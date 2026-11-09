# FR-GL03-17 — Independent synthetic integration acceptance
Date: 2026-11-09
Verdict: **PASS for isolated synthetic compatibility only; production BLOCKED.**

## Baselines and scope
- Codex FR-GL03-12 immutable parent commit `2183ef2d833e2804062b671fa42c51ca4d30cdeb`.
- The Codex GitHub delivery contains 27 added paths (GitHub compare), including the original ZIP, reports, verification evidence, manifest and extracted source. Delivery branch `codex/fr-gl03-12-hardening` is retained; no merge to main.
- The Vision integration branch `vision/fr-gl03-17-integration` starts from the Codex parent and adds frozen copies of original FR-GL03-10 adapter and FR-GL03-13 gateway, a synthetic-only projection bridge, integration tests and CI workflow.
- All data is fictional. No real authentication, live Brain, real user records, deployment or production secrets.

## Independent CI evidence
GitHub Actions run: https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/actions/runs/42613347184
Commit: `5f4f0fe6202064d977b196c30aca046ee84b9cda`
Job ID: `129147056558`, conclusion **success**.

The actual job log (not merely workflow summary) confirms:
- `python3 verify.py`: **PASS 21 package files verified**.
- `node --test *.test.mjs` in Codex package: **68 passed, 0 failed**.
- `node --test FR-GL03-17/integration.test.mjs`: **11 passed, 0 failed**.
- Total across those two suites: **79 tests passed, no failures**; the integration tests are additional to the Codex suite.

The remote ZIP is present and the outer manifest is published. SHA256 of the ZIP was verified by Codex at publication, but Vision's CI independently rechecked the extracted source manifest rather than re-hashing the ZIP: keep those evidence categories distinct.

## Contract reconciliation result
- The original FR-GL03-10 adapter has extra record fields `revision` and `state`, whereas FR-GL03-12 server deliberately allows only `{id,title,context}` actions and `{id,title}` decisions. Passing the original adapter directly would yield HTTP 502, so it is **not drop-in compatible**.
- Vision's `synthetic-contract-bridge.mjs` validates the input, requires `source: synthetic-fixture`, checks contextual tags and performs an explicit allowlisted projection. This makes the two original modules interoperable in a **fictional-data-only** test without weakening server-side output validation.
- The frozen FR-GL03-13 gateway successfully fetches through the hardened server, and the integration suite exercises view filtering, unauthenticated/wrong-token access, CORS, preflight, denied writes and offline error mapping.
- The integration gateway's fetch implementation is remapped to loopback: this is a controlled simulation, **not** a real browser OIDC or TLS verification.

## Outstanding blockers
1. Production OIDC login, access token validation, per-user record authorization and revocation are not implemented. Shared token is synthetic only.
2. No confirmed canonical Brain adapter, schema version, ranking semantics, ownership, revision/cursor or redaction policy. The bridge intentionally strips fields required for production UX.
3. The public GitHub Pages interface is not integrated with the backend; its controls only modify fictional in-tab state.
4. Hosting, secrets management, HTTPS, CSP, support, audit trail, backups, risk assessment and business/device restrictions need separate review.
5. Server's timed-out adapter work can still occupy an in-flight slot until settlement; production needs cancellation and bounded I/O.
6. No actual end-user-browser test of credentials or API calls, and no pen test.

## Next smallest tasks
- **FR-GL03-18 (Vision):** synthetic-only read-only UI rendering gateway data and safe loading/error states; no sign-in, real records or public API deployment.
- **FR-GL03-19 (architecture decision):** compare host/provider options with current price, privacy and UK work-laptop constraints; obtain user decision before adding account integrations.
- **FR-GL03-20 (Codex independent):** versioned canonical-shaped synthetic schema, Top 5 ranking contract and negative tests, but keep fixture-only and avoid production auth implementation without selected provider.

No merge or public backend deployment is authorised by this report.
