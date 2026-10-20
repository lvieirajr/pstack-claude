import { expect, test } from "bun:test";
import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { headlessBrowser } from "./fixtures/verification/browser.mjs";
import { fixture, nativeRun, digest } from "./helpers/native-delegation.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const enabled = process.env.PSTACK_LIVE_VERIFICATION === "1";
const quote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";
const read = (path) => JSON.parse(readFileSync(path, "utf8"));

for (const runtime of ["claude", "codex"])
  test.skipIf(!enabled)(
    `${runtime}: native installed driver proves real CLI/API/UI isolation and failure cleanup`,
    async () => {
      const browser = headlessBrowser();
      const f = fixture(runtime, repo);
      f.env.PSTACK_BROWSER = browser;
      const evidence = mkdtempSync(join(tmpdir(), `pstack-live-${runtime}-`));
      try {
        for (const file of ["app.mjs", "prove.mjs", "browser.mjs"])
          cpSync(
            join(repo, "tests/fixtures/verification", file),
            join(f.workspace, file),
          );
        const skill = join(
          f.workspace,
          runtime === "claude" ? ".claude" : ".agents",
          "skills/verify",
        );
        mkdirSync(skill, { recursive: true });
        const contract = join(
          f.plugin,
          "skills/poteto-mode/references/verification.md",
        );
        assert.equal(
          digest(contract),
          digest(
            join(
              repo,
              "plugins/pstack/skills/poteto-mode/references/verification.md",
            ),
          ),
        );
        const command = `node ${quote(join(f.workspace, "prove.mjs"))} ${quote(f.worktrees[0])} ${quote(f.worktrees[1])} ${quote(evidence)}`;
        writeFileSync(
          join(skill, "SKILL.md"),
          `---\nname: verify\ndescription: Drive the real local fixture CLI, HTTP API and browser with isolated SQLite databases and browser profiles.\n---\n\n# Verify the fixture\n\nRead ${contract}.\n\n## Launch, doctor and drive\n\nRun the project-owned driver from this checkout\n\n\`\`\`shell\n${command}\n\`\`\`\n\nIt launches loopback servers on bind-assigned ports and headless browsers with fresh profiles. It checks /meta for PID and head, drives CLI add/list, real POST/GET and browser input/click, then independently reads SQLite effects through the CLI. Two instances stay up together and receive simultaneous API writes. The invalid request must return 422 without changing data.\n\n## Evidence\n\n${evidence} holds per-lane CLI transcripts, request/response receipts, CDP actions, screenshots and source/resource identities. An independent reader inspects these after cleanup.\n\n## Cleanup\n\nThe driver stops only its owned browser/server handles and removes only its fresh app state, including failed attempts. Evidence stays. It confirms instance B still works after A is stopped.\n`,
        );
        f.git(f.workspace, "add", ".");
        f.git(f.workspace, "commit", "-m", "Project-owned verification driver");
        const head = f.git(f.workspace, "rev-parse", "HEAD").trim();
        for (const worktree of f.worktrees.slice(0, 2))
          f.git(worktree, "reset", "--hard", head);
        const shell = (cmd) => ({
          name: runtime === "claude" ? "Bash" : "exec_command",
          args:
            runtime === "claude"
              ? { command: cmd, timeout: 60000 }
              : { cmd, workdir: f.workspace, yield_time_ms: 30000 },
        });
        const resultText = (result) => JSON.stringify(result);
        // The opt-in fixture has no credentials and only scripted local actions.
        // macOS sandboxing may prevent browser launch; no live user settings are changed.
        const native = await nativeRun(
          f,
          async function* () {
            const source = resultText(
              yield shell(
                `cat ${quote(join(skill, "SKILL.md"))} ${quote(contract)}`,
              ),
            );
            assert.ok(
              source.includes("Own runtime resources as well as files"),
              source,
            );
            assert.ok(
              source.includes(command),
              "read the resolved project driver",
            );
            const driven = resultText(yield shell(command));
            assert.ok(driven.includes("passed"), driven);
          },
          { codexSandbox: "danger-full-access" },
        );
        assert.ok(native.requests >= 3);
        const summary = read(join(evidence, "summary.json"));
        expect(summary.outcome).toBe("passed");
        expect(summary.scratchRemoved).toBe(true);
        expect(summary.receipts).toHaveLength(2);
        expect(
          summary.processExit.every(
            (child) => child.exitCode !== null || child.signal !== null,
          ),
        ).toBe(true);
        expect(
          new Set(summary.receipts.map((receipt) => receipt.port)).size,
        ).toBe(2);
        expect(
          new Set(summary.receipts.map((receipt) => receipt.browserPort)).size,
        ).toBe(2);
        for (const receipt of summary.receipts) {
          expect(receipt.head).toBe(head);
          expect(receipt.expected.at(-1)).toBe(`parallel-${receipt.owner}`);
          expect(receipt.uiExpected).toEqual([
            `cli-${receipt.owner}`,
            `api-${receipt.owner}`,
            `ui-${receipt.owner}`,
          ]);
          expect(receipt.appSha256).toBe(digest(join(f.workspace, "app.mjs")));
          expect(existsSync(receipt.database)).toBe(false);
          expect(existsSync(receipt.profile)).toBe(false);
          const transcript = read(join(receipt.artifacts, "cli-list.json"));
          expect(transcript.exitStatus).toBe(0);
          expect(JSON.parse(transcript.stdout)).toEqual(receipt.expected);
          const responses = read(join(receipt.artifacts, "responses.json"));
          expect(
            responses.some(
              (item) =>
                item.response.status === 201 &&
                item.response.body.added === `api-${receipt.owner}`,
            ),
          ).toBe(true);
          if (receipt.owner === "A")
            expect(responses.at(-1).response).toMatchObject({
              status: 422,
              body: { error: "value is required" },
            });
          const actions = read(join(receipt.artifacts, "browser-actions.json"));
          expect(
            actions.some(
              (action) =>
                action.method === "Input.dispatchMouseEvent" &&
                action.params.type === "mouseReleased",
            ),
          ).toBe(true);
          expect(
            readFileSync(join(receipt.artifacts, "ui.png"))
              .subarray(0, 8)
              .toString("hex"),
          ).toBe("89504e470d0a1a0a");
        }
        console.log(
          JSON.stringify({
            runtime,
            version: f.run(runtime, ["--version"]).trim(),
            evidence,
            outcome: summary.outcome,
            externalModelCalls: false,
            note: "Real native tools and app/browser processes; scripted model provider, no model-compliance claim.",
          }),
        );
      } finally {
        f.cleanup();
      }
    },
    120000,
  );
