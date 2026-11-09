# Scoped dependency/security review

Reviewed on 9 November 2026 using Node v24.22.1 and npm 11.9.0.

- Runtime library: jose, exact version **6.2.16**, MIT license, maintained upstream https://github.com/panva/jose. This was the registry's current release at inspection.
- Direct dependency only; no transitive runtime packages and no package lifecycle installation scripts. Node built-ins provide HTTP(S), timing and test primitives. The library uses Web Crypto for signature operations.
- Registry artifact: https://registry.npmjs.org/jose/-/jose-6.2.16.tgz
- Lockfile integrity: `sha512-4LSJpbuBuPdGrONCdZUy0xnxtLf8eEz+EY0SMXdHQEBU7bgUHDVblU/JAjryv3wID9/LK7/YuwFwq+AQNfMscQ==`
- Installation: project-local `npm ci --ignore-scripts --no-fund --no-audit`; use a workspace-local npm cache if needed. No global/system installation, private registry, live provider or real credentials required. node_modules is excluded from source delivery; package-lock.json preserves the exact registry version/integrity for reproducibility.
- Scoped source inspection covered installed package metadata, jwtVerify's signature-before-claims path, required issuer/audience/exp/iat validation, claim timing/maxTokenAge checks and createLocalJWKSet's algorithm/kid/use/key_ops/public-key selection behavior. Protocol-specific token profile, permission and user policy are enforced by this candidate around those APIs.
- `npm audit --json` at inspection reported zero known advisories across all severity levels; actual JSON and dependency inventory are included in evidence/. This is a registry advisory check, not proof that the library/runtime/supply chain has no vulnerabilities or an independent full cryptographic audit.
- No homemade JWT signature verification is implemented. Locally generated test keys and signing operations use jose; private keys remain only in process memory. Standard Node HTTP(S) fetching is bounded and fixed to trusted configured endpoints, with explicit no-redirect behavior and cache policy tests.

Before release: independently review updates and lockfile integrity, test provider profile compatibility, verify the selected Node runtime/security support and establish dependency monitoring. The Node runtime and hosting stack were not subjected to an external CVE assessment here.
