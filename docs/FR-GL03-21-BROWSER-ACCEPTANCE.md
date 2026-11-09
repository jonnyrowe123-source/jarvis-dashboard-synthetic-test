# FR-GL03-21 — Independent browser acceptance

Date: 2026-11-09
Verdict: **PASS for isolated synthetic Chromium behaviour; production BLOCKED**.

## Verified run
https://github.com/jonnyrowe123-source/jarvis-dashboard-synthetic-test/actions/runs/42615284429

The dedicated `.github/workflows/browser-acceptance.yml` installed a pinned Playwright test dependency and Chromium on a GitHub-hosted runner, started a local loopback Python HTTP server, loaded `synthetic-preview.html` and executed `prototype/browser-acceptance.mjs`.

Browser output:
- PASS: initial synthetic read-only view
- PASS: Lenovo context filter
- PASS: 10 minute context filter
- PASS: outage clears prior records
- PASS: stale invalidation clears records
- PASS: no runtime errors, screenshot captured

The screenshot is uploaded as the `synthetic-preview-browser` workflow artifact. The automated tests exercised DOM state in headless Chromium, not a human visual review. No accessibility audit, cross-browser, mobile, OIDC, HTTPS API or canonical-data testing has been performed.

## Security and deployment boundary
All records were fictional. The browser loaded local modules over a loopback HTTP server in CI. No external API, credentials, live Brain or write operation was used. The public GitHub Pages `index.html` was not modified or redeployed.

## Next
1. Review the screenshot visually and run keyboard/mobile/accessibility checks.
2. Reconcile FR-GL03-19 authentication once Codex delivers an immutable commit and evidence.
3. Define a versioned production DTO that retains per-record revision/state and server-authoritative Top 5 semantics; synthetic bridge must not be reused for real data.
4. Obtain explicit hosting/identity/production approval before any live deployment.

Overall **PASS** for the narrow synthetic browser acceptance, not production readiness.
