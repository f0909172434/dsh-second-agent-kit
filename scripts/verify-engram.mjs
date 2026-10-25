import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const mode = process.argv[2] ?? 'memory';
if (!['memory', 'host'].includes(mode)) throw new Error('Expected memory or host');
const host = mode === 'host';
mkdirSync('reports', {recursive: true});
const run = spawnSync(process.execPath, [
  'node_modules/honest-ci/dist/cli/index.js', 'run', '--config', host ? 'honest-ci.engram-host.yml' : 'honest-ci.engram.yml',
  '--evidence-output', host ? 'reports/engram-host-evidence.json' : 'reports/engram-evidence.json', '--', process.execPath,
  '--test', '--test-reporter=junit', `--test-reporter-destination=reports/engram-${mode}.xml`,
  host ? 'tests/acceptance/engram-host.test.mjs' : 'tests/acceptance/engram.test.mjs',
], {stdio: 'inherit'});
if (run.error) console.error(run.error.message);
process.exitCode = run.status ?? 2;
