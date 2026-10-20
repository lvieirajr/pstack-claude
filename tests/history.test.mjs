import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  listClaude,
  readClaude,
  requireComplete,
} from "../plugins/pstack/skills/reflect/scripts/history.mjs";
import {
  listCodex,
  pages,
  readCodex,
  withCodex,
} from "../plugins/pstack/skills/reflect/scripts/history-codex.mjs";
const cleanup = [];
afterEach(() => {
  for (const root of cleanup.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "pstack-history-")));
  cleanup.push(root);
  const workspace = join(root, "project"),
    other = join(root, "other"),
    config = join(root, "claude-config");
  for (const path of [workspace, other, config]) mkdirSync(path);
  const env = { CLAUDE_CONFIG_DIR: config };
  const dir = join(config, "projects", workspace.replace(/[^a-zA-Z0-9]/g, "-"));
  mkdirSync(dir, { recursive: true });
  const message = (uuid, parentUuid, extra = {}) => ({
    type: "user",
    uuid,
    parentUuid,
    sessionId: "run",
    cwd: workspace,
    message: { role: "user", content: "task" },
    ...extra,
  });
  const save = (name, records) => {
    const path = join(dir, name);
    mkdirSync(resolve(path, ".."), { recursive: true });
    writeFileSync(
      path,
      records.map((x) => JSON.stringify(x)).join("\n") + "\n",
    );
    return path;
  };
  return { root, workspace, other, config, dir, env, message, save };
}
describe("Claude history identity and active branches", () => {
  test("uses relocated configuration and exact run identity instead of newest file", async () => {
    const f = fixture();
    f.save("old.jsonl", [f.message("a", null)]);
    const newer = f.save("new.jsonl", [
      f.message("b", null, { sessionId: "different" }),
    ]);
    utimesSync(newer, new Date(), new Date(Date.now() + 10000));
    expect((await listClaude(f.workspace, { env: f.env })).runs).toHaveLength(
      2,
    );
    const selected = await readClaude(f.workspace, {
      runId: "run",
      env: f.env,
    });
    expect(selected.records[0].uuid).toBe("a");
  });
  test("never searches unrelated workspace buckets and rejects stale cwd metadata", async () => {
    const f = fixture();
    f.save("wrong.jsonl", [f.message("a", null, { cwd: f.other })]);
    const result = await listClaude(f.workspace, { env: f.env });
    expect(result.runs).toEqual([]);
    expect(result.limitations[0]).toContain("another workspace");
    await expect(
      readClaude(f.workspace, { file: join(f.dir, "wrong.jsonl") }),
    ).rejects.toThrow("another workspace");
  });
  test("validates every record, not only an opening cwd or session ID", async () => {
    const f = fixture(),
      file = f.save("run.jsonl", [
        f.message("a", null),
        f.message("b", "a", { cwd: f.other }),
      ]);
    await expect(readClaude(f.workspace, { file })).rejects.toThrow(
      "crosses workspace",
    );
    f.save("run.jsonl", [
      f.message("a", null),
      f.message("b", "a", { sessionId: "other" }),
    ]);
    await expect(readClaude(f.workspace, { file })).rejects.toThrow(
      "conflicting session",
    );
  });
  test("a filename or encoded cwd collision cannot override metadata", async () => {
    const f = fixture(),
      file = f.save("run.jsonl", [
        f.message("a", null, { sessionId: "actual" }),
      ]);
    await expect(
      readClaude(f.workspace, { file, runId: "run" }),
    ).rejects.toThrow("requested run");
  });
  test("duplicate copies of one run are ambiguous instead of resolved by mtime", async () => {
    const f = fixture();
    f.save("run.jsonl", [f.message("a", null)]);
    f.save("run/run.jsonl", [f.message("a", null)]);
    await expect(
      readClaude(f.workspace, { runId: "run", env: f.env }),
    ).rejects.toThrow("ambiguous");
  });
  test("reconstructs only the chosen branch and retains actual tool evidence", async () => {
    const f = fixture(),
      file = f.save("run.jsonl", [
        f.message("a", null),
        f.message("discarded", "a"),
        f.message("kept", "a", {
          type: "assistant",
          message: {
            role: "assistant",
            content: [
              {
                type: "tool_use",
                id: "call",
                name: "Read",
                input: { file_path: "app.ts" },
              },
            ],
          },
        }),
      ]);
    await expect(readClaude(f.workspace, { file })).rejects.toThrow(
      "branch is ambiguous",
    );
    await expect(readClaude(f.workspace, { file, leaf: "a" })).rejects.toThrow(
      "not a branch leaf",
    );
    const result = await readClaude(f.workspace, { file, leaf: "kept" });
    expect(result.records.map((x) => x.uuid)).toEqual(["a", "kept"]);
    expect(result.records[1].message.content[0].name).toBe("Read");
  });
  test("missing parents, cycles, malformed records, and conflicting IDs fail closed", async () => {
    const f = fixture();
    for (const records of [
      [f.message("a", "missing")],
      [f.message("a", "b"), f.message("b", "a")],
      [f.message("a", null), f.message("a", "changed")],
    ]) {
      const file = f.save("run.jsonl", records);
      await expect(
        readClaude(f.workspace, { file, leaf: "a" }),
      ).rejects.toThrow();
    }
    const file = f.save("run.jsonl", [f.message("a", null)]);
    writeFileSync(file, readFileSync(file, "utf8") + '{"partial":');
    await expect(readClaude(f.workspace, { file })).rejects.toThrow(
      "malformed JSONL",
    );
  });
  test("child runs sharing a parent session remain distinct", async () => {
    const f = fixture();
    f.save("run/subagents/agent-a.jsonl", [
      f.message("a", null, { isSidechain: true, agentId: "a" }),
    ]);
    f.save("run/subagents/agent-b.jsonl", [
      f.message("b", null, { isSidechain: true, agentId: "b" }),
    ]);
    const listed = await listClaude(f.workspace, { env: f.env });
    expect(listed.runs.map((x) => x.runId).sort()).toEqual(["run/a", "run/b"]);
    expect(
      (await readClaude(f.workspace, { runId: "run/b", env: f.env })).records[0]
        .uuid,
    ).toBe("b");
  });
  test("symlink workspace spelling is verified against canonical identity", async () => {
    const f = fixture();
    const alias = join(f.root, "alias");
    symlinkSync(f.workspace, alias);
    f.save("run.jsonl", [f.message("a", null)]);
    expect((await listClaude(alias, { env: f.env })).runs).toHaveLength(1);
  });
  test("compacted or absent history cannot silently satisfy a complete-evidence gate", async () => {
    const f = fixture(),
      file = f.save("run.jsonl", [
        f.message("a", null, { isCompactSummary: true }),
      ]);
    expect(() => requireComplete({ limitations: ["unavailable"] })).toThrow(
      "Complete evidence unavailable",
    );
    expect(() =>
      requireComplete({ limitations: [], records: [] }),
    ).not.toThrow();
    const read = await readClaude(f.workspace, { file });
    expect(() => requireComplete(read)).toThrow("compaction");
  });
});
function codexFixture(workspace) {
  const thread = {
    id: "child",
    sessionId: "root",
    forkedFromId: "parent",
    cwd: workspace,
    updatedAt: 100,
    source: "cli",
  };
  const calls = [];
  const request = async (method, params) => {
    calls.push({ method, params });
    if (method === "thread/read") return { thread };
    if (method === "thread/turns/list")
      return {
        data: [
          {
            id: "turn",
            itemsView: "full",
            status: "completed",
            items: [
              {
                type: "commandExecution",
                command: "cat app.ts",
                aggregatedOutput: "actual source",
              },
            ],
          },
        ],
        nextCursor: null,
      };
    throw new Error(method);
  };
  return { thread, calls, request };
}
describe("Codex native history", () => {
  test("uses the exact child thread, full native items, and read-only methods", async () => {
    const f = fixture(),
      c = codexFixture(f.workspace),
      result = await readCodex(c.request, f.workspace, "child");
    expect(result.runId).toBe("child");
    expect(result.sessionId).toBe("root");
    expect(result.records[0].items[0].aggregatedOutput).toBe("actual source");
    expect(c.calls.map((x) => x.method)).toEqual([
      "thread/read",
      "thread/turns/list",
      "thread/read",
    ]);
    expect(c.calls[1].params.itemsView).toBe("full");
  });
  test("checks cwd before fetching any transcript body", async () => {
    const f = fixture(),
      c = codexFixture(f.other);
    await expect(readCodex(c.request, f.workspace, "child")).rejects.toThrow(
      "workspace",
    );
    expect(c.calls).toHaveLength(1);
  });
  test("rejects another ID, a changed revision, or stale workspace metadata", async () => {
    const f = fixture();
    for (const change of [
      { id: "different" },
      { cwd: f.other },
      { updatedAt: 200 },
    ]) {
      const c = codexFixture(f.workspace);
      let count = 0;
      const request = async (method, params) => {
        const result = await c.request(method, params);
        if (method === "thread/read" && ++count === 2)
          return { thread: { ...c.thread, ...change } };
        return result;
      };
      await expect(readCodex(request, f.workspace, "child")).rejects.toThrow();
    }
  });
  test("follows every page and rejects non-advancing cursors", async () => {
    const calls = [];
    const request = async (_, params) => {
      calls.push(params);
      return params.cursor
        ? { data: [2], nextCursor: null }
        : { data: [1], nextCursor: "next" };
    };
    expect(
      await pages(request, "thread/turns/list", { threadId: "child" }),
    ).toEqual([1, 2]);
    expect(calls[1].cursor).toBe("next");
    await expect(
      pages(
        async () => ({ data: [], nextCursor: "repeat" }),
        "thread/list",
        {},
      ),
    ).rejects.toThrow("did not advance");
  });
  test("lists active and archived workspace runs, including worker kinds", async () => {
    const f = fixture(),
      calls = [];
    const request = async (_, params) => {
      calls.push(params);
      return {
        data: [
          {
            ...codexFixture(f.workspace).thread,
            id: params.archived ? "archived" : "active",
          },
        ],
        nextCursor: null,
      };
    };
    expect(
      (await listCodex(request, f.workspace, [f.workspace])).runs.map(
        (x) => x.runId,
      ),
    ).toEqual(["active", "archived"]);
    expect(calls[0].cwd).toEqual([f.workspace]);
    expect(calls[0].sourceKinds).toContain("subAgent");
    expect(calls[0].modelProviders).toEqual([]);
  });
  test("summaries, active turns, and missing native content cannot pass strict export", async () => {
    const f = fixture();
    for (const change of [
      { itemsView: "summary" },
      { status: "inProgress" },
      { items: [{ type: "tool", truncated: true }] },
      {
        items: [
          { type: "mcpToolCall", result: { content: [{ truncated: true }] } },
        ],
      },
    ]) {
      const c = codexFixture(f.workspace),
        request = async (method, params) => {
          const result = await c.request(method, params);
          return method === "thread/turns/list"
            ? { ...result, data: result.data.map((x) => ({ ...x, ...change })) }
            : result;
        };
      expect(() =>
        requireComplete({ limitations: ["missing tool evidence"] }),
      ).toThrow();
      const result = await readCodex(request, f.workspace, "child");
      expect(() => requireComplete(result)).toThrow(
        "Complete evidence unavailable",
      );
    }
  });
  test("unsupported history methods stay unavailable instead of falling back to Claude or a digest", async () => {
    const f = fixture(),
      c = codexFixture(f.workspace),
      request = async (method, params) => {
        if (method === "thread/turns/list")
          throw new Error("unsupported history method");
        return c.request(method, params);
      };
    await expect(readCodex(request, f.workspace, "child")).rejects.toThrow(
      "unsupported history",
    );
  });
  test("an empty persisted history cannot pass a complete-evidence gate", async () => {
    const f = fixture(),
      c = codexFixture(f.workspace);
    const request = async (method, params) =>
      method === "thread/turns/list"
        ? { data: [], nextCursor: null }
        : c.request(method, params);
    const result = await readCodex(request, f.workspace, "child");
    expect(() => requireComplete(result)).toThrow("no persisted turns");
  });
  test("a workspace filter mismatch and an active/archive duplicate are unavailable", async () => {
    const f = fixture();
    await expect(
      listCodex(
        async () => ({ data: [codexFixture(f.other).thread] }),
        f.workspace,
        [f.workspace],
      ),
    ).rejects.toThrow("workspace");
    await expect(
      listCodex(
        async () => ({ data: [codexFixture(f.workspace).thread] }),
        f.workspace,
        [f.workspace],
      ),
    ).rejects.toThrow("changed while listing");
  });
  test("missing local CLI reports unavailable history promptly", async () => {
    const f = fixture();
    await expect(
      withCodex(f.workspace, () => {}, {
        command: join(f.root, "missing"),
        timeoutMs: 1000,
      }),
    ).rejects.toThrow("unavailable");
  });
});
describe("history CLI", () => {
  const script = join(
    import.meta.dir,
    "../plugins/pstack/skills/reflect/scripts/history.mjs",
  );
  test("the installed helper runs through a symlink instead of silently exiting", () => {
    const f = fixture(),
      link = join(f.root, "history-link.mjs");
    symlinkSync(script, link);
    const r = spawnSync("node", [link, "--help"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("history.mjs list|read");
  });
  test("requires explicit workspace and exact run, even when another session is newer", () => {
    for (const args of [
      ["read", "--runtime", "claude"],
      ["read", "--runtime", "claude", "--workspace", tmpdir()],
    ]) {
      const r = spawnSync("node", [script, ...args], { encoding: "utf8" });
      expect(r.status).toBe(1);
      expect(r.stdout).toBe("");
    }
  });
  test("exports exclusively to the requested new file and never overwrites a transcript", () => {
    const f = fixture(),
      source = f.save("run.jsonl", [f.message("a", null)]),
      output = join(f.root, "evidence.json");
    const args = [
      script,
      "read",
      "--runtime",
      "claude",
      "--workspace",
      f.workspace,
      "--file",
      source,
      "--output",
      output,
    ];
    const first = spawnSync("node", args, { encoding: "utf8" });
    expect(first.status).toBe(0);
    expect(JSON.parse(readFileSync(output, "utf8")).runId).toBe("run");
    const second = spawnSync("node", args, { encoding: "utf8" });
    expect(second.status).toBe(1);
    expect(readFileSync(source, "utf8")).toContain('"uuid":"a"');
  });
  test("an exact launch boundary excludes inherited records and a missing one cannot be invented", () => {
    const f = fixture(),
      source = f.save("run.jsonl", [
        f.message("parent", null),
        f.message("candidate", "parent"),
      ]);
    const args = [
      script,
      "read",
      "--runtime",
      "claude",
      "--workspace",
      f.workspace,
      "--file",
      source,
    ];
    const scoped = spawnSync("node", [...args, "--after", "parent"], {
      encoding: "utf8",
    });
    expect(scoped.status).toBe(0);
    expect(JSON.parse(scoped.stdout).records.map((x) => x.uuid)).toEqual([
      "candidate",
    ]);
    const missing = spawnSync("node", [...args, "--after", "not-recorded"], {
      encoding: "utf8",
    });
    expect(missing.status).toBe(1);
    expect(missing.stdout).toBe("");
    const empty = spawnSync("node", [...args, "--after", ""], {
      encoding: "utf8",
    });
    expect(empty.status).toBe(1);
    expect(empty.stdout).toBe("");
  });
  test("listing respects the supplied time window and never reads other workspace buckets", () => {
    const f = fixture();
    const old = f.save("old.jsonl", [f.message("a", null)]);
    utimesSync(
      old,
      new Date("2020-01-01T00:00:00Z"),
      new Date("2020-01-01T00:00:00Z"),
    );
    f.save("new.jsonl", [f.message("b", null, { sessionId: "new" })]);
    const r = spawnSync(
      "node",
      [
        script,
        "list",
        "--runtime",
        "claude",
        "--workspace",
        f.workspace,
        "--since",
        "2019-01-01T00:00:00Z",
        "--until",
        "2021-01-01T00:00:00Z",
      ],
      { env: { ...process.env, ...f.env }, encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).runs.map((x) => x.runId)).toEqual(["run"]);
  });
  test("an incomplete source never creates a strict export", () => {
    const f = fixture(),
      source = f.save("run.jsonl", [
        f.message("a", null, { isCompactSummary: true }),
      ]),
      output = join(f.root, "evidence.json");
    const r = spawnSync(
      "node",
      [
        script,
        "read",
        "--runtime",
        "claude",
        "--workspace",
        f.workspace,
        "--file",
        source,
        "--require-complete",
        "--output",
        output,
      ],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(1);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("Complete evidence unavailable");
  });
});
