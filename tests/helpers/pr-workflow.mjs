import { writeFileSync } from "node:fs";

export const cliSource = (fixed) =>
  `const input=process.argv[2];if(${fixed ? "input === undefined || !input.trim() || " : ""}!/^[0-9, ]*$/.test(input)){console.error('invalid input');process.exitCode=2}else console.log(input.split(',').reduce((n,v)=>n+Number(v),0));\n`;
export const testsSource = (regression) =>
  `import{test}from'node:test';import assert from'node:assert/strict';import{spawnSync}from'node:child_process';\ntest('valid sum',()=>assert.equal(spawnSync(process.execPath,['sum.mjs','1, 2'],{encoding:'utf8'}).stdout,'3\\n'));\ntest('missing argument',()=>assert.equal(spawnSync(process.execPath,['sum.mjs']).status,2));\n${regression ? "test('blank input',()=>assert.equal(spawnSync(process.execPath,['sum.mjs','   ']).status,2));\n" : ""}`;
export function writeVerifier(
  file,
  { baseCheckout, base, verdict, headBranch = "lane-1", baseBranch = "main" },
) {
  writeFileSync(
    file,
    `import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const baseCheckout = ${JSON.stringify(baseCheckout)}, base = ${JSON.stringify(base)};
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
assert.equal(git(baseCheckout, 'rev-parse', 'HEAD'), base, 'baseline checkout changed');
const head = git(process.cwd(), 'rev-parse', 'HEAD');
const checkoutBranch = git(process.cwd(), 'branch', '--show-current');
const headBranch = ${JSON.stringify(headBranch)}, baseBranch = ${JSON.stringify(baseBranch)};
assert.equal(git(process.cwd(), 'rev-parse', 'refs/heads/' + headBranch), head, 'PR head branch changed');
assert.equal(git(baseCheckout, 'rev-parse', 'refs/heads/' + baseBranch), base, 'PR base branch changed');
const patch = execFileSync('git', ['diff', base, head], { encoding: 'utf8' });
const patchId = execFileSync('git', ['patch-id', '--stable'], { input: patch, encoding: 'utf8' }).trim().split(/\\s+/)[0];
assert.match(patchId, /^[a-f0-9]{40,64}$/, 'nonempty patch identity');
const run = (cwd, input) => {
  const r = spawnSync('node', ['sum.mjs', ...(input === undefined ? [] : [input])], { cwd, encoding: 'utf8' });
  return { input, status: r.status, stdout: r.stdout, stderr: r.stderr };
};
const before = run(baseCheckout, '   '), after = run(process.cwd(), '   '), valid = run(process.cwd(), '1, 2');
assert.equal(before.status, 0);
assert.equal(before.stdout, '0\\n');
assert.equal(after.status, 2);
assert.equal(after.stderr, 'invalid input\\n');
assert.equal(valid.status, 0);
assert.equal(valid.stdout, '3\\n');
const noArgument = { before: run(baseCheckout), after: run(process.cwd()) };
for (const observed of Object.values(noArgument)) {
  assert.equal(observed.status, 2);
  assert.equal(observed.stderr, 'invalid input\\n');
}
const receipt = { verdict: 'PASS', head, base, headBranch, baseBranch, checkoutBranch, patchId, before, after, valid, noArgument };
writeFileSync(${JSON.stringify(verdict)}, JSON.stringify(receipt));
console.log(JSON.stringify(receipt));
`,
  );
}
