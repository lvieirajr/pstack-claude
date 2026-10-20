#!/usr/bin/env bun
// Local GitHub transport fixture. No GitHub account or network is used.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const args = process.argv.slice(2);
const file = process.env.PSTACK_PR_STATE;
const state = JSON.parse(readFileSync(file, "utf8"));
appendFileSync(file + ".calls", JSON.stringify(args) + "\n");
const git = (...argv) =>
  execFileSync("git", ["-C", state.workspace, ...argv], {
    encoding: "utf8",
  }).trim();
// Positive model runs follow the actual owned bare remote after author pushes.
// Other cases inject snapshots deliberately and omit this option.
if (state.remote && state.pr.state === "OPEN") {
  const remoteHead = execFileSync(
    "git",
    [
      "--git-dir",
      state.remote,
      "rev-parse",
      `refs/heads/${state.pr.headRefName}`,
    ],
    { encoding: "utf8" },
  ).trim();
  if (remoteHead !== state.pr.headRefOid) {
    state.pr.headRefOid = remoteHead;
    state.ci = "PENDING";
  }
}
const finish = (value) => {
  writeFileSync(file, JSON.stringify(state));
  console.log(JSON.stringify(value));
};
if (args[0] === "api") {
  const query = args.find((arg) => arg.startsWith("query=")) ?? "";
  const pr = state.pr;
  if (query.includes("disablePullRequestAutoMerge")) {
    pr.autoMergeRequest = null;
    finish({
      data: { disablePullRequestAutoMerge: { clientMutationId: null } },
    });
  } else if (query.includes("dequeuePullRequest")) {
    pr.mergeQueueEntry = null;
    finish({ data: { dequeuePullRequest: { clientMutationId: null } } });
  } else if (query.includes("ReviewThreads"))
    finish({
      data: {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: state.threads,
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      },
    });
  else if (query.includes("PrCommitStatuses"))
    finish({
      data: {
        repository: {
          pullRequest: {
            commits: {
              nodes: [
                {
                  commit: {
                    oid: pr.headRefOid,
                    statusCheckRollup: { state: state.ci },
                  },
                },
              ],
            },
          },
        },
      },
    });
  else finish({ data: { repository: { pullRequest: pr } } });
} else if (args[0] === "pr" && args[1] === "checks") {
  finish([
    {
      name: "fixture-ci",
      state: state.ci,
      description: "Local fixture status",
      link: "",
      workflow: "fixture",
      bucket:
        state.ci === "SUCCESS"
          ? "pass"
          : state.ci === "PENDING"
            ? "pending"
            : "fail",
    },
  ]);
} else if (args[0] === "pr" && args[1] === "create") {
  assert.ok(!state.created);
  assert.equal(args[args.indexOf("--base") + 1], "main");
  assert.ok(!args.includes("--draft"));
  state.created = true;
  console.log("https://github.com/pstack-fixture/native-pr/pull/1");
  writeFileSync(file, JSON.stringify(state));
} else if (args[0] === "pr" && args[1] === "view") {
  finish({
    ...state.pr,
    number: 1,
    url: "https://github.com/pstack-fixture/native-pr/pull/1",
  });
} else if (args[0] === "pr" && args[1] === "comment") {
  const body = readFileSync(args[args.indexOf("--body-file") + 1], "utf8");
  state.comments ??= [];
  state.comments.push({ body });
  finish({
    url: `https://github.com/pstack-fixture/native-pr/pull/1#issuecomment-${state.comments.length}`,
  });
} else if (args[0] === "pr" && args[1] === "merge") {
  // Model the service head guard only. GitHub cannot see local grants/verdicts.
  assert.equal(
    args[args.indexOf("--match-head-commit") + 1],
    state.pr.headRefOid,
    "head changed",
  );
  // This positive fixture supports main; base-race safety is not claimed here.
  git("merge", "--squash", "lane-1");
  git("commit", "-m", "Land verified fixture");
  git("push", "origin", "main");
  state.pr.state = "MERGED";
  state.pr.mergedAt = new Date().toISOString();
  state.pr.mergeCommit = { oid: git("rev-parse", "HEAD") };
  finish({ merged: true });
} else throw Error(`Unsupported fixture gh command ${JSON.stringify(args)}`);
