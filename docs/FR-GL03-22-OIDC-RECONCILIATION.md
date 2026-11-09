# FR-GL03-22 — Vision independent OIDC delivery reconciliation

Date: 2026-11-09. Verdict: **PARTIAL**. Isolated prototype evidence supports continued synthetic integration; production is **BLOCKED**.

## Evidence and immutable references
- Codex source commit [5d6363aff12f386eb8a09f3dc7c3fce037fe28f2](https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/commit/5d6363aff12f386eb8a09f3dc7c3fce037fe28f2), branch `codex/fr-gl03-19-oidc-prototype`.
- Fetched the immutable commit metadata and independently read published `FR-GL03-19-REPORT.md`, `FR-GL03-19-RETURN.md`, `SHA256SUMS.txt`, `source/oidc-auth.mjs`, `source/server.mjs`, `source/oidc-api.test.mjs`, `IDENTITY-PROVIDER-REQUIREMENTS.md`, `evidence/fresh-package-tests.txt` and `evidence/source-integrity.json` via GitHub.
- Remote commit records **34 changed files** under `FR-GL03-19/`. Codex's published report claims successful independent remote SHA256/ZIP readback, but this review has **not independently downloaded binary ZIP bytes or recalculated all 34 SHA256 hashes**. GitHub content metadata and report availability are independently verified; package-byte integrity remains a separate verification gate.
- Codex's recorded run reports **166/166** source tests and **31/31** baseline Vision regressions. Fresh extraction log was inspected, but **not independently rerun by this Vision review**. Do not count repeated test runs as independent security controls.
- Vision source branch `vision/fr-gl03-20-synthetic-demo` has a separate 59-test source acceptance and successful isolated Chromium browser acceptance. These browser tests use local synthetic adapter, **not OIDC**.

## Code findings
1. **PASS — strict OIDC boundary in prototype**: `jose` verification, configured issuer/audience, pinned ES256/RS256, at+jwt type, subject/client allowlists, separate `dashboard:read` scope, generic 401/403/503, no synthetic-token fallback in OIDC mode. Confirmed by direct reading of candidate source and published test cases.
2. **PASS — important controls preserved by inspection**: read-only GET, exact allowed views, narrow CORS, output size cap, header/body limits and generic error handling retained in isolated candidate. Existing `makeServer` synthetic mode cannot run with `NODE_ENV=production` and mixed OIDC/shared-token options are rejected.
3. **BLOCKED — versioned DTO mismatch**: Codex `validDashboard` enforces exact legacy fictional envelope, which omits action/decision `revision` and `state` and does not carry `schemaVersion`. Vision's FR-GL03-18 strict DTO cannot travel end-to-end through this candidate. The temporary `versioned-http-adapter.mjs` bridge only works by discarding those validated record fields, so is unsuitable for real canonical records.
4. **BLOCKED — browser authentication**: Vision's browser preview uses a local fixture and has no PKCE login, OIDC callback, renewal or logout. Codex is a resource-server-only prototype; no actual identity provider has been integrated. Neither branch provides authenticated end-to-end browser-to-API acceptance.
5. **BLOCKED — real authorization**: `allowedSubjects` allows access to the entire fictional dashboard but is not per-record/field canonical authorization. Real Brain/Friday records must not be connected until approved policy is enforced server-side.
6. **BLOCKED — revocation and operations**: JWT bearer tokens are reusable while valid; cached JWKS keys remain usable until TTL. Static startup JTI denylisting does not provide operational revocation. Production proxy/TLS, gateway rate limits, audit/monitoring and readiness are unverified.
7. **NOTE — health reporting**: candidate OIDC `/health` returns `mode:'synthetic'` even when OIDC is enabled, so it is unsuitable as production auth readiness or deployment signal. Keep it synthetic-only until designed.
8. **NOTE — availability**: provider fetch fails closed; authentication may return 503 during outage. This is correct default security behavior but needs explicit UX, operational controls and alerting.

## Smallest non-overlapping next assignments
- **FR-GL03-23 (Vision, synthetic-only)**: define and implement a **versioned contract-preserving OIDC integration candidate** under a new isolated integration path, leaving the immutable Codex source and SHA manifests untouched. Use synthetic issued test JWTs and read-only fixtures. Test real HTTP response preserving `schemaVersion`, record IDs, revisions, state and context with duplicate-ID/schema checks; verify writes denied and all auth failures fail closed. Do **not** weaken the proven OIDC module or modify Codex artifacts.
- **FR-GL03-24 (Codex, separate)**: independently harden the candidate for operational revocation/issuer readiness and attack-surface review, but no real provider or credentials. Include negative tests and precise limits; do not modify Vision DTO or frontend.
- **FR-GL03-25 (Vision)**: separate browser-login design and provider decision record. A real provider sandbox requires explicit decision and approvals, not implied by passing synthetic tests.
- **FR-GL03-26 (Vision)**: independent package SHA256 and ZIP membership verification through a runner capable of retrieving binary GitHub files.

## Boundaries
No merge or deployment approved. This report does not claim live Brain connectivity or production readiness. Keep `main`, Pages demo, canonical data and production infrastructure unchanged. Human approval is required for provider/hosting/real-user/production choices.

**Overall PARTIAL** — Codex's documented delivery is a substantial synthetic-only security prototype, but it does not close the authentication + canonical DTO + browser-session integration gates.
