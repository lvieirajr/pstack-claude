# pstack-claude compared with the original pstack

Archived research from 2026-10-18, imported for issue #1. Repository-relative statements and counts describe the frozen source snapshots named below. Original source-file links point to the reviewed Cursor commit; this report is not an installation guide or a claim about completed roadmap work.

Evaluation date: 2026-10-18. This supplements the [portability audit](portability-audit.md) and [source inventory](portability-inventory.md).

## Recommendation

**Use this fork as a starting point for a portable pstack, with explicit changes before treating it as a replacement across all your harnesses.** It has already done substantial useful work on packaging, tool mappings, local worker execution, dependency bundling, upstream synchronization, and verification. Reimplementing all of that from the original would duplicate work.

It preserves most of Lauren Tan's reasoning system and skill coverage. It also makes its own workflow decisions. In particular, its full-autopilot workflow stops for human merges, its plugins activate routing automatically, and its required independent reviews remain blocked when the runtime cannot supply reviewers. Those are meaningful product differences, rather than mechanical translations.

For Claude Code it is a credible replacement for the main coding workflows. For Codex and Pi it is a promising, concretely implemented port with qualifications below. For OpenCode it supplies shared skills and some reported runtime verification, but leaves important execution details to the agent. For Cursor, Grok Bot, and Benny it is not a complete replacement: their native integrations are excluded.

I found **no unresolved failure in the code checks I exercised** after separating local Git-signing and sandbox restrictions from port defects. I did find source-level gaps that affect the portability claim, especially Codex history workflows. Passing the helper tests does not establish that every playbook works end to end in every harness.

## 1. What was compared

| Source | Frozen revision | Version | Role in this evaluation |
| --- | --- | --- | --- |
| This repository | `933da29fe88f64e715d1a446fd1ce045b429e5ef` | pstack 0.15.27 | Your original copy; 171 tracked source files |
| Latest fetched Cursor monorepo | `8838150c6b4829ea3c01782631213776d86df14a` | pstack 0.15.27 | Its entire pstack directory matches all 171 local source files byte for byte |
| pstack-claude | `3cff27a2dda8ab0390e3db55f4190539c5b86759` | Port 0.9.93 | The replacement under evaluation; 369 tracked files |
| pstack revision recorded by the port | `99743e9c151c8537cbbf1f98bb38f34ef3368453` | pstack 0.15.25 | Distinguishes intentional port changes from newer upstream work |

The version numbers belong to different release streams. Port 0.9.93 is not evidence that it is older than upstream 0.15.27; the recorded source commit is the relevant comparison. These conclusions describe the frozen revisions above, not every future update to either repository. See the [upstream pin and exclusions][pins] and the [upstream snapshot][original].

I cloned the repositories separately, materialized the exact upstream pin, compared skill sets and bodies, examined the rewrite/generation pipeline and declared forks, compared runtime and workflow implementations, and exercised the checks listed in section 8. The original audit remains the exhaustive inventory of this repository; this report concentrates on replacement fidelity and differences.

## 2. How close is it to Lauren's original?

### Coverage and source fidelity

| Measure | Result | Interpretation |
| --- | --- | --- |
| Original skill directories retained | 53 of the latest original's 55 | Nearly all main skills remain |
| Principle skills retained | All 24 | The reasoning foundation is preserved |
| Principle bodies unchanged | 21 of 24, ignoring frontmatter | Three have deliberate policy changes |
| Poteto-mode playbooks retained | All 23 | The workflow catalog remains, with changes to execution and policy |
| Total skills in the port | 63 | 53 retained plus 10 additions; more skills does not mean full original coverage |
| Retained upstream files matching the mechanical port of its exact pin | 85 | Verified with its actual substitution and derivation functions |
| Retained upstream files with declared departures from that derivation | 47 | All were declared; no undeclared or stale pstack fork entries in this comparison |

The last two rows cover 132 retained upstream files, not all 369 port files. The 47 entries include implementation and test files, and are not 47 independent policy changes. The registry classifies them as 39 `policy` and eight `port-feature` entries. This is unusually useful transparency: the repository does not present all its changes as unavoidable platform adaptations. See the [fork registry][forks] and [sync implementation][sync].

**There is no defensible single percentage for behavioral fidelity.** A one-line change from agent merge to operator merge matters more operationally than hundreds of mechanically translated lines. The appropriate assessment is high fidelity to the principles and workflow structure, with substantial differences in execution and autonomy.

The three changed principles concern stronger semantic controls for comparisons, stronger evidence for verification claims, and treating a documented constant as testable behavior. These are extensions to the original discipline, rather than a replacement of the philosophy. They are individually explained in the registry.

At playbook level, 11 match the mechanical port of the recorded pin: `authoring-a-skill`, `autonomous-run`, `eval`, `hillclimb`, `investigation`, `perf-issue`, `prototype`, `refactoring`, `runtime-forensics`, `trace-forensics`, and `visual-parity`. The other 12 are declared forks: `autopilot-full`, `autopilot-stack`, `babysit`, `bug-fix`, `feature`, `multi-phase-plan`, `opening-a-pr`, `orchestrate`, `pause-safely`, `session-pickup`, `shipping`, and `worktree-cleanup`. A mechanical match still inherits the execution limitations of the translated runtime.

### Retained, omitted, and added skills

All 29 of these public original skills remain, alongside the 24 principles:

`architect`, `arena`, `automate-me`, `benchmark-checklist`, `blast-radius`, `bro`, `correct`, `create-verification-skill`, `figure-it-out`, `how`, `in-your-own-words`, `interrogate`, `ketchup`, `maintain-verification-skill`, `no-comments`, `poteto-help`, `poteto-mode`, `recall`, `reflect`, `setup-pstack`, `sharpen`, `show-me-your-work`, `swarm`, `tdd`, `teach`, `technical-writing`, `typescript-best-practices`, and `unslop`.

| Original capability missing from this bundle | Reason and consequence |
| --- | --- |
| `make-bot-ui` | Deliberately excluded. There is no translated Grok Bot routine, secret acquisition, or Tailscale-backed UI deployment workflow |
| `create-formal-verification-skill` | Present in your newer upstream copy, absent from the port's pinned pstack revision. The README points to the maintainer's separate formal-verification plugin; that is an additional product to evaluate, not bundled equivalence |
| Benny's automation pack and its three internal skills | The entire `automations/` tree is excluded. Its review/triage automation, deployment wiring, and messaging integration are not ported |
| Cursor-native registration, sticky-mode metadata, assets, and tutorial | Excluded or replaced by the port's onboarding and packaging. This is not a native Cursor plugin distribution |

The ten added skills are six imports from cursor-team-kit (`deslop`, `fix-ci`, `fix-merge-conflicts`, `get-pr-comments`, `make-pr-easy-to-review`, `what-did-i-get-done`), three imports from thermos (`thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review`), and an independently authored `babysit`. They help close some original dependency gaps, but also expand the stack beyond Lauren's pstack. The [pin file][pins] records each imported component separately, and the [notices][notices] preserve attribution.

There are now two similarly named PR-maintenance entry points: the standalone `babysit` skill and poteto-mode's Babysit playbook. Poteto-mode explicitly routes PR-status requests to the playbook. Preserve that distinction when customizing the stack; calling the similarly named skill is not automatically equivalent. See [poteto-mode][mode].

### Upstream lag is modest but real

Using the port's sync/derivation functions against its recorded pstack revision produced no proposed writes, conflicts, undeclared forks, stale fork declarations, or forbidden Cursor tokens. This supports its stated provenance.

Running the equivalent comparison against your newer 0.15.27 snapshot proposed changes to eight paths. They concern the added formal-verification skill, `ketchup`, help recipes and help text, setup, `sharpen`, and TypeScript guidance. Two paths, `poteto-help/SKILL.md` and `setup-pstack/SKILL.md`, produced three-way conflicts. No files were actually synchronized.

That is evidence of a maintained fork with some update work outstanding, rather than a wholesale mismatch with current upstream. It also shows the limit of automated sync: declared forks make conflicts visible, but someone still has to resolve and validate them.

## 3. The differences that most affect behavior

| Area | Original | Port | Practical consequence |
| --- | --- | --- | --- |
| Activation | Explicit poteto-mode/custom-mode usage and Cursor activation metadata | Session-start routing enabled by default in native plugins and the Pi extension | Installing the plugin changes how ordinary nontrivial tasks route, even without explicitly requesting poteto-mode |
| Default models | Embedded Cursor model slugs, including Grok | Central model roles, Claude defaults, Codex examples/defaults, Pi provider mappings, and runtime override sheets | Removes the Grok requirement; still requires available models and runtime-specific dispatch |
| Worker environment | Cursor background/cloud facilities in advanced workflows | Local subagents with separate worktrees or branches | Replaces source isolation, not separate VMs, displays, ports, services, or credentials |
| Full autopilot | PR owners can merge once the required grant and proof cover it | Owners stop at merge-ready; operator clicks every merge | Does not reproduce an authorized build-to-merge unattended queue |
| Full-autopilot scale | Original queue policy | More than three owners needs approval of the stated size unless already named; at most two fix-forwards before a blocked handoff | Adds intervention points and a bounded review loop |
| Missing independent reviewers | Original agent-dependent workflows | Explicitly blocks required review and shipping; exploration alone can fall back to sequential work | A skills-only installation can load successfully while an authoring workflow remains unable to finish |
| PR readiness | Original watcher policy | Additional review-required, behind-base, unknown-state, snapshot-consistency, and repository/topology checks | More conditions lead to waiting or a blocker; useful hardening, but a changed state machine |
| Repository without CI | Empty check sources are treated as unavailable evidence | A confirmed absence of checks can become ready after repeated observations over at least 60 seconds for the same head | Useful for no-CI repositories, but readiness does not mean tests passed |
| Shipping | Original shipping playbook | Captured revisions, pending-merge cancellation, server-enforced head conditions, destination-history confirmation, and restricted queue/auto-merge use | Stronger protection against landing a different revision; some repositories need additional rules or cannot use that path |
| Cleanup | Original shell audit and cleanup policy | Node audit plus stronger preservation of untracked/ignored work, locks, submodules, and reflog-only commits | A substantive safety improvement, with more worktrees retained for review |
| Pause/resume | Resume notes and transcript-based reconstruction | A shared checkpoint locator inside the repository's Git common directory, artifact hashes, and atomic publication | A real portability improvement across harnesses and linked worktrees; deleting or recloning the checkout still loses that store |
| Skill composition | Original invocation restrictions | Removes disabling flags from composable skills and hides principles from the user command menu | Enables composition in Claude; changes automatic invocation and menu behavior |

The [autopilot-full fork][autopilot], [shipping playbook][shipping], [watcher policy][watchpolicy], [routing instruction][routing], and [resume contract][resume] establish these differences.

The manual-merge rule is specific to full autopilot. The port's separate Shipping playbook still allows the agent to merge under the user's landing authority and its stronger conditions. It would be inaccurate to describe the whole fork as incapable of merging.

These policy changes are not inherently worse. Several are improvements. They do mean that adopting the fork also adopts Michael Denyer's choices about autonomy, review scope, retries, routing, and evidence unless you override them deliberately.

## 4. What portability work it actually solves

### Installation and shared distribution

The repository supplies real Claude Code, Codex, and Copilot manifests, and a Pi package with both skills and an extension. This is more than renaming directories. I validated the Claude marketplace and plugin manifests, and installed the native Codex plugin from the local checkout into a disposable Codex home. Codex listed pstack 0.9.93 as installed and enabled.

Its Codex `.codex-plugin` manifest is a supported compatibility layout, not a reason to reject the port for lacking a root `plugin.json`. Current [OpenAI packaging documentation](https://developers.openai.com/plugins/build/plugins) explicitly describes that fallback. The active installation test is stronger evidence here than guessing from directory names.

A shared skills-only installation also carries supporting references and scripts. It does not install hooks or synthesize delegation, scheduling, or tool compatibility. Shared discovery is useful distribution infrastructure; it is not a universal runtime API. [OpenCode's skill documentation](https://opencode.ai/docs/skills/) likewise describes discovery and loading separately from agent execution.

### Grok, Cursor tools, and unbundled companions

The port removes the runtime dependency on Grok model slugs and translates Cursor tool syntax into Claude tool language. It provides additional Codex, Pi, and Copilot mappings instead of pretending Claude's tool schema applies everywhere. Available models are meant to be detected before an override sheet is written. It also supports inheriting the parent model.

It bundles several previously external review and cleanup skills, and replaces mandatory Cursor app drivers with a project-specific verification-driver policy and runtime equivalents. Your project still needs a way to run and observe the actual app. Installing a skill cannot supply missing browser, terminal, service, or device access.

The Grok Bot integration is removed, not generalized. That is a valid way to let ordinary coding workflows run without Grok Bot, but it does not produce a working bot for another environment. The same distinction applies to excluding Benny.

### Pi supplies an actual adapter

The Pi extension implements child-agent dispatch over Pi RPC, messaging, lifecycle tracking, optional worktrees, model resolution, questions, wakeups, and `/loop`. This is substantial functionality beyond shared Markdown. I verified its types against installed Pi 1.1.0 and ran the no-model-call startup/catalog tests against that runtime.

The repository's [Pi equivalence table][pi-evidence] is particularly helpful: it distinguishes fixture checks from live checks, records which provider was exercised, and identifies unexercised mechanisms. Its reported live model runs used an OpenAI sign-in. They do not establish live Anthropic or every-provider equivalence.

### Maintenance and checks

Central generation keeps 88 generated files consistent. The sync pipeline records separate upstream pins and distinguishes mechanical substitutions from declared forks. The test suite exercises parsing, pagination, revision changes, process lifecycle, cleanup, permissions, packaging, and documentation invariants. CI includes dedicated Windows hook and worktree-audit jobs and a macOS worktree-audit job.

Those are strong reasons to reuse this work. They do not make every runtime equal, but the implementation and maintenance discipline are considerably beyond a README-only port. See the [generator][generator] and [CI configuration][ci].

The port also adds project playbooks under `.agents/playbooks/`. A project can extend bundled workflows by anchoring changes to quoted step text; `check-playbooks.mjs` detects references that no longer match after an upgrade. This gives you an existing customization mechanism to consider before creating more permanent core forks. See [project playbooks in poteto-mode][mode].

## 5. Remaining gaps and newly introduced constraints

The labels below distinguish source-observed problems, deliberate policy choices, and limitations needing real runtime verification. None is presented as a reproduced application crash unless the evidence says so.

### C01. Codex transcript support is incomplete

**Source-observed portability gap; fix before relying on history workflows in Codex.** `recall` still directs transcript mining to `~/.claude/projects/...`; `show-me-your-work` audits the run against that location; `automate-me` restricts mining to that location; the Eval playbook grades candidates using Claude transcripts. These instructions do not describe Codex rollouts.

The Codex mapping gives `reflect` a session-digest fallback, but does not supply equivalent history instructions for those other workflows. The transcript-opening helper explicitly rejects a Codex rollout and asks for a digest. By contrast, the worktree-audit helper does scan Codex session roots. That helper's broader support must not be mistaken for complete history-workflow support.

Following the prose literally on Codex can miss the relevant history, read Claude history for the same project instead, or leave an evidence requirement unsatisfied. An agent might improvise a repair, but the port should encode it. See [recall][recall], [decision-log auditing][trail], [automate-me][automate], [Eval][eval], and [Codex mapping][codex-map].

### C02. Generic installation still means adapting Claude instructions

**Architectural limitation.** The common skill tree's primary language is Claude Code: `Skill`, `Agent`, `AskUserQuestion`, namespaced agent types, and Claude model families. Codex, Pi, and Copilot have explicit translations. OpenCode, Gemini CLI, and Prime are told to use their own equivalents.

The maintainer reports OpenCode 2.0.30 skill discovery/loading in CLI and desktop, and CLI delegation. That is useful evidence, but the same runtime table leaves multi-model workflows unverified there. There is no equivalent concrete OpenCode execution mapping in this bundle. Gemini and Prime have no reported live sessions in that table. I did not run those harnesses. See [runtime support][runtime-support].

There is also a documented Copilot host limitation: on CLI 1.0.92, a cached computer-use experiment assignment can leave noninteractive `-p` sessions with no plugin skills, while interactive sessions still work. This is maintainer-reported, not independently reproduced here or established as a defect in pstack's code. It is nevertheless a concrete environment where the advertised install does not guarantee usable skills. See the [installation caveat][port-readme].

### C03. Successful skill discovery does not guarantee a finishable workflow

**Deliberate blocking policy.** When independent review is required, lack of a subagent tool, exhausted capacity, or prohibited delegation blocks merge-ready/shipping. Sequential self-review is explicitly insufficient. This avoids false verification claims, but is incompatible with a blanket promise that the complete stack works in any harness.

For your portable version, distinguish a usable single-agent mode from a stronger mode requiring independent review. Make the policy visible before work begins. A documented blocked gate is preferable to inventing proof, but the user should be able to choose a suitable workflow. See [Subagents][mode].

### C04. Worktrees do not reproduce Cursor cloud environments

**Execution difference.** Local workers share a machine. Concurrent browser sessions, fixed service ports, databases, caches, environment variables, and deployment credentials may collide even when Git worktrees differ. Multiple live verification lanes therefore need project-specific resource isolation.

The plan validator still requires exactly ten live lanes, including screenshot artifacts, and exact template wording. It changed the model and driver terminology, not that scale assumption. A one-person CLI project or a harness with a small worker limit can still hit a structurally inappropriate plan. See [plan validation][check-plan] and [orchestration][orchestrate].

### C05. Pi adds a runtime maintenance obligation

**New implementation and environmental dependency.** The port owns roughly 1,870 lines of Pi extension TypeScript across dispatch, RPC, process recovery, timers, UI, and worktrees. CI checks Pi 1.1.0, while the package's optional Pi peer range is `*`. Later Pi APIs require continued validation.

On macOS, restored-agent identity uses `ps`; Linux first uses `/proc`. All eight process-recovery failures in my sandbox disappeared in the targeted run with process inspection allowed. This is not an unresolved port defect, but demonstrates that a restricted environment can prevent normal orphan recovery.

Pi `readonly` excludes `edit` and `write` but retains `bash`; it is a review convention, not filesystem enforcement. Children also do not inherit arbitrary parent CLI flags, including an ad hoc API key or one-off project trust. Persisted configuration matters. The mapping documents these limitations. See [Pi agent implementation][pi-agents] and [Pi mapping][pi-map].

### C06. Pi model fallback is not provider-neutral

**Source-observed configuration constraint.** The shipped tables cover `anthropic`, `openai`, and legacy `openai-codex`. An unrecognized parent provider selects the Anthropic table. A Pi session using Gemini or a local provider therefore does not automatically keep that provider for roles requesting a family alias. It needs an explicit model remapping or parent inheritance, and otherwise may require credentials it does not have.

This is configurable and documented, but it trades Grok-specific assumptions for a smaller set of default provider assumptions. A generic default should inherit the current provider/model or ask for a supported mapping. See [models][models] and [resolution logic][pi-config].

### C07. State and configuration are only partly neutral

**Remaining coupling.** Model sheets have per-runtime locations, but orchestration prose still fixes the store at `~/.claude/orchestrate/<slug>/`. Several history instructions hard-code `~/.claude/projects` even though setup supports a custom `CLAUDE_CONFIG_DIR` and the audit helper honors it.

Codex model configuration requires writing a sheet and copying role rows into global `AGENTS.md`; editing one copy can leave the other stale. The hook reads its toggle from the sheet separately. This is a maintenance risk rather than a demonstrated parser failure. Prefer one canonical configuration with an explicit load instruction. See [setup][setup] and [orchestration][orchestrate].

### C08. Scheduling is session-bound and varies by harness

**Remaining capability gap.** Pi wakeups require a live interactive parent session; child agents and print/JSON mode reject scheduling. Codex's mapping suggests rerunning on a cadence or using an available scheduled task rather than providing a native loop implementation.

An hourly audit described in a playbook therefore does not guarantee durable unattended execution after the harness exits. The portable contract needs bounded foreground execution and an explicit checkpoint, with durable scheduling supplied separately when available. See [Pi mapping][pi-map] and [Codex mapping][codex-map].

### C09. Forge, shell, and organizational assumptions remain

**Inherited and partially improved constraints.** PR workflows still assume GitHub/`gh`, with special optional Origin support. There is no general GitLab/Bitbucket adapter. The watcher still recognizes the literal `Code Review Gate` check and named review-bot categories; those rules are not exposed as a generic policy configuration.

The stack still needs Git, Node for some helpers, Bun for others, and `gh` for GitHub workflows. Bash/awk scripts remain even though the audit was rewritten in Node and the Codex Windows session hook has a PowerShell adapter. Windows support for those two components is not proof that all playbooks run natively on Windows.

The decision logger uses Perl when available to make long row appends less prone to interleaving, but has a fallback when Perl is absent. It would be inaccurate to call Perl a hard new dependency. Skill-authoring workflows also still refer to the separately installed Claude `plugin-dev` companion or mapped alternatives. See [dependencies][runtime-support], [watcher implementation][watchgithub], and [logger][logger].

### C10. Personal policy remains part of the default product

**Deliberate design, not a broken port.** Mandatory architectural review triggers, comment stripping, prose rules, review diversity, and live verification requirements remain opinionated. Automatic routing makes these choices relevant to more ordinary tasks. Required independent review can add cost and latency even after model settings are changed.

The port makes runtime and model configuration easier; it does not separate a neutral workflow core from optional Poteto and Denyer policy profiles. For your objective, that remains a useful boundary to introduce. The hook explicitly gives user and repository instructions precedence, which should be preserved. See [routing][routing] and [core policy][mode].

Copilot also gets a permission hook: it approves reads inside the plugin and selected registered script invocation forms, and rejects pstack agent dispatch on models outside the saved choices. Other forms retain the normal permission flow. This is bounded adapter policy with tests, but it is more than a tool-name translation and should be considered alongside your own permission settings. See the [hook implementation][copilot-permissions].

## 6. Status against the original portability audit

“Improved” means concrete implementation addresses the issue. “Partial” means a meaningful limitation remains. “Excluded” means the dependency was removed along with the capability.

| Audit finding | Port's result | Remaining work for your objective |
| --- | --- | --- |
| F01 Installation/discovery | Improved for Claude, Codex, Pi, and Copilot | Preserve native Cursor distribution and verify additional harnesses |
| F02 Host tool schemas | Partial; concrete Claude/Codex/Pi/Copilot support | Supply OpenCode and other needed mappings; prefer capabilities in shared prose |
| F03 Model routing | Improved; centralized roles and overrides | Use parent-model defaults and provider-neutral fallback |
| F04 Rules/activation | Improved through real hooks and instruction loading | Make automatic routing an explicit profile choice |
| F05 Paths/state | Partial; runtime sheets and shared Git checkpoint store | Resolve orchestration/history paths consistently |
| F06 Transcripts | Partial; Pi/Copilot support, audit reads Codex | Complete Codex history workflows and custom-home handling |
| F07 Missing dependencies | Improved by bundling cleanup/review skills | Declare optional authoring, app-driver, and image/visualization capabilities |
| F08 Cloud/delegation | Partial; actual local workers and worktrees | Account for service isolation and offer a usable single-agent mode |
| F09 Scheduling | Partial; Pi implementation and other runtime advice | Distinguish live-session timers from durable scheduling |
| F10 Grok Bot | Excluded | Keep an optional Cursor pack or design a separate bot integration |
| F11 Benny | Excluded | Keep its automation pack separately if you want those features |
| F12 Forge assumptions | Largely retained | Configure forge and base-branch behavior for your repositories |
| F13 Review-bot/approval policy | Partial; stronger required-review handling | Configure gate names and organization policy |
| F14 Fixed verification scale | Largely retained | Replace exactly ten screenshot lanes with project proof requirements |
| F15 Bun/bootstrap | Partial; declared tooling and bootstrap fixes | Prepare dependencies explicitly and support your installation constraints |
| F16 OS/shell behavior | Improved in targeted helpers | Establish the OS baseline for complete workflows |
| F17 Authorization | Changed and strengthened in shipping | Select your desired merge/autonomy policy explicitly |
| F18 Personal style | Retained, with additional policy | Separate optional style and engineering-policy profiles |
| F19 MCP/evidence integrations | Mostly retained | Discover available evidence sources and add only integrations you use |
| F20 Documentation/provenance | Substantially improved | Keep the neutral fork's own support matrix and attribution current |
| F21 Compatibility checks | Substantially improved | Add real end-to-end coverage for your chosen harnesses and workflows |

## 7. What I would adopt and what I would change

I would reuse this fork's packaging, generation/sync boundary, attribution, bundled companion skills, watcher hardening, conservative cleanup, shared checkpoint storage, and Pi adapter if Pi is a target. These represent substantial engineering already available to you.

I would keep your original snapshot as a reference and adopt the fork in a separate branch or import step, with its upstream and policy changes recorded. I would not replace the original directory blindly or interpret its larger skill count as proof of equivalence.

The initial changes should be narrow and verifiable:

| Priority | Change | Acceptance condition |
| --- | --- | --- |
| P0 | Complete Codex history mapping | Recall, trail auditing, eval, and habit extraction read the intended workspace/run or explicitly use a supported fallback, without reading another harness's history by mistake |
| P0 | Declare the default behavior profile | Activation, merge authority, required reviewers, and autonomy gates are visible; the selected behavior follows your instructions |
| P0 | Implement the next real harness adapter | If OpenCode is a target, verify skill invocation, delegation, model selection, cancellation, and missing-capability behavior there |
| P1 | Add parent-model/provider defaults and capacity-aware execution | Ordinary work succeeds without Grok, an additional provider account, or an assumed worker count; required missing proof is reported accurately |
| P1 | Resolve state/configuration paths once | Custom homes work, orchestration does not depend on Claude's directory, and Codex model settings have one canonical source |
| P1 | Generalize plan proof requirements | CLI/API/UI projects can declare their actual proof and lane count; validation no longer requires exactly ten screenshots |
| P1 | Preserve Cursor and optional specialist packs | Native Cursor installation remains supported; Grok Bot and Benny are explicitly optional rather than accidentally lost |
| P1 | Test a few complete tasks in each selected harness | Investigation, bug fix, review, checkpoint/resume, and an authorized PR handoff produce the promised evidence under the same declared profile |

This is less work than starting the whole port over. It is still real work: the fork provides a strong implementation base, not the finished harness-neutral design described in the original audit.

## 8. Verification performed and its limits

All installations and dependency preparation for this evaluation used disposable directories. I did not install the plugin into your active agent configuration, make paid model calls, change either upstream checkout's source, or exercise real PR writes. The only workspace addition for this comparison is this report.

| Check | Observed result |
| --- | --- |
| Local original versus freshly fetched upstream pstack | All 171 tracked source files match byte for byte |
| Derivation/sync comparison against the port's recorded pstack pin | 85 unchanged retained files, 47 declared forks; no proposed writes, conflicts, undeclared/stale entries, or denylist hits |
| Same comparison against this repository's newer snapshot | Eight proposed changed paths, including two conflicting paths; no changes applied |
| `bun tools/generate.mjs --check` | Passed; 88 generated files current and checked invariants pass |
| `claude plugin validate .` and `claude plugin validate ./plugins/pstack` | Both passed with a disposable `CLAUDE_CONFIG_DIR` |
| Native Codex marketplace add, plugin add, and plugin list | Passed on Codex 0.163.0 using a disposable `CODEX_HOME`; pstack listed as installed and enabled |
| Root `bun test tests/`, with fixture Git signing disabled per process | 1,243 passed, 40 skipped, eight failed inside the restricted sandbox |
| Targeted `tests/pi/agents-session.test.mjs` rerun with process inspection allowed | All 25 passed, including all eight sandbox failures; no unresolved failures from that run |
| Vendored helper `bun run typecheck` | Passed |
| Vendored helper `bun test orch watch-pr check-plan.test.ts` | 258 passed, zero failed |
| Pi extension typecheck against installed Pi 1.1.0 | Passed after allowing the temporary compiler/cache operation |
| Pi installed-runtime startup and model-catalog checks | Four passed, zero failed; no model calls |

An earlier unisolated root run had 77 failures, mostly because fixture commits inherited local 1Password Git signing. After disabling signing only in the test process, the eight remaining failures required `ps`, which the sandbox denied. The targeted unrestricted rerun resolved those. Neither class is evidence of a reproducible port defect on a normal installation. I did not rerun the entire root suite outside the sandbox; the full-run and targeted results are reported separately.

Tests ran on macOS with Bun 1.4.3; the repository's CI pins Bun 1.3.14. Windows/Linux jobs, shell/Markdown/workflow lint, the external link checker, signed-in Copilot smoke tests, and model-backed Pi tests were not rerun in this evaluation. Claude manifest validation and native Codex installation are not claims that a real model completed every playbook. Maintainer-reported OpenCode, Copilot, Claude, and Pi live checks are useful evidence with the scopes described in its documentation, not tests I independently repeated.

The support conclusion is therefore specific: **the port is mechanically well maintained and the exercised code checks are sound; comprehensive behavioral equivalence across harnesses remains unproven and, for several policies and excluded integrations, is explicitly not its behavior.**

[original]: https://github.com/cursor/plugins/tree/8838150c6b4829ea3c01782631213776d86df14a/pstack
[port-readme]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/README.md
[pins]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/tools/upstream.json
[forks]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/tools/forks.json
[sync]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/tools/sync.mjs
[notices]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/NOTICE.md
[mode]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/SKILL.md
[autopilot]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/playbooks/autopilot-full.md
[shipping]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/playbooks/shipping.md
[watchpolicy]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/scripts/watch-pr/policy.ts
[routing]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/hooks/session-start-context.md
[resume]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/references/resume-storage.md
[pi-evidence]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/docs/pi-equivalence.md
[generator]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/tools/generate.mjs
[ci]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/.github/workflows/ci.yml
[recall]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/recall/SKILL.md
[trail]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/show-me-your-work/SKILL.md
[automate]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/automate-me/SKILL.md
[eval]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/playbooks/eval.md
[codex-map]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/references/codex-tools.md
[runtime-support]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/docs/reference.md
[check-plan]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/scripts/check-plan.mjs
[orchestrate]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/playbooks/orchestrate.md
[pi-agents]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/pi/agents.ts
[pi-map]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/references/pi-tools.md
[models]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/models.json
[pi-config]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/pi/config.ts
[setup]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/setup-pstack/SKILL.md
[watchgithub]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/poteto-mode/scripts/watch-pr/github.ts
[logger]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/skills/show-me-your-work/scripts/log.sh
[copilot-permissions]: https://github.com/michael-denyer/pstack-claude/blob/3cff27a2dda8ab0390e3db55f4190539c5b86759/plugins/pstack/hooks/pre-tool-use.sh
