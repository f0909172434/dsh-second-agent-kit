import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, rmSync, readFileSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {resolveProjectIdentity} from '../fixtures/upstream/engram-identity.ts';

test('unmodified published Engram 0.7.6: offline real SQLite acceptance', {timeout: 60000}, async t => {
  const pkg = JSON.parse(readFileSync(new URL('../../node_modules/@kenz1117/dsh-engram/package.json', import.meta.url)));
  assert.equal(pkg.version, '0.7.6');
  const realFetch = globalThis.fetch;
  // Match upstream's composition tests: no network/model download; native keyword fallback.
  globalThis.fetch = async () => { throw new Error('External requests disabled in acceptance'); };
  const {apply} = await import('@kenz1117/dsh-engram');
  const root = mkdtempSync(join(tmpdir(), 'engram-stock-'));
  const dbDir = join(root, 'db'), paths = ['workspace-A', 'workspace-B'].map(x => join(root, x));
  for (const p of [dbDir, ...paths]) mkdirSync(p);
  const tools = new Map(), disposers = [];
  const ctx = {tools: {register: tool => tools.set(tool.name, tool)}, inject() {}, on() {}, get() {},
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); }};
  const context = (cwd, id) => ({agent: {id, session: {id, header: {cwd}}}, signal: new AbortController().signal});
  const a = context(paths[0], 'session-A'), b = context(paths[1], 'session-B');
  const call = (name, args, exec = a) => tools.get(name).execute(args, exec);
  try {
    apply(ctx, {dbDir, modelCacheDir: join(root, 'empty-model-cache'), ingest: 'off', injectProfile: false, queryRewrite: false, reviewScheduling: false});
    const save = (content, exec, scope = 'project') => call('engram_save', {scope, kind: 'fact', content, importance: 0.8}, exec);
    const search = (query, exec, scope = 'project') => call('engram_search', {scope, query}, exec);
    let savedA, savedB;
    await t.test('same-prefix workspaces save into distinct real databases', async () => {
      [savedA, savedB] = await Promise.all([save('ALPHAZEBRA workspace decision', a), save('BETATIGER workspace decision', b)]);
      assert.equal(resolveProjectIdentity(paths[0]).legacyDbName, resolveProjectIdentity(paths[1]).legacyDbName);
      for (const [path, saved] of [[paths[0], savedA], [paths[1], savedB]]) {
        const db = new DatabaseSync(join(dbDir, resolveProjectIdentity(path).dbName), {readOnly: true});
        try { assert(db.prepare('SELECT id FROM nodes WHERE id = ?').get(saved.id)); } finally { db.close(); }
      }
    });
    await t.test('interleaved searches never return the other workspace record', async () => {
      for (let round = 0; round < 8; round++) {
        const [aa, ab, ba, bb] = await Promise.all([
          search('ALPHAZEBRA', a), search('BETATIGER', a), search('ALPHAZEBRA', b), search('BETATIGER', b),
        ]);
        assert(aa.text.includes(savedA.id)); assert(bb.text.includes(savedB.id));
        assert(!ab.text.includes(savedB.id)); assert(!ba.text.includes(savedA.id));
      }
    });
    await t.test('update removes the superseded record from recall', async () => {
      const updated = await call('engram_update', {scope: 'project', id: savedA.id, content: 'GAMMAOTTER revised decision'});
      assert(!(await search('ALPHAZEBRA', a)).text.includes(savedA.id));
      assert((await search('GAMMAOTTER', a)).text.includes(updated.id));
      savedA = updated;
    });
    await t.test('forgotten records cannot be recalled', async () => {
      await call('engram_forget', {scope: 'project', id: savedA.id, reason: 'synthetic test', affects: 'fixture only', stillUseful: 'audit only'});
      assert(!(await search('GAMMAOTTER', a)).text.includes(savedA.id));
    });
    await t.test('explicit user-scope memory is shared across workspaces', async () => {
      const shared = await save('DELTAPANDA explicit shared preference', a, 'user');
      assert((await search('DELTAPANDA', b, 'user')).text.includes(shared.id));
      assert(!(await search('DELTAPANDA', b, 'project')).text.includes(shared.id));
    });
    await t.test('acceptance used no downloaded embedding model', () => {
      assert.deepEqual(readdirSync(join(root, 'empty-model-cache')), []);
    });
  } finally {
    for (const dispose of disposers.reverse()) await dispose();
    globalThis.fetch = realFetch;
    rmSync(root, {recursive: true, force: true});
  }
});
