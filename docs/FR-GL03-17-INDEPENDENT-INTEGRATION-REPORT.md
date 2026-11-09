# FR-GL03-17 — Independent Codex delivery and synthetic integration assessment
Date: 2026-11-09
Verdict: **PARTIAL** (delivery, integrity and synthetic integration PASS; schema contract NOT compatible; production BLOCKED)

## Immutable inputs
- Codex reference commit: `2183ef2d833e2804062b671fa42c51ca4d30cdeb`, branch `codex/fr-gl03-12-hardening`.
- Vision integration branch: `vision/fr-gl03-17-synthetic-integration`.
- Independent acceptance run: https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/actions/runs/42612532354
- Source architecture: `docs/FR-GL03-09-SECURE-BACKEND-CONTRACT.md`, `docs/FR-GL03-10-READONLY-ADAPTER.md`, and `prototype/dashboard-gateway.mjs`.

## Independent evidence verified
1. GitHub commit `2183ef...` exists and includes **27 added files** under `FR-GL03-12/`; the branch has diverged from `main` and was not merged.
2. The outer `FR-GL03-12/SHA256SUMS.txt` independently verified the actual published ZIP, report, return and verification text hashes (4 of 4).
3. The ZIP independently passed **22 unique safe archive members and CRC** checks.
4. `FR-GL03-12/source/verify.py` independently rehashed **21 package files**, and compared exact file membership against the packaged SHA256 manifest: PASS.
5. `npm test` in `FR-GL03-12/source` independently passed **68/68**, 0 failed, 0 skipped on GitHub Actions Node 24.
6. `node --test prototype/*.test.mjs` independently passed **31/31**, 0 failed, 0 skipped on the same branch; includes **9 new real-loopback-HTTP integration tests** exercising hardened server with Vision gateway.
7. All checks ran with synthetic fixtures, ephemeral local loopback server and repository CI; no production credentials, canonical Brain data or public API deployment were used.

**Do not aggregate 68 and 31 as proof of 99 unique security controls.** Each suite tests its own concerns and some behaviours overlap.

## Findings
### P1 — FR-GL03-10 schema incompatible with FR-GL03-12 strict envelope (verified)
FR-GL03-10 returns richer actions `{id,title,revision,state,context}` and decisions `{id,title,revision,state}`.
FR-GL03-12 `validDashboard` requires **exactly** `{id,title,context}` and `{id,title}`, rejecting the additional revision/state fields. With the real FR-GL03-10 synthetic adapter injected into hardened server, GET /v1/dashboard returns 502 `upstream_failure`. Verified by tests 17.8 and 17.9. This is an intentional fail-closed policy; do not bypass it via dropping fields silently.

**Remediation:** define a single versioned DTO covering real canonical revision, action identity/state, decision state, ranked Top 5 and warnings; update validation in a new isolated integration candidate, preserving strict allowlists, output limits and field-level disclosure. Independently review before merging.

### P1 — Production auth and authorization absent (expected)
FR-GL03-12 uses a shared synthetic bearer test token. `pkce.mjs` is only a helper. There is no OIDC provider integration, access-token verifier, per-user record authorization, revocation, or operational deployment controls.

**Remediation:** decide provider and hosting; implement isolated OAuth/OIDC authorization-code + PKCE with API audience, validated JWT/introspection and per-user authorization, under separate approval. Never expose live Brain through the current API.

### P1 — Current Pages UI is not connected to the gateway (expected)
`index.html` uses its own local fixture and temporary button state. That site is safe as a synthetic demo, but does not represent canonical status and cannot be used for real write confirmations.

**Remediation:** create read-only UI states and explicit mapper with safe text rendering and authenticated snapshots only when the identity boundary is ready. Keep live control buttons disabled until write/recovery acceptance.

### P2 — Top 5 ranking and schema semantics unspecified
The fixture implements basic context filtering, not due-date/priority/pinning/replenishment guarantees. The original FR-GL03-09 schema must define ordering as server-authoritative and include warnings and snapshot consistency.

### P2 — Provider/browser/operations untested
Tests demonstrate HTTP request handling and CORS headers on Node loopback, not genuine cross-origin browser login, token renewal, HTTPS, provider key rotation, tenant isolation, load or production monitoring.

## Recommended next non-overlapping development
- **Vision FR-GL03-18:** versioned synthetic DTO and strict mapper acceptance tests. Keep both richer record revisions and server refusal on unknown keys, and avoid second source of truth.
- **Vision FR-GL03-16:** read-only presentation mapper, loading/error/stale UI; no live data or writes.
- **Codex (later isolated assignment):** production OIDC resource-server prototype against a dedicated provider sandbox only after provider/host decision; avoid duplicating Vision DTO/UI work.
- **Security gate:** approve identity, hosting, UK data/privacy and canonical read policy before enabling private data.

## Decision
**PASS**: Codex delivery integrity; hardened synthetic server tests; Vision synthetic HTTP gateway connection.
**FAIL/BLOCKED**: richer contract integration (502 by design), authentication, real Brain connection, public API deployment, production go-live.
**Overall: PARTIAL**. No branch merge, production deployment or live data access authorised or performed.
