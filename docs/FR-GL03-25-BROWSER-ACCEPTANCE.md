# FR-GL03-25 — Independent browser integration acceptance

Date: 2026-11-09 (Europe/London). **Narrow verdict: PASS — isolated synthetic browser+OIDC+v1 API; production remains BLOCKED.**

## Independently executed evidence

- Original Codex candidate FR-GL03-23 immutable commit `ae4e74c690f1889527a2a05c6f20c93aaacd0c12`: 48 delivery files observed in the GitHub commit, source and documentation inspected. Codex's ZIP/hash assertions have not been reverified byte-for-byte by Vision.
- FR-GL03-24 independent mobile/keyboard acceptance: https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/actions/runs/42623060139 — PASS after making the native select keyboard input deterministic.
- FR-GL03-25 final passing run: https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/actions/runs/42624078727, commit `a6451c90a4358f9c43d5c6f77bd1a4267010603a`. **269/269 Codex candidate tests and 47/47 Vision tests passed**, zero failed or skipped. Vision 47 includes the six new strict-CORS regression tests. Real headless Chromium tests also passed.
- Separate original FR-GL03-23 package remains untouched; all new derivatives under `FR-GL03-25/`, `prototype/`, workflow and `fr23-loopback-preview.html`. No main changes or production deployment.

## Defect found and corrected

The original protected FR-GL03-23 candidate answered actual browser preflight `OPTIONS /v1/dashboard?view=overall` with 403 because its OPTIONS handler rejected **any** query. Node tests bypassed the browser preflight and therefore did not detect the problem. Vision's independent derivative `FR-GL03-25/server.mjs` accepts only an optional exact `view=(overall|10min|lenovo)` query during narrowly configured GET preflight. All malformed, duplicate, encoded, unsupported or write-related preflights still deny. Tests cover actual origin/CORS and real browser access. Preserve this change when composing the eventual approved candidate.

## Browser acceptance

The Chromium runner launched a fictional ES256 OIDC issuer with memory-only private keys and public loopback JWKS; a local browser-origin HTTP server; and an OIDC-protected versioned API on loopback. The browser consumed `createVersionedDashboardGateway` and `createReadOnlyPresenter`. Tests verified:
- Valid fictional subject and `dashboard:read` returning schemaVersion 1, source ordering, per-record identity/revisions/states/contexts and snapshot revision.
- Overall, Lenovo and 10min views; unlisted subject or missing scope returns 403 and clears display records/revision.
- Simulated network failure and presenter invalidation clear stale records; authorised recovery works.
- 390px mobile viewport without horizontal overflow, keyboard refresh, no persistent token storage, and no page JavaScript errors.
- Screenshot artifact from the final acceptance run.

The browser test uses an injected local fictional token, **not** an implemented login or PKCE callback; no real provider or personal data is involved. Expected HTTP 403/network failures generate console resource warnings but no uncaught JavaScript page exceptions.

## Remaining launch gates

1. Finalize canonical ownership, user/record read authorization and field-level minimum disclosure **before** connecting Brain.
2. Define server-authoritative Top 5 ranking, pin behavior, tie-break and snapshot consistency. v1 fields contain neither rank nor pin.
3. Approve real IdP/tenant/client/audience, browser Authorization Code + PKCE, refresh/logout and operational revocation.
4. Approve host/network/TLS, quotas, monitoring, incident response, safe deployment/rollback.
5. Validate actual canonical sources, source revision consistency, strict read-only provider, and privacy tests using only fictional replicas before live access.
6. Decide whether browser preview should be published as synthetic-only; this is not authorization to deploy.

**PASS for isolated synthetic acceptance. BLOCKED for canonical production V1.**
