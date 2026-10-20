import { expect, test } from "bun:test";
import { spawnSync, execFileSync } from "node:child_process";
import {
  mkdirSync,
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { modelRun } from "./helpers/model-pr.mjs";
import {
  cliSource,
  testsSource,
  writeVerifier,
} from "./helpers/pr-workflow.mjs";

test("the live fixture CI genuinely fails on the bug and passes after its repair", () => {
  const root = mkdtempSync(join(tmpdir(), "pstack-pr-ci-"));
  const run = () =>
    spawnSync("node", ["--test", "sum.test.mjs"], {
      cwd: root,
      encoding: "utf8",
    });
  try {
    writeFileSync(join(root, "sum.mjs"), cliSource(false));
    writeFileSync(join(root, "sum.test.mjs"), testsSource(false));
    let result = run();
    expect(result.status, result.stderr + result.stdout).toBe(0);
    writeFileSync(join(root, "sum.test.mjs"), testsSource(true));
    result = run();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("blank input");
    writeFileSync(join(root, "sum.mjs"), cliSource(true));
    result = run();
    expect(result.status, result.stderr + result.stdout).toBe(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("independent proof records actual baseline/head outputs and Git identity", () => {
  const root = mkdtempSync(join(tmpdir(), "pstack-pr-proof-"));
  try {
    const before = join(root, "before"),
      after = join(root, "after");
    mkdirSync(before);
    writeFileSync(join(before, "sum.mjs"), cliSource(false));
    const git = (...args) =>
      execFileSync(
        "git",
        ["-c", "core.hooksPath=/dev/null", "-C", before, ...args],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    git("init", "-b", "main");
    git("config", "user.name", "Fixture");
    git("config", "user.email", "fixture@example.invalid");
    git("config", "commit.gpgsign", "false");
    git("add", ".");
    git("commit", "-m", "Baseline CLI");
    const base = git("rev-parse", "HEAD").trim();
    git("worktree", "add", "-b", "fix-cli", after);
    writeFileSync(join(after, "sum.mjs"), cliSource(true));
    execFileSync("git", ["-C", after, "add", "."]);
    execFileSync(
      "git",
      [
        "-c",
        "core.hooksPath=/dev/null",
        "-C",
        after,
        "commit",
        "-m",
        "Fixed CLI",
      ],
      { stdio: "pipe" },
    );
    const head = git("rev-parse", "fix-cli").trim();
    const script = join(root, "verify.mjs"),
      verdict = join(root, "verdict.json");
    writeVerifier(script, {
      baseCheckout: before,
      base,
      verdict,
      headBranch: "fix-cli",
    });
    const result = spawnSync("node", [script], {
      cwd: after,
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    const receipt = JSON.parse(readFileSync(verdict));
    expect(receipt).toMatchObject({
      verdict: "PASS",
      base,
      head,
      headBranch: "fix-cli",
      baseBranch: "main",
      checkoutBranch: "fix-cli",
      before: { status: 0, stdout: "0\n" },
      after: { status: 2, stderr: "invalid input\n" },
      valid: { status: 0, stdout: "3\n" },
    });
    expect(receipt.patchId).toMatch(/^[a-f0-9]{40,64}$/);
    // A stale baseline cannot be laundered into a current PASS receipt.
    writeVerifier(script, { baseCheckout: before, base: head, verdict });
    const stale = spawnSync("node", [script], { cwd: after, encoding: "utf8" });
    expect(stale.status).not.toBe(0);
    expect(stale.stderr).toContain("baseline checkout changed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("native model evidence includes output flushed after the CLI parent exits", async () => {
  const root = mkdtempSync(join(tmpdir(), "pstack-model-output-"));
  try {
    const bin = join(root, "bin");
    mkdirSync(bin);
    const executable = join(bin, "codex");
    const trailing = `setTimeout(() => { require('node:fs').writeSync(1, JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'after-parent-exit'}})+'\\n'); }, 40);`;
    writeFileSync(
      executable,
      `#!/usr/bin/env node
const {spawn}=require('node:child_process');require('node:fs').writeSync(1,JSON.stringify({type:'thread.started',thread_id:'fixture-thread'})+'\\n');const child=spawn(process.execPath,['-e',${JSON.stringify(trailing)}],{stdio:['ignore',process.stdout,'ignore']});child.unref();process.exit(0);
`,
    );
    chmodSync(executable, 0o755);
    const config = join(root, "gitconfig");
    writeFileSync(config, "");
    const result = await modelRun(
      { runtime: "codex", workspace: root, env: { GIT_CONFIG_GLOBAL: config } },
      {
        name: "flush",
        prompt: "Local stub only. No model call.",
        evidence: root,
        extraEnv: { PATH: bin + ":" + process.env.PATH },
        timeoutMs: 5000,
      },
    );
    expect(result.id).toBe("fixture-thread");
    expect(result.events.at(-1).item.text).toBe("after-parent-exit");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 10000);
