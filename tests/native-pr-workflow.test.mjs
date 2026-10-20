import { expect, test } from "bun:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cliSource, writeVerifier } from "./helpers/pr-workflow.mjs";
import { fixture, nativeRun, digest } from "./helpers/native-delegation.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const enabled = process.env.PSTACK_NATIVE_PR === "1";
const quote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";

for (const runtime of ["claude", "codex"])
  test.skipIf(!enabled)(
    `${runtime}: installed PR helpers across fresh author, verifier and landing sessions`,
    async () => {
      const f = fixture(runtime, repo);
      const stateFile = join(f.root, "pr-state.json"),
        verdict = join(f.root, "verdict.json");
      try {
        const contract = join(
          f.plugin,
          "skills/poteto-mode/references/pr-workflows.md",
        );
        expect(digest(contract)).toBe(
          digest(
            join(
              repo,
              "plugins/pstack/skills/poteto-mode/references/pr-workflows.md",
            ),
          ),
        );
        const toolsDir = join(f.plugin, "skills/poteto-mode/scripts/watch-pr");
        // Warm the installed package's own dependency bootstrap, not checkout imports.
        f.env.BUN_INSTALL_CACHE_DIR =
          process.env.BUN_INSTALL_CACHE_DIR ?? "/tmp/pstack-issue6-bun-cache";
        f.run("bun", [join(toolsDir, "ship-pr"), "--help"]);
        const bin = join(f.root, "bin");
        mkdirSync(bin);
        cpSync(
          join(repo, "tests/fixtures/pr-workflow/gh.mjs"),
          join(bin, "gh"),
        );
        const { chmodSync } = await import("node:fs");
        chmodSync(join(bin, "gh"), 0o755);
        f.env.PATH = bin + ":" + f.env.PATH;
        f.env.PSTACK_PR_STATE = stateFile;
        writeFileSync(join(f.workspace, "sum.mjs"), cliSource(false));
        f.git(f.workspace, "add", "sum.mjs");
        f.git(f.workspace, "commit", "-m", "CLI fixture");
        const base = f.git(f.workspace, "rev-parse", "HEAD").trim();
        for (const path of f.worktrees.slice(0, 2))
          f.git(path, "reset", "--hard", base);
        const remote = join(f.root, "remote.git");
        f.git(f.workspace, "init", "--bare", remote);
        f.git(f.workspace, "remote", "add", "origin", remote);
        f.git(f.workspace, "push", "origin", "main");
        const state = {
          workspace: f.workspace,
          verdict,
          created: false,
          ci: "FAILURE",
          threads: [],
          pr: {
            id: "fixture-pr",
            state: "OPEN",
            headRefOid: base,
            headRefName: "lane-1",
            baseRefName: "main",
            baseRefOid: base,
            baseRef: { target: { oid: base } },
            isDraft: false,
            mergedAt: null,
            mergeable: "MERGEABLE",
            mergeStateStatus: "CLEAN",
            reviewDecision: null,
            autoMergeRequest: null,
            mergeQueueEntry: null,
            mergeCommit: null,
          },
        };
        const save = () => writeFileSync(stateFile, JSON.stringify(state));
        save();
        const shell = (cmd, cwd = f.workspace) => ({
          name: runtime === "claude" ? "Bash" : "exec_command",
          args:
            runtime === "claude"
              ? { command: `cd ${quote(cwd)} && ${cmd}`, timeout: 20000 }
              : { cmd, workdir: cwd, yield_time_ms: 10000 },
        });
        const text = (result) => JSON.stringify(result);
        const watch = `bun ${quote(join(toolsDir, "watch-pr"))} --owner pstack-fixture --repo native-pr --pr 1 --status-only`;
        const authorScript = join(f.root, "author.mjs");
        writeFileSync(
          authorScript,
          `import{writeFileSync}from'node:fs';writeFileSync('sum.mjs',${JSON.stringify(cliSource(true))});`,
        );
        const author = await nativeRun(
          f,
          async function* () {
            assert.ok(
              text(yield shell(`cat ${quote(contract)}`)).includes(
                "Keep the lifecycle boundaries",
              ),
            );
            yield shell(
              `gh pr create --repo pstack-fixture/native-pr --base main --head lane-1 --title 'fix(cli): reject empty input' --body 'Synthetic local fixture only'`,
            );
            assert.ok(text(yield shell(watch)).includes("ci-failing"));
            const built = text(
              yield shell(
                `node ${quote(authorScript)} && git add sum.mjs && git commit -m 'Reject empty input' && git push origin lane-1`,
                f.worktrees[0],
              ),
            );
            assert.equal(
              readFileSync(join(f.worktrees[0], "sum.mjs"), "utf8"),
              cliSource(true),
              built,
            );
            assert.notEqual(
              f.git(f.worktrees[0], "rev-parse", "HEAD").trim(),
              base,
              built,
            );
            state.pr.headRefOid = f
              .git(f.worktrees[0], "rev-parse", "HEAD")
              .trim();
            state.ci = "SUCCESS";
            save();
            assert.ok(text(yield shell(watch)).includes("ci-clean"));
          },
          {
            codexSandbox: "danger-full-access",
            parentPrompt:
              "PSTACK_PARENT\nAct as the author of the local PR workflow fixture. Read the installed contract; open, repair and check your assigned PR. No landing authority in this phase.",
          },
        );
        const head = state.pr.headRefOid;
        f.git(f.worktrees[1], "reset", "--hard", head);
        const verifyScript = join(f.root, "verify.mjs");
        writeVerifier(verifyScript, {
          baseCheckout: f.workspace,
          base,
          verdict,
        });
        const reviewer = await nativeRun(
          { ...f, workspace: f.worktrees[1] },
          async function* () {
            const evidence = text(
              yield shell(`node ${quote(verifyScript)}`, f.worktrees[1]),
            );
            assert.ok(evidence.includes(head), evidence);
            assert.ok(evidence.includes("PASS"));
            yield shell(
              `gh pr comment 1 --repo pstack-fixture/native-pr --body-file ${quote(verdict)}`,
              f.worktrees[1],
            );
          },
          {
            parentPrompt:
              "PSTACK_PARENT\nAct as a fresh independent verifier of this local fixture. You did not write the code. Run the actual CLI at base and head; write only the proof artifact. No merge authority.",
          },
        );
        state.comments = JSON.parse(readFileSync(stateFile)).comments;
        expect(state.comments).toHaveLength(1);
        expect(JSON.parse(state.comments[0].body)).toEqual(
          JSON.parse(readFileSync(verdict)),
        );
        const inspected = join(f.root, "landing.json");
        const inspect = `bun ${quote(join(toolsDir, "ship-pr"))} inspect --repo pstack-fixture/native-pr --pr 1 > ${quote(inspected)}`;
        const cancel = `bun ${quote(join(toolsDir, "ship-pr"))} cancel-pending --record ${quote(inspected)}`;
        const checkpoint = await nativeRun(
          f,
          async function* () {
            yield shell(inspect);
            state.pr.baseRef.target.oid = "changed-base";
            save();
            assert.ok(text(yield shell(cancel)).includes("changed"));
            state.pr.baseRef.target.oid = base;
            state.pr.autoMergeRequest = { enabledAt: "fixture" };
            state.pr.mergeQueueEntry = { id: "fixture-queue" };
            save();
            yield shell(inspect);
            assert.ok(text(yield shell(cancel)).includes("cancelled"));
            const cancelled = JSON.parse(readFileSync(stateFile));
            state.pr = cancelled.pr;
            expect(state.pr.autoMergeRequest).toBeNull();
            expect(state.pr.mergeQueueEntry).toBeNull();
            // The controller stops issuing writes here. This is checkpoint
            // integration, not proof that a model obeys an operator stop.
            expect(JSON.parse(readFileSync(stateFile)).pr.state).toBe("OPEN");
          },
          {
            codexSandbox: "danger-full-access",
            parentPrompt:
              "PSTACK_PARENT\nResume the local fixture as landing coordinator after its independent verdict. Reconcile revision and pending requests; honor operator stop. Only the declared fixture main branch is authorized.",
          },
        );
        const calls = readFileSync(stateFile + ".calls", "utf8")
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line));
        expect(
          calls.some((args) => args[0] === "pr" && args[1] === "merge"),
        ).toBe(false);
        expect(JSON.parse(readFileSync(verdict))).toMatchObject({
          verdict: "PASS",
          head,
          base,
          headBranch: "lane-1",
          baseBranch: "main",
          checkoutBranch: "lane-2",
        });
        const landing = await nativeRun(
          f,
          async function* () {
            yield shell(inspect);
            assert.ok(text(yield shell(cancel)).includes("cancelled"));
            const stale = `gh pr merge 1 --repo pstack-fixture/native-pr --squash --match-head-commit ${base}`;
            assert.ok(text(yield shell(stale)).includes("head changed"));
            expect(JSON.parse(readFileSync(stateFile)).pr.state).toBe("OPEN");
            const merge = `gh pr merge 1 --repo pstack-fixture/native-pr --squash --match-head-commit ${head}`;
            assert.ok(text(yield shell(merge)).includes("merged"));
            yield shell(
              `git fetch origin main && git merge-base --is-ancestor ${JSON.parse(readFileSync(stateFile)).pr.mergeCommit.oid} origin/main`,
            );
          },
          {
            codexSandbox: "danger-full-access",
            parentPrompt:
              "PSTACK_PARENT\nResume from the retained checkpoint. The controller has checked the independent receipt and current gates. It now grants this fixture's main landing only. Reinspect before the guarded merge and confirm destination history.",
          },
        );
        const final = JSON.parse(readFileSync(stateFile));
        expect(final.pr.state).toBe("MERGED");
        expect(f.git(f.workspace, "show", "origin/main:sum.mjs")).toBe(
          cliSource(true),
        );
        expect(f.git(f.workspace, "status", "--porcelain")).toBe("");
        const ids = [author, reviewer, checkpoint, landing].map((result) =>
          result.stdout
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line))
            .map((event) => event.thread_id ?? event.session_id)
            .find(Boolean),
        );
        expect(ids.every(Boolean)).toBe(true);
        expect(new Set(ids).size).toBe(4);
        console.log(
          JSON.stringify({
            runtime,
            phases: 4,
            independentNativeSessions: ids,
            localGitDestination: final.pr.mergeCommit.oid,
            externalModelCalls: false,
            liveGitHub: false,
            note: "Scripted provider and GitHub transport; real native helpers, CLI processes and Git commits.",
          }),
        );
      } finally {
        f.cleanup();
      }
    },
    120000,
  );
