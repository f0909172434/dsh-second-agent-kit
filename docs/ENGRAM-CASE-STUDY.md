# Replacing a local memory patch with verified upstream behavior

這個案例展示如何查核上游已實現的功能、退役重複補丁，並針對仍存在的資料遷移限制交付可重跑證據。沒有另建記憶框架或測試平台。

## Problem and decision

The kit previously carried a patch for Engram 0.7.5: full-path identities for non-Git workspaces, per-session project routing and a local automatic-ingestion policy. Engram 0.7.6 already implements the first two capabilities. Keeping a second implementation of them would increase maintenance without establishing new value.

We selected the unmodified published 0.7.6 package for explicit memory operations and verified it before changing the recommended path. The historical patch remains available. We did not claim equivalence for automatic ingestion; it is off in the accepted profile.

A separate known limitation remains. Old filenames encode only the first 12 UTF-8 bytes of cwd, so different same-prefix workspaces can share a legacy database. The new identities differ, but automatic migration gives the entire old file to whichever workspace opens first. Upstream already documents this tradeoff.

## Contribution

The new preflight reuses an attributed, pinned read-only subset of upstream identity resolution. Given an existing database directory and explicit workspace paths, it reports matching legacy files/sidecars and old/new coexistence. It never opens memory contents, migrates files or assigns ownership. Nonzero exit stops the recommended upgrade workflow; running the checker alone cannot constrain an independently started plugin.

Standard Node JUnit output feeds HonestCI, with explicit minimum test counts and zero allowed skips. Missing, empty, stale, skipped and reduced-count report controls prevent a green result caused by tests not running. This reuses existing tools instead of introducing another CI framework.

## Evidence tiers

| Tier | Implementation exercised | Acceptance |
| --- | --- | --- |
| Kit unit and kernel checks | Preflight, source pin, packaging behavior, HonestCI controls, existing macOS confinement | 24 tests locally, zero skips on macOS; three platform-specific skips on Linux are separate from memory gates |
| Published-plugin memory | Real Engram tool bodies and SQLite; small lifecycle context double | Six cases: same-prefix isolation, interleaved retrieval, update, forget, explicit user sharing, no downloaded model |
| Real DSH host composition | Cordis Context + Loader/Include, DSH 0.1.5-rc.2 tool pipeline, system prompt, loopback HTTP server, published Engram | Five cases: 17 tools loaded, concurrent scoped writes, HTTP project switching, update/forget visible to tool retrieval, unload removes tools and routes |
| Migration observation | Byte-pinned upstream migration function and real SQLite with synthetic schema | Both opening orders reproduced; preflight blocks beforehand and preserves original bytes |
| Proposed migration safety | Unresolved legacy ownership must remain unassigned | **Two red tests on upstream 0.7.6, expected exit 1** |

The real host test loads a disposable `cordis.yml`. Workspace/session input records are synthetic and the LLM service throws if called. No LLM calls are made. Retrieval uses the native keyword fallback with external fetch blocked. The host itself is real, but this is not native Desktop rendering, GUI navigation or a model-driven conversation.

## Before / after

- Before: the local patch was the documented starting point. After: verified explicit operations use published upstream 0.7.6; historical policy differences remain visible.
- Before: opening a colliding old database could choose ownership implicitly. After: the kit's preflight flags it before a recommended upgrade; **the upstream automatic migration policy is unchanged**.
- Before: direct-tool tests used a lifecycle double. After: an additional suite exercises actual plugin loading, the execution pipeline, HTTP project selection and unload behavior.
- Before: local results only. After: the pull request runs both memory evidence tiers on Linux and macOS and retains JUnit plus HonestCI artifacts.

## Public review and reproduction

- [Implementation PR](https://github.com/f0909172434/dsh-second-agent-kit/pull/1)
- [Upstream design discussion](https://github.com/kenz1117/dsh-engram/issues/3)
- [Upgrade instructions](ENGRAM-UPGRADE.md)
- [Upstream reproducer patch](upstream/engram-legacy-migration.patch)

```sh
npm ci --ignore-scripts
npm test
npm run verify:engram
npm run verify:engram:host
npm run test:migration
# Deliberately red on the pinned baseline:
npm run reproduce:upstream-safety
```

The positive observation tests show that the documented limitation was reproduced; they do not turn migration safety green. The separate red tests retain the unmet criterion. The upstream issue asks about an opt-in conservative policy before implementing a core behavior change. Submission is complete; maintainer acceptance is not claimed.

## Bounds on the result

No production memory was used or changed. No model/API spend was needed. The checker covers only supplied paths and is not a database-integrity check or transaction lock. Same-origin worktree sharing remains upstream behavior. Vector quality, automatic ingestion, full Desktop GUI and DSH 0.1.6-alpha.2 are outside this acceptance.

HonestCI's missing trusted default-branch baseline warning remains explicit; fixed minimum counts and zero-skip limits are enforced. This work demonstrates reproducible integration and upgrade diagnosis, not a new memory architecture or a claim about hiring outcomes.
