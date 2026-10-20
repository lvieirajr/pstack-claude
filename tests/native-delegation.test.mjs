import { test } from "bun:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fixture, nativeRun, digest } from "./helpers/native-delegation.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const enabled = process.env.PSTACK_NATIVE_DELEGATION === "1";

async function capacity(runtime, codexModel) {
  const f = fixture(runtime, repo, { codexModel }),
    ids = [];
  let rejected = false,
    followed = false;
  let nativeTools;
  const modern = () =>
    nativeTools.get("spawn_agent")?.namespace === "collaboration";
  const resultText = (r) =>
    typeof (r?.output ?? r?.content) === "string"
      ? (r.output ?? r.content)
      : Array.isArray(r?.output ?? r?.content)
        ? (r.output ?? r.content)
            .map((block) => block.text ?? JSON.stringify(block))
            .join("\n")
        : JSON.stringify(r?.output ?? r?.content);
  const start = (lane) => ({
    name: runtime === "claude" ? "Agent" : "spawn_agent",
    args:
      runtime === "claude"
        ? {
            description: `fixture lane ${lane}`,
            prompt: `PSTACK_CHILD ${lane}\nRead ${f.entry}, its delegation contract, and ${f.plugin}/skills/${f.skillFor(lane)}/SKILL.md; execute only your assigned slice in ${f.worktrees[lane - 1]}. Return actual source identity and receipt.json.`,
            subagent_type:
              lane === 5 || lane === 6
                ? "pstack:poteto-agent"
                : "general-purpose",
            run_in_background: true,
            model: ["sonnet", "haiku", "opus"][(lane - 1) % 3],
          }
        : {
            message: `PSTACK_CHILD ${lane}\nRead ${f.entry}, its delegation contract, and ${f.plugin}/skills/${f.skillFor(lane)}/SKILL.md; execute only your assigned slice in ${f.worktrees[lane - 1]}. Return actual source identity and receipt.json.`,
            ...(modern()
              ? { task_name: `lane_${lane}`, fork_turns: "none" }
              : {}),
            model: ["gpt-6.1-sol", "gpt-6-luna", "gpt-6-astra"][(lane - 1) % 3],
          },
  });
  const idFrom = (r) => {
    const text = resultText(r);
    if (runtime === "codex") {
      const parsed = JSON.parse(text);
      const id = parsed.agent_id ?? parsed.task_name;
      assert.ok(id, text);
      return id;
    }
    const id = text.match(/agentId:\s*([^\s<]+)/)?.[1];
    assert.ok(id, text);
    return id;
  };
  const shell = (cmd) => ({
    name: runtime === "claude" ? "Bash" : "exec_command",
    args:
      runtime === "claude"
        ? { command: cmd, timeout: 20000 }
        : { cmd, workdir: f.workspace, yield_time_ms: 1000 },
  });
  try {
    const result = await nativeRun(f, async function* ({ release, tools }) {
      nativeTools = tools;
      for (let lane = 1; lane <= 2; lane++) ids.push(idFrom(yield start(lane)));
      const failure = resultText(yield start(3));
      assert.match(failure, /limit|maximum|too many/i);
      rejected = true;
      release();
      for (let lane = 1; lane <= 10; lane++) {
        if (lane > 2) ids.push(idFrom(yield start(lane)));
        if (runtime === "codex" && !modern()) {
          const waited = JSON.parse(
            resultText(
              yield {
                name: "wait_agent",
                args: { targets: [ids[lane - 1]], timeout_ms: 10000 },
              },
            ),
          );
          assert.ok(
            JSON.stringify(waited).includes("completed"),
            JSON.stringify(waited),
          );
        } else
          assert.ok(
            resultText(yield shell(f.waitCommand(lane))).includes("entryHash"),
          );
        if (lane === 1) {
          const reply = yield {
            name:
              runtime === "claude"
                ? "SendMessage"
                : modern()
                  ? "followup_task"
                  : "send_input",
            args:
              runtime === "claude"
                ? {
                    to: ids[0],
                    message:
                      "Continue only the same fixture check; return the previously observed receipt. No new lane and no edits.",
                  }
                : {
                    target: ids[0],
                    message:
                      "Continue only the same fixture check; return the previously observed receipt. No new lane and no edits.",
                  },
          };
          assert.ok(
            !JSON.stringify(reply).includes('is_error":true'),
            JSON.stringify(reply),
          );
          followed = true;
          if (runtime === "codex" && !modern())
            yield {
              name: "wait_agent",
              args: { targets: [ids[0]], timeout_ms: 10000 },
            };
        }
        if (runtime === "codex" && tools.has("close_agent"))
          yield { name: "close_agent", args: { target: ids[lane - 1] } };
        else if (runtime === "codex") yield { name: "list_agents", args: {} };
      }
    });
    assert.equal(new Set(ids).size, 10);
    assert.equal(result.childSteps.size, 10);
    const receipts = f.worktrees.map((p, i) => {
      const r = JSON.parse(readFileSync(p + "/receipt.json"));
      assert.equal(Number(r.lane), i + 1);
      assert.equal(r.cwd, p);
      assert.equal(r.head, f.head);
      assert.equal(r.entryHash, digest(f.entry));
      assert.equal(r.contractHash, digest(f.contract));
      assert.equal(r.workflowHash, digest(r.workflow));
      return r;
    });
    assert.equal(new Set(result.childModels.values()).size, 3);
    const history = join(f.plugin, "skills/reflect/scripts/history.mjs");
    const listing = JSON.parse(
      f.run("node", [
        history,
        "list",
        "--runtime",
        runtime,
        "--workspace",
        f.workspace,
      ]),
    );
    const nativeEvents = result.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const spawnEvent = nativeEvents.find(
      (event) =>
        event.item?.tool === "spawn_agent" &&
        event.item?.prompt?.startsWith("PSTACK_CHILD 3\n") &&
        event.item.receiver_thread_ids?.length,
    );
    const readHistory = (runId) =>
      JSON.parse(
        f.run("node", [
          history,
          "read",
          "--runtime",
          runtime,
          "--workspace",
          f.workspace,
          "--run",
          runId,
          "--require-complete",
        ]),
      );
    let historyId = spawnEvent?.item.receiver_thread_ids[0] ?? ids[2];
    if (runtime === "codex" && modern()) {
      const rootId = nativeEvents.find(
        (event) => event.type === "thread.started",
      )?.thread_id;
      assert.ok(rootId, "native parent history identity is required");
      const parent = readHistory(rootId);
      const childIds = new Set(
        parent.records
          .flatMap((turn) => turn.items)
          .filter(
            (item) =>
              item.type === "subAgentActivity" &&
              item.kind === "started" &&
              item.agentPath === ids[2],
          )
          .map((item) => item.agentThreadId),
      );
      assert.equal(
        childIds.size,
        1,
        "bind the exact task path, not a recent child",
      );
      historyId = [...childIds][0];
      assert.ok(historyId && historyId !== ids[2]);
    } else {
      const saved = listing.runs.find((r) =>
        runtime === "codex"
          ? r.runId === historyId
          : r.kind === "subagent" && r.runId.endsWith("/" + ids[2]),
      );
      assert.ok(saved, "the native child history must be discoverable");
      historyId = saved.runId;
    }
    const recovered = readHistory(historyId);
    assert.equal(recovered.runId, historyId);
    assert.ok(recovered.records.length > 0);
    let childOutput;
    if (runtime === "codex") {
      const command = recovered.records
        .flatMap((turn) => turn.items)
        .find(
          (item) =>
            item.type === "commandExecution" &&
            item.cwd === f.worktrees[2] &&
            item.command.includes("receipt.mjs"),
        );
      assert.ok(command, "the child must execute its own receipt command");
      assert.equal(command.exitCode, 0);
      childOutput = command.aggregatedOutput;
    } else {
      const blocks = recovered.records.flatMap((record) =>
        Array.isArray(record.message?.content) ? record.message.content : [],
      );
      const command = blocks.find(
        (block) =>
          block.type === "tool_use" &&
          block.name === "Bash" &&
          block.input.command.includes(f.command(3)),
      );
      assert.ok(command, "the child must execute its own receipt command");
      const output = blocks.find(
        (block) =>
          block.type === "tool_result" && block.tool_use_id === command.id,
      );
      assert.ok(output && !output.is_error, "the child command must succeed");
      childOutput = JSON.stringify(output.content);
    }
    for (const evidence of [
      f.worktrees[2],
      f.head,
      digest(f.entry),
      digest(f.contract),
    ])
      assert.ok(
        childOutput.includes(evidence),
        `missing child tool result evidence: ${evidence}`,
      );
    const childToolAudit = "native child history available";
    assert.equal(f.git(f.workspace, "status", "--porcelain"), "");
    console.log(
      JSON.stringify({
        runtime,
        version: f.run(runtime, ["--version"]).trim(),
        scenario: "capacity and installed children",
        nativeSurface:
          runtime === "claude"
            ? "Agent"
            : modern()
              ? "collaboration"
              : "multi_agent_v1",
        children: ids.length,
        receipts: receipts.length,
        capacityRejection: rejected,
        followUp: followed,
        persistedEvidenceRecovered: true,
        childToolAudit,
        externalModelCalls: false,
      }),
    );
  } finally {
    f.cleanup();
  }
}

async function cancellation(runtime) {
  const f = fixture(runtime, repo);
  let nativeTools;
  const modern = () =>
    nativeTools.get("spawn_agent")?.namespace === "collaboration";
  const text = (r) =>
    typeof (r?.output ?? r?.content) === "string"
      ? (r.output ?? r.content)
      : Array.isArray(r?.output ?? r?.content)
        ? (r.output ?? r.content)
            .map((block) => block.text ?? JSON.stringify(block))
            .join("\n")
        : JSON.stringify(r?.output ?? r?.content);
  const quote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";
  const writer = join(f.root, "writer.mjs"),
    pidFile = join(f.root, "writer.pid"),
    counter = join(f.worktrees[0], "heartbeat.txt");
  writeFileSync(
    writer,
    `import{writeFileSync,appendFileSync}from'node:fs';writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>appendFileSync(${JSON.stringify(counter)},'tick\\n'),30);`,
  );
  const check = join(f.root, "inspect.mjs");
  writeFileSync(
    check,
    `import{existsSync,readFileSync}from'node:fs';const end=Date.now()+5000;while(!existsSync(${JSON.stringify(pidFile)})){if(Date.now()>end)throw Error('no child PID');await new Promise(r=>setTimeout(r,20));}const pid=Number(readFileSync(${JSON.stringify(pidFile)},'utf8'));let alive=true,limitation;try{process.kill(pid,0)}catch(e){if(e.code==='ESRCH')alive=false;else if(['EPERM','EACCES'].includes(e.code)){alive=null;limitation='process inspection denied';}else throw e;}console.log(JSON.stringify({pid,alive,limitation}));`,
  );
  const shell = (cmd) => ({
    name: runtime === "claude" ? "Bash" : "exec_command",
    args:
      runtime === "claude"
        ? { command: cmd, timeout: 10000 }
        : { cmd, workdir: f.worktrees[0], yield_time_ms: 1000 },
  });
  const start = () => ({
    name: runtime === "claude" ? "Agent" : "spawn_agent",
    args:
      runtime === "claude"
        ? {
            description: "fixture writer stop",
            prompt: `PSTACK_CHILD 1\nRead ${f.entry}; own ${f.worktrees[0]}. Run the fixture writer and report its exact process ID.`,
            subagent_type: "pstack:poteto-agent",
            run_in_background: true,
          }
        : {
            ...(modern() ? { task_name: "writer", fork_turns: "none" } : {}),
            message: `PSTACK_CHILD 1\nRead ${f.entry}; own ${f.worktrees[0]}. Run the fixture writer and report its exact process ID.`,
          },
  });
  let id, stopped, observed, replacement, nativeOwnership;
  let nativeTaskState = "unknown";
  const taskStopped = () =>
    ["stopped", "interrupted", "completed", "errored", "shutdown"].includes(
      nativeTaskState,
    );
  let processInspectionDenied = false;
  try {
    await nativeRun(
      f,
      async function* ({ release, tools }) {
        nativeTools = tools;
        const reply = text(yield start());
        id =
          runtime === "codex"
            ? (JSON.parse(reply).agent_id ?? JSON.parse(reply).task_name)
            : reply.match(/agentId:\s*([^\s<]+)/)?.[1];
        assert.ok(id, reply);
        release();
        const seen = text(
          yield shell(`${quote(process.execPath)} ${quote(check)}`),
        );
        assert.ok(seen.includes("alive"), seen);
        processInspectionDenied = seen.includes("process inspection denied");
        if (runtime === "codex" && !modern())
          yield {
            name: "wait_agent",
            args: { targets: [id], timeout_ms: 10000 },
          };
        stopped = text(
          yield {
            name:
              runtime === "claude"
                ? "TaskStop"
                : nativeTools.has("close_agent")
                  ? "close_agent"
                  : "interrupt_agent",
            args: runtime === "claude" ? { task_id: id } : { target: id },
          },
        );
        if (runtime === "claude") {
          const acknowledgement = JSON.parse(stopped);
          assert.equal(acknowledgement.task_id, id);
          assert.equal(acknowledgement.task_type, "local_agent");
          assert.ok(
            acknowledgement.message.startsWith(
              `Successfully stopped task: ${id}`,
            ),
            stopped,
          );
          nativeTaskState = "stopped";
        } else if (modern()) {
          const nativeStatus = JSON.parse(
            text(yield { name: "list_agents", args: {} }),
          );
          nativeTaskState =
            nativeStatus.agents.find((agent) => agent.agent_name === id)
              ?.agent_status ?? "unknown";
        }
        observed = text(
          yield shell(`${quote(process.execPath)} ${quote(check)}`),
        );
        nativeOwnership = JSON.parse(observed.match(/\{"pid"[^\n]+\}/)[0]);
        processInspectionDenied ||= Boolean(nativeOwnership.limitation);
        if (nativeOwnership.alive === false && taskStopped()) {
          const next = text(
            yield {
              name: runtime === "claude" ? "Agent" : "spawn_agent",
              args:
                runtime === "claude"
                  ? {
                      description: "fixture replacement writer",
                      prompt: `PSTACK_CHILD 2\nRead ${f.entry}. Use only ${f.worktrees[1]} and return its receipt.`,
                      subagent_type: "pstack:poteto-agent",
                      run_in_background: true,
                    }
                  : {
                      ...(modern()
                        ? {
                            task_name: "replacement_writer",
                            fork_turns: "none",
                          }
                        : {}),
                      message: `PSTACK_CHILD 2\nRead ${f.entry}. Use only ${f.worktrees[1]} and return its receipt.`,
                    },
            },
          );
          replacement =
            runtime === "codex"
              ? (JSON.parse(next).agent_id ?? JSON.parse(next).task_name)
              : next.match(/agentId:\s*([^\s<]+)/)?.[1];
          assert.ok(replacement);
          assert.notEqual(replacement, id);
          if (runtime === "codex" && !modern()) {
            yield {
              name: "wait_agent",
              args: { targets: [replacement], timeout_ms: 10000 },
            };
            yield { name: "close_agent", args: { target: replacement } };
          } else yield shell(f.waitCommand(2));
        }
      },
      {
        childAction: async ({ step, lane }) =>
          step === 0
            ? shell(
                lane === 1
                  ? `${quote(process.execPath)} ${quote(writer)}`
                  : f.command(lane),
              )
            : {
                text:
                  lane === 1
                    ? "Writer tool returned; background process ownership still requires reconciliation."
                    : "Replacement receipt is recorded.",
              },
      },
    );
    const pid = Number(readFileSync(pidFile, "utf8"));
    let alive = true;
    try {
      process.kill(pid, 0);
    } catch (e) {
      if (e.code === "ESRCH") alive = false;
      else throw e;
    }
    assert.ok(id);
    assert.ok(stopped);
    assert.ok(observed.includes("alive"));
    if (replacement) {
      assert.ok(taskStopped(), "a dead command alone does not stop the writer");
      assert.equal(nativeOwnership.alive, false);
      assert.equal(alive, false);
      const receipt = JSON.parse(
        readFileSync(join(f.worktrees[1], "receipt.json"), "utf8"),
      );
      assert.equal(receipt.head, f.head);
    }
    if (nativeOwnership.alive !== false || !taskStopped())
      assert.equal(replacement, undefined);
    console.log(
      JSON.stringify({
        runtime,
        version: f.run(runtime, ["--version"]).trim(),
        scenario: "cancellation and replacement",
        writerAliveAfterStop: alive,
        nativeTaskState,
        processInspectionDenied,
        replacementStarted: Boolean(replacement),
        ownership:
          nativeOwnership.alive === false && taskStopped()
            ? "quiescent"
            : "unresolved",
        externalModelCalls: false,
      }),
    );
  } finally {
    try {
      const pid = Number(readFileSync(pidFile, "utf8"));
      process.kill(pid, "SIGKILL");
    } catch (e) {
      if (!["ENOENT", "ESRCH"].includes(e.code)) throw e;
    } finally {
      f.cleanup();
    }
  }
}

for (const runtime of ["claude", "codex"]) {
  test.skipIf(!enabled)(
    `${runtime}: native capacity, installed source, ten lanes, and recovered history`,
    async () => {
      await capacity(runtime);
      if (runtime === "codex") await capacity(runtime, "pstack-fixture");
    },
    120000,
  );
  test.skipIf(!enabled)(
    `${runtime}: native writer cancellation and ownership-safe replacement`,
    async () => cancellation(runtime),
    120000,
  );
}
