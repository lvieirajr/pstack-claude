// Paid native-model choices; local forge and real local Git/CLI, no live GitHub.
import { expect, test } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { fixture, digest } from "./helpers/native-delegation.mjs";
import {
  cliSource,
  testsSource,
  writeVerifier,
} from "./helpers/pr-workflow.mjs";
import { modelRun } from "./helpers/model-pr.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const enabled = process.env.PSTACK_MODEL_PR_WORKFLOW === "1";
const save = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
for (const runtime of ["claude", "codex"])
  test.skipIf(!enabled)(
    `${runtime}: real models author, independently verify and land the current local fixture`,
    async () => {
      const f = fixture(runtime, repo);
      const evidence = mkdtempSync(
        join(tmpdir(), `pstack-model-pr-workflow-${runtime}-`),
      );
      const stateFile = join(f.root, "state.json");
      try {
        f.env.BUN_INSTALL_CACHE_DIR =
          process.env.BUN_INSTALL_CACHE_DIR ?? "/tmp/pstack-issue6-bun-cache";
        const scripts = join(f.plugin, "skills/poteto-mode/scripts/watch-pr");
        f.run("bun", [join(scripts, "ship-pr"), "--help"]);
        const contract = join(
          f.plugin,
          "skills/poteto-mode/references/pr-workflows.md",
        );
        const source = {
          installation: f.plugin,
          fixtureSource: f.git(f.source, "rev-parse", "HEAD").trim(),
          contractSha256: digest(contract),
        };
        assert.equal(
          source.contractSha256,
          digest(
            join(
              repo,
              "plugins/pstack/skills/poteto-mode/references/pr-workflows.md",
            ),
          ),
        );
        save(join(evidence, "installed-source.json"), source);
        const bin = join(f.root, "bin");
        mkdirSync(bin);
        cpSync(
          join(repo, "tests/fixtures/pr-workflow/gh.mjs"),
          join(bin, "gh"),
        );
        chmodSync(join(bin, "gh"), 0o755);
        const extraEnv = {
          PATH: bin + ":" + process.env.PATH,
          PSTACK_PR_STATE: stateFile,
          GH_REPO: "pstack-fixture/native-pr",
        };
        writeFileSync(join(f.workspace, "sum.mjs"), cliSource(false));
        writeFileSync(join(f.workspace, "sum.test.mjs"), testsSource(false));
        f.git(f.workspace, "add", ".");
        f.git(f.workspace, "commit", "-m", "Baseline CLI");
        const base = f.git(f.workspace, "rev-parse", "HEAD").trim();
        const remote = join(f.root, "remote.git");
        f.git(f.workspace, "init", "--bare", remote);
        f.git(f.workspace, "remote", "add", "origin", remote);
        f.git(f.workspace, "push", "origin", "main");
        f.git(f.worktrees[0], "reset", "--hard", base);
        writeFileSync(join(f.worktrees[0], "sum.test.mjs"), testsSource(true));
        f.git(f.worktrees[0], "add", "sum.test.mjs");
        f.git(
          f.worktrees[0],
          "commit",
          "-m",
          "Regression: blank input must fail",
        );
        f.git(f.worktrees[0], "push", "origin", "lane-1");
        const redHead = f.git(f.worktrees[0], "rev-parse", "HEAD").trim();
        const ci = () => {
          const result = spawnSync("node", ["--test", "sum.test.mjs"], {
            cwd: f.worktrees[0],
            encoding: "utf8",
          });
          return {
            status: result.status,
            stdout: result.stdout,
            stderr: result.stderr,
          };
        };
        const red = ci();
        assert.equal(red.status, 1);
        save(join(evidence, "ci-red.json"), red);
        save(stateFile, {
          workspace: f.workspace,
          remote,
          created: false,
          ci: "FAILURE",
          threads: [],
          pr: {
            id: "fixture-pr",
            state: "OPEN",
            headRefOid: redHead,
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
        });
        const shared = `This is an explicitly local pstack fixture, not a live GitHub repo. Scope is only ${f.root} and evidence ${evidence}. Existing native login is for model access only. The gh on PATH is a controlled local transport for pstack-fixture/native-pr #1; the only origin is ${remote}. Never invoke another gh executable, credential/login/browser flow, external service, delegate, or touch other files. Read the native installed contract ${contract} (SHA256 ${source.contractSha256}) and the relevant linked playbook. Installed watch-pr and ship-pr are in ${scripts}. Use their absolute paths. Synthetic fixture rules: no required external approvals, queue, auto-merge or model-diversity requirement. This is a single representative CLI task, not a complete ten-lane autopilot. Use only fixture/evidence paths for temporary files; never fixed /tmp names. Do not create scratch probes inside .git. Actual assigned Git operations establish write access; a denied write remains blocked. Do not alter Git configuration, tests, contracts, hooks, authentication or branch rules. Report only in chat unless the role expressly permits a receipt. Stop after this role.\n\n`;
        const phases = [];
        async function phase(name, cwd, prompt, { writes = false } = {}) {
          console.log(JSON.stringify({ runtime, stage: name, evidence }));
          const result = await modelRun(
            { ...f, workspace: cwd },
            {
              name,
              prompt: shared + prompt,
              evidence,
              extraEnv,
              maxTurns: 30,
              timeoutMs: 300000,
              // These exact disposable writers need the shared .git directory.
              sandbox: writes ? "danger-full-access" : "workspace-write",
              allowedTools: writes
                ? "Read,Bash,Glob,Grep,Edit,Write"
                : "Read,Bash,Glob,Grep",
            },
          );
          phases.push({ name, id: result.id, exit: result.exit });
          save(join(evidence, "phases.json"), phases);
          return result;
        }
        await phase(
          "author",
          f.worktrees[0],
          `Act only as author. lane-1 has a committed failing blank-input regression. Open the ready PR against main using gh pr create --repo pstack-fixture/native-pr --base main --head lane-1 (provide its fixture title/body). Read the actual failing local Node test, repair only sum.mjs so whitespace input exits 2 with stderr 'invalid input' and valid '1, 2' still prints 3. Run node --test sum.test.mjs, commit only sum.mjs and push lane-1 to the local origin. You may do those writes, but may not merge, comment, queue, or arm auto-merge. Stop at author-ready; independent verification belongs to another session.`,
          { writes: true },
        );
        const afterAuthor = read(stateFile);
        assert.equal(afterAuthor.created, true);
        assert.equal(afterAuthor.pr.state, "OPEN");
        assert.equal(afterAuthor.comments?.length ?? 0, 0);
        const head = f.git(f.worktrees[0], "rev-parse", "HEAD").trim();
        assert.notEqual(head, redHead);
        assert.equal(
          f.git(f.workspace, "rev-parse", "refs/remotes/origin/lane-1").trim(),
          head,
        );
        assert.equal(f.git(f.worktrees[0], "status", "--porcelain"), "");
        assert.equal(
          f.git(f.worktrees[0], "diff", "--name-only", redHead, head).trim(),
          "sum.mjs",
        );
        const green = ci();
        assert.equal(green.status, 0, green.stderr + green.stdout);
        save(join(evidence, "ci-green.json"), green);
        const fixedSource = readFileSync(
          join(f.worktrees[0], "sum.mjs"),
          "utf8",
        );
        writeFileSync(
          join(evidence, "author.patch"),
          f.git(f.worktrees[0], "diff", base, head),
        );
        afterAuthor.ci = "SUCCESS";
        afterAuthor.pr.headRefOid = head;
        save(stateFile, afterAuthor);
        f.git(f.worktrees[1], "reset", "--hard", head);
        const verifier = join(f.root, "verify.mjs"),
          verdict = join(evidence, "verdict.json");
        writeVerifier(verifier, { baseCheckout: f.workspace, base, verdict });
        await phase(
          "independent-verifier",
          f.worktrees[1],
          `You are a fresh verifier and did not write this patch. Read the CLI and diff from ${base} to ${head}; run node ${verifier}, which drives actual base/head CLI behavior and records observations at ${verdict}. Inspect that receipt and post that exact receipt as the one fixture PR comment with gh pr comment 1 --repo pstack-fixture/native-pr --body-file ${verdict}. Only that proof artifact and comment are authorized writes; no source change, commit, push or merge. State any failure instead of inventing PASS.`,
        );
        const proof = read(verdict);
        assert.equal(proof.verdict, "PASS");
        assert.equal(proof.head, head);
        assert.equal(proof.base, base);
        assert.equal(proof.headBranch, "lane-1");
        assert.equal(proof.baseBranch, "main");
        assert.equal(proof.checkoutBranch, "lane-2");
        assert.match(proof.patchId, /^[a-f0-9]{40,64}$/);
        const verified = read(stateFile);
        assert.equal(verified.pr.state, "OPEN");
        assert.equal(verified.comments.length, 1);
        assert.deepEqual(JSON.parse(verified.comments[0].body), proof);
        assert.equal(f.git(f.worktrees[1], "status", "--porcelain"), "");
        assert.equal(f.git(f.worktrees[1], "rev-parse", "HEAD").trim(), head);
        const calls = () =>
          readFileSync(stateFile + ".calls", "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
        assert.equal(
          calls().filter((args) => args[0] === "pr" && args[1] === "merge")
            .length,
          0,
        );
        save(join(evidence, "grant.json"), {
          head,
          base,
          baseBranch: "main",
          proof,
          authority:
            "This local fixture main only, after independent proof and current gates. A new test grant explicitly releases any earlier hold; no real GitHub write is authorized.",
        });
        await phase(
          "authorized-landing",
          f.workspace,
          `Act as landing coordinator. A new explicit test grant authorizes the immediate squash merge of only fixture PR #1, verified head ${head}, base main ${base}, into local origin/main. Independent verifier evidence is ${verdict}, produced by native session ${phases[1].id}; it has also been posted to the local PR. Actual Node CI is green at this head. Check current service gates with the installed watcher, read and cancel pending requests with installed ship-pr, and compare the exact revision with the proof before landing. Keep head-guarded immediate merge and readback/destination confirmation from Shipping; never --admin, --auto, retarget, or change rules. Fetch local main and prove the actual merge commit is in origin/main with the expected CLI behavior. This grant covers only this fixture; stop if any proof or gate is missing.`,
          { writes: true },
        );
        const landed = read(stateFile);
        assert.equal(landed.pr.state, "MERGED");
        assert.equal(landed.pr.headRefOid, head);
        assert.equal(landed.pr.baseRefName, "main");
        const merges = calls().filter(
          (args) => args[0] === "pr" && args[1] === "merge",
        );
        assert.equal(merges.length, 1);
        assert.ok(merges[0].includes("--match-head-commit"));
        assert.equal(
          merges[0][merges[0].indexOf("--match-head-commit") + 1],
          head,
        );
        assert.ok(
          !merges[0].includes("--auto") && !merges[0].includes("--admin"),
        );
        assert.ok(
          calls().some((args) =>
            args.some((arg) => arg.includes("query Landing")),
          ),
        );
        f.git(f.workspace, "fetch", "origin", "main");
        f.git(
          f.workspace,
          "merge-base",
          "--is-ancestor",
          landed.pr.mergeCommit.oid,
          "origin/main",
        );
        expect(f.git(f.workspace, "show", "origin/main:sum.mjs")).toBe(
          fixedSource,
        );
        f.git(f.workspace, "diff", "--exit-code", head, "origin/main");
        assert.equal(f.git(f.workspace, "status", "--porcelain"), "");
        assert.equal(new Set(phases.map((phase) => phase.id)).size, 3);
        save(join(evidence, "forge-calls.json"), calls());
        save(join(evidence, "result.json"), {
          runtime,
          outcome: "passed",
          source,
          phases,
          head,
          base,
          destination: landed.pr.mergeCommit.oid,
          externalModelCalls: true,
          liveGitHub: false,
          limits:
            "Synthetic single-task workflow, local GitHub transport; not live service gates, full autopilot lanes or model-diverse proof.",
        });
        console.log(
          JSON.stringify({
            runtime,
            outcome: "passed",
            evidence,
            phases,
            destination: landed.pr.mergeCommit.oid,
          }),
        );
      } catch (error) {
        // A timeout can happen after landing. Preserve actual state before teardown.
        try {
          const current = read(stateFile);
          const reconciliation = {
            forge: current,
            refs: f.git(f.workspace, "show-ref"),
          };
          if (current.pr.mergeCommit?.oid) {
            f.git(f.workspace, "fetch", "origin", "main");
            f.git(
              f.workspace,
              "merge-base",
              "--is-ancestor",
              current.pr.mergeCommit.oid,
              "origin/main",
            );
            reconciliation.destinationConfirmed = true;
            reconciliation.source = f.git(
              f.workspace,
              "show",
              "origin/main:sum.mjs",
            );
          }
          save(join(evidence, "reconciliation.json"), reconciliation);
        } catch (reconcileError) {
          save(join(evidence, "reconciliation-failure.json"), {
            message: reconcileError.message,
          });
        }
        save(join(evidence, "failure.json"), {
          message: error.message,
          stack: error.stack,
        });
        throw error;
      } finally {
        f.cleanup();
      }
    },
    960000,
  );
