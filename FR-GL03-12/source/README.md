# FR-GL03-12 isolated synthetic API candidate

Development only. No production authentication, deployment, live data access, writes, external calls, or persistence. The bundled adapter is a fictional fixture, not the canonical Brain or the FR-GL03-10 implementation.

## Reproduce

Use a patched Node.js 24.x runtime (tested on 24.22.1), Python 3 for integrity verification, and no npm installation. There are zero third-party dependencies, install scripts, or lockfile requirements.

```
python3 verify.py
npm test
```

Tests listen only on ephemeral IPv4 loopback ports. Run tests in an isolated environment with no production credentials. The literal test token is a public synthetic fixture. It is not a secret or a deployment credential.

For a local manual session, generate an ephemeral synthetic token in the process environment and start on loopback:

```
SYNTHETIC_TEST_TOKEN="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))")" node server.mjs
```

The process prints only its loopback address. Do not print, commit, reuse, or put a real secret in this variable. Stop with Ctrl-C. No dotenv file is needed. Do not expose this listener through a public proxy, port forward or container port publication.

## Interface

- `GET /health`: public synthetic liveness, no records; not a dependency-readiness signal.
- `GET /v1/dashboard`: exact `Authorization: Bearer <synthetic-token>` header; optional exact `view=overall`, `view=10min`, or `view=lenovo`.
- All write methods and HEAD: 405, `Allow: GET`. OPTIONS is limited to the dashboard's allowlisted GET preflight. No cookies or credentialed CORS.
- Default CORS origin: `http://localhost:4173`. A different exact HTTP(S) origin can be supplied to `makeServer`. Requests carrying other origins receive 403; nonbrowser callers need no Origin but still need authentication.
- Unknown authenticated paths: 404. Unknown unauthenticated paths: 401. Noncanonical/encoded queries: 400. Bodies: 413 and connection close; Expect: 100-continue: 417. URI cap: 2048 characters; parsed header cap: 8192 bytes.
- 16 concurrent adapter operations, no unbounded waiting queue; saturation: 503 with Retry-After. Default adapter deadline: 500 ms; adapter error, timeout or invalid result: generic 502. Output cap: 65536 UTF-8 bytes plus strict fixture schema. No source exception or request token is logged.
- Header timeout 5 seconds, request timeout 10 seconds, idle socket timeout 10 seconds, keepalive 1 second, 100 requests/socket, 64 connections. Parser errors return minimal 400/431 and close. These are local guardrails, not production DDoS protection.

`pkce.mjs` is an isolated S256/random-material helper with RFC-vector tests. It is deliberately not connected to the synthetic bearer path. See OIDC-DESIGN.md before any production implementation.

Compatibility is limited to observed FR-GL03-11 behavior. See the report for missing upstream contracts, deliberate stricter behavior and production blockers. `baseline/` preserves the original five files for comparison. `evidence/` contains actual command results. The root manifest covers every package file except itself; the original baseline manifest has its original scope.
