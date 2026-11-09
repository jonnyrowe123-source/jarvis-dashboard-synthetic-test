# FR-GL03-23 — Vision integration handover

**Verdict: PASS for isolated versioned synthetic API integration. Production readiness: BLOCKED.**

- New v1 contract preserves snapshot revision, IDs, record revisions/states and action contexts over OIDC HTTP to the presenter. Exact shared validation rejects unknown fields, duplicate cross-kind IDs, malformed/oversized/unsupported records and wrong-view results. No field-dropping bridge is used by the new candidate.
- Source array order is preserved throughout. The first-five display does not invent canonical ranking; future Top 5/pin policy and new fields require a reviewed version extension. Current v1 keeps FR-18's open-state/synthetic source profile.
- Independently verified original inputs: FR-19 commit 5d6363aff12f386eb8a09f3dc7c3fce037fe28f2; Vision-22 commit 95813c4dec440d42a09f0329102b1f6d634a006d; FR-18 a3d26020d6e2b28c79adb4e5f761a7d501cac292; FR-16 f9752e4b4a55ad40f3b9848b91c27dbc8e879036. All 79 original Vision-22 blobs remain unchanged.
- Executed baselines: 166 FR-19, 41 Vision-22, 12 FR-18 DTO/bridge subset and 10 FR-16 presenter subset passed. **Final candidate: 269 passed, 0 failed, 0 skipped, 0 cancelled**; unchanged Vision regression: 41 passed. Fresh-extraction locked-install suite reproduces 269 passes. Do not add repeated/overlapping suites as unique security controls.
- Preserved OIDC policy/code, CORS, read-only methods, deadlines/capacity, request/output limits and redacted failures. Existing immutable packages, source adapter, presenter, Pages UI and workflows are untouched. Runtime jose remains 6.2.16; test-only Ajv 8.20.0 checks the published schema. Advisory audit: zero known vulnerabilities at execution.
- **Ready for isolated integration: YES, fictional records only. Production-ready: NO.** Canonical ownership/minimum disclosure, authoritative ranking/pinning/snapshot semantics, real provider/browser login, operational revocation and hosting controls remain Vision decisions/gates.

Migration: use FR-GL03-23/source/server.mjs with makeOidcServer; wrap the rich synthetic source once with createVersionedReadOnlyAdapter (or inject a direct v1 source); switch to createVersionedDashboardGateway and pass validateDashboard to the unchanged presenter as adaptPayload. Do not use either legacy field-dropping bridge. Old unversioned/unknown-field outputs fail closed rather than losing metadata.

Read CONTRACT-V1.md and SECURITY-COMPATIBILITY.md. Package includes complete source, machine-readable schema, tests/evidence, dependency review and SHA256 manifests. Reproduce with Python verify.py, then source/npm ci --ignore-scripts and npm test on Node 24.x. Exact immutable publication SHA is returned after GitHub read-back; it cannot be embedded in the contents of its own commit.

No main merge, deployment, public API, real provider/Brain connection, live write or canonical policy implementation was performed or authorized.
