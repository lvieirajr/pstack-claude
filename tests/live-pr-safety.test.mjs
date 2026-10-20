// Opt-in integration against the exact private repositories retained by live-pr-workflow.
// No additional repository is created or deleted; tool sequences are scripted, not paid evals.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { githubFixture } from "./helpers/github-fixture.mjs";
import { cliSource, testsSource } from "./helpers/pr-workflow.mjs";
import { fixture, nativeRun, digest } from "./helpers/native-delegation.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const enabled = process.env.PSTACK_LIVE_PR_SAFETY === "1";
const quote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const save = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
async function waitFor(readState, ready) {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const state = readState();
    if (ready(state)) return state;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw Error("GitHub did not converge to the required fixture state");
}
for (const runtime of ["claude", "codex"])
  test.skipIf(!enabled)(
    `${runtime}: live stale revisions, service gates, stop/resume and two-PR restack`,
    async () => {
      const records = read(process.env.PSTACK_LIVE_PR_REPOSITORIES);
      const github = githubFixture({
        record: read(records[runtime]),
        visibility: process.env.PSTACK_LIVE_PR_VISIBILITY ?? "private",
      });
      const evidence = mkdtempSync(
        join(tmpdir(), `pstack-live-pr-safety-${runtime}-`),
      );
      const f = fixture(runtime, repo);
      const limits = [];
      const tag = randomUUID().slice(0, 8);
      const parentBranch = `stack-parent-${tag}`,
        childBranch = `stack-child-${tag}`,
        reviewBranch = `review-gate-${tag}`;
      const phases = [];
      console.log(
        JSON.stringify({
          runtime,
          evidence,
          repository: github.url,
          cleanup: "manual",
        }),
      );
      try {
        save(join(evidence, "repository.json"), github.record);
        f.env.HOME = homedir();
        f.env.GH_CONFIG_DIR =
          process.env.GH_CONFIG_DIR ??
          join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "gh");
        f.env.BUN_INSTALL_CACHE_DIR =
          process.env.BUN_INSTALL_CACHE_DIR ?? "/tmp/pstack-issue6-bun-cache";
        f.git(f.workspace, "config", "credential.helper", "");
        f.git(
          f.workspace,
          "config",
          "--add",
          "credential.helper",
          "!gh auth git-credential",
        );
        f.git(
          f.workspace,
          "remote",
          "add",
          "origin",
          `https://github.com/${github.repository}.git`,
        );
        f.git(f.workspace, "fetch", "origin", "main");
        f.git(f.workspace, "reset", "--hard", "FETCH_HEAD");
        assert.equal(
          readFileSync(join(f.workspace, "sum.mjs"), "utf8"),
          cliSource(true),
        );
        assert.equal(
          readFileSync(join(f.workspace, "sum.test.mjs"), "utf8"),
          testsSource(true),
        );
        const scripts = join(f.plugin, "skills/poteto-mode/scripts/watch-pr");
        const contract = join(
          f.plugin,
          "skills/poteto-mode/references/pr-workflows.md",
        );
        assert.equal(
          digest(contract),
          digest(
            join(
              repo,
              "plugins/pstack/skills/poteto-mode/references/pr-workflows.md",
            ),
          ),
        );
        save(join(evidence, "source.json"), {
          source: f.git(f.source, "rev-parse", "HEAD").trim(),
          contractSha256: digest(contract),
        });
        f.run("bun", [join(scripts, "ship-pr"), "--help"]);
        assert.equal(
          f.run("gh", ["api", "user", "--jq", ".login"]).trim(),
          github.repository.split("/")[0],
        );
        const runner = join(f.root, "command.mjs");
        writeFileSync(
          runner,
          `import{spawnSync}from'node:child_process';import{writeFileSync}from'node:fs';const[file,command]=process.argv.slice(2);const r=spawnSync('sh',['-e','-c',command],{encoding:'utf8',timeout:25000});writeFileSync(file,JSON.stringify({command,cwd:process.cwd(),status:r.status,stdout:r.stdout,stderr:r.stderr,error:r.error?.message}));console.log(r.stdout??'');console.error(r.stderr??'');process.exitCode=r.status??1;`,
        );
        async function phase(name, cwd, commands, grant) {
          console.log(JSON.stringify({ runtime, stage: name, evidence }));
          const outputs = [];
          const result = await nativeRun(
            { ...f, workspace: cwd },
            async function* () {
              for (const [i, entry] of commands.entries()) {
                const { cmd, fails = false } =
                  typeof entry === "string" ? { cmd: entry } : entry;
                const receipt = join(evidence, `${name}-${i}.json`);
                const wrapped = `node ${quote(runner)} ${quote(receipt)} ${quote(cmd)}`;
                yield {
                  name: runtime === "claude" ? "Bash" : "exec_command",
                  args:
                    runtime === "claude"
                      ? {
                          command: `cd ${quote(cwd)} && ${wrapped}`,
                          timeout: 30000,
                        }
                      : { cmd: wrapped, workdir: cwd, yield_time_ms: 30000 },
                };
                const observed = read(receipt);
                assert.equal(observed.error, undefined);
                if (fails)
                  assert.ok(
                    Number.isInteger(observed.status) && observed.status !== 0,
                    JSON.stringify(observed),
                  );
                else assert.equal(observed.status, 0, JSON.stringify(observed));
                outputs.push(observed);
              }
            },
            {
              codexSandbox: "danger-full-access",
              parentPrompt: `PSTACK_PARENT\nRead ${contract}. Only ${github.repository} and the owned temporary worktrees/evidence are in scope. ${grant}`,
            },
          );
          writeFileSync(join(evidence, name + ".jsonl"), result.stdout, {
            mode: 0o600,
          });
          const id = result.stdout
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line))
            .map((event) => event.thread_id ?? event.session_id)
            .find(Boolean);
          assert.ok(id);
          phases.push({ name, id, commands, grant });
          save(join(evidence, "phases.json"), phases);
          return outputs;
        }
        const inspect = (pr, file) =>
          `bun ${quote(join(scripts, "ship-pr"))} inspect --repo ${github.repository} --pr ${pr} > ${quote(file)}`;
        const cancel = (file) =>
          `bun ${quote(join(scripts, "ship-pr"))} cancel-pending --record ${quote(file)}`;
        const merge = (pr, head) =>
          `gh pr merge ${pr} --repo ${github.repository} --squash --match-head-commit ${head}`;
        const watch = (pr, file) =>
          `bun ${quote(join(scripts, "watch-pr"))} --owner ${github.repository.split("/")[0]} --repo ${github.repository.split("/")[1]} --pr ${pr} --timeout 15 --interval 1 > ${quote(file)}`;
        const body = join(f.root, "body.md");
        writeFileSync(
          body,
          "Owned issue #10 integration fixture. No production target. Current checks and independent fixture proof are required before an explicit test landing grant.\n",
        );
        const parent = f.worktrees[2],
          child = f.worktrees[3];
        const base = f.git(f.workspace, "rev-parse", "HEAD").trim();
        f.git(parent, "reset", "--hard", base);
        await phase(
          "open-parent",
          parent,
          [
            `printf 'parent v1\\n' > parent.txt && git add parent.txt && git commit -m 'Add stack parent' && git push origin lane-3:${parentBranch}`,
            `gh pr create --repo ${github.repository} --base main --head ${parentBranch} --title 'Fixture stack parent' --body-file ${quote(body)}`,
          ],
          "Open the stack parent only. No merge or auto-merge authority.",
        );
        const pr = github
          .api("/pulls?state=open")
          .find((pr) => pr.head.ref === parentBranch);
        assert.ok(pr);
        const original = join(evidence, "original.json");
        await phase(
          "checkpoint",
          parent,
          [inspect(pr.number, original)],
          "Retain the exact pre-interruption revision. No writes to GitHub.",
        );
        const oldHead = read(original).record.revision.headRefOid;
        await phase(
          "advance-head",
          parent,
          [
            `printf 'parent v2\\n' > parent.txt && git add parent.txt && git commit -m 'Update stack parent before proof' && git push origin lane-3:${parentBranch}`,
          ],
          "Only this fixture parent update is authorized; prior proof is stale and landing is withheld.",
        );
        const head = f.git(parent, "rev-parse", "HEAD").trim();
        await waitFor(
          () => github.api(`/pulls/${pr.number}`),
          (pr) => pr.head.sha === head && pr.mergeable !== null,
        );
        const stale = await phase(
          "reject-stale-head",
          parent,
          [
            { cmd: cancel(original), fails: true },
            { cmd: merge(pr.number, oldHead), fails: true },
          ],
          "Reject stale proof; do not retry with a replacement SHA or arm auto-merge.",
        );
        assert.equal(JSON.parse(stale[0].stdout).kind, "changed");
        assert.match(
          stale[1].stderr,
          /head.*(changed|modified|match)|expected.*head|head.*expected/i,
        );
        assert.equal(github.api(`/pulls/${pr.number}`).state, "open");
        // Exercise the server's atomic SHA condition independently of gh's preflight.
        assert.throws(
          () =>
            github.api(`/pulls/${pr.number}/merge`, "PUT", {
              sha: oldHead,
              merge_method: "squash",
            }),
          /HTTP 409/,
        );
        const beforeBase = join(evidence, "before-base.json");
        await phase(
          "save-base",
          parent,
          [inspect(pr.number, beforeBase)],
          "Record the head/base pair; no landing authority.",
        );
        await phase(
          "advance-base",
          f.workspace,
          [
            `printf 'base advance ${tag}\\n' > base-note.txt && git add base-note.txt && git commit -m 'Advance fixture destination' && git push origin main`,
          ],
          "Advance only the declared fixture main branch to test stale base invalidation.",
        );
        const movedBase = f.git(f.workspace, "rev-parse", "HEAD").trim();
        const currentBase = await waitFor(
          () =>
            JSON.parse(
              f.run("bun", [
                join(scripts, "ship-pr"),
                "inspect",
                "--repo",
                github.repository,
                "--pr",
                String(pr.number),
              ]),
            ),
          (snapshot) => snapshot.record?.revision.baseRefOid === movedBase,
        );
        save(join(evidence, "actual-current-base.json"), currentBase);
        const moved = await phase(
          "reject-stale-base",
          parent,
          [{ cmd: cancel(beforeBase), fails: true }],
          "Stop on changed base. Reusing the old landing record is forbidden.",
        );
        assert.equal(JSON.parse(moved[0].stdout).kind, "changed");
        // A dedicated protected destination tests required approval without fabricating a second reviewer.
        github.api("/git/refs", "POST", {
          ref: `refs/heads/${reviewBranch}`,
          sha: movedBase,
        });
        const protection = {
          required_status_checks: {
            strict: false,
            contexts: ["fixture-safety"],
          },
          enforce_admins: true,
          required_pull_request_reviews: null,
          restrictions: null,
        };
        let protectedBranch = false;
        try {
          save(
            join(evidence, "main-protection.json"),
            github.api("/branches/main/protection", "PUT", protection),
          );
          save(
            join(evidence, "review-protection.json"),
            github.api(`/branches/${reviewBranch}/protection`, "PUT", {
              ...protection,
              required_pull_request_reviews: {
                required_approving_review_count: 1,
                dismiss_stale_reviews: true,
              },
            }),
          );
          protectedBranch = true;
        } catch (error) {
          if (!/HTTP 403/.test(String(error.stderr))) throw error;
          limits.push({
            feature: "private branch protection / required reviews",
            reason: String(error.stderr).trim(),
          });
        }
        github.api(`/statuses/${head}`, "POST", {
          state: "failure",
          context: "fixture-safety",
          description: "Declared fixture failure gate",
        });
        const failedWatch = join(evidence, "blocked-ci-watch.jsonl");
        const ci = await phase(
          "blocked-ci",
          parent,
          [{ cmd: watch(pr.number, failedWatch), fails: true }],
          "Failed CI blocks landing; report the blocker without merge authority.",
        );
        assert.match(
          ci[0].stdout + readFileSync(failedWatch, "utf8"),
          /ci-failing|NEEDS_ACTION|BLOCKER/,
        );
        if (protectedBranch) {
          const rejected = await phase(
            "server-rejects-ci",
            parent,
            [{ cmd: merge(pr.number, head), fails: true }],
            "The fixture grants an attempted merge solely to prove GitHub's required CI gate refuses it; no bypass flags or configuration changes.",
          );
          assert.match(
            rejected[0].stderr,
            /not mergeable|protected|required|checks|policy|merge.*blocked/i,
          );
          assert.equal(github.api(`/pulls/${pr.number}`).state, "open");
        }
        const retargetRecord = join(evidence, "before-retarget.json");
        await phase(
          "retarget",
          parent,
          [
            inspect(pr.number, retargetRecord),
            cancel(retargetRecord),
            `gh pr edit ${pr.number} --repo ${github.repository} --base ${reviewBranch}`,
          ],
          "Cancel pending mechanisms on this exact revision before retargeting only this fixture PR for the review-gate probe.",
        );
        await waitFor(
          () => github.api(`/pulls/${pr.number}`),
          (pr) => pr.base.ref === reviewBranch && pr.mergeable !== null,
        );
        const retargeted = await phase(
          "reject-retarget",
          parent,
          [{ cmd: cancel(retargetRecord), fails: true }],
          "A matching head does not validate a changed destination; reject the old record.",
        );
        assert.equal(JSON.parse(retargeted[0].stdout).kind, "changed");
        github.api(`/statuses/${head}`, "POST", {
          state: "success",
          context: "fixture-safety",
          description: "Fixture status now green",
        });
        if (protectedBranch) {
          const rejected = await phase(
            "server-rejects-review",
            parent,
            [{ cmd: merge(pr.number, head), fails: true }],
            "Prove required independent approval blocks the authorized test attempt. Do not self-approve or use --admin.",
          );
          assert.match(
            rejected[0].stderr,
            /not mergeable|protected|required|review|policy|merge.*blocked/i,
          );
          assert.equal(github.api(`/pulls/${pr.number}`).state, "open");
        }
        const reviewRecord = join(evidence, "review-gate.json");
        await phase(
          "restore-declared-destination",
          parent,
          [
            inspect(pr.number, reviewRecord),
            cancel(reviewRecord),
            `gh pr edit ${pr.number} --repo ${github.repository} --base main`,
          ],
          "Restore the declared fixture destination after same-revision cancellation. Retain the protected review-gate branch unchanged.",
        );
        await waitFor(
          () => github.api(`/pulls/${pr.number}`),
          (pr) => pr.base.ref === "main" && pr.mergeable !== null,
        );
        f.git(child, "reset", "--hard", head);
        await phase(
          "open-child",
          child,
          [
            `printf 'child only\\n' > child.txt && git add child.txt && git commit -m 'Add stack child' && git push origin lane-4:${childBranch}`,
            `gh pr create --repo ${github.repository} --base ${parentBranch} --head ${childBranch} --title 'Fixture stack child' --body-file ${quote(body)}`,
          ],
          "Open the child against its actual parent tip. The root owns topology; no stack landing is authorized.",
        );
        const childPr = github
          .api("/pulls?state=open")
          .find((pr) => pr.head.ref === childBranch);
        assert.ok(childPr);
        const childHead = f.git(child, "rev-parse", "HEAD").trim();
        const oldParent = head;
        const oldPatch = f.git(child, "diff", oldParent, childHead);
        assert.equal(
          f.git(child, "diff", "--name-only", oldParent, childHead).trim(),
          "child.txt",
        );
        // Wait for actual Actions at the current parent/child heads, never treat status-only as READY.
        for (const sha of [head, childHead])
          await waitFor(
            () =>
              github.api(`/actions/runs?event=pull_request&head_sha=${sha}`)
                .workflow_runs,
            (runs) =>
              runs.some(
                (run) =>
                  run.head_sha === sha &&
                  run.status === "completed" &&
                  run.conclusion === "success",
              ),
          );
        if (protectedBranch) {
          github.api("", "PATCH", { allow_auto_merge: true });
          github.api(`/statuses/${head}`, "POST", {
            state: "pending",
            context: "fixture-safety",
            description: "Hold for operator stop fixture",
          });
          const enable = join(f.root, "enable.json");
          save(enable, {
            query:
              "mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){pullRequest{id autoMergeRequest{enabledAt}}}}",
            variables: { id: github.api(`/pulls/${pr.number}`).node_id },
          });
          await phase(
            "arm-fixture-pending",
            parent,
            [`gh api graphql --input ${quote(enable)}`],
            "Explicit fixture-only authority arms auto-merge behind the enforced pending check to test subsequent cancellation. It may not land yet.",
          );
        } else
          limits.push({
            feature: "active auto-merge cancellation",
            reason:
              "Not armed without an enforceable pending gate; private branch protection unavailable.",
          });
        const parentRecord = join(evidence, "parent-stop.json"),
          childRecord = join(evidence, "child-stop.json");
        await phase(
          "operator-stop",
          parent,
          [
            inspect(pr.number, parentRecord),
            cancel(parentRecord),
            inspect(childPr.number, childRecord),
            cancel(childRecord),
          ],
          "STOP: revoke all previous landing grants. Zero source/branch writes; cancel pending mechanisms and confirm both PRs remain open. This is a foreground checkpoint, not durable scheduling.",
        );
        const stoppedParent = read(parentRecord).record;
        if (protectedBranch)
          assert.equal(stoppedParent.pending.autoMerge, true);
        assert.equal(github.api(`/pulls/${pr.number}`).state, "open");
        assert.equal(github.api(`/pulls/${childPr.number}`).state, "open");
        const stopReadback = join(evidence, "stop-readback.json");
        await phase(
          "resume-read-only",
          parent,
          [
            inspect(pr.number, stopReadback),
            inspect(childPr.number, join(evidence, "child-readback.json")),
          ],
          "Resume read-only after interruption. The user stop still holds; no new landing grant exists and neither PR may merge.",
        );
        assert.deepEqual(read(stopReadback).record.pending, {
          autoMerge: false,
          queueEntryId: null,
        });
        github.api(`/statuses/${head}`, "POST", {
          state: "success",
          context: "fixture-safety",
          description: "Explicit operator release after stop readback",
        });
        const parentProof = join(evidence, "parent-proof.json");
        // Fresh native session runs actual tests and records its inspected revision; it did not author the patch.
        f.git(f.worktrees[4], "reset", "--hard", head);
        await phase(
          "independent-stack-proof",
          f.worktrees[4],
          [
            `git diff ${movedBase} ${head}`,
            `node --test sum.test.mjs`,
            `test "$(cat parent.txt)" = 'parent v2'`,
            inspect(pr.number, parentProof),
          ],
          "Fresh independent fixture verification only. Run actual CLI tests, inspect the parent diff and destination. No source change or landing authority.",
        );
        const readyFile = join(evidence, "parent-ready.jsonl");
        await phase(
          "operator-lands-parent",
          parent,
          [
            watch(pr.number, readyFile),
            inspect(pr.number, parentRecord),
            cancel(parentRecord),
            merge(pr.number, head),
          ],
          `New explicit operator test grant: after the independent current-revision proof and current gates, land only parent PR ${pr.number} at ${head} into main. Child remains STACK-READY for the operator. Stop after the merge request, simulating interruption before local confirmation.`,
        );
        assert.equal(
          readFileSync(readyFile, "utf8")
            .trim()
            .split("\n")
            .map(JSON.parse)
            .at(-1).kind,
          "READY",
        );
        const mergedParent = join(evidence, "parent-merged.json");
        await phase(
          "reconcile-after-merge",
          f.workspace,
          [inspect(pr.number, mergedParent), `git fetch origin main`],
          "Reconcile the interrupted landing before another write. If already merged, verify destination and never reissue the merge.",
        );
        const landed = read(mergedParent).record;
        assert.equal(landed.state, "MERGED");
        assert.equal(landed.revision.headRefOid, head);
        assert.equal(landed.revision.baseRefName, "main");
        f.git(
          f.workspace,
          "merge-base",
          "--is-ancestor",
          landed.mergeCommitOid,
          "origin/main",
        );
        assert.equal(
          f.git(f.workspace, "show", "origin/main:parent.txt"),
          "parent v2\n",
        );
        const trunk = f.git(f.workspace, "rev-parse", "origin/main").trim();
        const lease = f
          .git(
            child,
            "ls-remote",
            "--exit-code",
            "origin",
            `refs/heads/${childBranch}`,
          )
          .trim();
        assert.equal(lease, `${childHead}\trefs/heads/${childBranch}`);
        save(join(evidence, "topology.json"), {
          oldParent,
          oldChild: childHead,
          trunk,
          capturedRemoteHead: childHead,
          remoteRef: `refs/heads/${childBranch}`,
          parentMerge: landed.mergeCommitOid,
        });
        await phase(
          "root-restacks-child",
          child,
          [
            inspect(childPr.number, childRecord),
            cancel(childRecord),
            `git merge-base --is-ancestor ${oldParent} HEAD && git rebase --onto ${trunk} ${oldParent} lane-4 && git push --force-with-lease=refs/heads/${childBranch}:${childHead} origin HEAD:refs/heads/${childBranch}`,
            `gh pr edit ${childPr.number} --repo ${github.repository} --base main`,
          ],
          "Root topology grant only: replay exactly old-parent..child onto confirmed trunk using the captured explicit remote lease, then retarget the child. No child merge authority.",
        );
        const newChild = f.git(child, "rev-parse", "HEAD").trim();
        assert.notEqual(newChild, childHead);
        assert.equal(f.git(child, "diff", trunk, newChild), oldPatch);
        assert.equal(
          f.git(child, "rev-list", "--count", `${trunk}..${newChild}`).trim(),
          "1",
        );
        github.api(`/statuses/${newChild}`, "POST", {
          state: "success",
          context: "fixture-safety",
          description: "Current restacked child verified",
        });
        await waitFor(
          () =>
            github.api(`/actions/runs?event=pull_request&head_sha=${newChild}`)
              .workflow_runs,
          (runs) =>
            runs.some(
              (run) =>
                run.head_sha === newChild &&
                run.status === "completed" &&
                run.conclusion === "success",
            ),
        );
        const childReady = join(evidence, "child-ready.jsonl"),
          childProof = join(evidence, "child-proof.json");
        f.git(f.worktrees[5], "reset", "--hard", newChild);
        await phase(
          "independent-child-ready",
          f.worktrees[5],
          [
            `git diff ${trunk} ${newChild}`,
            `node --test sum.test.mjs`,
            `test "$(cat parent.txt)" = 'parent v2' && test "$(cat child.txt)" = 'child only'`,
            watch(childPr.number, childReady),
            inspect(childPr.number, childProof),
          ],
          "Fresh verification of current child revision/destination. Report STACK-READY; no automatic stack landing grant.",
        );
        assert.equal(github.api(`/pulls/${childPr.number}`).state, "open");
        assert.equal(read(childProof).record.revision.headRefOid, newChild);
        assert.equal(read(childProof).record.revision.baseRefOid, trunk);
        assert.equal(
          readFileSync(childReady, "utf8")
            .trim()
            .split("\n")
            .map(JSON.parse)
            .at(-1).kind,
          "READY",
        );
        await phase(
          "operator-lands-child",
          child,
          [
            cancel(childProof),
            merge(childPr.number, newChild),
            inspect(childPr.number, join(evidence, "child-merged.json")),
          ],
          `New explicit operator test grant releases the stack hold for child ${childPr.number}, exact verified head ${newChild}, into ${github.repository}:main. No other PR is authorized.`,
        );
        const final = read(join(evidence, "child-merged.json")).record;
        assert.equal(final.state, "MERGED");
        assert.equal(final.revision.headRefOid, newChild);
        assert.equal(final.revision.baseRefName, "main");
        f.git(f.workspace, "fetch", "origin", "main");
        f.git(
          f.workspace,
          "merge-base",
          "--is-ancestor",
          final.mergeCommitOid,
          "origin/main",
        );
        assert.equal(
          f.git(f.workspace, "rev-parse", "origin/main^{tree}").trim(),
          f.git(child, "rev-parse", "HEAD^{tree}").trim(),
        );
        assert.equal(
          f.git(f.workspace, "show", "origin/main:child.txt"),
          "child only\n",
        );
        assert.equal(
          new Set(phases.map((phase) => phase.id)).size,
          phases.length,
        );
        limits.push({
          feature: "active merge queue",
          reason:
            "Fixture repositories have no merge-queue rule; queue cancellation is exercised by installed-helper/native transport tests, not a live Enterprise organization queue.",
        });
        save(join(evidence, "result.json"), {
          outcome: "passed",
          runtime,
          repository: github.url,
          parent: pr.html_url,
          child: childPr.html_url,
          oldParent,
          oldChild: childHead,
          restackedChild: newChild,
          parentMerge: landed.mergeCommitOid,
          childMerge: final.mergeCommitOid,
          phases,
          limits,
          liveGitHub: true,
          scriptedController: true,
          externalModelCalls: false,
        });
        console.log(
          JSON.stringify({ outcome: "passed", runtime, evidence, limits }),
        );
      } catch (error) {
        save(join(evidence, "failure.json"), {
          message: error.message,
          stack: error.stack,
        });
        throw error;
      } finally {
        save(join(evidence, "limits.json"), limits);
        f.cleanup();
        console.log(
          JSON.stringify({
            runtime,
            repository: github.url,
            evidence,
            cleanup: "manual",
          }),
        );
      }
    },
    900000,
  );
