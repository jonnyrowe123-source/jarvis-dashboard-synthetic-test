# FR-GL03-13 — Browser gateway handover
Status: SOURCE CANDIDATE / NOT DEPLOYED / TESTS NOT YET EXECUTED

This stream is independent of Codex FR-GL03-12 (server hardening). It defines a browser-side read-only adapter for a future authenticated API.

Source: prototype/dashboard-gateway.mjs
Tests: prototype/dashboard-gateway.test.mjs
Run: node --test prototype/dashboard-gateway.test.mjs (Node 22+)

Boundary: no real Jarvis records, no API deployed, no credentials embedded, no write path. The getAccessToken callback is supplied by a future independently reviewed OIDC integration; it is NOT implemented here. Do not pass long-lived secrets or put tokens in localStorage.

Known limitations: response validation is structural only; no record-level schema/size cap yet; no actual OIDC integration, no user identity, no canonical data adapter, no cross-device testing. Browser API errors must be rendered safely via textContent, not innerHTML. Token memory lifecycle and XSS protection require separate review.

Integration gates:
1. FR-GL03-12 security review and accepted API semantics.
2. Identity-provider decision and authenticated staging API.
3. End-to-end tests with synthetic-only fixtures, including 401/403, offline, expired token and malformed payload.
4. Explicit approval before any real-data access.

Production readiness: BLOCKED.
