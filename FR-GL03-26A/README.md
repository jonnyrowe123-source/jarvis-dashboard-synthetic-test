# FR-GL03-26A — authorization configuration capture

Synthetic development candidate only. No security acceptance, live Brain connection,
production deployment, merge or baseline branch changes are authorized by this package.

Base: `1b18ffda991534cdb0d3ee51eb1a34f01b89559d`
Branch: `vision/fr-gl03-26a-authorization-hardening`

The original policy validated `subjectTenants` but retained the caller-owned object.
A caller could change a subject's tenant after construction or while a snapshot read
was pending. If a record's ACL also named that subject, the changed tenant mapping
could grant access across the established tenant boundary.

Construction now accepts exactly the existing two fictional subject keys as own data
properties on an ordinary object, validates both tenant strings, and copies their
values into a private frozen mapping. Accessor properties are rejected without
executing their getters. Each read selects its captured tenant before awaiting the
snapshot. Caller edits, deletions, additions and property redefinitions cannot change
an established policy. The caller's object remains writable; legitimate configuration
changes require construction of a new policy instance.

No HTTP server, authentication, ACL semantics, projection, ordering, business rules,
warning withholding, or inherited GL03-25 browser implementation was changed.

## Reproduction (Node 24)

```sh
npm ci --ignore-scripts --prefix FR-GL03-23/source
npm ci --ignore-scripts --prefix FR-GL03-19/source
npm test --prefix FR-GL03-12/source
npm test --prefix FR-GL03-19/source
npm test --prefix FR-GL03-23/source
node --test prototype/*.test.mjs
node --test prototype/fr26-policy.test.mjs prototype/fr26-http-policy.test.mjs
npm install --no-save --no-package-lock --ignore-scripts playwright@1.56.1
npx playwright install --with-deps chromium
node prototype/fr23-browser-acceptance.mjs
```

Developer regression: 68 + 166 + 269 + 75 = 578 passing tests, zero failures.
The targeted 28 tests are included in the prototype total, not additional tests.
With the original policy and new tests: 24 pass / 4 fail, demonstrating the regression
coverage catches the vulnerability and accessor configuration issue.

The dedicated GitHub Actions workflow records the checkout SHA, repeats these four
suites and inherited GL03-25 Chromium acceptance, and uploads the browser screenshot.
Use the separate final handover for the actual commit, CI outcome, job IDs and hashes.
CI execution is evidence of checks, not independent security acceptance.

## Scope and residual assumptions

Configuration is trusted in-process input; hostile JavaScript proxies, mutable
principal objects supplied directly by arbitrary code and malicious snapshot provider
code are not a sandbox boundary. The HTTP authenticator remains the source of verified
request principals. This change is limited to subject-to-tenant configuration capture.
The fictional model still supports only its two explicitly listed subjects. Source
records continue to require matching tenant and subject ACL. Independent security
review and Vision approval remain required before any acceptance decision.

## Rollback

Nothing was installed or deployed. To inspect the unchanged baseline, use a separate
checkout/worktree at the base SHA above. If a later approved integration needs reversal,
revert the final development commit on that integration branch through normal review.
Do not reset or force-push the protected baseline branches. Reverting reintroduces the
mutable-configuration vulnerability and should not be treated as a secure release.
