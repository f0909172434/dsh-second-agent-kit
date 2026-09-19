# DSH Second Agent Kit

**English** · [繁體中文](README.zh-TW.md)

Small, inspectable extensions for DeepSeek Harness 0.1.5-rc.2 on macOS. MIT licensed; independent of DSH Desktop's own license.

## What is included

- A Cordis plugin that preserves upstream decisions and asks before browser writes, borrowing tabs, and common publishing/deletion commands.
- A subclass of the existing DSH Seatbelt provider. It preserves the host's filesystem policy and denies IP networking and Apple Events in **confined shell processes**. Local computation and workspace writes continue to work. Shell network requests need the host's existing per-call escalation and user approval; dedicated browser, web and model tools use their own policy.
- Stock Engram 0.7.6 verification, a read-only upgrade preflight, and real SQLite migration reproductions. The old 0.7.5 patch is retained as history; verified routing and explicit memory operations now use upstream.
- An independent LibreOffice renderer (`scripts/render-office.py`) using an isolated profile and explicit macOS system fonts to avoid silent Chinese glyph loss. Requires an official LibreOffice install; `--png` requires PyMuPDF.
- An experimental macOS computer-use patch (**live Word panel test failed; not enabled by this bundle**). It targets a validated focused file-panel element's system XPC process instead of silently posting keys to the host app. No global input broadcast, stale-observation bypass, or new permanent app grant.

The guard also blocks further Mac input after two consecutive known UI failures or 20 input calls in one agent turn. Observation remains available; a new user turn resets the limit. This limits tool dispatch, not total model spending.

## Install the guard

Requirements: macOS 14+, Node 24, DSH 0.1.5-rc.2, existing workspace-write + ask mode. Test in a separate profile first.

```sh
npm ci
npm test
npm pack
mkdir -p "$HOME/.dsh/packages/dsh-second-agent-kit-0.1.4"
tar -xzf dsh-second-agent-kit-0.1.4.tgz -C "$HOME/.dsh/packages/dsh-second-agent-kit-0.1.4"
dsh plugin --profile YOUR_TEST_PROFILE add "file:$HOME/.dsh/packages/dsh-second-agent-kit-0.1.4/package"
```

The bundle disables the upstream `sandbox` row, inserts `second-agent-sandbox` with the restricted provider and inserts `second-agent-approval`. If an earlier local `daily-approval` hook is present, disable that duplicate after validating this plugin. Do not disable DSH's own user-approval plugin. No credentials are required or bundled.

Unsupported sandbox runners fail closed rather than silently returning an unconfined command. This version is deliberately macOS-only. Do not enable danger-full-access as a standing default: that mode bypasses the host's confinement by design.

## Engram verification and upgrade check

Use **unmodified Engram 0.7.6** for the verified offline profile, with automatic ingestion and query rewriting disabled. Before upgrading an existing memory directory, run the read-only preflight and stop on any nonzero exit:

```sh
npm run check:engram-upgrade -- --db-dir /absolute/memory-directory --workspace /absolute/workspace
npm run verify:engram
npm run test:migration
```

The check never opens memory contents or migrates files. It detects ambiguous legacy filenames for supplied workspaces. Verification runs six real-plugin/SQLite cases through HonestCI with zero skipped tests allowed. Upstream's legacy ownership ambiguity remains unresolved; reproducing it is not a safety pass. See [upgrade guidance and boundaries](docs/ENGRAM-UPGRADE.md).

The original `scripts/patch-engram.py` and `tests/memory-runtime.mjs` remain historical 0.7.5 artifacts, not instructions for the new default profile.

## Computer-use patch

See `patches/computer-use.patch` and `patches/computer-use-base.txt`. Apply only to the recorded upstream commit, install dependencies, and run the upstream `pnpm run build` to rebuild JS and native artifacts together. The native helper must be built locally; no unreviewed downloaded executable is supplied here. Tests include a standalone Swift routing-policy check. The upstream package remains MIT (license alongside patch).

## Office rendering

Install LibreOffice from https://www.libreoffice.org/ and PyMuPDF in an independent Python environment. Then run:

```sh
python scripts/render-office.py input.docx new-preview-directory --png
```

The helper rejects overwriting a PDF and prints the page count. Inspect every PNG. LibreOffice layout does not prove Microsoft Word layout, and spreadsheet calculation or presentation animation still needs application-specific verification.

## Verification and boundaries

`npm test` verifies hook behavior, fail-closed runner handling, and actual macOS kernel denial of TCP sockets/out-of-workspace writes while permitting a workspace write. Pure Swift policy checks reject inactive, unobserved, untrusted and invalid keyboard targets.

This is **not a universal semantic firewall**. Regex command recognition is advisory; the kernel rule applies only to processes the host confines. Browser/MCP/GUI/plugin capabilities are separate and must retain their approvals. Public publication, payments and destructive operations still require explicit authorization. Unix-domain sockets remain available for local application IPC (including LibreOffice). Local IPC can reach services or proxies with their own authority; this is not an egress boundary against cooperating local services. An allowed workspace file could affect another process that reads it. This project does not claim to eliminate every IPC or indirect-action channel.

No user credentials, conversation logs, personal documents, or production memory databases belong in this repository. See `VALIDATION.md` for current observed results and unresolved cases.

Desktop 0.15.6 incorrectly treats local tarballs as missing directories and removes them at boot. Keep the extracted directory at a stable path. The per-turn Mac input guard blocks further dispatch after two consecutive recognized failures or 20 inputs; observations do not reset it. It does not impose a token-spending cap.
