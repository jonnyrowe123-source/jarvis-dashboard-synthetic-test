# FR-GL03-22 — Independent OIDC-to-synthetic dashboard integration report

Date: 9 November 2026. **Narrow verdict: PASS for isolated synthetic integration; production readiness: BLOCKED.**

## Evidence and source
- Codex source branch `codex/fr-gl03-19-oidc-prototype`, immutable commit `5d6363aff12f386eb8a09f3dc7c3fce037fe28f2`. The GitHub commit has 34 changed files. Codex's report claims and describes 166 tests, a fresh ZIP verification, and byte-identity of archive files. I independently read the GitHub-published report, handover, SHA256 manifest and critical authentication and API source. **I did not independently hash the binary ZIP or all 34 blobs**, so publication integrity remains partially based on Codex's supplied evidence.
- Vision integration branch `vision/fr-gl03-22-oidc-synthetic-integration` created from that exact Codex commit, preserving its original files. New test files are under `prototype/`; no main merge or deployment.
- GitHub Actions run: https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/actions/runs/42617102160 — successful. Executed (Node 24): Codex source `npm test`: **166 passed**; new `prototype/oidc-synthetic-bridge.test.mjs`: **10 passed**; full Vision `prototype/*.test.mjs`: **41 passed**, including those same ten (not 51 unique tests). All zero failed or skipped.

## Verified end-to-end boundary
Real loopback HTTP requests hit Codex's `makeOidcServer`, whose local fictional issuer signs an ES256 `at+jwt` and whose exact configured JWKS endpoint serves locally generated public keys. The adapter invokes FR-GL03-10's richer synthetic source and refuses invalid/unknown fields or duplicate cross-kind IDs, then maps to the historic strict server response shape. The tests prove successful reads of two fictional action IDs and one decision ID, filtered views, 401 for missing/invalid token, 403 for missing scope or unlisted subject, 502 for malformed/duplicate fixture records, no POST capability, and browser gateway omission of token from URLs.

## Explicit limits
- The compatibility bridge **drops record revision and state from the HTTP response** after strict input checks; **never use it for canonical/production records**.
- The newly created Vision dashboard presenter/preview (FR-GL03-16/20/21) are not integrated on this branch. No browser PKCE login, real IdP, live Brain, per-record ownership, hosting/TLS verification, operational revocation, or production audit exists.
- No real credential, production endpoint, merge, deployment or write path was used. Real provider claims and subject ACLs require approval.
- CI's existing synthetic workflow originally ran without installing `jose`; its first execution failed with `ERR_MODULE_NOT_FOUND`. The independent OIDC workflow installed the locked dependency and passed. A later branch-only workflow update applies the locked install to the default synthetic regression on this branch as well.

## Priority gates
1. Replace compatibility bridge with a strict, versioned end-to-end API DTO retaining identity/revision/state and authoritative Top 5 ordering.
2. Connect OIDC resource-server login through a browser-safe Code+PKCE flow with an approved sandbox IdP.
3. Define record ownership and minimum disclosure across views, including decision/action authorization.
4. Set provider, host, TLS, revocation SLA, rate limit, monitoring and incident controls; review under explicit release approval.

Overall **PARTIAL**, with synthetic-authenticated HTTP integration PASS. Vision retains decisions and controls.