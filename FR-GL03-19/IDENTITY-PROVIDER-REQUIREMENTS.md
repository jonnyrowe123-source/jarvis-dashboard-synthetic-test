# Provider and deployment prerequisites — outstanding Vision decisions

No provider has been selected, contacted or provisioned. The fixture issuer is local test support, not a production identity system. This prototype verifies resource-server access tokens; it does not implement browser login, PKCE transactions, token issuance, refresh, logout, OIDC discovery or introspection. The earlier OIDC-DESIGN.md remains relevant to those separate flows.

## Required provider profile

Use a dedicated API audience distinct from every approved browser/client ID. The provider must issue signed JWT access tokens using ES256/P-256 or RS256/RSA >=2048 bits, with protected typ=at+jwt, nonempty kid, pinned exact iss, one exact string aud, stable opaque sub, numeric exp/iat, unique jti and an approved client_id. Require scope containing dashboard:read, plus an explicit administrator-maintained subject allowlist at this API. Optional azp must agree with client_id; optional token_use must equal access. Providers issuing typ=JWT, multiple audience arrays, opaque tokens, custom permission arrays or differently named client claims require a reviewed profile adapter, not relaxed defaults or synthetic fallback.

The issuer is trusted to distinguish ID tokens and access tokens correctly. A signed token maliciously mislabeled by a compromised trusted issuer cannot be identified by the resource server's type checks alone. Exact type/audience/client policy prevents normal ID-token substitution; it does not defend against issuer compromise.

Use fixed, trusted HTTPS issuer/JWKS configuration, stable public verification-only JWKs and rotation overlap. The API does not discover keys from token jku/x5u/jwk/x5c. Configure a JWKS endpoint serving JSON or application/jwk-set+json, no redirects or content encoding, <=8 keys and <=32 KiB. Restrict egress to the selected provider endpoint and review TLS trust/DNS/proxy behavior at the selected host. No credentials are needed to fetch public JWKS. No issuer endpoint is accepted from user input.

This prototype uses direct Node HTTPS requests, not proxy auto-discovery. Production egress/proxy routing and CA configuration must be explicitly tested in the selected hosting environment. The only runtime issuer requests executed here were loopback HTTP fixtures.

## Vision decisions and integration gates

- Select provider, tenant and eligible users; approve exact issuer, audience, client registrations and allowlist ownership. Subject identifiers are scoped to the one pinned issuer. Establish user removal and configuration refresh procedures.
- Implement/review Authorization Code + PKCE browser login with transaction state/nonce/verifier replay protection. Never embed secrets/tokens in Pages, localStorage or query strings. No frontend modification is delivered here.
- Define per-record ownership and field-level canonical read authorization with Vision's versioned dashboard DTO. This prototype gates the whole fictional dashboard, not individual records. Preserve the current schema-mismatch refusal until Vision resolves the contract.
- Decide short token lifetime, clock skew, emergency key retirement and revocation SLA. Cached keys survive up to TTL and bearer tokens can be replayed within validity. Static startup jti denylisting is a testable hook, not an operational revocation service. Consider provider introspection or sender constraints if required; do not assume jti or PKCE stops stolen-access-token replay.
- Supply a deployment entrypoint that calls makeOidcServer with approved trusted production configuration and fails before listening if it is incomplete. The delivered CLI intentionally supports only explicitly selected synthetic local use. Keep test-issuer.mjs/signing support out of runtime deployments.
- Provide HTTPS/gateway, HSTS at the TLS boundary, restricted CORS origin, trusted-proxy policy, per-user/network quotas and monitoring. The authentication cap and key-refresh cooldown do not replace request rate limiting or DDoS controls.
- Add redacted audit outcomes and operational health/readiness without logging Authorization headers, JWTs, claims, codes or keys. Manage secrets outside source. Public JWKS verification itself needs no private signing key in the API.
- Independently test actual provider sandbox issuance/type claims, key rotation and revocation, browser callback flow, tenant/user removal, TLS, gateway outages, sustained load and penetration testing. Re-run reviewed dependency auditing at integration/release time.

No public endpoint, canonical data connection or production deployment is authorized by this package. Writes remain absent regardless of identity or permission claims.
