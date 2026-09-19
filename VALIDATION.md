# Validation record — 2026-09-16

Target: macOS, DSH 0.1.5-rc.2, desktop 0.14.3, Node 24.

- Guard: 8/8 tests pass, including real kernel checks and integration with the pinned upstream sandbox provider. Workspace writes succeed; TCP connections and writes outside the allowed workspace fail. Unsupported runner shapes fail closed.
- Guard 0.1.1: after a full desktop/backend restart, the actual DSH Bash tool reported `PASS local write permitted; kernel blocked network socket: EPERM`, exit 0. The initial 0.1.0 bundle failed because the host treats `name` as a match assertion, not a rename. Version 0.1.1 explicitly disables the original row and inserts the subclass; a real-host composition regression test covers this. The model ran the check twice despite a once-only instruction; prompt tool-count limits are not enforcement.
- Guard: installed into an isolated DSH profile; web host booted without plugin load errors. No paid model call was needed for this check.
- Official vision: existing Vision Toolkit 0.1.45 configured for the official DeepSeek endpoint; one real DSH vision_glance call correctly read a synthetic document's title and date. No alternative-provider key is needed.
- Engram: real installed patched tools pass concurrent project-isolation/update/forget/user-scope tests with disposable databases. The exported test has been rerun successfully. The host settings-panel project view is still a documented limitation.
- Computer-use: upstream build succeeds against pinned 0.1.5-rc.2 dependencies; 146 existing non-UI tests and 9 standalone Swift routing-policy checks pass. Both live Word file-panel Escape variants **fail** (including a fresh observation and window-focus matching). The stock helper has been restored. The source patch is retained only as an explicitly unsuccessful experiment; it is not installed by the guard bundle and is not a reliable file-dialog fix.
- Verified Search: previous compatibility work passed 250 tests and typecheck/build. A live DSH search plus official-page fetch returned dated retrieval metadata and source quotes; the page itself did not expose a publication date.

No credentials, live session logs, production databases or user documents are included. Existing upstream licenses remain applicable to the respective patches. Paid acceptance runs are bounded by the user's pre-existing budget; cost UI is not a hard spending cap.

- Independent LibreOffice 26.8.0: official DMG SHA-256 verified; macOS accepted its notarized signature. DOCX PDF conversion plus one-page visual inspection passed after explicit system-font configuration. Native Word file-panel behavior remains unresolved.

- Guard 0.1.2 permits Unix-domain sockets needed by offline application IPC while retaining denied TCP/IP connections and filesystem policy. Kernel tests cover both behaviors. LibreOffice rendering succeeds under this policy; blanket Unix-socket denial in 0.1.1 prevented the application from starting. This deliberately does not claim containment against local IPC proxies.
- Final desktop 0.1.2 readback: DSH ran the original TCP-denial fixture and the LibreOffice renderer, each once without escalation. Both succeeded; the actual generated one-page Chinese PNG was inspected independently and had no missing glyphs or clipped content.

## 2026-09-20 update

- Kit 0.1.4: 11 tests passed, including actual macOS sandbox checks, host composition, session/turn retry isolation, and downstream approval-ask/deny handling.
- Desktop 0.15.6 boot removed valid file: tarballs because internal/manifest.rs checks is_dir(). Extracted-directory file: dependencies survive restart; composed daily profile retains the guard, restricted sandbox, Engram and Verified Search. No desktop binary patch.
- Installed patched Engram runtime again passed concurrent project isolation, update, forget and explicit shared-preference checks with disposable storage. Upstream 0.7.6 passes those tools but changes automatic sharing/profile injection, so daily remains the policy-patched 0.7.5.
- BrowserSkill plugin/CLI updated to 0.3.0, cost meter 1.7.30, marketplace 1.49.0. Stable backend remains 0.1.5-rc.2, matching the desktop recommendation.
- Native TextEdit reached the save panel but keyboard actions repeatedly returned stale-observation errors; stopped manually. No successful native save/reopen claim. The new guard is dispatch protection, not a native-dialog repair or token budget cap.


## 2026-09-20 — stock Engram upgrade verification (local development branch)

- Node 24.19.0, DSH dependencies pinned to 0.1.5-rc.2; unmodified published Engram 0.7.6 library byte-matched to the npm archive.
- General kit suite: 24/24 passed, zero skipped, including the existing real macOS kernel checks and six HonestCI positive/negative controls.
- Memory gate: six cases passed, zero skipped, through HonestCI 1.0.4 using native Node JUnit. No trusted default-branch baseline exists yet; the explicit six-test minimum and zero-skip limit are active.
- Direct plugin-tool execution used a small lifecycle context double, real temporary SQLite stores and the native keyword fallback. External fetch was blocked. No paid model calls, model downloads, or production memory access occurred. This is not a live Desktop/GUI or vector-search acceptance.
- Two real SQLite observation tests reproduce upstream's documented first-open ownership behavior. The two independent proposed safety tests FAIL on the upstream baseline as expected; upstream migration safety is NOT ACCEPTED. The database schema in this migration-only fixture is synthetic.
- The read-only checker blocks matching legacy files, coexisting old/new files and sidecars, with byte preservation verified. A packaged CLI smoke test passes (clean exit 0; ambiguous exit 1; no content printed).
- Old 0.7.5 patch retained as historical evidence. Verified offline operations now use stock 0.7.6; equivalence of automatic-ingestion policies is not claimed.
- The existing js-yaml 4.1.1 direct development dependency was updated to 4.3.2 after a concrete audit finding; the resulting dependency audit reports zero vulnerabilities.
- At the time of this local acceptance, GitHub CI had not run remotely. Remote verification is tracked in the kit pull request. Engram upstream files remain a local contribution proposal, not a submitted or accepted change.
