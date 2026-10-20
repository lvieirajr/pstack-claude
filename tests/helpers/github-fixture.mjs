import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const requiredScopes = ["repo", "workflow"];
const runGh = (args, input) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    input,
    timeout: 30000,
    stdio: ["pipe", "pipe", "pipe"],
  });

// Classic OAuth scopes are required by this opt-in test fixture, not by pstack.
export function fixtureAccount(run = runGh) {
  const response = run([
    "api",
    "--hostname",
    "github.com",
    "--include",
    "user",
  ]);
  const header = response.match(/^x-oauth-scopes:\s*([^\r\n]*)/im)?.[1];
  assert.ok(
    header !== undefined,
    "This fixture needs a classic gh login with repo and workflow scopes; token capabilities were not reported.",
  );
  const scopes = header.split(",").map((scope) => scope.trim());
  const missing = requiredScopes.filter((scope) => !scopes.includes(scope));
  assert.equal(
    missing.length,
    0,
    `Missing gh scopes (${missing.join(", ")}). Run gh auth refresh -h github.com ${missing.map((scope) => `-s ${scope}`).join(" ")} yourself. No authentication flow or repository was started.`,
  );
  const login = JSON.parse(response.slice(response.indexOf("{"))).login;
  assert.match(login, /^[A-Za-z0-9-]+$/, "invalid GitHub fixture owner");
  return login;
}

export function githubFixture({
  run = runGh,
  uuid = randomUUID(),
  record: retained,
  visibility = "private",
} = {}) {
  assert.ok(
    ["private", "public"].includes(visibility),
    "invalid fixture visibility",
  );
  const privateRepository = visibility === "private";
  const login = fixtureAccount(run);
  let existing;
  if (retained) {
    assert.match(
      retained.repository,
      new RegExp(`^${login}/pstack-pr-workflow-fixture-[a-f0-9-]+$`),
    );
    existing = JSON.parse(
      run(["api", "--hostname", "github.com", `repos/${retained.repository}`]),
    );
    assert.equal(existing.id, retained.id, "fixture identity changed");
    assert.equal(existing.full_name, retained.repository);
    assert.equal(existing.description, retained.marker);
    assert.equal(existing.private, privateRepository);
    assert.equal(retained.cleanup, "manual");
    uuid = retained.repository.split("pstack-pr-workflow-fixture-")[1];
  }
  const name = `pstack-pr-workflow-fixture-${uuid}`;
  const repository = `${login}/${name}`;
  const marker = `Disposable pstack PR workflow fixture ${uuid}`;
  const api = (endpoint, method = "GET", body) => {
    assert.notEqual(
      method.toUpperCase(),
      "DELETE",
      "This fixture never deletes GitHub repositories; cleanup is manual.",
    );
    return JSON.parse(
      run(
        [
          "api",
          "--hostname",
          "github.com",
          endpoint,
          "--method",
          method,
          ...(body === undefined ? [] : ["--input", "-"]),
        ],
        body === undefined ? undefined : JSON.stringify(body),
      ),
    );
  };
  const created =
    existing ??
    api("user/repos", "POST", {
      name,
      description: marker,
      private: privateRepository,
      auto_init: true,
    });
  assert.equal(created.full_name, repository);
  assert.equal(created.private, privateRepository);
  assert.equal(created.description, marker, "fixture marker changed");
  assert.ok(Number.isSafeInteger(created.id));
  const record = {
    repository,
    id: created.id,
    marker,
    defaultBranch: created.default_branch,
    url: created.html_url,
    cleanup: "manual",
    visibility,
  };
  return {
    ...record,
    record,
    api: (suffix, method, body) =>
      api(`repos/${repository}${suffix}`, method, body),
  };
}
