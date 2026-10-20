# Live verification on Claude Code and Codex

This contract applies only to Claude Code and Codex. It takes precedence over inherited driver locations, screenshot-only plan wording, and fixed lane validation. Other harnesses retain their inherited procedures. Preserve Lauren's proof standards: unit, live, and perf checks; a regression lane against trunk; actual user paths and side effects; independent receipt inspection; and any required operator review. A structural plan check is never evidence that the app worked.

## Resolve the project driver

Resolve the target checkout and package from the worker's actual working directory. Read the project-selected verification skill and feature map before choosing tools. A brief names its absolute path and exact launch, doctor, drive, evidence, and cleanup commands. Resolve bundled instructions and `check-plan.mjs` from the installed plugin separately. Never write project drivers, app state, or receipts into the plugin cache or tracked dotfiles.

For a new generated `verify` skill, use `.claude/skills/verify/` on Claude Code and [`.agents/skills/verify/` on Codex](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills), under the target repo or touched monorepo package. Apply that root to SKILL.md, helpers, and the feature map. On Codex start in that package or a descendant so its native project discovery can see the skill. These are repository paths, not a shared home-directory installation. If a project already selects a driver elsewhere, read that exact source and run its commands directly; do not duplicate its feature map for another harness. Maintenance locates the same source, including older `verify-*` skills, and keeps its original edit boundary.

Check the actual tools and permissions of the verifier, not just those of the coordinator. Claude Code can use its available shell, PTY, browser, or project driver. Codex uses its exposed shell/PTY and browser tools or an installed project browser harness. A skill name never grants a missing tool. Do not assume Codex has Claude's bundled `run` or user-only `verify`. Prefer the repo's own HTTP, PTY, Playwright, or other real driver over a new stack. Missing auth, dependencies, browser access, or launch capability leaves live proof blocked; record the prerequisite and attempted command. A manual handoff is pending until its actual evidence is returned and inspected.

## Declare the proof before dispatch

Keep ten logical live lanes by default. Execution capacity only schedules those lanes, including serial execution where necessary. Another lane count needs a deliberate user or repository decision with its source and reason recorded in the plan. Check that source before accepting the plan; a checker cannot authenticate it. Distinct required scenarios stay distinct even when one worker executes several. Follow the [native delegation contract](delegation.md) for capacity and independent review.

On these two runtimes, copy the multi-phase skeleton, then replace its live block using this shape. Fill every placeholder, write every required lane, and choose each lane's actual surface and evidence kind. Use `Run` for a shell command or `Drive` for a concrete native tool/action. Keep the regression comparison and all unit/perf blocks.

```markdown
**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Required lanes `10` at the PR head on the configured `swarm workers` model.

- [ ] Lane 1. Regression lane against trunk. Surface `cli`. Run `<same real journey at trunk and head>`. Artifact `transcript`. Save `<lane-owned path>`. Pass when <observable result and side effect>.
```

For a deliberately selected different count, change `Required lanes` and add ``Lane decision `<user/repository source and reason>` `` on the live block's opening line. Update all program references to the selected count; do not leave a contradictory ten-lane swarm task. State execution capacity in the dispatch/boot recipe separately. Keep the boot recipe, program-level evidence/review tasks, and per-PR blocks consistent with the selected surface and lane count.

| Surface | Artifact | Required contents |
| --- | --- | --- |
| `cli` | `transcript` | Exact command/input, stdout, stderr, exit status, and observed files or other side effects. Use a PTY when interaction requires one. |
| `api` | `response` | Actual request method/path/input, response status and relevant headers/body, plus an independent read of persisted effects. Redact secrets. |
| `ui` | `screenshot` or `video` | Real rendered state and the action sequence, plus observed effects. A screenshot of source or a health response does not prove the UI. |

The `Save` path names the primary artifact. Return supporting transcripts and side-effect receipts too. Preserve the inherited interaction gate for UI changes that require operator review, including screenshots, a 30 to 60 second video, and the operator's approval. For a CLI/API interaction gate, replace screen media with lane artifacts and reproduction commands, posted for operator review; keep the stop at merge-ready. `Review gate. None.` needs a concrete reason and cannot override an existing user/repository gate. Select the gate from the actual change, not the media tooling available.

Run the installed checker with the current runtime explicitly:

```shell
node <installed-plugin>/skills/poteto-mode/scripts/check-plan.mjs <plan.md> --runtime claude
node <installed-plugin>/skills/poteto-mode/scripts/check-plan.mjs <plan.md> --runtime codex
```

The inherited invocation without `--runtime` keeps the inherited template contract for other harnesses. Native validation requires declared, contiguous lanes, surface-appropriate artifact kinds, a command/tool action, a save path and a pass predicate. It does not execute commands, authenticate lane decisions, inspect artifacts, or replace the coordinator's review.

## Own runtime resources as well as files

A worktree isolates source files, not a server, port, database, queue, browser, credentials, or external account. Before dispatch, put each lane's resource ownership in its brief or project driver. Record the run/lane, checkout and head SHA, launch command and owned process handle/PID, bound ports, data/database namespace, browser profile/context, and artifact directory. Record acquired handles as launch returns them. Readers and writers both need this boundary.

- Give each simultaneous instance separate writable data, database/schema or container resources, caches that mutate app state, and browser profiles/contexts. Scope credentials and test accounts to the intended environment. Never borrow the user's browser profile or reset their database.
- Prefer an app-supported dynamic port assigned on bind, then pass the actual bound address to every client. For fixed ports or external/shared state, use the project's exclusive reservation or serialize the affected drives. Finding a free port and later binding it is not a reservation. If exclusive access cannot be established, report blocked instead of racing another run.
- Launch with the checkout/head and assigned resources explicitly selected. Wait for usable seeded state and run doctor before driving. Health alone does not prove the right build, ready migrations, or UI state. Recheck after surprises and fresh sessions; reset/relaunch a wedged UI even when health passes.
- Give every lane an evidence directory separate from disposable app state, with head SHA, source checkout, commands, resource identity, observed values and outcome in its receipt. Include trunk/head artifacts for the regression and perf comparisons. Keep partial evidence on failures and interruptions. Secrets do not belong in receipts.
- Cleanup runs after failed attempts as well as success. Stop only processes/resources the run owns, confirm termination, and remove only its disposable state. Never kill by process name or unverified stale PID. Check that evidence still exists after cleanup and that peers remain healthy. Unknown worker/process ownership is quarantined until reconciled under the delegation contract; interruption alone does not free a port or namespace.

Generation smoke-tests launch, doctor, one real mapped journey, evidence and cleanup. When the generated driver claims parallel isolation, also run two instances together, mutate one through its real surface, show the other is unchanged, and stop one while the other still works. If the app cannot support isolation, document and test its serial/exclusive model instead. Do not advertise parallel support from worktree separation alone.

## Inspect before accepting a receipt

The coordinator or independent verifier opens the returned artifacts from the exact head, checks they record the real commands/actions and observed predicates, and compares the side effects. Inspect images/video with an available media viewer, not their filenames. Verify claimed resource and build identity and that cleanup preserved proof. A worker's PASS label, test exit, nonempty file, or checker success alone is insufficient. Missing/stale/inaccessible evidence is incomplete verification. Keep regression, perf, model diversity, and authorization gates distinct; unavailable tooling never silently lowers them.
