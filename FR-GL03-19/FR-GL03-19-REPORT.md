# FR-GL03-19 — Authentication security prototype report

Date: 9 November 2026, Europe/London. **Verdict: PARTIAL.**

The isolated resource-server prototype and synthetic acceptance tests pass. This is **not production-ready** and is not a deployed authentication service. Real provider, browser, operational revocation, per-record canonical authorization and hosting acceptance remain blockers. Vision's data-contract/schema work is deliberately untouched.

## Verified starting point

- Codex source commit: `2183ef2d833e2804062b671fa42c51ca4d30cdeb`, branch codex/fr-gl03-12-hardening, read back from GitHub.
- Vision snapshot: `ad3cf09e44b99b5824fbe4f082bbb94fe8208d91`, branch vision/fr-gl03-17-synthetic-integration. All **41 original blob contents** in that snapshot were reconstructed locally and independently checked against GitHub's content-addressed blob SHAs, then checked unchanged after development. The new branch is based on this immutable Vision snapshot, without a merge.
- Read the FR-GL03-17 independent integration report, FR-GL03-09 backend contract and Codex OIDC-DESIGN.md. Exact reference copies are included. Attachment/repository text was treated as evidence, not authority to exceed this assignment.
- Independently reran the original API suite: **68 passed, 0 failed, 0 skipped**. Independently reran Vision's suite: **31 passed, 0 failed, 0 skipped**. Both ran on Node v24.22.1; npm 11.9.0.
- FR-GL03-17 establishes that the strict Codex fixture schema rejects the richer FR-GL03-10 output with a generic 502. This known incompatibility remains intact; no fields were dropped or schema/adapter/frontend edited to hide it.

## Implementation

New work lives exclusively under FR-GL03-19/. Its source/server.mjs is a separate candidate derived from FR-GL03-12; it does not replace the archived baseline. The synthetic fixture adapter and the existing security/PKCE tests were copied byte-for-byte. No frontend or canonical/data adapter source was modified.

`oidc-auth.mjs` provides a modular resource-server boundary using pinned **jose 6.2.16** for signature and standard claim validation. The maintained library is reviewed in DEPENDENCY-REVIEW.md; the lockfile records its exact registry integrity. There are no transitive runtime packages, lifecycle scripts or bespoke signature-verification code. A scoped source review and npm advisory audit found no known advisories at execution; neither is a complete external cryptographic/supply-chain audit.

### Token/identity policy

- One bounded Authorization Bearer credential, case-insensitive scheme, compact JWT syntax, maximum header value 4096 characters. Duplicate credentials, query/cookie tokens and malformed headers do not authenticate.
- Exact configured HTTPS issuer and one exact API audience distinct from approved client IDs. Signature and key lookup constrained to explicitly selected ES256/RS256, mandatory kid and exact protected typ=at+jwt. Header keys limited to alg/typ/kid; token-provided URLs, embedded keys, certificates and JOSE extensions are refused before network fetch.
- Require iss, aud, sub, exp, iat, jti and client_id. jose checks signature, issuer/audience, expiry, nbf and maximum age; additional checks require integer dates, positive bounded lifetime, valid subject/jti/client IDs, configured authorized clients and consistent optional azp/token_use. Multiple audience arrays and normal ID tokens are rejected. The selected provider must honor the access-token profile; type checking cannot compensate for a compromised issuer deliberately minting mislabeled tokens.
- Separate authorization: a verified subject must be explicitly allowlisted under the one pinned issuer **and** scope must separately contain the exact dashboard:read permission. Missing scope or unlisted subjects receive generic 403. Identity/signature/claim failures receive generic 401; failures expose no token/claim/exception details.
- Minimal frozen principal returned by the module. The HTTP gate does not pass identity into the unchanged fixture adapter or return it to clients. All eligible fictional subjects see the same synthetic fixture; canonical ownership is deliberately not represented as implemented.

### JWKS, failure and concurrency policy

- Fetch only the statically configured JWKS endpoint, with HTTPS in production configuration. No discovery, redirects, credential forwarding or request-supplied endpoint resolution. Explicit local-test override requires IPv4 loopback issuer/endpoints and is prohibited under NODE_ENV=production.
- 32 KiB response cap, JSON content types only, no encoded response, at most eight public verification keys, distinct bounded key IDs, approved algorithms/key types/use/key_ops; private/symmetric key material is refused.
- Default cache TTL 60s, refresh cooldown 1s, total request/body deadline 1s. Ceilings: 300s TTL, 60s cooldown, 5s request deadline. One pending refresh is coalesced; unknown-kid attempts cannot create an unbounded key cache or unlimited refreshes. Provider headers do not extend the configured cache TTL.
- Known cached keys remain usable until TTL during provider outage. Unknown keys cannot authorize. Expired-cache verification fails closed on fetch failure; no stale grace/fallback. Key retirement takes effect at refresh/TTL, not instantly. Failed fetches also respect cooldown; legitimate newly rotated keys may temporarily be denied during it.
- Default 32 concurrent authentications, configurable ceiling 64, return generic 503 on saturation. Provider unavailability also yields redacted 503. HTTP responses include Retry-After. These bounds do not replace per-user/network quotas or gateway protection.

### API separation and preserved controls

`makeOidcServer({oidc})` forces OIDC and throws before listening for absent/unsafe configuration or mixed shared-token options. No provider/network failure, bad token or absent configuration falls back to shared synthetic authentication. The separate development makeServer({token}) mode remains for existing tests, refuses mixed OIDC configuration and is forbidden under NODE_ENV=production. The CLI requires explicit AUTHENTICATION_MODE=synthetic and has no implicit default or production configuration loader.

The existing read-only methods, exact view queries, request/body/header limits, output allowlists/byte cap, CORS/preflight, security headers, adapter timeout/capacity and exception redaction remain. Public synthetic /health is liveness only, not issuer readiness. Writes and HEAD still return 405 before authentication, preserving the existing control; valid permissions never enable writes. No /me, login, refresh or write endpoint is introduced.

## Executed acceptance evidence

| Suite | Passed | Failed | Skipped | Cancelled |
| --- | ---: | ---: | ---: | ---: |
| Original FR-GL03-12 API baseline | 68 | 0 | 0 | 0 |
| Original Vision frontend/integration baseline | 31 | 0 | 0 | 0 |
| Final FR-GL03-19 package source | 166 | 0 | 0 | 0 |
| Final unchanged Vision frontend/integration regression | 31 | 0 | 0 | 0 |
| Fresh package extraction, lockfile install and suite | 166 | 0 | 0 | 0 |

The final 166 include **68 preserved tests + 82 authentication-module tests + 16 OIDC HTTP tests**. Suite executions and overlapping concerns must not be counted as distinct security controls. No tests were skipped. Actual logs, dependency audit and source-integrity metadata are included. Fresh extraction also verifies exact first-party SHA256 membership and ZIP CRC/safe archive names. No browser/provider/production test was inferred from unit-test results.

New negative tests cover wrong/missing issuer/audience, signature tampering/forgery, alg=none, HMAC confusion, explicit RSA/EC algorithm selection, ID-token type/use, missing/invalid/future/expired/date claims, untrusted client/azp, missing permission/unlisted subject, malformed/oversized/duplicate credentials, query/cookie credential refusal, malicious key URLs/embedded keys/extensions, cache/key rotation and retirement, unknown-kid cooldown, coalesced refresh, provider error/redirect/closed connection, malformed/private/oversized JWKS, slow headers and stalled response bodies, outage recovery/expired cache, authentication capacity and concurrent HTTP reads. Missing configuration and production/synthetic separation are also tested.

An initial development test failed because jose correctly refused to *sign* a test token with an unrecognized critical extension. The test issuer was updated to explicitly support that fixture extension during signing so the API's rejection is actually exercised. Final evidence reports the corrected executed tests; this was not an authentication bypass.

## Replay-relevant results and limits

An access token with a valid signature is intentionally reusable on read requests. Tests verify repeated reads succeed, the same initially valid token fails after actual expiry, and a configured startup denylist rejects its jti. PKCE/code/nonce replay defenses belong to the browser authorization transaction and are not implemented by a resource-server verifier. Requiring jti does **not** prevent stolen-bearer replay. Static immutable allowlist/denylist snapshots require authenticator recreation to reflect changes; there is no live revocation/introspection/DPoP service. Cache TTL and token lifetime bound some exposure but do not establish a revocation SLA.

## Remaining vulnerabilities and unverified deployment gates

1. **Production blocker:** real IdP/client/audience/tenant selection and actual issuer token-profile validation are outstanding Vision decisions. No real provider was contacted. Production HTTPS/TLS/egress/proxy behavior is unverified; tests use loopback HTTP only. Direct Node HTTPS requests do not automatically configure an enterprise proxy.
2. **Production blocker:** canonical record ownership, field-level read policy and versioned DTO remain Vision's work. The known FR-GL03-10/12 schema mismatch remains. This API can authorize access to the whole fictional fixture, not production personal records.
3. **Production blocker:** no browser authorization-code/PKCE callback integration, session renewal/logout, durable revocation, emergency key retirement pipeline or sender constraints. Bearer replay within validity remains possible. An issuer compromise defeats claims/type policy.
4. No production bootstrap/configuration loader, HTTPS gateway/HSTS, trust-proxy configuration, per-user/network rate limits, redacted operational audit/monitoring or incident-response acceptance. Public health does not attest to JWKS/provider readiness. Signature verification/caching limits are not DDoS protection.
5. Host/runtime CVE assessment, real provider sandbox integration, browser/tenant isolation, sustained-load and external penetration testing remain unverified. The audited dependency version is pinned as of this run; future registry advisories/updates require review.
6. Existing adapter limits remain: timed-out promises retain their concurrency slots until actual settlement; a hung trusted adapter can saturate capacity and synchronous trusted code can block the event loop. No adapter/schema redesign was made.
7. The new source deliberately uses a restrictive access-token/JWKS profile. A provider with opaque tokens, different claim/type conventions or large/redirected JWKS requires a reviewed integration change. Do not silently relax checks or reactivate synthetic fallback to make a provider work.

## Boundary and decision

All signing keys were generated locally and held only in process memory; only public JWKS was served on ephemeral IPv4 loopback. Test identities, client IDs and token IDs are fictional. No real credentials, personal records, live Brain/Friday access, production writes, deployment, main-branch modification or merge occurred. No second canonical source was introduced. Existing upstream blobs remain unchanged.

**Ready for isolated synthetic authentication integration: YES.** **Ready for production deployment: NO.** Overall **PARTIAL**, with prototype security acceptance PASS and production gates outstanding. Publish only to codex/fr-gl03-19-oidc-prototype and independently verify the remote commit/file hashes. Vision retains go-live and provider/hosting/contract decisions.
