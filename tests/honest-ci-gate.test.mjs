import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const cli = resolve('node_modules/honest-ci/dist/cli/index.js');
const config = readFileSync('honest-ci.engram.yml', 'utf8');
for (const mode of ['missing', 'zero', 'skipped', 'reduced', 'stale', 'healthy']) {
  test(`HonestCI gate: ${mode}`, t => {
    mkdirSync('work', {recursive: true});
    const root = mkdtempSync(resolve('work/gate-'));
    t.after(() => rmSync(root, {recursive: true, force: true}));
    mkdirSync(join(root, 'reports'));
    writeFileSync(join(root, 'honest-ci.engram.yml'), config);
    const count = mode === 'zero' ? 0 : mode === 'reduced' ? 5 : 6;
    const cases = Array.from({length: count}, (_, i) => `<testcase name="case-${i}">${mode === 'skipped' ? '<skipped/>' : ''}</testcase>`).join('');
    const xml = `<testsuite name="memory" tests="${count}" failures="0" errors="0" skipped="${mode === 'skipped' ? count : 0}">${cases}</testsuite>`;
    if (mode === 'stale') writeFileSync(join(root, 'reports/engram-memory.xml'), xml);
    const code = ['missing', 'stale'].includes(mode) ? '' : `require('node:fs').writeFileSync('reports/engram-memory.xml', ${JSON.stringify(xml)})`;
    const result = spawnSync(process.execPath, [cli, 'run', '--config', 'honest-ci.engram.yml', '--format', 'json', '--', process.execPath, '-e', code], {cwd: root, encoding: 'utf8'});
    assert.equal(result.status, mode === 'healthy' ? 0 : 1, result.stdout + result.stderr);
    const expected = {missing: 'HCI001', zero: 'HCI004', skipped: 'SKIPPED', reduced: 'HCI005_BELOW_MINIMUM', stale: 'STALE'}[mode];
    if (expected) assert(result.stdout.includes(expected), result.stdout);
  });
}
