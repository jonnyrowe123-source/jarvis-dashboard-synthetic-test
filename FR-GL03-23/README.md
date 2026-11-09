# FR-GL03-23 — versioned read-only dashboard API candidate

Fictional synthetic records only. No production deployment, canonical data connection or writes.

## Reproduce

Use patched Node 24.x, npm and Python 3 in an isolated workspace. Package keys/identities are generated locally for tests and never saved. No real provider is contacted. Tests bind only ephemeral IPv4 loopback listeners.

```
python3 verify.py
cd source
npm ci --ignore-scripts --no-fund --no-audit
npm test
```

Use a workspace-local npm cache if the default home cache is unwritable. Include development dependencies for the JSON Schema conformance tests. jose 6.2.16 is the sole runtime package; Ajv 8.20.0 is test-only. Dependencies are pinned in package-lock.json, not vendored. Do not run the fixture suites with NODE_ENV=production: production explicitly refuses local-test issuer configuration and synthetic shared tokens.

## Candidate modules

- dashboard-v1.schema.json and dashboard-contract.mjs: shared strict structural/semantic contract, bounded immutable snapshots and exact serialization.
- versioned-adapter.mjs: validates the richer FR-GL03-10 synthetic shape and adds schemaVersion=1, retaining all existing fields/positions. This is version introduction, not the old field-dropping compatibility bridge.
- read-only-adapter.mjs: byte-identical copy of the existing FR-GL03-10 fictional fixture; synthetic-versioned-adapter.mjs composes it with the versioned boundary for the candidate default. No canonical source or ownership implementation exists.
- server.mjs: separate derivative of FR-GL03-19's server with its output boundary replaced by the shared contract. OIDC verification code and policy are copied unchanged. Injected server adapters must directly return the versioned DTO; unversioned/unsupported output fails closed.
- versioned-gateway.mjs: browser-compatible strict gateway, bounded response streaming, no token storage, no token in URLs, no redirects or writes. Requires an exact HTTPS API origin; explicit localTest enables loopback HTTP in tests only.
- readonly-presenter.mjs: unchanged FR-GL03-16 presenter copy. versioned-dto.mjs aliases its validator import to the shared contract. Pass validateDashboard as adaptPayload: the wire DTO is already versioned; no lost metadata needs reconstruction. index.html/GitHub Pages is unchanged.

Example isolated composition:

```
import {makeOidcServer} from './source/server.mjs';
import {createVersionedDashboardGateway} from './source/versioned-gateway.mjs';
import {createReadOnlyPresenter} from './source/readonly-presenter.mjs';
import {validateDashboard} from './source/dashboard-contract.mjs';

// Configure an approved fictional local issuer for tests only.
const server = makeOidcServer({oidc: fictionalTestConfiguration});
server.listen(0, '127.0.0.1');
// Test harness waits for the listener before using its address.
const gateway = createVersionedDashboardGateway({baseUrl: loopbackOrigin, localTest: true});
const presenter = createReadOnlyPresenter({gateway, adaptPayload: validateDashboard});
```

Use source/test-issuer.mjs only as test support, never as a deployable IdP. Missing production OIDC configuration fails before listening and never falls back to a shared token. The CLI is still explicitly synthetic-only; a production bootstrap remains unimplemented.

## Package contents and integrity

Read CONTRACT-V1.md, SECURITY-COMPATIBILITY.md and FR-GL03-23-RETURN.md. evidence/ contains executed baselines, final tests, dependency audit and source-integrity checks. references/ contains provenance snapshots for review, not alternative executable authorities. SHA256SUMS.json covers every first-party package file except itself and the outer ZIP/manifest. SHA256SUMS.txt covers the archive and key deliverables. verify.py checks exact first-party inventory and bytes, excluding dependency installation under source/node_modules/. The lockfile/npm ci verifies installed dependency artifacts.

All changes are isolated under FR-GL03-23/. Original FR-GL03-12/19 packages, Vision sources, workflow files, frontend and main are preserved. Current synthetic integration uses no legacy field-dropping bridge. Real provider, canonical authorization, ranking/pinning and operational release decisions remain Vision's responsibility.
