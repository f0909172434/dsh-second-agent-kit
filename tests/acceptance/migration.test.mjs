import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {resolveProjectIdentity, migrateProjectDb} from '../fixtures/upstream/engram-identity.ts';
import {inspectEngramUpgrade} from '../../src/engram-upgrade.mjs';

for (const first of ['A', 'B']) test(`known upstream limitation: ${first} opens first and receives both projects' SQLite rows`, t => {
  const root = mkdtempSync(join(tmpdir(), 'engram-migration-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const dbDir = join(root, 'db'); mkdirSync(dbDir);
  const paths = Object.fromEntries(['A', 'B'].map(x => [x, join(root, 'workspace-' + x)]));
  for (const p of Object.values(paths)) mkdirSync(p);
  const ids = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, resolveProjectIdentity(path)]));
  assert.equal(ids.A.legacyDbName, ids.B.legacyDbName);
  const legacy = join(dbDir, ids.A.legacyDbName);
  const db = new DatabaseSync(legacy);
  db.exec('CREATE TABLE synthetic_memories (workspace TEXT, content TEXT)');
  for (const owner of ['A', 'B']) db.prepare('INSERT INTO synthetic_memories VALUES (?, ?)').run(owner, 'fixture-' + owner);
  db.close();
  const bytes = readFileSync(legacy);
  const report = inspectEngramUpgrade({dbDir, workspaces: Object.values(paths)});
  assert.equal(report.status, 'manual-review-required');
  assert.deepEqual(readFileSync(legacy), bytes);
  const second = first === 'A' ? 'B' : 'A';
  assert.equal(migrateProjectDb(dbDir, ids[first]), 'renamed');
  assert.equal(migrateProjectDb(dbDir, ids[second]), 'none');
  assert(!existsSync(legacy));
  assert(!existsSync(join(dbDir, ids[second].dbName)));
  const migrated = new DatabaseSync(join(dbDir, ids[first].dbName), {readOnly: true});
  try { assert.deepEqual(migrated.prepare('SELECT workspace FROM synthetic_memories ORDER BY workspace').all().map(r => r.workspace), ['A', 'B']); }
  finally { migrated.close(); }
  assert.equal(createHash('sha256').update(readFileSync(join(dbDir, ids[first].dbName))).digest('hex'), createHash('sha256').update(bytes).digest('hex'));
  t.diagnostic(JSON.stringify({upstreamMigrationSafety: 'NOT_ACCEPTED', firstWorkspace: first,
    observedOwnerRows: ['A', 'B'], checkerBlockedBeforeMigration: true, storage: 'real SQLite; synthetic schema'}));
});
