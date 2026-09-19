import {lstatSync, statSync} from 'node:fs';
import {isAbsolute, join} from 'node:path';
import {resolveProjectIdentity} from './vendor/engram-identity.mjs';

function exists(path) {
  try { lstatSync(path); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

/** Inspect filenames only; never open a database or start Engram (which can migrate it). */
export function inspectEngramUpgrade({dbDir, workspaces}) {
  if (!isAbsolute(dbDir) || !statSync(dbDir).isDirectory()) throw new Error('db-dir must be an existing absolute directory');
  if (!Array.isArray(workspaces) || workspaces.length === 0) throw new Error('at least one workspace is required');
  const results = [...new Set(workspaces)].map(workspace => {
    if (!isAbsolute(workspace) || !statSync(workspace).isDirectory()) throw new Error('workspace must be an existing absolute directory');
    const identity = resolveProjectIdentity(workspace);
    const legacyArtifacts = ['', '-wal', '-shm', '-journal']
      .map(suffix => identity.legacyDbName + suffix)
      .filter(name => exists(join(dbDir, name)));
    const currentPresent = exists(join(dbDir, identity.dbName));
    return {workspace, source: identity.source, legacyFile: identity.legacyDbName,
      currentFile: identity.dbName, currentPresent, legacyArtifacts,
      status: legacyArtifacts.length ? 'manual-review-required' : 'no-legacy-conflict',
      reason: legacyArtifacts.length ? (currentPresent ? 'legacy-and-current-coexist' : 'legacy-ownership-ambiguous') : null};
  });
  return {engramVersion: '0.7.6', readOnly: true,
    status: results.some(r => r.legacyArtifacts.length) ? 'manual-review-required' : 'no-legacy-conflict',
    coverage: 'Supplied workspace paths only; not a database integrity check or proof of historical ownership.', results};
}
