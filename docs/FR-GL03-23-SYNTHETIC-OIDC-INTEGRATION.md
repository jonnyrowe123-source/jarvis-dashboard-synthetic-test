# FR-GL03-23 — Isolated OIDC + versioned synthetic DTO acceptance

Date: 2026-11-09. **PASS for synthetic HTTP integration; production BLOCKED.**

## Verified CI
- GitHub Actions run: https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/actions/runs/42618122969
- Codex OIDC candidate source suite: **166 passed / 0 failed / 0 skipped**.
- New Vision authenticated HTTP integration: **9 passed / 0 failed / 0 skipped**.
- Existing Vision prototype regression: **59 passed / 0 failed / 0 skipped**.
- These are 234 executed test cases in one combined run; underlying test concerns overlap.

## Integration
On separate Vision integration branch, staged immutable Codex `FR-GL03-19/source/` module/test copies and pinned package-lock, preserving the Codex delivery branch and its artifacts. New `integration/oidc-versioned-server.mjs` creates a **synthetic-only** OIDC-protected read-only HTTP server with the untouched `createOidcAuthenticator` exported from Codex. It uses the FR-GL03-10 richer local synthetic adapter and the FR-GL03-18 strict DTO mapping without removing action/decision revisions, states, IDs or schema version. Test issuer is fictional, local loopback.

Executed cases:
1. Authorized HTTP GET returns versioned DTO preserving actions and decisions revision/state.
2. Missing bearer 401 and missing scope 403.
3. Provider failure 503; adapter not invoked.
4. Duplicate IDs rejected with generic 502.
5. Unknown fields rejected; no silent loss.
6. POST/PUT/PATCH/DELETE 405 despite valid token.
7. Lenovo filter retains context, revision/state and version.
8. NODE_ENV=production startup refused.
9. Narrow read-only CORS preflight succeeds; write preflight refused.

The initial workflow failed because the FR-GL03-19 candidate directory had not yet been staged on Vision's branch. Copied exact published source/test files into the branch and reran; final combined run succeeded. No edits were made to the immutable Codex source files when copying.

## Important limitations
- The new integration server is **test scaffolding**, not a security-hardened production fork of Codex's server. Its trusted adapter has no explicit timeout/in-flight capacity protection and its HTTP validation does not reproduce every hardened server edge-case. Consequently passing tests are NOT a basis to deploy this integration server. Final architecture should preserve Codex's hardened server controls while adding a versioned output validator in a separate reviewed candidate.
- This test does not cover a browser authorization-code/PKCE login, refresh/logout, live provider, server-side per-record authorization, key emergency retirement, live revocation, hosting/TLS or monitoring.
- In CI, the issuer and API run over private IPv4 loopback with generated ephemeral signing keys. No production credentials, canonical Brain data, writes, Pages updates, or main-branch modifications.
- Binary package checksum verification remains separately required for independent installation acceptance.

## Recommendation
Next **FR-GL03-27**: implement a safe versioned response validator in an isolated copy of the Codex hardened OIDC server, preserving its transport, timeouts, admission controls and output byte ceiling, and then add cross-browser gateway/presenter tests with fake issuer. Before any real provider/canonical integration, obtain Vision's explicit provider, hosting, identity, data ownership and field policy decisions.

**Synthetic integration PASS. Production PARTIAL/BLOCKED.**
