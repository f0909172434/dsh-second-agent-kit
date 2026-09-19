import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('reports', {recursive: true});
const run = spawnSync(process.execPath, [
  'node_modules/honest-ci/dist/cli/index.js', 'run', '--config', 'honest-ci.engram.yml',
  '--evidence-output', 'reports/engram-evidence.json', '--', process.execPath,
  '--test', '--test-reporter=junit', '--test-reporter-destination=reports/engram-memory.xml',
  'tests/acceptance/engram.test.mjs',
], {stdio: 'inherit'});
if (run.error) console.error(run.error.message);
process.exitCode = run.status ?? 2;
