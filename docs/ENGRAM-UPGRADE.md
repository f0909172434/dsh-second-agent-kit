# Engram 0.7.6 upgrade verification

The supported verification target is the **unmodified published** Engram 0.7.6
with DSH packages 0.1.5-rc.2 and Node 24. The old 0.7.5 patch remains historical;
it is no longer the recommended path for the behaviors verified here.

## Check before starting an upgraded plugin

```sh
npm ci --ignore-scripts
npm run check:engram-upgrade -- --db-dir /absolute/path/to/engram \
  --workspace /absolute/path/to/workspace-A \
  --workspace /absolute/path/to/workspace-B
```

The packaged command is `dsh-engram-upgrade-check` with the same arguments.
Supply the exact absolute workspace paths used in session headers. Run while
Engram is stopped. Exit codes: **0** = no recognized legacy conflict for those
paths; **1** = manual review required; **2** = invalid or unevaluable input.
Stop the upgrade on either nonzero code. This command does not start or update
Engram and does not migrate, merge, delete, or open database contents.

The JSON report contains workspace paths, identity type, filenames and findings,
never memory content. A matching legacy database, dangling symlink or SQLite
sidecar blocks the check, including when a new database already exists. Git
configuration is read to preserve upstream's intentional same-origin sharing.
The identity resolver is an attributed, pinned read-only subset of upstream,
not a new naming scheme.

**Coverage is limited to supplied paths.** No conflict is not proof that the
database is intact or correctly attributed. This is a preflight, not a lock or
a change to Engram's automatic migration. It cannot reconstruct ownership of
historically mixed data. Keep unresolved old data unchanged and decide ownership
before any actual migration; no automatic remediation is provided here.

## Reproduce the verification

```sh
npm test
npm run verify:engram
npm run test:migration
```

`verify:engram` runs the real published plugin's registered tools against
temporary SQLite databases. The host lifecycle/registration context is a small
test double, as in the previous kit test; this is not a live Desktop acceptance.
Fetch is blocked, model caches are empty and automatic ingestion, rewriting and
profile injection are disabled. Retrieval uses the native **keyword fallback**;
vector quality, automatic ingestion and the settings panel are not verified.

Six memory cases cover same-prefix separation, concurrent retrieval, update,
forget, explicit user-scope sharing and the empty model cache. Node's JUnit
reporter feeds HonestCI 1.0.4 with a hard minimum of six tests and zero allowed
skips. Missing, zero-test, skipped, reduced-count and stale reports are tested
as negative controls. A missing trusted default-branch baseline remains an
explicit warning; it does not weaken the six-test minimum or skip limit.

Artifacts: `reports/engram-memory.xml`, `reports/engram-evidence.json`.
CI runs the memory gate on Linux and macOS. macOS-only kernel tests are a
separate suite; Linux skips do not count as memory acceptance.

## Known migration limitation — still unresolved upstream

Engram's old filename encoded only the first 12 **UTF-8 bytes** of the cwd.
Multiple workspaces can therefore have one legacy database. In 0.7.6 the first
workspace opened receives the entire file by rename; reversing opening order
reverses ownership. The source already documents this tradeoff.

`test:migration` uses real closed SQLite databases with a synthetic table and
the exact upstream migration function. Passing these **observation tests**
means the limitation was reproduced and our preflight blocked it without
changing bytes; it does **not** mean upstream migration is safe. The separate
upstream contribution contains two red safety tests (expected exit 1 on 0.7.6).
No production data or complete Engram schema is needed to demonstrate rename
behavior. No upstream default-policy change is included in this kit.

## Historical patch

`scripts/patch-engram.py` and `tests/memory-runtime.mjs` retain the original
0.7.5 experiment for reproducibility. Do not apply it to 0.7.6. The new default
verification uses stock 0.7.6. This is **not** a claim that upstream reproduces
the old patch's project-only automatic ingestion policy: automatic ingestion
is explicitly outside this offline acceptance and must remain off for this
validated profile.
