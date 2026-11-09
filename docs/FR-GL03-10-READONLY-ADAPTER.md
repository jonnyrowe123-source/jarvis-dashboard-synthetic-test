# FR-GL03-10 — Read-only backend selection and adapter candidate

**Status: isolated source candidate. No real data, no authentication and no deployed backend.**

## Hosting shortlist (prices NOT verified)
- **Cloudflare Pages + Workers**: static frontend and edge API; potential low-cost option, but requires independent verification of current free-tier limits, data protection, identity and account policies.
- **GitHub Pages + Cloudflare Worker**: preserve already-tested frontend; separate API and authentication. Preferred *evaluation* route, not an approved production architecture.
- **Azure Static Web Apps + Functions**: potentially convenient identity/integration but higher configuration and governance complexity.
- **Google Apps Script web app**: easy access to Google Sheets but identity, deployment permissions, quotas and work-laptop restrictions need careful review; not a default recommendation.

## Why the candidate does not fetch Google Sheets directly
The browser is public and cannot hold service credentials. A secure API must authenticate the user and independently authorise every record read. The adapter shipped here intentionally uses synthetic fixtures only.

## Candidate source
`read-only-adapter.mjs` validates a limited snapshot contract, supports view filters and rejects writes. `read-only-adapter.test.mjs` defines six tests intended for Node.js with `node --test`. **Tests have not been run in the connected GitHub environment.**

## Before implementation
1. Select identity provider and backend host after current pricing, data location, terms and operational review.
2. Confirm exact canonical Brain data contract and existing revision/ownership rules; no second source of truth.
3. Implement authenticated server-side read-only endpoint; never expose Google credentials to the browser.
4. Test unauthenticated access, wrong-user access, redaction, stale data, outages and audit trails.
5. Deploy synthetic staging only; production requires explicit approval.

## Gate
FR-GL03-10 is a **source-only read-only adapter proof**. The current public Pages site is unchanged and remains synthetic.
