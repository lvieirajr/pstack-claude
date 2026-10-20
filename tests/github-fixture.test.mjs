import { expect, test } from "bun:test";
import { fixtureAccount, githubFixture } from "./helpers/github-fixture.mjs";

const account = (scopes) =>
  `HTTP/2.0 200 OK\nX-Oauth-Scopes: ${scopes}\n\n{"login":"fixture-owner"}`;
function fake({ scopes = "repo, workflow" } = {}) {
  const calls = [];
  let created;
  const run = (args, input) => {
    calls.push({ args, input });
    const endpoint = args[3];
    if (endpoint === "--include") return account(scopes);
    const method = args.includes("--method")
      ? args[args.indexOf("--method") + 1]
      : "GET";
    if (endpoint === "user/repos" && method === "POST") {
      const body = JSON.parse(input);
      created = {
        id: 1,
        full_name: `fixture-owner/${body.name}`,
        private: body.private,
        description: body.description,
        default_branch: "main",
        html_url: `https://github.com/fixture-owner/${body.name}`,
      };
      return JSON.stringify(created);
    }
    if (method === "GET") return JSON.stringify(created);
    throw Error(`unexpected fixture call ${JSON.stringify(args)}`);
  };
  return { run, calls };
}

test("missing CI scope prevents repository creation and auth flows", () => {
  const f = fake({ scopes: "repo, read:org, gist" });
  expect(() => githubFixture({ run: f.run })).toThrow("-s workflow yourself");
  expect(f.calls).toHaveLength(1);
  expect(f.calls[0].args).toEqual([
    "api",
    "--hostname",
    "github.com",
    "--include",
    "user",
  ]);
});
test("unreported capabilities do not imply permission", () => {
  expect(() =>
    fixtureAccount(() => 'HTTP/2.0 200 OK\n\n{"login":"fixture-owner"}'),
  ).toThrow("capabilities were not reported");
});
test("a private fixture needs no deletion scope and records manual cleanup", () => {
  const f = fake();
  const fixture = githubFixture({ run: f.run, uuid: "owned-test" });
  expect(fixture.repository).toBe(
    "fixture-owner/pstack-pr-workflow-fixture-owned-test",
  );
  expect(JSON.parse(f.calls[1].input)).toMatchObject({
    private: true,
    auto_init: true,
  });
  expect(fixture.record).toMatchObject({
    repository: fixture.repository,
    id: 1,
    url: `https://github.com/${fixture.repository}`,
    cleanup: "manual",
  });
  expect(fixture.cleanup).toBe("manual");
  expect(fixture.api("").full_name).toBe(fixture.repository);
  expect(f.calls.some((call) => call.args.includes("DELETE"))).toBe(false);
});
for (const suffix of ["", "/"])
  for (const method of ["DELETE", "delete"])
    test(`manual cleanup rejects ${method} ${suffix || "repository"} without a request`, () => {
      const f = fake();
      const fixture = githubFixture({ run: f.run, uuid: "owned-test" });
      const before = f.calls.length;
      expect(() => fixture.api(suffix, method)).toThrow("cleanup is manual");
      expect(f.calls).toHaveLength(before);
    });

test("retained fixtures are reused without another creation", () => {
  const f = fake();
  const first = githubFixture({ run: f.run, uuid: "abcdef12-3456" });
  const reused = githubFixture({ run: f.run, record: first.record });
  expect(reused.record).toEqual(first.record);
  expect(f.calls.filter((call) => call.args[3] === "user/repos")).toHaveLength(
    1,
  );
});
for (const changed of [
  { id: 2 },
  { private: false },
  { full_name: "other/repository" },
  { description: "different fixture" },
])
  test(`retained fixture identity rejects ${JSON.stringify(changed)}`, () => {
    const f = fake();
    const first = githubFixture({ run: f.run, uuid: "abcdef12-3456" });
    const run = (args, input) => {
      const value = f.run(args, input);
      return args[3] === `repos/${first.repository}`
        ? JSON.stringify({ ...JSON.parse(value), ...changed })
        : value;
    };
    expect(() => githubFixture({ run, record: first.record })).toThrow();
    expect(
      f.calls.filter((call) => call.args[3] === "user/repos"),
    ).toHaveLength(1);
  });

test("public synthetic fixtures require an explicit visibility choice", () => {
  const f = fake();
  const fixture = githubFixture({
    run: f.run,
    uuid: "abcdef12-3456",
    visibility: "public",
  });
  expect(JSON.parse(f.calls[1].input).private).toBe(false);
  expect(fixture.record.visibility).toBe("public");
  expect(() => githubFixture({ run: f.run, record: fixture.record })).toThrow();
  expect(
    githubFixture({ run: f.run, record: fixture.record, visibility: "public" })
      .record,
  ).toEqual(fixture.record);
});
