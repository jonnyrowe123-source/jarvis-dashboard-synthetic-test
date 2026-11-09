# FR-GL03-25 — Independent versioned API acceptance

Date: 9 November 2026, Europe/London.

**Verdict: PASS within isolated synthetic OIDC/API/presenter scope; production BLOCKED.**

## Independent evidence
Codex's FR-GL03-23 publication was retrieved from immutable commit `ae4e74c690f1889527a2a05c6f20c93aaacd0c12`. Its reported GitHub commit contains 48 changed files, including source, contract specification, review, ZIP and SHA256 manifest. Vision read the actual versioned contract, server, gateway, HTTP tests, handover and security report. The Codex package's self-reported full ZIP/SHA256 verification was **not independently repeated** by Vision.

Vision created a separate branch from that immutable commit: `vision/fr-gl03-25-versioned-independent-acceptance`, and added `prototype/versioned-independent-acceptance.test.mjs` (6 tests) plus an independent GitHub Actions workflow.

GitHub Actions independently executed the published candidate on Node 24 after locked dependency installation:
- Codex candidate suite: **269 pass / 0 fail / 0 skip**
- New independent Vision OIDC HTTP + gateway + presenter checks: **6 pass / 0 fail / 0 skip**
- Full available Vision `prototype/*.test.mjs` regression after fixing branch-only locked dependency installation: **47 pass / 0 fail / 0 skip** (includes the same six new tests).

Evidence:
- Candidate + independent acceptance: https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/actions/runs/42623697529
- Corrected routine Vision regression: https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/actions/runs/42623879745
- Later rerun of dedicated candidate acceptance: https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/actions/runs/42623879830

The first routine Vision regression run on the branch failed due to missing `jose` dependency installation from the separate FR-GL03-19/23 source directories. The workflow was corrected on this branch to install both locked dependencies; the rerun passed.

## Technical findings
- `dashboard-contract.mjs` preserves `schemaVersion=1`, snapshot revision, global IDs, title, action context, record revision and state, and source ordering.
- `server.mjs` uses `encodeDashboard` to reject malformed responses before sending 200 headers.
- `versioned-gateway.mjs` enforces HTTPS outside explicit loopback tests, sends the Bearer token only in the Authorization header, bounds response bytes and rejects unsupported payloads.
- Real loopback HTTP integration confirmed full metadata preservation through OIDC to gateway and FR-16 presenter.
- Wrong subject/scope fails closed, duplicate IDs and unsupported version return redacted 502, and access loss clears previously displayed records.
- The old metadata-dropping bridge is not part of this candidate's dependency path.

## Release blockers
- The synthetic v1 schema supports only `source=synthetic-fixture` and `state=open`; it is not a canonical production DTO.
- No per-record owner/tenant/field-level authorization, real provider/browser sign-in or operational revocation.
- No authoritative pin/rank/replenishment policy; first five are source-ordered, not proven canonical Top 5.
- No live Brain, hosted real HTTPS API, monitoring/rate limits or deployment acceptance.
- This is a security-relevant code review and synthetic test assessment, not an independent full binary SHA256 audit or penetration test.

No merge to `main`, public dashboard modification, deployment or live record access occurred.

**Next recommended bounded task:** FR-GL03-26, independent mobile/browser versioned contract acceptance through a synthetic local issuer, no provider selection or public deployment. In parallel, Vision should define canonical authorization and Top 5 semantics as explicit reviewable decisions before implementing production adapters.
