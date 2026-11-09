# FR-GL03-11 — Isolated synthetic API proof

Status: DEVELOPMENT CANDIDATE. Not deployed. No real Jarvis records.

Run `node --test server.test.mjs` with Node.js 22+. Nine tests passed in the cloud container on 2026-11-09.

`server.mjs` exposes `GET /health` and a test-token-protected `GET /v1/dashboard`; every write is rejected. The token is a synthetic shared secret for **local isolation tests only**. This is NOT production authentication and must not be deployed to the internet. It has no user identity, sessions, revocation, rate limits or canonical Brain adapter.

The `read-only-adapter.mjs` is a minimal self-contained synthetic fixture for test execution, not a replacement for the separately committed FR-GL03-10 adapter.

Next tasks: independent security review; choose actual OIDC identity provider; implement token validation and user-level authorisation; synthetic staging tests; no personal data until approval. Codex parallel task: review API threat model, write failing negative tests for malformed requests and transport limits, and propose a production OIDC implementation in an isolated branch. Do not merge or deploy automatically.
