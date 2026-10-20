import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { basename } from "node:path";

// This fixture must never pick the user's desktop browser automatically.
export function headlessBrowser(env = process.env) {
  const browser = env.PSTACK_BROWSER;
  assert.ok(
    browser,
    "Set PSTACK_BROWSER to a dedicated chrome-headless-shell executable; no desktop browser is launched by default.",
  );
  assert.match(
    basename(browser),
    /^(?:chrome-headless-shell|headless_shell)(?:\.exe)?$/,
    "The fixture requires a dedicated headless shell, not desktop Chrome.",
  );
  assert.ok(
    existsSync(browser),
    "PSTACK_BROWSER does not exist; install a dedicated headless shell separately.",
  );
  return browser;
}
