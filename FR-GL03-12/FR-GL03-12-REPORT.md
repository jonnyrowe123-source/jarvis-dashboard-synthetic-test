# FR-GL03-12 — Independent secure API hardening report

Date: 9 November 2026 (Europe/London). Overall status: **PARTIAL**.

The isolated synthetic candidate is ready for isolated integration testing with synthetic inputs. It is **not ready for production deployment**. Production identity/authorization and compatibility with the actual FR-GL03-09/10 artifacts remain security-critical release blockers. Vision retains architecture, hosting, canonical integration and go-live decisions.

## Input integrity and dependency inspection

Input: FR-GL03-11-SYNTHETIC-API-PROOF.zip, 3,366 bytes. SHA256:

`b4d96ebd09ad451fe60a4039b9f21a7e4b2c8cbb6ed8ce59df519ef731b1e95c`

Inspected the archive member list before extraction: five flat, regular files, no traversal names. Verified all four entries in the original SHA256SUMS.json against actual extracted bytes: README.md, server.mjs, server.test.mjs and read-only-adapter.mjs all match. The original manifest excludes itself; all five original files are preserved under baseline/. Hash matching establishes integrity against the supplied manifest, not independent publisher authenticity; no signature or trusted out-of-band digest was supplied.

Read all original source, tests and documentation. The original had no package manifest or external dependencies; imports were Node built-ins and the local synthetic adapter. Updated code also uses only Node built-ins and local modules. Added a private package.json with explicit Node 24.x support and test/start scripts; no packages installed, no runtime/development third-party dependencies added, no install scripts or network service dependency. An npm vulnerability audit would not establish Node runtime security and was not used as evidence. Runtime patching and future dependency review remain operator responsibilities.

Documentation in the attachment was treated as material to assess, not authorization or proof. The reported original nine passes were independently reproduced.

## Actual test results

Environment: managed isolated Linux development environment; Node.js v24.22.1, npm 11.9.0. All listeners used ephemeral 127.0.0.1 ports. No deployment, live Brain access, personal records, GitHub operation, dashboard modification or persistent data write occurred.

| Execution | Passed | Failed | Skipped | Cancelled |
| --- | ---: | ---: | ---: | ---: |
| Original `node --test work/original/server.test.mjs` | 9 | 0 | 0 | 0 |
| Final `node --test *.test.mjs` | 68 | 0 | 0 | 0 |
| Final documented `npm test` | 68 | 0 | 0 | 0 |

The final 68 tests include the original nine unchanged tests. Repeated runs are verification of the same tests, not additional unique coverage. Syntax checks passed for server.mjs and pkce.mjs. evidence/ includes actual test transcripts and before/after HTTP probes. The package is also freshly extracted, its full file inventory and hashes checked, and its suite rerun as a final packaging check; verification evidence is returned separately to avoid a self-referential package hash.

## Findings and changes

| Finding in original | Change and evidence | Limit |
| --- | --- | --- |
| Shared-token authentication has no principal, authorization, expiry, revocation or production identity verification | Explicitly retained as synthetic only; timingSafeEqual with bounded token format; negative authorization tests; standalone PKCE helper and OIDC design | **Production blocker**; passing synthetic bearer tests does not verify OIDC |
| Empty/encoded queries accepted, target parsing normalized paths and accepted absolute URLs | Exact origin-form paths, canonical view query grammar, duplicate/unknown/blank/encoded/malformed query rejection before adapter calls | Deliberately stricter than original; real contract review required |
| No explicit body/URI/header limits; duplicate Authorization ambiguity | No request bodies; early close for body framing, 2048-character URI cap, 8192-byte header cap, duplicate security-header rejection, parser error handling and Expect rejection | Wire-tested oversized headers, URI, body framing and malformed HTTP; not a comprehensive parser audit |
| Every browser preflight rejected, preventing normal cross-origin Authorization requests | Narrow allowlisted GET/Authorization preflight; all supplied disallowed origins denied; Vary on application responses | Browser integration remains untested; CORS never replaces identity validation |
| Adapter failures conflated with invalid views; no deadline/capacity guard | Validate query separately; generic 502 errors; 500 ms deadline, 16 active operations, bounded connection count and socket/request/header timers | Synchronous CPU blocking cannot be interrupted; hung adapter promises retain slots until settlement |
| Adapter output not validated or size bounded | Strict synthetic envelope and item fields, array/string limits, UTF-8 byte cap; reject extra fields, invalid shapes, cycles and oversized responses | Fixture-specific; trusted local adapter required; no production schema claimed |
| Missing error/transport negative tests | 59 additional tests including raw TCP framing cases, failure/timeout recovery, saturation, 30 concurrent requests, schema disclosure and PKCE vector | No fuzz campaign, provider integration, production load test or external penetration test |
| Security metadata incomplete | Retained no-store/nosniff/referrer/CSP, added frame denial and CORP, auth challenge, method Allow, Retry-After and redacted generic errors | Parser-level failures are intentionally minimal close responses; no TLS/HSTS on local HTTP |

Actual probes: empty view and encoded query key changed from HTTP 200 to 400; disallowed-origin health changed from 200 without CORS permission to explicit 403; valid allowlisted preflight changed from 403 to 204. The original disallowed-origin response was not evidence that browsers could read it: no Access-Control-Allow-Origin was present. The new rejection is defense in depth and clearer policy.

## Independently verified controls

- Original archive member integrity and all four supplied SHA256 entries.
- Existing functional behavior through the original nine tests.
- Exact view validation, duplicates/unknown/encoded queries, absolute/noncanonical targets, no body acceptance, malformed HTTP, ambiguous framing, duplicate auth/origin and header/URI limits over loopback HTTP/TCP.
- Unauthorized/wrong-token access denial and write/HEAD method rejection; methods do not acquire write behavior with a valid synthetic token.
- Allowed/denied origin and preflight responses, application security headers and absent Server header.
- Generic adapter failures, missing/oversized/extra/cyclic output rejection, deadlines, concurrency saturation and rejection recovery; concurrent view isolation.
- Header/request/keepalive/request-count settings by configuration assertions. Wall-clock slow-client enforcement and connection-cap saturation were not exercised.
- PKCE RFC 7636 S256 vector, verifier validation, generated material format and observed independence across 100 generated transactions. This is not proof of an integrated login flow or a statistical RNG audit.
- Complete package member hashes, fresh-extraction tests and outer ZIP CRC integrity in the final packaging check.

## FR-GL03-09 / FR-GL03-10 compatibility assessment

Neither the FR-GL03-09 secure backend contract nor the real FR-GL03-10 read-only adapter was supplied. No connected live source was accessed to retrieve them. Therefore actual upstream compatibility is **UNVERIFIED**, not PASS.

Observed compatibility: original health payload, dashboard envelope (revision, source, actions, decisions, warnings), view names, read-only behavior and async getDashboard(view) use are preserved for the bundled synthetic fixture. An injected adapter seam enables isolated failure/contract testing. The fixture has no canonical credentials, records or writes.

Intentional behavior differences: exact canonical query encoding, empty view rejection, explicit Origin denial, allowed narrow preflight, distinct generic 502 for adapter errors, explicit limits, and strict synthetic output schema. The `source: synthetic-fixture` guard deliberately prevents claiming this candidate accepts real data. Do not plug the canonical Brain into this build unchanged. Vision should supply versioned FR-GL03-09 schema/error/auth semantics and FR-GL03-10 adapter behavior; add schema and failure-contract tests, review field-level disclosure/authorization, then replace the fixture guard in a separately reviewed integration. Confirm schema versioning, allowed source/revision values, view semantics, warning types, snapshot consistency and cancellation behavior. This adds no second canonical source.

## Remaining vulnerabilities, unverified controls and release blockers

1. **Critical production blocker:** no OIDC verification, individual authorization, session lifecycle or revocation. A leaked shared synthetic token grants all fixture reads. The token has no production standing. PKCE helper code alone does not authenticate anyone.
2. **Critical production blocker:** actual FR-GL03-09/10 contract and authorization/data minimization behavior unverified. Real adapter integration and personal data use remain prohibited for this build.
3. Hosting/gateway, HTTPS/HSTS, trusted proxy rules, per-principal/network rate limits, audit pipeline, operational secrets handling and dependency monitoring are not implemented or tested. Local transport/capacity caps do not prevent distributed denial of service. No public API is approved.
4. An adapter that never settles eventually occupies all bounded slots; later calls fail 503. Timeout does not cancel underlying work. Production adapter work needs finite I/O timeouts and cooperative cancellation or isolation. Synchronous/harmful code in an injected adapter can block the event loop; adapters are trusted code, not a sandbox. Memory limits are not a defense against malicious adapter code.
5. Actual browser callback/preflight behavior, provider key rotation/outage, replay protection, tenant isolation, expired tokens, TLS, slowloris timing, connection-cap load, sustained load and external penetration testing remain unverified. Node runtime CVE status was not independently fetched; use a supported patched runtime.
6. API headers do not secure the existing dashboard's code. No dashboard edit was made. HTML-looking strings remain JSON data; consumers must render them as text. Parser/early Expect errors do not carry the complete application header set; they contain no records and close the connection.

## Recommendations and handoff

Use this package only for isolated synthetic integration tests. Review OIDC-DESIGN.md with Vision, obtain the actual upstream contract/adapter artifacts, establish authorization policy and a provider sandbox, then add integration and operational security evidence. Do not infer production readiness from unit-test success. No public deployment, merge, live write or architecture/hosting selection is requested or performed.
