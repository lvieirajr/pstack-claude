import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { createInterface } from "node:readline";

const sameWorkspace = (cwd, workspace) => {
  try {
    return (
      typeof cwd === "string" && realpathSync(cwd) === realpathSync(workspace)
    );
  } catch {
    return false;
  }
};

// Read-only thread methods: never resume, fork, inject, or start a model turn.
export async function withCodex(
  workspace,
  action,
  { command = "codex", timeoutMs = 30_000 } = {},
) {
  const child = spawn(command, ["app-server", "--stdio"], {
    cwd: workspace,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const pending = new Map();
  let nextId = 0;
  const fail = (error) => {
    for (const p of pending.values()) p.reject(error);
    pending.clear();
  };
  child.on("error", () =>
    fail(
      new Error(
        "Codex CLI unavailable; supply a native history export instead",
      ),
    ),
  );
  child.on("exit", () =>
    fail(new Error("Codex app-server exited before returning history")),
  );
  child.stderr.resume(); // Do not expose configuration or credential diagnostics.
  child.stdin.on("error", () =>
    fail(new Error("Codex app-server connection closed")),
  );
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    const p = pending.get(message.id);
    if (!p) return;
    pending.delete(message.id);
    if (message.error)
      p.reject(
        new Error(
          `Codex history unavailable (${message.error.code}): ${message.error.message}`,
        ),
      );
    else p.resolve(message.result);
  });
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      child.stdin.write(JSON.stringify({ id, method, params }) + "\n");
    });
  const timer = setTimeout(() => {
    fail(
      new Error(
        "Codex history read timed out; no complete export was produced",
      ),
    );
    child.kill("SIGKILL");
  }, timeoutMs);
  try {
    await request("initialize", {
      clientInfo: { name: "pstack-history", version: "1" },
      capabilities: { experimentalApi: true },
    });
    child.stdin.write(
      JSON.stringify({ method: "initialized", params: {} }) + "\n",
    );
    return await action(request);
  } finally {
    clearTimeout(timer);
    lines.close();
    child.stdin.end();
    child.kill();
  }
}

export async function pages(request, method, params) {
  const rows = [],
    seen = new Set();
  let cursor;
  do {
    const page = await request(method, {
      ...params,
      ...(cursor ? { cursor } : {}),
    });
    if (!Array.isArray(page?.data))
      throw new Error(`${method}: missing history page`);
    rows.push(...page.data);
    cursor = page.nextCursor;
    if (cursor != null) {
      if (typeof cursor !== "string" || !cursor || seen.has(cursor))
        throw new Error(`${method}: pagination did not advance`);
      seen.add(cursor);
    }
  } while (cursor != null);
  return rows;
}

function descriptor(thread, workspace) {
  if (!thread?.id || !sameWorkspace(thread.cwd, workspace))
    throw new Error(
      "Codex run metadata does not match the requested workspace",
    );
  if (!Number.isFinite(thread.updatedAt))
    throw new Error("Codex run has no usable modification time");
  return {
    runtime: "codex",
    runId: thread.id,
    sessionId: thread.sessionId ?? null,
    workspace: realpathSync(workspace),
    updatedAt: new Date(thread.updatedAt * 1000).toISOString(),
    source: "codex app-server",
    kind: thread.source ?? null,
    forkedFromId: thread.forkedFromId ?? null,
    parentThreadId: thread.parentThreadId ?? null,
  };
}

export async function listCodex(request, workspace, spellings) {
  const runs = [],
    ids = new Set();
  for (const archived of [false, true]) {
    const threads = await pages(request, "thread/list", {
      cwd: spellings,
      archived,
      limit: 100,
      sortKey: "updated_at",
      modelProviders: [],
      sourceKinds: [
        "cli",
        "vscode",
        "exec",
        "appServer",
        "subAgent",
        "subAgentReview",
        "subAgentCompact",
        "subAgentThreadSpawn",
        "subAgentOther",
        "unknown",
      ],
    });
    for (const thread of threads) {
      if (ids.has(thread.id))
        throw new Error(
          "Codex history changed while listing; retry the workspace query",
        );
      ids.add(thread.id);
      runs.push({ ...descriptor(thread, workspace), archived });
    }
  }
  return { runs, limitations: [] };
}

function unavailableContent(value) {
  if (!value || typeof value !== "object") return false;
  return (
    value.truncated === true ||
    value.contentUnavailable === true ||
    Object.values(value).some(unavailableContent)
  );
}

export async function readCodex(request, workspace, runId) {
  const before = (await request("thread/read", { threadId: runId }))?.thread;
  const run = descriptor(before, workspace);
  if (run.runId !== runId) throw new Error("Codex returned a different run ID");
  const records = await pages(request, "thread/turns/list", {
    threadId: runId,
    itemsView: "full",
    sortDirection: "asc",
    limit: 50,
  });
  const limitations = new Set(),
    ids = new Set();
  if (records.length === 0) limitations.add("no persisted turns are available");
  for (const turn of records) {
    if (!turn?.id || ids.has(turn.id) || !Array.isArray(turn.items))
      throw new Error("Codex returned inconsistent turn history");
    ids.add(turn.id);
    if (turn.itemsView !== undefined && turn.itemsView !== "full")
      limitations.add("turn items are summarized or missing");
    if (turn.status === "inProgress")
      limitations.add("an active turn is incomplete");
    if (
      !["completed", "interrupted", "failed", "inProgress"].includes(
        turn.status,
      )
    )
      limitations.add("unrecognized turn status");
    for (const item of turn.items) {
      if (unavailableContent(item))
        limitations.add("native item content is truncated or unavailable");
    }
  }
  const after = (await request("thread/read", { threadId: runId }))?.thread;
  descriptor(after, workspace);
  if (after.id !== runId || after.updatedAt !== before.updatedAt)
    throw new Error("Codex run changed while reading; retry the exact run");
  return {
    ...run,
    capturedAt: new Date().toISOString(),
    limitations: [...limitations],
    records,
  };
}
