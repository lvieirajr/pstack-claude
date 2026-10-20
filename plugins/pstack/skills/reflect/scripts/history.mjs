#!/usr/bin/env node
// Scoped native history. List metadata first; read only an explicitly selected run.
import {
  createReadStream,
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { candidates } from "./find-transcript.mjs";
import { listCodex, readCodex, withCodex } from "./history-codex.mjs";

const canonical = (path) => realpathSync(path);
const sameWorkspace = (path, workspace) => {
  try {
    return canonical(path) === canonical(workspace);
  } catch {
    return false;
  }
};
const encode = (path) => path.replace(/[^a-zA-Z0-9]/g, "-");

async function claudeMetadata(path, workspace) {
  const stream = createReadStream(path, { encoding: "utf8" });
  let rest = "";
  const inspect = (line) => {
    const record = JSON.parse(line);
    if (record.type === "session_meta" || record.type === "session")
      throw new Error("not a Claude transcript");
    if (typeof record.sessionId !== "string" || typeof record.cwd !== "string")
      return null;
    if (!sameWorkspace(record.cwd, workspace))
      throw new Error(
        "Claude transcript metadata belongs to another workspace",
      );
    const child = record.isSidechain === true || record.agentId !== undefined;
    const agent =
      record.agentId ??
      (child && path.includes("subagents") ? basename(path, ".jsonl") : null);
    if (child && !agent)
      throw new Error("Claude subagent has no identifiable run");
    return {
      runtime: "claude",
      runId: child ? `${record.sessionId}/${agent}` : record.sessionId,
      sessionId: record.sessionId,
      workspace: canonical(workspace),
      source: canonical(path),
      updatedAt: statSync(path).mtime.toISOString(),
      kind: child ? "subagent" : "main",
    };
  };
  try {
    for await (const chunk of stream) {
      const lines = (rest + chunk).split("\n");
      rest = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const run = inspect(line);
        if (run) return run;
      }
    }
    if (rest.trim()) {
      const run = inspect(rest);
      if (run) return run;
    }
    throw new Error("Claude transcript has no workspace/run metadata");
  } finally {
    stream.destroy();
  }
}

export async function listClaude(
  workspace,
  { env = process.env, home = homedir() } = {},
) {
  const config = env.CLAUDE_CONFIG_DIR || join(home, ".claude");
  const roots = [
    ...new Set(
      [resolve(workspace), canonical(workspace)].map((path) =>
        join(config, "projects", encode(path)),
      ),
    ),
  ];
  const runs = [],
    limitations = [],
    files = new Set();
  for (const root of roots.filter(existsSync)) {
    for (const { path } of candidates(root)) {
      if (files.has(canonical(path))) continue;
      files.add(canonical(path));
      try {
        runs.push(await claudeMetadata(path, workspace));
      } catch (error) {
        limitations.push(`${path}: ${error.message}`);
      }
    }
  }
  if (!roots.some(existsSync))
    limitations.push(
      "No Claude transcript directory for this workspace; provide an exact native transcript with --file if its layout differs",
    );
  if (!runs.length && !limitations.length)
    limitations.push(
      "No recognizable Claude runs in the supported workspace layouts; use an exact native transcript if the layout differs",
    );
  return { runs, limitations };
}

export async function readClaude(
  workspace,
  { runId, file, leaf, env, home } = {},
) {
  let run;
  if (file) run = await claudeMetadata(file, workspace);
  else {
    const { runs, limitations } = await listClaude(workspace, { env, home });
    const matches = runs.filter((candidate) => candidate.runId === runId);
    if (matches.length !== 1)
      throw new Error(
        `Claude run selection is ${matches.length ? "ambiguous" : "unavailable"}; provide the exact --file (${limitations.join("; ")})`,
      );
    [run] = matches;
  }
  if (runId && run.runId !== runId)
    throw new Error("Claude transcript does not match the requested run ID");
  const before = statSync(run.source),
    raw = readFileSync(run.source, "utf8"),
    after = statSync(run.source);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs)
    throw new Error(
      "Claude transcript changed while reading; retry the exact run",
    );
  const entries = new Map(),
    parents = new Set();
  for (const line of raw.split("\n").filter((line) => line.trim())) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      throw new Error(
        "Claude transcript contains incomplete or malformed JSONL; no complete export was produced",
      );
    }
    if (record.cwd && !sameWorkspace(record.cwd, workspace))
      throw new Error("Claude transcript crosses workspace boundaries");
    if (record.sessionId && record.sessionId !== run.sessionId)
      throw new Error("Claude transcript contains conflicting session IDs");
    if (typeof record.uuid !== "string") continue;
    if (
      entries.has(record.uuid) &&
      JSON.stringify(entries.get(record.uuid)) !== JSON.stringify(record)
    )
      throw new Error("Claude transcript has conflicting message IDs");
    entries.set(record.uuid, record);
    if (record.parentUuid) parents.add(record.parentUuid);
  }
  const leaves = [...entries.keys()].filter((id) => !parents.has(id));
  if (!leaf && leaves.length !== 1)
    throw new Error(
      `Claude active branch is ${leaves.length ? "ambiguous" : "unavailable"}; use the native active leaf with --leaf or supply an active-branch export`,
    );
  if (leaf && !leaves.includes(leaf))
    throw new Error("Requested Claude message is not a branch leaf");
  const branchLeafId = leaf ?? leaves[0],
    records = [],
    seen = new Set();
  let id = branchLeafId;
  while (id != null) {
    if (seen.has(id) || !entries.has(id))
      throw new Error(
        "Claude branch has a cycle or missing parent; complete lineage is unavailable",
      );
    seen.add(id);
    const record = entries.get(id);
    records.push(record);
    id = record.parentUuid ?? null;
  }
  records.reverse();
  const limitations = [];
  if (
    !records.some(
      (record) => record.type === "user" || record.type === "assistant",
    )
  )
    throw new Error("Claude branch contains no conversation messages");
  if (
    records.some(
      (record) =>
        record.isCompactSummary || record.subtype === "compact_boundary",
    )
  )
    limitations.push(
      "selected branch contains a compaction summary; inspect original tool evidence before grading",
    );
  return {
    ...run,
    branchLeafId,
    updatedAt: after.mtime.toISOString(),
    capturedAt: new Date().toISOString(),
    limitations,
    records,
  };
}

export function requireComplete(evidence) {
  if (evidence.limitations.length)
    throw new Error(
      `Complete evidence unavailable: ${evidence.limitations.join("; ")}`,
    );
  return evidence;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: Object.fromEntries(
      [
        "runtime",
        "workspace",
        "run",
        "file",
        "leaf",
        "after",
        "since",
        "until",
        "output",
      ]
        .map((key) => [key, { type: "string" }])
        .concat([
          ["require-complete", { type: "boolean" }],
          ["help", { type: "boolean" }],
        ]),
    ),
  });
  if (values.help) {
    console.log(
      "history.mjs list|read --runtime claude|codex --workspace <cwd> [--run <id> | --file <claude-jsonl>] [--leaf <claude-message-uuid>] [--after <launch-boundary-id>] [--since <ISO>] [--until <ISO>] [--require-complete] [--output <new-file>]",
    );
    return;
  }
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === "string" && !value.trim())
      throw new Error(`--${name} requires a non-empty value`);
  }
  const [operation] = positionals;
  if (
    positionals.length !== 1 ||
    !["list", "read"].includes(operation) ||
    !["claude", "codex"].includes(values.runtime) ||
    !values.workspace
  )
    throw new Error(
      "Specify list|read, --runtime claude|codex, and an explicit --workspace",
    );
  const workspace = canonical(values.workspace);
  if (!statSync(workspace).isDirectory())
    throw new Error("Workspace must be a directory");
  if (operation === "read" && !values.run && !values.file)
    throw new Error(
      "Reading requires an exact --run ID or --file; never infer the newest run",
    );
  if (values.runtime === "codex" && (values.file || values.leaf))
    throw new Error(
      "Codex uses native thread IDs and active history, not raw JSONL or a Claude leaf",
    );
  if (
    operation === "list" &&
    (values.run || values.file || values.leaf || values.after)
  )
    throw new Error("Run/branch selectors apply only to read");
  if (operation === "read" && (values.since || values.until))
    throw new Error(
      "Time filters apply only to list; read exports the selected run's full available branch",
    );
  const since = values.since ? Date.parse(values.since) : -Infinity;
  const until = values.until ? Date.parse(values.until) : Infinity;
  if (Number.isNaN(since) || Number.isNaN(until) || since > until)
    throw new Error("Invalid history time window");
  let evidence;
  if (values.runtime === "claude")
    evidence =
      operation === "list"
        ? await listClaude(values.workspace)
        : await readClaude(values.workspace, {
            runId: values.run,
            file: values.file,
            leaf: values.leaf,
          });
  else
    evidence = await withCodex(workspace, (request) =>
      operation === "list"
        ? listCodex(request, workspace, [
            ...new Set([resolve(values.workspace), workspace]),
          ])
        : readCodex(request, workspace, values.run),
    );
  if (operation === "list") {
    evidence.runs = evidence.runs
      .filter(
        (run) =>
          Date.parse(run.updatedAt) >= since &&
          Date.parse(run.updatedAt) <= until,
      )
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }
  if (values.after) {
    const at = evidence.records.findIndex(
      (record) => (record.uuid ?? record.id) === values.after,
    );
    if (at < 0)
      throw new Error(
        "The supplied launch boundary is absent from this run; candidate-only evidence is unavailable",
      );
    evidence.records = evidence.records.slice(at + 1);
    evidence.afterRecordId = values.after;
    if (evidence.records.length === 0)
      evidence.limitations.push(
        "no records after the supplied launch boundary",
      );
  }
  if (values["require-complete"]) requireComplete(evidence);
  const output = JSON.stringify(evidence, null, 2) + "\n";
  if (values.output) {
    writeFileSync(values.output, output, { flag: "wx", mode: 0o600 });
    console.log(
      JSON.stringify({
        output: resolve(values.output),
        limitations: evidence.limitations,
      }),
    );
  } else console.log(output.trimEnd());
}
function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === canonical(process.argv[1]);
  } catch {
    return false;
  }
}
if (invokedDirectly())
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
