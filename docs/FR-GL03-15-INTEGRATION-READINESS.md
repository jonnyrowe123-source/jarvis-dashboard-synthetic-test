# FR-GL03-15 — Independent integration-readiness review
Date: 2026-11-09
Verdict: PARTIAL — synthetic contract preparation complete; Codex FR-GL03-12 source pending

## Evidence inspected
- docs/FR-GL03-09-SECURE-BACKEND-CONTRACT.md
- docs/FR-GL03-10-READONLY-ADAPTER.md
- docs/FR-GL03-13-FRONTEND-GATEWAY.md
- prototype/read-only-adapter.mjs
- prototype/dashboard-gateway.mjs
- prototype/integration-readonly.test.mjs
- GitHub Actions run 42610114313 reported success; exact test count not independently extracted.
Codex reported 68/68 passing, but its final published source/verification evidence has NOT been retrieved or validated. No claim of combined end-to-end pass.

## Contract reconciliation (specific)
1. **API prefix ambiguity — P1 for integration**: FR-GL03-09 specifies API prefix /v1 but example paths show GET /dashboard and /health; browser gateway explicitly requests /v1/dashboard. Standardise /v1/dashboard, /v1/me, /v1/actions and /health before integrating.
2. **Authentication gap — P1**: gateway requires caller-supplied getAccessToken; there is no OIDC client, PKCE flow, token lifecycle, or validated backend identity. Shared synthetic test token is not a substitute. No live data.
3. **Data schema mismatch — P1**: backend synthetic fixture uses action fields {id,title,revision,state,context}; the public dashboard's current UI has its own local fields {id,name,tag,state}. An explicit presentation mapper is required; do not silently overwrite one schema.
4. **Validation asymmetry — P1**: server adapter checks IDs, titles, revision and uniqueness, but gateway checks only top-level arrays. Gateway should validate item fields, cap total response size and handle unsupported schema versions.
5. **Authority/ranking — P1 for live read**: fixture view filter simply filters by context, while FR-GL03-09 requires server-authoritative Top 5 ranking, pin ordering, due dates, warnings and replenishment. A demo filter is not acceptance of ranking requirements.
6. **Read-only semantics — PASS at design level**: gateway exposes no mutation methods, adapter throws on mutation, synthetic API candidate denies non-GET. Do not enable action buttons against a real API until separately approved.
7. **Failure semantics — PARTIAL**: gateway maps 401,403,network and malformed responses to errors, but public Pages UI has no integrated loading/error state and its local buttons still change synthetic state. A future real-data UI must disable mutations and clearly show stale/unavailable state.
8. **URL/CORS — PARTIAL**: gateway enforces HTTPS for non-local hosts and uses credentials omit. Backend origin allowlist and identity enforcement need live integration tests; CORS is not auth.
9. **Canonical source — BLOCKED**: no verified adapter to Brain revision, record ownership, permissions, schema or audit trail. Never read private Brain directly from Pages.
10. **Test evidence — PARTIAL**: GitHub Actions run successful on main, but no evidence yet of Codex source integration or full isolated E2E tests.

## Proposed smallest non-overlapping tasks
Vision FR-GL03-16: build an isolated UI presentation mapper and read-only error/loading display, backed by synthetic gateway data; no backend auth or real records. Test against fixed schema.
Codex FR-GL03-12: finish security hardening, verification and publish immutable commit+SHA256 manifest to isolated branch. No frontend changes.
Vision FR-GL03-17 (after Codex return): independently verify source/hashes and reconcile actual server route/schema/auth contract; run combined synthetic-only tests. Do not merge before review.
Architecture decision gate: choose identity provider, host, cost, work-laptop redaction and canonical adapter strategy; require explicit approval before real data.

## Go/no-go
Synthetic-only isolated integration: CONDITIONALLY READY once Codex artifact is retrievable and checked.
Production integration: BLOCKED — identity, authority, privacy, hosting, operational and independent security gates unresolved.
