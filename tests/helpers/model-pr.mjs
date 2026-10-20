import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

// Existing native account only; the isolated plugin directory is explicit.
export async function modelRun(
  f,
  {
    name,
    prompt,
    evidence,
    sandbox = "workspace-write",
    extraEnv = {},
    allowedTools = "Read,Bash,Glob,Grep",
    maxTurns = 12,
    timeoutMs = 180000,
  },
) {
  const runtime = f.runtime;
  writeFileSync(join(evidence, name + ".prompt"), prompt, { mode: 0o600 });
  const args =
    runtime === "claude"
      ? [
          "-p",
          "--permission-mode",
          "dontAsk",
          "--strict-mcp-config",
          "--plugin-dir",
          f.plugin,
          "--output-format",
          "stream-json",
          "--verbose",
          "--max-turns",
          String(maxTurns),
          "--allowedTools",
          allowedTools,
          "--",
          prompt,
        ]
      : ["exec", "--json", "-s", sandbox, "-C", f.workspace, "--", prompt];
  const env = {
    ...process.env,
    ...extraEnv,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: f.env.GIT_CONFIG_GLOBAL,
    BUN_INSTALL_CACHE_DIR: f.env.BUN_INSTALL_CACHE_DIR,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  };
  const child = spawn(runtime, args, {
    cwd: f.workspace,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "",
    stderr = "",
    timedOut = false;
  child.stdout.on("data", (data) => {
    stdout += data;
    writeFileSync(join(evidence, name + ".jsonl"), stdout, {
      mode: 0o600,
    });
  });
  child.stderr.on("data", (data) => {
    stderr += data;
    writeFileSync(join(evidence, name + ".stderr"), stderr, {
      mode: 0o600,
    });
  });
  let force;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
    force = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    }, 3000);
  }, timeoutMs);
  const exit = await new Promise((resolve, reject) => {
    child.on("close", (code, signal) => resolve({ code, signal }));
    child.on("error", reject);
  }).finally(() => {
    clearTimeout(timer);
    clearTimeout(force);
  });
  assert.equal(timedOut, false, `model gate timed out; evidence ${evidence}`);
  assert.equal(exit.code, 0, stderr + stdout.slice(-1500));
  const events = stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const id = events
    .map((event) => event.thread_id ?? event.session_id)
    .find(Boolean);
  assert.ok(id);
  return { id, exit, timedOut, events };
}
