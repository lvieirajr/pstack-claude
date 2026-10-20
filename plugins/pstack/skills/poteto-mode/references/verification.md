# Live verification on Claude Code and Codex

Apply this reference only on Claude Code and Codex. It adapts driver paths, tools and screenshot-oriented plan wording. Preserve the calling workflow's unit/live/perf, regression, independent review and operator gates. Other harnesses retain inherited procedures.

## Resolve the project driver

Resolve the target checkout/package and read its selected verification skill and feature map. Keep project commands separate from installed plugin helpers. For new `verify` skills use `.claude/skills/verify/` on Claude Code and `.agents/skills/verify/` on Codex under the repo or touched package; start Codex within that package so discovery finds it. Existing drivers, including older `verify-*` skills, retain their location and edit boundary. Do not duplicate them or write project artifacts into plugin caches or dotfiles.

Use the verifier's available shell/PTY/browser tools or existing project harness. Codex does not automatically have Claude's bundled `run` or user-only `verify`. Missing tools, dependencies or auth leave affected proof blocked; an actual returned and inspected manual result can complete a handoff.

## Declare the proof before dispatch

For multi-phase plans and their autopilots, retain the inherited ten logical live lanes. Native capacity schedules them in waves rather than reducing coverage. A different count requires a user/repository decision recorded with source and reason. This lane requirement does not extend to unrelated small tasks. Follow [native delegation](delegation.md).

Copy the multi-phase skeleton and replace its live block with this shape, filling every lane and placeholder while retaining unit/perf and regression comparisons:

```markdown
**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Required lanes `10` at the PR head on the configured `swarm workers` model.

- [ ] Lane 1. Regression lane against trunk. Surface `cli`. Run `<same real journey at trunk and head>`. Artifact `transcript`. Save `<lane-owned path>`. Pass when <observable result and side effect>.
```

Use `Run` for a shell command or `Drive` for a native tool/action. A nondefault `Required lanes` count also needs ``Lane decision `<user/repository source and reason>` `` on the opening line. Keep program tasks, boot recipe and per-PR blocks consistent; state concurrency separately.

| Surface | Artifact | Evidence |
| --- | --- | --- |
| `cli` | `transcript` | Command/input, stdout, stderr, exit status and observed side effects; PTY when needed. |
| `api` | `response` | Request, status, relevant response and independently read persisted effects, with secrets redacted. |
| `ui` | `screenshot` or `video` | Actual rendered state, actions and observed effects. |

Preserve UI operator gates, including screenshots, 30 to 60 second video and approval. CLI/API gates use reproduction commands and real artifacts for the same operator review. `Review gate. None.` needs a concrete reason and cannot override user/repository gates.

Validate with the installed checker:

```shell
node <installed-plugin>/skills/poteto-mode/scripts/check-plan.mjs <plan.md> --runtime claude
node <installed-plugin>/skills/poteto-mode/scripts/check-plan.mjs <plan.md> --runtime codex
```

Without `--runtime` inherited validation is unchanged. The checker validates plan structure, not authorization, execution or artifacts.

## Own resources and inspect proof

Assign each concurrent lane its checkout/head, launch/doctor/drive/cleanup commands, owned process handles, ports, writable data/database namespace, browser context and evidence directory. Worktrees do not isolate these resources. Prefer app-assigned ports; otherwise reserve exclusively or serialize. A free-port probe is not a reservation.

Run against usable seeded state and the intended build. Cleanup only owned processes and disposable state, confirming exit and preserving evidence on success, failure and interruption. Reconcile unknown ownership before reuse. A new driver's smoke test covers launch, doctor, one actual journey, evidence and cleanup. Claims of parallel isolation also require two instances with independent mutations and cleanup; otherwise document/test serial use.

Open returned artifacts, inspect actual actions, results and effects for the exact head, and check cleanup preserved proof. View images/video with an available viewer. A worker's PASS label or checker success cannot replace this inspection.
