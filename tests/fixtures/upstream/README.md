# Upstream migration fixture

`engram-identity.ts` is the **unmodified** `src/project/identity.ts` from
`kenz1117/dsh-engram` commit `a7639b559e95361fbc0f1dd8723714e77b4b17d6` (0.7.6).
SHA-256: `60bb88a1eb5a963f7bbe6ae52d5f09e8e6f8137f09d303d1321d1a3093b54e04`.
MIT license: see `src/vendor/ENGRAM-LICENSE` in the repository root.

The production checker's `src/vendor/engram-identity.mjs` reuses the read-only
prefix of this source, with TypeScript types stripped. The migration function
and `renameSync` import are excluded. Tests compare its answers with this exact
upstream implementation for non-Git directories, Git origins and worktrees.
Neither copy downloads code at runtime. Updating Engram requires reviewing and
repinning both files; no compatibility beyond 0.7.6 is implied.
