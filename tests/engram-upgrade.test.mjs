import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inspectEngramUpgrade} from '../src/engram-upgrade.mjs';
import {resolveProjectIdentity} from './fixtures/upstream/engram-identity.ts';

test('upstream migration fixture is the exact reviewed source', () => {
  const source = readFileSync(new URL('./fixtures/upstream/engram-identity.ts', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), '60bb88a1eb5a963f7bbe6ae52d5f09e8e6f8137f09d303d1321d1a3093b54e04');
});

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'engram-check-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const dbDir = join(root, 'db'), workspaces = ['workspace-A', 'workspace-B'].map(x => join(root, x));
  for (const dir of [dbDir, ...workspaces]) mkdirSync(dir);
  return {dbDir, workspaces};
}
test('clean workspaces use upstream names and remain unmodified', t => {
  const f = fixture(t), report = inspectEngramUpgrade(f);
  assert.equal(report.status, 'no-legacy-conflict');
  for (const row of report.results) assert.equal(row.currentFile, resolveProjectIdentity(row.workspace).dbName);
  assert.notEqual(report.results[0].currentFile, report.results[1].currentFile);
  assert.deepEqual(readdirSync(f.dbDir), []);
});
test('ambiguous old database blocks both workspaces without reading or changing contents', t => {
  const f = fixture(t), old = join(f.dbDir, resolveProjectIdentity(f.workspaces[0]).legacyDbName);
  const secret = 'SYNTHETIC-CONTENT-MUST-NOT-APPEAR';
  writeFileSync(old, secret);
  const report = inspectEngramUpgrade(f);
  assert.equal(report.status, 'manual-review-required');
  assert(report.results.every(r => r.status === 'manual-review-required'));
  assert(!JSON.stringify(report).includes(secret));
  assert.equal(readFileSync(old, 'utf8'), secret);
  assert.equal(readdirSync(f.dbDir).length, 1);
});
test('old and new coexist without overwrite', t => {
  const f = fixture(t), id = resolveProjectIdentity(f.workspaces[0]);
  writeFileSync(join(f.dbDir, id.legacyDbName), 'old');
  writeFileSync(join(f.dbDir, id.dbName), 'new');
  const report = inspectEngramUpgrade(f);
  assert.equal(report.results[0].reason, 'legacy-and-current-coexist');
  assert.equal(readFileSync(join(f.dbDir, id.legacyDbName), 'utf8'), 'old');
  assert.equal(readFileSync(join(f.dbDir, id.dbName), 'utf8'), 'new');
});
test('orphan sidecars and dangling old symlinks require review', t => {
  const f = fixture(t), id = resolveProjectIdentity(f.workspaces[0]);
  writeFileSync(join(f.dbDir, id.legacyDbName + '-wal'), 'sidecar');
  symlinkSync(join(f.dbDir, 'absent'), join(f.dbDir, id.legacyDbName));
  assert.equal(inspectEngramUpgrade(f).results[0].legacyArtifacts.length, 2);
});
test('Git origin and worktree naming matches the actual upstream resolver', t => {
  const f = fixture(t), [a,b] = f.workspaces;
  mkdirSync(join(a, '.git'));
  writeFileSync(join(a, '.git/config'), '[remote "origin"]\nurl = https://github.com/example/shared.git\n');
  mkdirSync(join(a, '.git/worktrees/b'), {recursive: true});
  writeFileSync(join(a, '.git/worktrees/b/commondir'), '../..');
  writeFileSync(join(b, '.git'), `gitdir: ${join(a, '.git/worktrees/b')}`);
  const report = inspectEngramUpgrade(f);
  for (const row of report.results) assert.equal(row.currentFile, resolveProjectIdentity(row.workspace).dbName);
  assert.equal(report.results[0].currentFile, report.results[1].currentFile);
});
test('CLI distinguishes clean, blocked and invalid input', t => {
  const f = fixture(t);
  const run = (...extra) => spawnSync(process.execPath, [resolve('scripts/check-engram-upgrade.mjs'), '--db-dir', f.dbDir, '--workspace', f.workspaces[0], ...extra], {encoding: 'utf8'});
  assert.equal(run().status, 0);
  writeFileSync(join(f.dbDir, resolveProjectIdentity(f.workspaces[0]).legacyDbName), 'old');
  assert.equal(run().status, 1);
  assert.equal(run('--unsupported').status, 2);
  assert.throws(() => inspectEngramUpgrade({...f, dbDir: join(f.dbDir, 'missing')}));
  assert.throws(() => inspectEngramUpgrade({...f, workspaces: []}));
});
