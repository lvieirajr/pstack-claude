# Model selection contract

Read this before choosing models or reasoning levels for a pstack role. It applies to every harness; a platform mapping supplies the native dispatch details.

## Selection and validation

A saved role override takes precedence over the role's generated default. Ordinary single-model roles default to `inherit-parent`. `auto` is an equivalent alias. Neither chooses a provider. Omit a model override when native inheritance provides the parent model; inspect native agent defaults that could change that choice. When the host cannot honor the requested inheritance, report the conflict and ask for configuration.

The strongest judgment role and diverse panels keep explicit model choices. Their shipped values are candidates, not proof of access or suitability on another harness. Confirm the strongest model against the user's available choices; never claim an inherited model is the strongest without that confirmation.

Validate the resolved model ID and requested reasoning level against the active tool schema, model catalog, and native agent configuration. A known catalog entry does not prove account access. If access fails, report the requested model and the configuration needed. Do not substitute another model, provider, or reasoning level without a user choice. If the host cannot expose or apply a requested setting, report that limitation before dispatch.

`session` means no explicit reasoning override. On the same model, use native inheritance. After switching models, use that model's native default unless the user configured an explicit supported level. Different harnesses and models support different levels; the levels shipped for Claude are not a universal list.

## Panels and review gates

Keep the configured number of seats. Resolve aliases to actual model identities before assessing diversity. At least two distinct model identities are necessary for model diversity. Repeating a model or changing only its reasoning level adds seats, not model diversity. A parent-model alias cannot establish an additional distinct identity by itself. Record provider diversity separately from model diversity.

When a required diverse panel cannot run, name the missing models or unsupported settings and request configuration. A user may deliberately choose a reduced-diversity workflow; record `panel diversity: reduced` in its sheet and identify the limitation in the result. That workflow cannot satisfy a gate requiring diverse models. A requirement for independent review still needs independent reviewers. `panel vendors: any` waives only the Copilot sheet's vendor check.

## Native mappings

| Harness | Model selection | Reasoning and limits |
| --- | --- | --- |
| Claude Code | Use the active `Agent` model enum; omit the override for inheritance. Do not convert an unsupported saved model into a different model automatically. | Use a supported effort agent only after checking the chosen model's supported levels. |
| Codex | Use the host's exposed model selector or an existing native agent configuration. Treat the examples in its mapping as examples. | Use `reasoning_effort` only when exposed and supported. If selecting model/effort requires a fresh agent context, supply that context explicitly. An unavailable selector or a conflicting native agent configuration needs configuration, not an ignored override. |
| Copilot CLI/app | Use the current `task` model enum and saved role choice; ordinary unconfigured roles omit `model`. | Pass `reasoning_effort` only when that tool exposes it and the selected model supports it. The app and CLI may expose different capabilities. |
| Pi | Use a full `provider/id`, an explicit `pi models:` mapping, or an alias in the current provider's table. Unknown providers have no fallback table. | The extension checks the model registry, configured credentials, and model thinking metadata before launching. Explicit unsupported levels fail rather than being clamped. A child does not inherit one-off parent credential flags. |
| OpenCode | Use `opencode models` and an existing native subagent's `provider/model-id` configuration. Omission normally inherits the invoking agent's model. | Configure provider-specific reasoning options on a supported native agent. Do not invent `model` or `reasoning_effort` parameters on a task tool that lacks them. The concrete pstack adapter remains task #7; reading a sheet alone does not apply its settings. |

Native behavior references: [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents), [Copilot agent configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration), [OpenCode agents](https://opencode.ai/docs/agents/), and [Pi extension APIs](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs/extensions.md). Inspect the active version and tool schema before relying on a selector.

## Central configuration contract

The canonical non-secret configuration for the dotfiles installation will live under `~/.agents`; task #3 finalizes its path, serialization, loading, and installation. It owns one set of role names and panel seat counts, default reasoning, hook preference, and the user's model choices. Runtime-specific model IDs and supported reasoning settings belong to overrides in that same source when they cannot be shared. Credentials stay in each provider's native credential store.

Each adapter must read that source or derive its native configuration from it. Under that installation, the per-runtime `pstack-models.md` sheets will be derived views of the same role contract, rather than independently edited authorities. Preserve the role labels generated from `models.json`, ordered panel entries, explicit override precedence, parent aliases, and reduced-diversity status in every projection. Never copy one harness's model IDs blindly into another's configuration.

This issue changes shipped defaults and model selection. It does not yet install, synchronize, or relocate user sheets. Until task #3 supplies those mechanisms, `setup-pstack` still writes the current runtime's sheet at its documented native path; it must not claim other runtimes were configured too.
