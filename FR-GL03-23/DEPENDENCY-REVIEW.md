# Dependencies and scoped review

Reviewed 9 November 2026 on Node v24.22.1 / npm 11.9.0.

Runtime: jose **6.2.16**, MIT, unchanged from verified FR-GL03-19. Authentication module and its 82 unit tests are byte-identical to that baseline. Its signature/issuer/audience/time/key-selection policy remains unchanged. The resource server does not implement its own cryptographic verification. Provider requirements and operational limits in FR-GL03-19 still apply.

Test-only: Ajv **8.20.0**, MIT, used to compile the published draft 2020-12 JSON Schema independently of the shared executable validator. Compilation uses strict mode and Unicode regexp behavior; there is no coercion, default insertion, extra-property removal or external schema loading. Only the committed trusted schema is compiled. Ajv's code-generation/evaluation machinery is not in the production request path or browser gateway.

Locked development transitive packages: fast-deep-equal 3.1.3 (MIT), fast-uri 3.1.9 (BSD-3-Clause), json-schema-traverse 1.0.0 (MIT), require-from-string 2.0.2 (MIT). Metadata and dependency inventory were inspected. None has install/preinstall/postinstall/prepare lifecycle hooks in the installed registry metadata; installation used --ignore-scripts regardless. All versions, registry URLs and integrity hashes are recorded in package-lock.json. No global/system dependency was installed.

The actual npm audit JSON reports **zero known advisories**, including development dependencies. This is an advisory lookup and scoped usage review, not an external cryptographic/code/supply-chain audit. Runtime/host CVE assessment and future dependency monitoring remain operational release requirements. Tests use only local loopback identity services; npm installation/audit uses the public registry, without provider credentials.
