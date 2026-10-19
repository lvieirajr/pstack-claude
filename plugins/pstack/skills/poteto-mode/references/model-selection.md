# Model selection contract

Read this before choosing models or reasoning levels for a pstack role. It applies only to Claude Code and Codex. Their platform mappings supply the native dispatch details; other harnesses retain the inherited instructions.

## Selection and validation

A saved role override takes precedence over the role's generated default. On these two harnesses, ordinary default/worker roles default to `inherit-parent`, taking precedence over the inherited shared examples and fallback instructions. `auto` is an equivalent alias. Neither chooses a provider. Omit a model override when native inheritance provides the parent model; inspect native agent defaults that could change that choice. When the host cannot honor the requested inheritance, report the conflict and ask for configuration.

The strongest judgment role and diverse panels keep explicit model choices. Their shipped values are candidates, not proof of access or suitability on another harness. Confirm the strongest model against the user's available choices; never claim an inherited model is the strongest without that confirmation.

Validate the resolved model ID and requested reasoning level against the active tool schema, model catalog, and native agent configuration. A known catalog entry does not prove account access. If access fails, report the requested model and the configuration needed. Do not substitute another model, provider, or reasoning level without a user choice. If the host cannot expose or apply a requested setting, report that limitation before dispatch.

`session` means no explicit reasoning override. On the same model, use native inheritance. After switching models, use that model's native default unless the user configured an explicit supported level. Different harnesses and models support different levels; the levels shipped for Claude are not a universal list.

## Panels and review gates

Keep the configured number of seats. Resolve aliases to actual model identities before assessing diversity. At least two distinct model identities are necessary for model diversity. Repeating a model or changing only its reasoning level adds seats, not model diversity. A parent-model alias cannot establish an additional distinct identity by itself. Record provider diversity separately from model diversity.

When a required diverse panel cannot run, name the missing models or unsupported settings and request configuration. A user may deliberately choose a reduced-diversity workflow; record `panel diversity: reduced` in its sheet and identify the limitation in the result. That workflow cannot satisfy a gate requiring diverse models. A requirement for independent review still needs independent reviewers.

## Native mappings

| Harness | Model selection | Reasoning and limits |
| --- | --- | --- |
| Claude Code | Use the active `Agent` model enum; omit the override for inheritance. Do not convert an unsupported saved model into a different model automatically. | Use a supported effort agent only after checking the chosen model's supported levels. |
| Codex | Use the host's exposed model selector or an existing native agent configuration. Treat the examples in its mapping as examples. | Use `reasoning_effort` only when exposed and supported. If selecting model/effort requires a fresh agent context, supply that context explicitly. An unavailable selector or a conflicting native agent configuration needs configuration, not an ignored override. |

Native behavior references: [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents). Inspect the active version and tool schema before relying on a selector.
