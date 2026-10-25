#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {inspectEngramUpgrade} from '../src/engram-upgrade.mjs';

try {
  const {values} = parseArgs({options: {'db-dir': {type: 'string'}, workspace: {type: 'string', multiple: true}}});
  if (!values['db-dir']) throw new Error('Usage: --db-dir ABSOLUTE_PATH --workspace ABSOLUTE_PATH [--workspace ABSOLUTE_PATH]');
  const report = inspectEngramUpgrade({dbDir: values['db-dir'], workspaces: values.workspace});
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'manual-review-required' ? 1 : 0;
} catch (error) {
  console.error(JSON.stringify({status: 'input-error', message: error.message}));
  process.exitCode = 2;
}
