# FR-GL03-09 — Secure Dashboard Backend Contract (Draft)
Status: DESIGN CANDIDATE — NOT IMPLEMENTED OR APPROVED
Date: 2026-11-09

## Boundary
GitHub Pages is public static delivery ONLY. It must never contain Jarvis personal data, service-account keys, OAuth client secrets, access tokens, private API URLs with embedded credentials, or copied canonical records. No production data access until authenticated backend and threat model are accepted.

Browser -> identity provider (OIDC with PKCE) -> protected API -> authorised canonical data adapter -> canonical records. API validates tokens on every request, applies per-user authorisation, and refuses unknown identities. Never rely on browser-only checks. Cross-origin requests are restricted to the approved frontend origin; CORS is not authentication. Use TLS throughout.

## Candidate API (v1)
All requests/responses JSON; dates ISO 8601 UTC; opaque IDs; no raw credentials in query strings. API prefix /v1.
GET /health => {status:"ok",version:"...",dataConnected:false}; health must not expose private state.
GET /me => {subject:"...",scopes:["actions:read",...]} (authenticated).
GET /dashboard?view=overall|10min|lenovo => {revision:"...",actions:[...],decisions:[...],warnings:[...]}; server enforces 5-item ranking, pin semantics and priority, never trusts frontend sorting for canonical changes.
GET /actions?cursor=... => {items:[...],nextCursor:null}; authenticated, paginated.
POST /actions/{id}/transition with {operation:"done"|"skip"|"defer",expectedRevision:integer,until?:ISO8601,idempotencyKey:UUID}; requires write scope, explicit ownership, validation, conflict detection; skip defaults to 3h and defer defaults to 3d on the SERVER, based on authoritative time. Return {id,revision,state,committedAt}; reject duplicates safely.
POST /decisions/{id}/resolve with {outcome:"...",expectedRevision:integer,idempotencyKey:UUID}; atomic all-or-nothing record update plus related record changes, otherwise return error with no partial success.
GET /changes?since=... => authenticated reconciliation cursor; no data leakage across users.

## Mandatory safety behaviour
1. Deny by default. Production endpoints disabled until explicit go-live approval.
2. OAuth/OIDC with PKCE for browser login, short-lived access tokens, no long-lived tokens in localStorage, HttpOnly secure SameSite cookies where applicable, CSRF protection for cookie sessions. Select provider only after assessment.
3. Enforce scope + record ownership on every API read/write; least privilege on canonical adapter.
4. All writes use compare-and-swap expectedRevision and durable idempotency key. Duplicate request returns original committed result or explicit conflict; never executes twice.
5. Server computes rankings, replenishment and pin conflicts. Do not let browser silently overwrite canonical data.
6. Separate synthetic, staging and production origins, credentials, databases and logs. No production secrets in repository or GitHub Actions output.
7. Audit event for every attempted and committed mutation: actor, operation, record ID, old/new revision, outcome, timestamp, correlation ID. Exclude private payloads/tokens from logs.
8. On network failure, show unknown/not confirmed; never mark action done optimistically as a durable success. Re-fetch canonical revision on reconnect.
9. Backend adapter must be compatible with the existing canonical Brain without creating a second source of truth. Data migration/authority decisions require separate review.
10. Rate limits, input length/type validation, CSP, dependency pinning, security headers, and operational backup/recovery procedures required.

## Threats and gates
- Public static hosting exposes any embedded data: test repository must remain synthetic only.
- Stolen browser session: short lifetime, revocation and step-up for sensitive operations.
- Cross-origin misuse: origin allowlist plus server-side auth, CSRF defence.
- Replay/double click: durable idempotency and revision preconditions.
- Backend or canonical outage: read-only degraded mode, no fabricated success.
- Race between two devices: server conflict response (409) with refresh and explicit user choice.
- Malicious repository contribution: protected branch, required review and deployment checks before production.

## Acceptance tests (not yet run)
A. Unauthenticated GET /dashboard and POST transition return 401.
B. Wrong user/scope returns 403; guessed IDs never reveal another user's data.
C. Duplicate idempotency key executes exactly once, even after retry.
D. Stale expectedRevision returns 409, canonical record unchanged.
E. Two concurrent writes resolve to one commit and one conflict.
F. Interrupted decision update rolls back completely.
G. Backend unreachable => UI reports no confirmed change.
H. Browser refresh reconciles committed status from canonical records.
I. CORS denial plus direct API calls still enforce auth.
J. Public repository and built site inspected for personal data and secrets.
K. Cross-device Chrome/Edge/mobile tests; employer restrictions respected.
L. Recovery restores authoritative state with audit-chain consistency.

## Outstanding decisions
- Identity provider, backend host, storage adapter, cost and operational owner.
- Whether work-laptop mode should omit sensitive fields by default (recommended).
- Read-only first release vs enabled writes after acceptance (recommended read-only first).
- Availability, support, backups, monitoring and data retention.

## Release gate
BLOCKED: This document is a design contract only. No API, auth, canonical connection or production deployment exists. A secure backend implementation and independent review must precede real-data access.
