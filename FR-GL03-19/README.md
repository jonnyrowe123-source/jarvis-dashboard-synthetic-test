# FR-GL03-19 — isolated OIDC resource-server prototype

**Not a production deployment. Fictional identities and local test keys only.**

This is a separate authentication candidate derived from verified FR-GL03-12 source, alongside the unchanged Vision FR-GL03-17 tree. No frontend, FR-GL03-10 adapter or dashboard schema is changed. The source/read-only-adapter.mjs file is an exact copy of the old self-contained synthetic fixture, not the canonical adapter. Vision's richer DTO/schema incompatibility remains unresolved here by design.

## Reproduce

Use patched Node 24.x, npm, Python 3 and an isolated workspace without production credentials. Tests generate private signing keys in memory, serve only public JWKS on ephemeral 127.0.0.1 ports and never contact a real identity provider. No real user identifiers, credentials or key files are supplied.

```
python3 verify.py
cd source
npm ci --ignore-scripts --no-fund --no-audit
npm test
```

The lockfile pins jose 6.2.16 and its registry integrity digest. npm installation needs access only to the public npm registry; the test suite needs loopback networking, not external services. Configure the npm cache under your workspace if the default home cache is unwritable. Do not set NODE_ENV=production while running the synthetic fixture suites: production explicitly rejects the local-test override and shared-token mode.

Tests in this package include the original 68 security/fixture tests and new module/HTTP authentication tests. The original Vision frontend/integration suite remains in repository prototype/; its separate transcript is included as regression evidence. It is not bundled as a new frontend candidate.

## Authentication boundary

```
import {makeOidcServer} from './source/server.mjs';
const server = makeOidcServer({oidc: trustedConfiguration});
// Bind only to loopback for prototype evaluation; do not expose publicly.
server.listen(0, '127.0.0.1');
```

A complete trustedConfiguration requires issuer, audience, jwksUri, algorithms (ES256 and/or RS256), allowedSubjects and allowedClientIds. Production configuration requires HTTPS issuer/JWKS URLs; the client IDs must differ from the API audience. No request supplies these values. Missing/unsafe configuration throws before a listener is created. No shared-token fallback exists in this path. Do not use real provider values or real identities in this prototype.

`environment: 'local-test'` is only for explicit fixtures with literal IPv4 loopback endpoints; it is refused under NODE_ENV=production. `test-issuer.mjs` constructs complete fictional configuration for tests; it is not a deployable IdP. Do not import test signing support into a deployed process.

`createOidcAuthenticator(config).authenticate(req)` returns a minimal authenticated principal only after signature and claim checks, or a generic 401/403/503 result. The HTTP server enforces it before dashboard/unknown-route processing. Principal data is not returned to clients or passed into the existing adapter; every allowlisted subject sees the same fictional fixture. Canonical ownership/row-level policies remain a Vision integration gate.

The original development-only makeServer({token}) path remains for the 68 legacy controls. It rejects NODE_ENV=production, rejects mixed oidc configuration, and is never selected by makeOidcServer. The CLI now requires AUTHENTICATION_MODE=synthetic explicitly and has no production/OIDC startup loader. Production applications must use the OIDC factory with reviewed trusted configuration; a real deployment entrypoint remains out of scope.

## HTTP and cache behavior

- Authentication: 401 with generic Bearer challenge; verified but unlisted subject or missing dashboard:read scope: 403. Provider unavailable/expired cache or verification saturation: 503 and Retry-After.
- Public /health and approved preflight remain unauthenticated. Health is synthetic process liveness, not provider readiness. Writes/HEAD remain 405 before authentication; valid identity never enables a write.
- Request validation, output schema, CORS, limits and security headers are preserved. Default security limits are documented in the report.
- Configured issuer, one exact API audience, at+jwt type, approved asymmetric algorithm and kid are required. Reject ID tokens, token-supplied key URLs, embedded keys and unknown JOSE extensions. Access tokens must carry iss/aud/sub/exp/iat/jti/client_id; scope must separately include dashboard:read, and the subject must separately be allowlisted for the pinned issuer.
- Default access-token maximum lifetime 300s, skew 5s; configurable ceilings 900s/60s. Default JWKS TTL 60s (ceiling 300s), fetch deadline 1s (ceiling 5s), refresh cooldown 1s, maximum 8 public keys/32 KiB. At most 32 concurrent verifications by default, ceiling 64. A single in-flight fetch is shared. No redirects/discovery or stale-key grace after TTL.
- Known cached keys remain usable until TTL during an outage. Unknown key IDs and expired caches cannot authorize; refreshes are coalesced/throttled. A legitimate new key can be denied during the cooldown; providers should publish overlap keys before rotation. Cache TTL bounds retirement detection, not immediate revocation.
- Bearer access tokens are deliberately reusable for read requests until expiry/revocation. jti is required for incident correlation and an optional bounded startup denylist; it does not make a bearer token one-use. Runtime revocation, logout and sender-constrained tokens are not implemented.

Read the security report, IDENTITY-PROVIDER-REQUIREMENTS.md and DEPENDENCY-REVIEW.md before integration. No production readiness is claimed.
