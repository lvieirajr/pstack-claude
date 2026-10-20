# Compatibility baseline

This is the starting contract for [issue #1](https://github.com/lvieirajr/pstack-claude/issues/1), recorded on 2026-10-18. It describes the reviewed implementation and the evidence available for it. It is not a claim that every workflow already works in every harness.

The current targets are **Claude Code and Codex only**. The original four-harness roadmap and research below are historical evidence. The scope was narrowed on 2026-10-19: personal changes for other harnesses are restored to the inherited `pstack-claude` baseline at `3cff27a2dda8ab0390e3db55f4190539c5b86759`. Their native code, mappings, hooks, tests, and shared model data remain inherited; Claude/Codex additions in shared skill files are explicitly scoped to those two harnesses. Archived research is retained and does not establish a current support commitment.

## Source and behavior baseline

| Source | Revision | Version | Purpose |
| --- | --- | --- | --- |
| Michael Denyer's port, inherited by this fork | `3cff27a2dda8ab0390e3db55f4190539c5b86759` | 0.9.93 | Starting implementation |
| Lauren Tan's original, pinned by that port | `99743e9c151c8537cbbf1f98bb38f34ef3368453` | 0.15.25 | Mechanical translation and declared-fork comparison |
| Original pstack snapshot reviewed for parity | `8838150c6b4829ea3c01782631213776d86df14a` | 0.15.27 | Reference behavior for this roadmap; current pstack pin after issue #4 |

The original local Jarvis copy at `933da29fe88f64e715d1a446fd1ce045b429e5ef` matched all 171 source files in the reviewed original snapshot. At the inherited baseline, the port retained 53 of the 55 upstream skill directories (including all 24 principles) and all 23 playbooks, with 47 declared pstack file departures from its derived pin. Issue #4 imports the missing formal-verification skill and pins the reviewed v0.15.27 snapshot; only the Grok Bot UI skill remains excluded from those 55 upstream skill directories. The formal-verification prerequisites add one declared file fork. A file-fork count is not a count of separate policy changes.

Preserve the original workflow's intent, scope, independent reviewers, real-surface proof, evidence, and user-authorized autonomy. Different native tool names are expected. Skipping a required reviewer, substituting the writer's self-review, or replacing required observed evidence with an unsupported summary does not establish parity.

Important existing differences remain explicit:

- On Claude Code and Codex, the installed [autonomy contract](../plugins/pstack/skills/poteto-mode/references/autonomy.md) restores an authorized full-autopilot owner-to-merge path while preserving independent proof, explicit user gates, and revision-safe shipping. The [policy audit](workflow-policy.md) records the retained differences and optional native instruction limits. Other harnesses retain the inherited operator-merge behavior.
- Native routing is enabled by default; model roles and state paths remain partly Claude-oriented.
- Local worktrees replace Cursor cloud execution, without providing independent machines or services.
- Grok Bot and Benny are excluded. The original's formal-verification skill is bundled after issue #4; its chosen verifier must be installed separately, and importing it does not establish a completed proof.
- Stronger watcher, cleanup, and checkpoint safeguards are useful changes to assess individually, not reasons to revert the whole port.

The [fork registry](../tools/forks.json) and [source pins](../tools/upstream.json) remain authoritative for code ownership. The archived [original audit](research/portability-audit.md), [171-file inventory](research/portability-inventory.md), and [port comparison](research/pstack-claude-comparison.md) preserve the research behind this baseline. Those reports describe their frozen snapshots, not the current working tree or completed roadmap tasks.

## Evidence levels

Use these labels per capability, not as a score for a whole harness:

| Label | Meaning |
| --- | --- |
| Source | A manifest, mapping, or workflow describes the behavior; execution is not established |
| Fixture | Automated local tests exercise the mechanism, often with a fake host or child process |
| Runtime | A real installed harness passed a specified check without a model call |
| Reported | The upstream maintainer records a live/manual result; this evaluation did not repeat it |
| Gap | Missing, changed, restricted, or unverified behavior that prevents a blanket parity claim |

An offline fixture is not a live model workflow. A successful plugin install is not proof that a model invokes a skill or completes its review. Every future live result must record the harness version, execution mode, source revision, configured models, command/scenario, and observed evidence. Missing checks remain visible.

## Capability matrix

These cells summarize the inherited implementation. Follow the [runtime reference](reference.md#runtime-support), [Pi mechanism evidence](pi-equivalence.md), and archived comparison for scope and sources.

| Capability | Copilot CLI | Copilot app | Codex | OpenCode | Pi |
| --- | --- | --- | --- | --- | --- |
| Installation and discovery | Fixture; reported marketplace smoke | Reported shared plugin loading | Runtime: native plugin install/list on 0.163.0 | Reported CLI discovery | Runtime: package/child startup on 1.1.0 |
| Skill invocation | Reported CLI smoke; noninteractive host caveat below | Reported manual check | Source mapping; model invocation unverified here | Reported CLI/desktop loading | Source native skills; full catalog invocation unverified here |
| Routing and instructions | Fixture; reported SessionStart | Reported manual check | Fixture hook contract; real hook trust/injection unverified here | Gap: explicit invocation/standing instructions | Fixture; reported prompt injection |
| Model roles and effort | Fixture sheet/dispatch checks; reported setup | Reported setup | Source mapping; model dispatch unverified here | Gap: no concrete execution mapping | Fixture; runtime catalog; reported OpenAI dispatch |
| Worker lifecycle | Source mapping; reported dispatch | Source session primitives; reported dispatch | Source mapping; lifecycle unverified here | Reported CLI delegation; remaining lifecycle unverified | Fixture lifecycle; reported live child runs |
| Independent review | Source policy and agents; complete review unverified here | Source policy; complete review unverified here | Gap: requires permitted agents/capacity; complete review unverified | Gap: adapter and multi-model review incomplete | Fixture mechanics; complete pstack review workflow unverified here |
| Live application proof | Source driver policy; project-specific proof unverified | Source app tools; project-specific proof unverified | Source driver mapping; proof unverified | Gap: adapter/driver integration | Source driver mapping; proof unverified |
| PR delivery and merge authority | Fixture shared helpers; end-to-end unverified | Source stack/session tools; end-to-end unverified | Fixture shared helpers; end-to-end unverified | Gap: adapter; shared helpers available | Fixture shared helpers; end-to-end unverified |
| Scheduling and unattended work | Gap: cadence fallback is not durable scheduling | Source native automation mapping; recovery unverified | Gap: no portable durable loop implementation | Gap: no concrete scheduler adapter | Fixture/reported timers; only live interactive parent scheduling |
| History and resume | Source transcript mapping; fixture reader/checkpoints | Source mapping; app history coverage unverified | Gap: history workflows still name Claude paths; fixture checkpoints | Gap: no concrete history adapter; shared checkpoints available | Fixture transcript/branch reader and checkpoints |

The maintainer's reported checks are useful evidence, but their presence does not upgrade an untested full workflow. The Pi live table records an OpenAI sign-in; Anthropic and legacy OpenAI-Codex model IDs were catalog-checked, not called live in that report. Required independent review stays closed when no eligible reviewer can run.

## Versions and known limits

This is a versioned evidence baseline, not a promise of compatibility with all later releases.

| Component | Recorded version | Evidence and boundary |
| --- | --- | --- |
| Bun | CI: 1.3.14; local evaluation: 1.4.3 | Existing CI baseline and independently observed local runs; do not report them as the same environment |
| Node.js | Local: 24.22.0 | Used for Node helpers and installed Pi probes; a broad version range has not been established |
| Git | Local: Apple Git 2.54.0 | Real fixture repositories/worktrees; tests must supply their own identity/signing policy |
| GitHub CLI | Local: 2.102.0 | Needed for GitHub workflows; authenticated PR writes were not part of the baseline evaluation |
| Codex CLI | Local: 0.163.0 | Disposable native marketplace/plugin installation passed; no model-backed playbook run |
| Copilot CLI | Upstream report: 1.0.87 through 1.0.92 | Not installed in the local evaluation; signed-in smoke tests were not independently repeated |
| Copilot app | Upstream manual report: 2026-09-25 | No exact app build recorded in the source report; no independent app run |
| OpenCode | Upstream report: 2.0.30 | Discovery/loading and CLI delegation reported; model panels and complete workflows remain unverified |
| Pi | CI and disposable runtime: 1.1.0 | Typecheck, model catalog, and child startup passed; no independent model-backed run |

The current official [Codex subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) uses `[agents] enabled` and `max_concurrent_threads_per_session`; it does not require the old `[features] multi_agent` snippet. The [Codex mapping](../plugins/pstack/skills/poteto-mode/references/codex-tools.md) reflects that guidance. Host policy and the actual exposed tool schema still determine whether delegation is available; updating a local config does not override them.

Copilot CLI 1.0.92 has a maintainer-reported case where a cached computer-use experiment leaves `-p` sessions without plugin skills while interactive sessions work. This has not been independently reproduced here. Record the exact version and mode if encountered; do not clear the user's caches or broaden permissions silently. Copilot CLI and app are distinct test targets.

Pi process recovery may require `/proc` or `ps` to identify orphan processes. A sandbox denying process inspection can prevent that guarantee. Its interactive timers do not imply durable jobs after exit. Worktree isolation does not isolate application ports, databases, browsers, or credentials.

## Native installation contract

Claude Code and Codex install this fork through their existing marketplace/plugin commands. Dotfiles only invoke those commands after the CLIs and prerequisites are installed. Each harness owns its plugin files, caches, registration, updates, and removal. There is no custom installer, shared package checkout, skill-link manager, generated bridge, ownership manifest, or canonical pstack JSON configuration.

Install the complete native plugins, including their skills, supporting scripts, and hooks. Do not also expose pstack through shared skill links, which can duplicate discovery. Existing unrelated skills and shared instructions remain in place. Model choices use each harness's inherited native setup procedure.

The native Claude and Codex instruction files on the inspected machine resolve to the same `~/.agents/AGENTS.md`. Model setup must account for these aliases; native installation does not make those instruction files independent. Never mix conflicting runtime-specific choices in that shared file. This cleanup does not run model setup or rewrite those instructions.

Issue #3 now covers the small dotfiles integration and native installation verification. The earlier managed-`~/.agents` design and its installer tests have been withdrawn. Verify clean native installation in disposable homes without running the machine bootstrap or changing the live home. Keep native hook trust and model-backed workflow checks separate from registration checks.

Keep inherited version **0.9.93** during development. The user will introduce this fork's own version for its first ready release. Claude's remote plugin updates rely on the declared version, so unchanged development metadata does not establish an automatic upgrade path between commits. Verify versioned updates before that first release.

## Reproduce the code baseline

Use the existing toolchain rather than migrating package managers. From this repository:

```shell
bun install --frozen-lockfile
bun tools/generate.mjs --check
bun test tests/
```

Run the independently packaged helper checks from their directory:

```shell
cd plugins/pstack/skills/poteto-mode/scripts
bun install --frozen-lockfile
bun run typecheck
bun test orch watch-pr check-plan.test.ts
bunx prettier@3.6.2 --check .
```

These are offline/code checks after dependencies are prepared. They make no model calls. Root dependencies include `typebox`; the helper package has its own lockfile and dependencies. An unavailable dependency fetch is an environment failure, not a passing test.

Fixtures set their own Git identity and disable signing only for disposable fixture repositories or individual fixture commands. Do not change global signing settings or use a personal signing agent just to run the suite. Existing tests exercise commits, restacking, cleanup, and checkpoint lookup with real Git state.

Keep restricted-environment results separate. Do not skip process recovery tests and call them passed: either run them where process inspection is permitted, or record the exact blocked tests and limitation. A targeted rerun does not become a claimed full unrestricted suite run.

When Pi 1.1.0 is available, the following checks need no model account:

```shell
bun tools/typecheck-pi.mjs
PSTACK_PI_REQUIRE_CATALOG=1 PSTACK_PI_REQUIRE_RUNTIME=1 bun test tests/pi/catalog.test.mjs tests/pi/runtime.test.mjs
```

Use `PI_PACKAGE_DIR` for a disposable installed package. The typecheck resolves a pinned compiler through `bunx`, so its first run may need network/cache access. The catalog check establishes that IDs exist, not that the account can call every model.

Signed-in/model-backed checks are a separate explicit tier. Examples include `tests/copilot-smoke.sh`, `PSTACK_PI_LIVE=1 bun test tests/pi/live.test.mjs`, and the Claude skill-collision probe. Shipping's disposable live repository test creates, merges, and deletes a repository. None of those should be mistaken for an ordinary offline baseline command. See [contributor checks](../CONTRIBUTING.md#before-you-open-a-pr) for their exact scope.

## Verification record

The archived [comparison verification](research/pstack-claude-comparison.md#8-verification-performed-and-its-limits) records the initial evaluation: generator current; root 1,243 pass / 40 skip / eight sandbox failures; targeted process-recovery rerun 25 pass / zero fail, including those eight; helper typecheck and 258 tests pass; Pi installed-runtime checks four pass and typecheck pass; Claude manifests and disposable native Codex installation pass.

Fresh issue #1 checks on the local issue branch, based on the inherited revision above, used macOS, Bun 1.4.3, and Node.js 24.22.0. Process inspection was permitted for the process-recovery tests. The root/helper test process used a temporary global Git configuration requiring signing with an unavailable signer; fixture repositories or commands supply their own unsigned policy. Personal Git configuration was not edited.

| Check | Observed result |
| --- | --- |
| Signing-failure reproduction | Before the fixture fix, the existing cold checkpoint test failed on its setup commit; after the fix, it passed under the same temporary signing requirement |
| Root suite, including the added signing regression and real installed Pi probes | 1,256 pass, 36 skip, zero fail across 45 files; skipped checks remain unverified |
| Helper typecheck and tests | Typecheck passed; 258 pass, zero fail across ten files |
| Generator and invariants | 88 generated files current; skill references, model/config structure, packaging, and hook checks passed |
| Offline derivation against the materialized recorded pstack pin | 85 unchanged files, 47 declared forks; zero writes/conflicts, undeclared/stale entries, or denylist hits |
| Pi 1.1.0 | Extension typecheck passed; installed startup/catalog checks included in the root result, with no model calls |
| Codex CLI 0.163.0 | Marketplace registration, native plugin install, and installed/enabled listing passed in a disposable `CODEX_HOME` |
| Helper formatting | Prettier 3.6.2 check passed |
| Documentation | Markdownlint 0.18.1 passed; lychee 0.24.2 offline local-file/fragment check passed |

The new checkpoint regression publishes and reads an actual artifact with an unavailable global signing agent and no globally supplied fixture identity. This guards the reproduced setup failure without changing production signing behavior. The full root run retains platform-specific and model-backed skips; Copilot/OpenCode sessions, model-backed Pi workflows, live PR writes, and dotfiles deployment were not executed. Source-only and reported cells in the capability matrix remain unchanged by these code checks. No compatibility score or blanket end-to-end support is inferred from the passing counts.

### Issue #4 source sync

On 2026-10-19, issue #4 advances only the pstack component from `99743e9c151c8537cbbf1f98bb38f34ef3368453` (v0.15.25) to the reviewed `8838150c6b4829ea3c01782631213776d86df14a` (v0.15.27). The sync adds the formal-verification skill and updates seven existing skill files. Help and setup conflicts retain the port's native runtime procedures while incorporating the new formal-verification routing and setup offer. The other component pins and release metadata stay unchanged at their inherited values.

| Check | Observed result |
| --- | --- |
| Root suite with temporary unsigned fixture Git settings | 1,259 pass, 40 skip, zero fail across 45 files |
| Generator and skill validation | 89 generated files current; packaging, links, frontmatter, and hook checks passed; skill-creator validator passed for the added skill |
| Pstack ownership audit at the new pin | 85 unchanged files, 48 declared forks; no conflicts, undeclared/stale forks, or denylist hits |
| Other component ownership audits | cursor-team-kit: six unchanged files; thermos: four unchanged files and one declared fork; both passed |
| Claude Code 2.1.292, native local-folder installation | Source changes available in the registered folder; 64 installed skill entrypoints match the working source |
| Claude Code 2.1.292, native Git installation | Same-version `plugin update` kept 63 skills; native uninstall/install refreshed to 64 matching entrypoints, with one enabled registration |
| Codex 0.163.0, native local-folder and Git installations | Native refresh/add produced 64 matching installed entrypoints and the new prompt stub, with one enabled registration |
| Codex app-server `skills/list`, after Git refresh | 64 distinct pstack skills; new `pstack:create-formal-verification-skill` enabled and present once; no discovery errors |
| Documentation | Markdownlint and offline local-file/fragment link checks passed |

The native checks used disposable homes, a baseline source commit followed by the uncommitted working snapshot, and the actual CLIs. A temporary Git URL rewrite routed the Git-marketplace fixture to a local repository; nothing was published. Every installed skill entrypoint was compared byte for byte with the working source. The [development refresh procedure](reference.md#refresh-a-development-installation) records the native commands needed while the package version remains 0.9.93.

These checks do not exercise remote GitHub fetching, live-home installation, model-backed skill invocation, native hook trust, verifier installation, or a completed formal proof. The imported skill requires the chosen verifier and its runtime dependencies; an unexecuted generated check remains a draft. Automated updates between versioned releases will be verified with the first ready release.

### Issue #5 workflow policy

The [policy audit](workflow-policy.md) classifies all 48 pstack forks and the one thermos fork after issue #4. A Claude/Codex-only installed contract restores authorized full-autopilot merges and replaces the inherited fixed owner-count/retry gates with native user or repository limits. It preserves manual review requests, stops, independent review, real-surface proof, current-revision shipping checks, and the separate operator-landed stack workflow. Routing remains explicitly selectable through the inherited model-sheet setting.

The root suite passed 1,265 tests with 40 skips and zero failures. Generation and the pstack ownership audit passed. Native Git-marketplace fixture installs on Claude Code 2.1.292 and Codex 0.163.0 carried the new contract and its entrypoint links, retained one enabled registration, preserved shared instruction symlinks and contents, and read on/off routing choices across fresh installed-hook processes. The [validation record](workflow-policy.md#issue-5-validation-record) distinguishes those checks from model-backed authorization, stop, independent-review, and actual merge scenarios, which were not executed.

## Workflow acceptance scenarios

These are the live parity scenarios for later work, not tests that issue #1 claims to have executed:

| Scenario | Required observation | Roadmap issues |
| --- | --- | --- |
| Install and invoke | Dotfiles-provisioned fresh session loads the selected revision, instructions, and required native components once | [#3](https://github.com/lvieirajr/pstack-claude/issues/3), [#7](https://github.com/lvieirajr/pstack-claude/issues/7) |
| Investigate | Correct source/history scope, traceable findings, and accurate unavailable-source reporting | [#6](https://github.com/lvieirajr/pstack-claude/issues/6), [#7](https://github.com/lvieirajr/pstack-claude/issues/7) |
| Fix a bug | Intended failure reproduced, fix verified on the real surface, no unrelated edits | [#7](https://github.com/lvieirajr/pstack-claude/issues/7), [#9](https://github.com/lvieirajr/pstack-claude/issues/9) |
| Delegate and review | Correct roles/models, independent reviewers, traceable results, cancellation and replacement behavior | [#2](https://github.com/lvieirajr/pstack-claude/issues/2), [#8](https://github.com/lvieirajr/pstack-claude/issues/8) |
| Pause and resume | Same project/run and intact artifacts recovered; changed or missing evidence diagnosed | [#6](https://github.com/lvieirajr/pstack-claude/issues/6), [#11](https://github.com/lvieirajr/pstack-claude/issues/11) |
| Deliver a PR | Current revision reviewed and proven, repository rules respected, only authorized external actions taken | [#5](https://github.com/lvieirajr/pstack-claude/issues/5), [#10](https://github.com/lvieirajr/pstack-claude/issues/10) |
| Run unattended | Durable objective/grant, idempotent wakeups, recoverable work, effective operator stop | [#11](https://github.com/lvieirajr/pstack-claude/issues/11), [#12](https://github.com/lvieirajr/pstack-claude/issues/12) |
| Trigger bot integrations | Real scoped events, supported backend, protected secrets, observed results/recovery | [#13](https://github.com/lvieirajr/pstack-claude/issues/13) |

Work one issue at a time. Agree on its focused plan, implement and verify, review the uncommitted result together, then commit/push to the fork after review. This baseline does not close the later issues or authorize a dotfiles deployment.
