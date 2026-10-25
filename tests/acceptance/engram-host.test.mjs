import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Context} from '@deepseek-ai/cordis';
import Loader from '@deepseek-ai/cordis-plugin-loader';
import Include from '@deepseek-ai/cordis-plugin-include';
import HttpServer from '@deepseek-ai/dsh-host-webserver';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import ToolRuntime from '@deepseek-ai/dsh-tools';
import * as Engram from '@kenz1117/dsh-engram';

test('real DSH Loader, tool execution pipeline and HTTP workspace routes', {timeout: 60000}, async t => {
  const root = mkdtempSync(join(tmpdir(), 'engram-real-host-'));
  const paths = ['workspace-A', 'workspace-B'].map(p => join(root, p));
  for (const p of paths) mkdirSync(p);
  const realFetch = globalThis.fetch;
  let port, modelCalls = 0;
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (port && url.origin === `http://127.0.0.1:${port}`) return realFetch(input, init);
    throw new Error('External fetch disabled in real-host acceptance');
  };
  const ctx = new Context();
  ctx.baseUrl = pathToFileURL(root).href + '/';
  const offlineServices = {name: 'offline-fixtures', apply(c) {
    c.provide('llm', {stream: async function* () {modelCalls++; throw new Error('Model calls forbidden');}, listProviders: () => []});
    c.provide('workspaceRegistry', {list: () => paths.map((path, i) => ({id: `workspace-${i}`, path, title: `Workspace ${i}`}))});
  }};
  const modules = new Map([
    ['@deepseek-ai/dsh-host-webserver', HttpServer], ['@deepseek-ai/dsh-system-prompt', SystemPrompt],
    ['@deepseek-ai/dsh-tools', ToolRuntime], ['fixture:offline-services', offlineServices], ['@kenz1117/dsh-engram', Engram],
  ]);
  const config = [...modules.keys()].map(name => ({name, ...(name.endsWith('webserver') ? {config: {host: '127.0.0.1', port: 0}} : name.endsWith('dsh-engram') ? {config: {dbDir: join(root, 'db'), modelCacheDir: join(root, 'models'), ingest: 'off', injectProfile: false, queryRewrite: false, reviewScheduling: false}} : {})}));
  const configPath = join(root, 'cordis.yml');
  writeFileSync(configPath, JSON.stringify(config));
  try {
    await ctx.plugin(Loader);
    ctx.loader.builtins.include = Include;
    ctx.loader.internal = {version: 'v2', async import(specifier) {
      if (!modules.has(specifier)) throw new Error(`Unexpected module: ${specifier}`);
      return modules.get(specifier);
    }};
    await ctx.loader.create({name: 'cordis:include', config: {path: pathToFileURL(configPath).href}});
    await ctx.loader.await();
    port = ctx.webServer.port;
    const request = async (route, body) => {
      const response = await fetch(`http://127.0.0.1:${port}/api/engram/${route}`, body ? {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)} : undefined);
      return {status: response.status, body: await response.json()};
    };
    const agents = paths.map((cwd, i) => ({id: `agent-${i}`, session: {id: `session-${i}`, header: {cwd}}}));
    let callId = 0;
    const call = async (name, args, agent = agents[0]) => {
      const result = await ctx.tools.execute({name, arguments: args, agent, callId: `host-${++callId}`, signal: new AbortController().signal});
      assert(!result.isError, JSON.stringify(result));
      return result.value;
    };
    let a, b, projects;
    await t.test('Loader activates all 17 Engram tools', () => {
      assert.equal(ctx.tools.schemas().filter(s => s.name.startsWith('engram_')).length, 17);
    });
    await t.test('real tool execution pipeline writes separate session workspaces', async () => {
      [a,b] = await Promise.all(agents.map((agent, i) => call('engram_save', {scope: 'project', kind: 'fact', content: `HOSTCANARY${i} workspace record`}, agent)));
      assert(a.id); assert(b.id);
      projects = (await request('workspaces')).body.items.filter(item => paths.includes(item.path));
      assert.equal(projects.length, 2);
    });
    await t.test('HTTP workspace switching reads only the selected project', async () => {
      for (const [i, id] of [[0, a.id], [1, b.id]]) {
        const project = projects.find(p => p.path === paths[i]);
        const response = await request(`list?scope=project&project=${project.dbName}`);
        assert.equal(response.status, 200);
        assert.deepEqual(response.body.records.map(r => r.id), [id]);
      }
      assert.equal((await request('list?scope=project&project=unknown')).status, 404);
    });
    await t.test('HTTP update and forget are reflected in tool retrieval', async () => {
      const project = projects.find(p => p.path === paths[0]).dbName;
      const updated = await request('update', {scope: 'project', project, id: a.id, content: 'HOSTREVISED new record'});
      assert.equal(updated.status, 200);
      const newId = updated.body.record.id;
      assert((await call('engram_search', {scope: 'project', query: 'HOSTREVISED'})).text.includes(newId));
      assert.equal((await request('forget', {scope: 'project', project, id: newId})).status, 200);
      assert(!(await call('engram_search', {scope: 'project', query: 'HOSTREVISED'})).text.includes(newId));
    });
    await t.test('unloading the plugin removes tools and HTTP routes', async () => {
      const entry = [...ctx.loader.entries()].find(e => e.options.name === '@kenz1117/dsh-engram');
      assert(entry);
      await entry.fiber.dispose();
      assert.equal(ctx.tools.schemas().filter(s => s.name.startsWith('engram_')).length, 0);
      const response = await fetch(`http://127.0.0.1:${port}/api/engram/workspaces`);
      assert.equal(response.status, 404);
      assert.equal(modelCalls, 0);
    });
  } finally {
    await ctx.fiber.dispose();
    globalThis.fetch = realFetch;
    rmSync(root, {recursive: true, force: true});
  }
});
