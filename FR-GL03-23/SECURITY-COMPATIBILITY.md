# FR-GL03-23 — security, compatibility and migration review

Date: 9 November 2026 (Europe/London).

**Verdict: PASS for the isolated versioned synthetic API assignment. Production readiness: BLOCKED; deployment is not authorized.**

The new candidate transports the rich versioned dashboard DTO directly, with strict validation at source, HTTP output and gateway consumption. The old field-dropping bridge is unnecessary in this candidate. No production policy, frontend rollout or canonical integration is represented as complete.

## Independently verified inputs

| Input | Immutable source |
| --- | --- |
| FR-GL03-19 authentication package | 5d6363aff12f386eb8a09f3dc7c3fce037fe28f2 |
| Vision FR-GL03-22 integration snapshot | 95813c4dec440d42a09f0329102b1f6d634a006d |
| FR-GL03-18 versioned DTO/bridge work | a3d26020d6e2b28c79adb4e5f761a7d501cac292 |
| FR-GL03-16 presentation work | f9752e4b4a55ad40f3b9848b91c27dbc8e879036 |

Read FR-GL03-22's report and actual bridge/tests, FR-GL03-18's DTO/bridge source and tests, FR-GL03-16's presenter/tests, and the verified FR-GL03-19 source. Documentation claims were not treated as test evidence. All **79 existing Vision-22 snapshot blobs** were checked against GitHub's blob hashes before work and checked unchanged afterward. Seven fetched reference source/test blobs were also verified against their respective immutable branch snapshots; source-integrity.json records the inventory and provenance.

The FR-GL03-19 authenticator and its unit tests are byte-identical copies in this new candidate. The FR-GL03-10 synthetic adapter and FR-GL03-16 presenter copies are also unchanged. Original FR-GL03-12/19 packages, prototype/, index.html, workflow definitions and other existing repository files are untouched; all new files are under FR-GL03-23/.

## Executed results

Environment: managed isolated Linux, Node v24.22.1, npm 11.9.0. Local signing keys generated in memory; public JWKS served on ephemeral 127.0.0.1. No live IdP, Brain/Friday records, production credentials or externally listening API was used.

| Executed suite | Passed | Failed | Skipped | Cancelled |
| --- | ---: | ---: | ---: | ---: |
| Original FR-GL03-19 full baseline | 166 | 0 | 0 | 0 |
| Original Vision-22 prototype suite | 41 | 0 | 0 | 0 |
| FR-GL03-18 DTO/bridge subset | 12 | 0 | 0 | 0 |
| FR-GL03-16 presenter subset | 10 | 0 | 0 | 0 |
| Final FR-GL03-23 candidate | 269 | 0 | 0 | 0 |
| Final unchanged Vision-22 regression | 41 | 0 | 0 | 0 |
| Clean extraction + locked install + candidate suite | 269 | 0 | 0 | 0 |

The candidate contains 166 retained regression tests, with contract-specific fixture imports/assertions adjusted in two copied test files; **103 new tests** comprise 59 contract, 3 independent JSON Schema, 24 versioned HTTP/end-to-end and 17 gateway tests. Authentication module tests are unchanged. Repeated suites and overlapping concerns are not additional distinct security controls. The FR-18/16 subsets do not claim to execute every test on those branches.

Actual transcripts, dependency audit/tree and integrity metadata are included. Final archive verification checks safe unique paths, CRCs and exact first-party file membership/hashes; its source bytes match those installed and tested in a fresh extraction. Reference presenter rendering tests use an in-process DOM stub, not a real browser. HTTP integration uses real local TCP/HTTP plus native fetch and a local signing/JWKS fixture; no browser login or cross-origin browser claim is inferred.

## Security controls and contract findings

- **Identity fields survive:** schemaVersion=1, snapshot revision, every record ID/revision/state, action context, title and warnings are preserved. Unknown envelope/record fields fail closed. The only rich-source upgrade adds a version after validating the full source; it never strips revision/state or silently overwrites a source version.
- **Strict records:** exact keys, safe integer revisions, bounded text/collections, global cross-kind ID uniqueness, supported state/context/version, well-formed Unicode and requested-view consistency. No coercion, deduplication, filtering repair, empty-success substitute or automatic downgrade. Unknown fields cannot become an implicit disclosure channel.
- **Safe serialization:** descriptors/prototypes/dense arrays are checked, accessors/custom serialization fields refused, and a deeply frozen defensive copy is serialized. This removes adapter mutation/custom-toJSON ambiguity from ordinary data snapshots. Trusted local adapters are not a hostile-code sandbox; proxy traps or synchronous malicious code cannot be safely isolated by a schema validator.
- **Limits:** shape/text checks bound serialization work, then the complete UTF-8 response cap is enforced before 200 headers. Exact 65,536/65,537-byte cases are tested. The gateway independently bounds declared/actual streamed bytes and performs fatal UTF-8 decoding and full shared contract validation before returning data.
- **Version agreement:** the wire schema, server, gateway and FR-16 validator alias agree on v1. Ajv independently compiles the published JSON Schema and exercises Unicode/numeric/structural boundaries. Cross-record ID uniqueness, view consistency and byte limits remain explicitly mandatory executable-validator invariants beyond standard JSON Schema.
- **Ordering:** deliberately nonlexical IDs and distinct position titles survive repeated source-to-HTTP-to-gateway-to-presenter reads. The renderer's first-five display uses source order without re-ranking; full presenter records retain metadata. No canonical Top 5 or pin policy is fabricated.
- **Authentication unchanged:** pinned jose 6.2.16, configured issuer/audience/asymmetric algorithm/access-token type/date/client profile, explicit allowed subject and separate dashboard:read scope. Missing/invalid configuration refuses startup; OIDC failure never falls back to the separate local synthetic token path. Token URLs/cookies/ID tokens/forgery/replay-relevant expiry/unknown keys/rotation/provider outages remain covered by the existing executed tests.
- **HTTP/read-only unchanged:** exact query/path handling, duplicate credentials/framing checks, body/header/URI limits, CORS/narrow preflight, no-store/security headers, generic errors, no token/claim/exception disclosure and write/HEAD refusal. Public synthetic health remains liveness only. Unknown schema/bad source returns redacted 502. Adapter deadline/capacity/retained-slot and key-verification/JWKS caps remain in place.
- **Failure handling end to end:** invalid sources are not repaired or partially served; gateway errors map to generic presenter errors that clear records and snapshot revision. Context-specific concurrent reads retain the correct identity/revision/state. Native gateway tests cover hanging headers/body and redirect refusal.

## Compatibility and explicit migration

1. **Immutable packages remain historical.** FR-GL03-12/19 continue to return their original unversioned legacy shape. Do not patch those archives or their manifests. Import the new candidate modules under FR-GL03-23/source and install its locked dependencies instead.
2. **FR-GL03-10 richer synthetic source:** use createVersionedReadOnlyAdapter(source) exactly once. It validates the original rich source envelope and adds schemaVersion=1. Do not compose createOidcSyntheticBridge or createLegacyFixtureBridge: those discard metadata and are absent from the new candidate dependency graph. Existing versioned sources can be injected directly as the server adapter; no wrapper that rewrites their version is needed.
3. **Server:** replace only the output boundary in a derivative server; authentication code and upstream fixtures are preserved. A custom adapter must return the versioned DTO. Old unversioned or legacy field-dropped outputs now return 502 by explicit contract design. The default uses the unchanged rich fixture through the new versioning boundary.
4. **Gateway:** switch to createVersionedDashboardGateway. It checks the complete wire DTO and bounded response, instead of the old gateway's envelope-only acceptance. Use an exact HTTPS API origin; localhost HTTP now requires the explicit localTest test option. No persistent token/cache storage is introduced. Access-token acquisition remains a caller responsibility, separate from the HTTP/body deadline; its exceptions are redacted as sign-in failures.
5. **Presenter:** FR-GL03-16 source is reused unchanged, with its validator import bound to the shared v1 validator and adaptPayload set to validateDashboard. It consumes the already-versioned wire DTO; no record fields need reconstruction or removal. The view model retains record metadata/snapshot revision, while existing rendering remains title-based and read-only. The actual Pages UI is not modified or published by this assignment.
6. **V1 profile:** source stays synthetic-fixture; state remains open; action contexts remain 10min/lenovo; decisions remain context-free/snapshot-wide. Empty warnings, malformed Unicode, unknown fields/versions and response byte overflow now fail strictly. Code-point text lengths follow JSON Schema; they admit every previously valid FR-18 text plus explicitly tested astral boundaries. These are documented changes to the new contract, not edits to the old API packages.
7. **Future versions:** extra source/record fields, states/contexts, pin/rank metadata or ownership semantics need a new reviewed schema/path and coordinated client rollout. No opaque extensions bag, inferred rank, synthetic-to-canonical source substitution or automatic policy fallback is permitted. Define rollback by reverting candidate imports, not rewriting old package hashes.

## Outstanding decisions and operational risks

- **Canonical authorization remains unresolved:** current subject+scope gating grants access to the entire fictional fixture. It does not implement record ownership, view-specific personal-data filtering, tenant isolation or field-level canonical disclosure. Principal information is not passed to the unchanged source adapter. Vision must approve the canonical read boundary before any personal records are allowed.
- **Authoritative ranking/pinning remains unresolved:** source order is preserved, not certified as canonical priority. Vision must define policy, stable ties, pin conflicts, snapshot atomicity, revision advancement and Top 5 replenishment. The trusted source seam is the extension point; this candidate implements no ranking algorithm or write endpoint.
- **Production identity/hosting remain blocked:** no real provider/browser Code+PKCE session flow, operational revocation/introspection, sender-constrained tokens, TLS/HSTS/gateway/trusted-proxy setup, per-user/network quotas, security audit/monitoring or incident/rollback acceptance. Existing bearer tokens are reusable while valid; static allowlist/jti denylist and key TTL do not establish immediate revocation. No production bootstrap or permission to deploy is supplied.
- **Inherited reliability limits remain:** a timed-out source promise retains its bounded slot until it settles; synchronous trusted source code can block the event loop. Shape/output bounds do not sandbox arbitrary JavaScript. The source must provide a coherent snapshot; the API cannot independently prove canonical transaction consistency from opaque revisions.
- **No production assessment inferred:** native loopback tests are not real browser/IdP, proxy/TLS, sustained-load, tenant-policy or external penetration tests. Dependency audit reports zero known advisories as of execution; it does not certify future/library/runtime/host security. See DEPENDENCY-REVIEW.md.

## Handoff decision

**Ready for isolated synthetic versioned integration: YES. Production deployment: NO.** Contract implementation, security regression and end-to-end metadata preservation PASS within this scope. Production and canonical policy gates remain explicitly blocked. No live records, public API, merge, write endpoints or second canonical data source were introduced.
