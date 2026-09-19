/** Known 0.7.6 limitation, not a new discovery. These safety tests intentionally fail on the pinned baseline. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, mkdirSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resolveProjectIdentity, migrateProjectDb} from '../fixtures/upstream/engram-identity.ts';

for (const first of ['A', 'B']) test(`ambiguous legacy ownership must not be assigned by opening ${first} first`, t => {
  const root = mkdtempSync(join(tmpdir(), 'engram-ownership-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const dbDir = join(root, 'db'); mkdirSync(dbDir);
  const identities = {};
  for (const name of ['A', 'B']) {
    const cwd = join(root, 'workspace-' + name); mkdirSync(cwd);
    identities[name] = resolveProjectIdentity(cwd);
  }
  assert.equal(identities.A.legacyDbName, identities.B.legacyDbName);
  assert.notEqual(identities.A.dbName, identities.B.dbName);
  const oldPath = join(dbDir, identities.A.legacyDbName);
  const db = new DatabaseSync(oldPath);
  db.exec('CREATE TABLE synthetic_memories (workspace TEXT, content TEXT)');
  for (const name of ['A', 'B']) db.prepare('INSERT INTO synthetic_memories VALUES (?, ?)').run(name, 'synthetic-' + name);
  db.close();
  const second = first === 'A' ? 'B' : 'A';
  const outcomes = [migrateProjectDb(dbDir, identities[first]), migrateProjectDb(dbDir, identities[second])];
  const destination = join(dbDir, identities[first].dbName);
  let rows;
  if (existsSync(destination)) {
    const migrated = new DatabaseSync(destination, {readOnly: true});
    try { rows = migrated.prepare('SELECT workspace FROM synthetic_memories ORDER BY workspace').all().map(r => r.workspace); }
    finally { migrated.close(); }
  }
  t.diagnostic(JSON.stringify({first, outcomes, observedOwnerRows: rows, fixture: 'real SQLite / synthetic schema'}));
  assert(existsSync(oldPath), 'Known limitation: the ambiguous old database was automatically assigned to the first workspace');
  assert(!existsSync(destination), 'An unconfirmed ownership decision must not create a project destination');
});
