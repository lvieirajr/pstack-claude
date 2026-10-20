import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

export const digest = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const quote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";
export function fixture(runtime, repo, { codexModel = "gpt-6.1-sol" } = {}) {
  const root = realpathSync(
      mkdtempSync(join(tmpdir(), `pstack-delegation-${runtime}-`)),
    ),
    home = join(root, "isolated home"),
    source = join(root, "source"),
    workspace = join(root, "project");
  for (const p of [home, source, workspace]) mkdirSync(p);
  for (const file of execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: repo, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean)) {
    if (!existsSync(join(repo, file))) continue;
    mkdirSync(dirname(join(source, file)), { recursive: true });
    cpSync(join(repo, file), join(source, file), { dereference: false });
  }
  const git = (cwd, ...args) =>
    execFileSync(
      "git",
      ["-c", "core.hooksPath=/dev/null", "-C", cwd, ...args],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  for (const p of [source, workspace]) {
    git(p, "init", "-b", "main");
    git(p, "config", "commit.gpgsign", "false");
    git(p, "config", "user.name", "Fixture");
    git(p, "config", "user.email", "fixture@example.invalid");
  }
  git(source, "add", ".");
  git(source, "commit", "-m", "Native delegation fixture");
  const url = "https://github.com/pstack-fixture/native-delegation.git";
  const env = {
    PATH: process.env.PATH,
    TMPDIR: process.env.TMPDIR,
    LANG: "en_US.UTF-8",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: join(home, ".gitconfig"),
    HOME: home,
    CLAUDE_CONFIG_DIR: join(home, "claude config"),
    CODEX_HOME: join(home, "codex config"),
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: `url.file://${source}/.insteadOf`,
    GIT_CONFIG_VALUE_0: url,
    CLAUDE_CODE_FORK_SUBAGENT: "0",
    CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "2",
    CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: "1",
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  };
  for (const p of [env.CLAUDE_CONFIG_DIR, env.CODEX_HOME]) mkdirSync(p);
  writeFileSync(env.GIT_CONFIG_GLOBAL, "");
  const run = (exe, args) =>
    execFileSync(exe, args, {
      cwd: root,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000,
    });
  run(runtime, ["plugin", "marketplace", "add", url]);
  const installed = run(runtime, [
    "plugin",
    runtime === "claude" ? "install" : "add",
    "pstack@pstack-claude",
    ...(runtime === "codex" ? ["--json"] : []),
  ]);
  const plugin =
    runtime === "codex"
      ? JSON.parse(installed).installedPath
      : JSON.parse(run(runtime, ["plugin", "list", "--json"]))[0].installPath;
  const entry = join(plugin, "skills/poteto-mode/SKILL.md"),
    contract = join(plugin, "skills/poteto-mode/references/delegation.md");
  assert.equal(
    digest(entry),
    digest(join(repo, "plugins/pstack/skills/poteto-mode/SKILL.md")),
  );
  assert.equal(
    digest(contract),
    digest(
      join(repo, "plugins/pstack/skills/poteto-mode/references/delegation.md"),
    ),
  );
  writeFileSync(join(workspace, "input.txt"), "A checked fixture input.\n");
  git(workspace, "add", ".");
  git(workspace, "commit", "-m", "Fixture input");
  const head = git(workspace, "rev-parse", "HEAD").trim();
  const worktrees = Array.from({ length: 10 }, (_, i) => {
    const p = join(root, `lane-${i + 1}`);
    git(workspace, "worktree", "add", "-b", `lane-${i + 1}`, p, head);
    return p;
  });
  const action = join(root, "receipt.mjs");
  writeFileSync(
    action,
    `import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';const [entry,contract,out,lane,workflow]=process.argv.slice(2);const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');const result={lane,cwd:process.cwd(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),entry,entryHash:hash(entry),contractHash:hash(contract),workflow,workflowHash:hash(workflow),input:readFileSync('input.txt','utf8')};writeFileSync(out,JSON.stringify(result),{mode:0o600});console.log(JSON.stringify(result));`,
  );
  const skillFor = (lane) =>
    lane <= 4 ? "swarm" : lane <= 7 ? "arena" : "interrogate";
  const command = (lane) =>
    `${quote(process.execPath)} ${quote(action)} ${quote(entry)} ${quote(contract)} ${quote(join(worktrees[lane - 1], "receipt.json"))} ${lane} ${quote(join(plugin, "skills", skillFor(lane), "SKILL.md"))}`;
  const waitFile = join(root, "wait-file.mjs");
  writeFileSync(
    waitFile,
    `import{existsSync,readFileSync}from'node:fs';const until=Date.now()+15000;while(!existsSync(process.argv[2])){if(Date.now()>until)throw Error('missing worker output');await new Promise(r=>setTimeout(r,20));}console.log(readFileSync(process.argv[2],'utf8'));`,
  );
  const waitCommand = (lane) =>
    `${quote(process.execPath)} ${quote(waitFile)} ${quote(join(worktrees[lane - 1], "receipt.json"))}`;
  return {
    runtime,
    codexModel,
    root,
    home,
    source,
    workspace,
    plugin,
    entry,
    contract,
    head,
    worktrees,
    env,
    run,
    git,
    skillFor,
    command,
    waitCommand,
    cleanup() {
      run(runtime, [
        "plugin",
        runtime === "claude" ? "uninstall" : "remove",
        "pstack@pstack-claude",
      ]);
      run(runtime, ["plugin", "marketplace", "remove", "pstack-claude"]);
      rmSync(root, { recursive: true, force: true });
    },
  };
}

export async function nativeRun(
  f,
  control,
  { childAction, codexSandbox = "workspace-write" } = {},
) {
  let index = 0,
    parentCall,
    errors = [],
    requests = 0;
  const childSteps = new Map(),
    childModels = new Map(),
    tools = new Map();
  let release;
  const held = new Promise((r) => (release = r));
  const driver = control({
    release: () => release(),
    tools,
    childSteps,
    childModels,
  });
  const server = createServer(async (req, res) => {
    try {
      let raw = "";
      for await (const b of req) raw += b;
      let input = {};
      try {
        input = JSON.parse(raw);
      } catch {}
      if (req.url.includes("count_tokens")) {
        res.setHeader("content-type", "application/json");
        res.end('{"input_tokens":100}');
        return;
      }
      if (
        !req.url.includes(f.runtime === "claude" ? "/messages" : "/responses")
      ) {
        res.setHeader("content-type", "application/json");
        res.end("{}");
        return;
      }
      requests++;
      const messages = f.runtime === "claude" ? input.messages : input.input;
      const available = new Map();
      for (const tool of [
        ...(input.tools ?? []),
        ...(input.input ?? [])
          .filter((item) => item.type === "additional_tools")
          .flatMap((item) => item.tools ?? []),
      ]) {
        if (tool.type === "namespace")
          for (const fn of tool.tools ?? [])
            available.set(fn.name, { ...fn, namespace: tool.name });
        else if (tool.name) available.set(tool.name, tool);
      }
      const marker = messages
        ?.flatMap((item) =>
          item.type === "agent_message"
            ? [JSON.stringify(item)]
            : item.role === "user"
              ? typeof item.content === "string"
                ? [item.content]
                : (item.content?.map((block) => block.text ?? "") ?? [])
              : [],
        )
        .map((text) => text.match(/PSTACK_CHILD (\d+)/))
        .find(Boolean);
      let action;
      if (marker) {
        const lane = Number(marker[1]),
          step = childSteps.get(lane) ?? 0;
        childSteps.set(lane, step + 1);
        childModels.set(lane, input.model);
        if (childAction) action = await childAction({ lane, step, input });
        else if (step === 0) {
          await held;
          action = {
            name: f.runtime === "claude" ? "Bash" : "exec_command",
            args:
              f.runtime === "claude"
                ? {
                    command: `cd ${quote(f.worktrees[lane - 1])} && ${f.command(lane)}`,
                    timeout: 10000,
                  }
                : {
                    cmd: f.command(lane),
                    workdir: f.worktrees[lane - 1],
                    yield_time_ms: 1000,
                  },
          };
        } else
          action = {
            text: `PASS lane ${lane}; receipt.json contains the observed source and input identities.`,
          };
      } else {
        for (const [name, tool] of available) tools.set(name, tool);
        let result;
        if (parentCall) {
          if (f.runtime === "claude") {
            const b = messages
              ?.flatMap((m) => (Array.isArray(m.content) ? m.content : []))
              .find(
                (b) => b.type === "tool_result" && b.tool_use_id === parentCall,
              );
            result = b;
          } else
            result = messages?.find(
              (b) =>
                ["function_call_output", "custom_tool_call_output"].includes(
                  b.type,
                ) && b.call_id === parentCall,
            );
          if (!result) {
            writeFileSync(
              join(f.root, "failed-request.json"),
              JSON.stringify(input, null, 2),
            );
            throw Error("parent request has no matching native tool result");
          }
        }
        const next = await driver.next(result);
        action = next.done
          ? { text: "Fixture protocol complete." }
          : next.value;
        if (action.name) {
          assert.ok(
            tools.has(action.name) ||
              (action.name === "exec_command" && tools.has("exec")),
            `Native ${f.runtime} tool unavailable: ${action.name}`,
          );
          parentCall = `call_${++index}`;
        }
      }
      if (
        f.runtime === "codex" &&
        action.name === "exec_command" &&
        available.has("exec")
      ) {
        action = {
          name: "exec",
          code: `text((await tools.exec_command(${JSON.stringify(action.args)})).output);`,
        };
      }
      let item;
      if (f.runtime === "claude") {
        const block = action.name
          ? {
              type: "tool_use",
              id: marker
                ? `child_${marker[1]}_${childSteps.get(Number(marker[1]))}`
                : parentCall,
              name: action.name,
              input: action.args,
            }
          : { type: "text", text: action.text };
        const stop = action.name ? "tool_use" : "end_turn";
        res.setHeader("content-type", "text/event-stream");
        const emit = (type, data) =>
          res.write(
            `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`,
          );
        emit("message_start", {
          message: {
            id: `msg_${requests}`,
            type: "message",
            role: "assistant",
            model: input.model,
            content: [],
            stop_reason: null,
            usage: { input_tokens: 100, output_tokens: 0 },
          },
        });
        emit("content_block_start", {
          index: 0,
          content_block: action.name
            ? { ...block, input: {} }
            : { type: "text", text: "" },
        });
        emit("content_block_delta", {
          index: 0,
          delta: action.name
            ? {
                type: "input_json_delta",
                partial_json: JSON.stringify(action.args),
              }
            : { type: "text_delta", text: action.text },
        });
        emit("content_block_stop", { index: 0 });
        emit("message_delta", {
          delta: { stop_reason: stop, stop_sequence: null },
          usage: { output_tokens: 20 },
        });
        emit("message_stop", {});
      } else {
        item = action.code
          ? {
              type: "custom_tool_call",
              id: `fc_${requests}`,
              call_id: marker ? `child_${marker[1]}` : parentCall,
              name: "exec",
              namespace: "functions",
              input: action.code,
            }
          : action.name
            ? {
                type: "function_call",
                id: `fc_${requests}`,
                call_id: marker ? `child_${marker[1]}` : parentCall,
                name: action.name,
                ...(available.get(action.name)?.namespace
                  ? { namespace: available.get(action.name).namespace }
                  : {}),
                arguments: JSON.stringify(action.args),
              }
            : {
                type: "message",
                role: "assistant",
                id: `msg_${requests}`,
                content: [
                  { type: "output_text", text: action.text, annotations: [] },
                ],
              };
        res.setHeader("content-type", "text/event-stream");
        const emit = (type, data) =>
          res.write(
            `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`,
          );
        emit("response.created", {
          response: {
            id: `resp_${requests}`,
            status: "in_progress",
            output: [],
          },
        });
        emit("response.output_item.done", { output_index: 0, item });
        emit("response.completed", {
          response: {
            id: `resp_${requests}`,
            object: "response",
            status: "completed",
            output: [item],
            usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
          },
        });
      }
      res.end();
    } catch (error) {
      errors.push(error);
      console.error(error.message);
      child.kill("SIGTERM");
      res.writeHead(500);
      res.end(JSON.stringify({ error: { message: error.message } }));
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ...f.env };
  let args;
  if (f.runtime === "claude") {
    Object.assign(env, {
      ANTHROPIC_BASE_URL: base,
      ANTHROPIC_API_KEY: "local-fixture-only",
    });
    args = [
      "-p",
      "--permission-mode",
      "dontAsk",
      "--model",
      "sonnet",
      "--setting-sources",
      "",
      "--strict-mcp-config",
      "--plugin-dir",
      f.plugin,
      "--output-format",
      "stream-json",
      "--verbose",
      "--max-turns",
      "60",
      "--allowedTools",
      "Read,Bash,Agent,SendMessage,TaskStop",
      "--",
      "PSTACK_PARENT\nExercise the installed pstack delegation fixture with all ten required lanes, using native agents and separate worktrees. Explicit fixture model choices for this protocol are sonnet/haiku on Claude and gpt-6.1-sol/gpt-6-luna on Codex.",
    ];
  } else {
    writeFileSync(
      join(env.CODEX_HOME, "config.toml"),
      `model_provider = "fixture"\nmodel = ${JSON.stringify(f.codexModel)}\napproval_policy = "never"\n[model_providers.fixture]\nname = "Local fixture"\nbase_url = "${base}/v1"\nwire_api = "responses"\nrequires_openai_auth = false\n[agents]\nenabled = true\nmax_concurrent_threads_per_session = 2\n`,
    );
    args = [
      "exec",
      "--skip-git-repo-check",
      "--json",
      "-s",
      codexSandbox,
      ...f.worktrees.flatMap((p) => ["--add-dir", p]),
      "--",
      "PSTACK_PARENT\nExercise the installed pstack delegation fixture with all ten required lanes, using native agents and separate worktrees. Explicit fixture model choices are gpt-6.1-sol and gpt-6-luna.",
    ];
  }
  const child = spawn(f.runtime, args, {
    cwd: f.workspace,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "",
    stderr = "";
  child.stdout.on("data", (b) => (stdout += b));
  child.stderr.on("data", (b) => (stderr += b));
  const timer = setTimeout(() => child.kill("SIGKILL"), 90000);
  try {
    const code = await new Promise((r, j) => {
      child.on("exit", r);
      child.on("error", j);
    });
    if (errors.length) throw errors[0];
    assert.equal(code, 0, stderr + "\n" + stdout.slice(-2000));
    return {
      stdout,
      stderr,
      requests,
      tools,
      childSteps,
      childModels,
    };
  } finally {
    release();
    clearTimeout(timer);
    child.kill();
    server.closeAllConnections();
    server.close();
  }
}
