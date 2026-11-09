# Dashboard API contract v1 — FR-GL03-23

**Stable candidate wire contract for isolated synthetic integration. Not a production release.**

The normative structural schema is source/dashboard-v1.schema.json (JSON Schema draft 2020-12; identifier urn:jarvis:dashboard:synthetic:v1). The shared source/dashboard-contract.mjs validator additionally enforces the semantic invariants below. Both are part of this versioned contract. The schema alone is insufficient for identity uniqueness, view consistency and total byte limits.

## Endpoint, version and identity

`GET /v1/dashboard?view=overall|10min|lenovo`

Omitted view means overall. Exactly one canonical ASCII view parameter is permitted; blanks, duplicates, unknown/encoded parameters are refused. Responses use application/json; charset=utf-8 and Cache-Control: no-store. Successful dashboard responses always carry integer schemaVersion=1. The /v1 path and schemaVersion are jointly pinned; there is no silent downgrade, best-effort field removal or content-type version negotiation. The Accept header does not select another schema. Unsupported routes are 404 after authentication; unknown query-version parameters are 400. An adapter returning any unsupported/missing version causes generic 502, never a partially accepted response.

The FR-GL03-19 OIDC access-token policy applies unchanged: pinned issuer/audience/type/algorithm/time/client checks, subject allowlist and separate dashboard:read scope. Synthetic shared-token mode remains a separate local test path, prohibited under NODE_ENV=production and never a fallback from OIDC. No tokens appear in response data or URLs.

## Exact envelope

Every property below is required. No other envelope or record properties are permitted.

| Field | Definition |
| --- | --- |
| schemaVersion | Integer, exactly 1 |
| revision | Opaque nonempty snapshot revision string, at most 128 Unicode code points |
| source | Exactly synthetic-fixture; no canonical source is enabled by this candidate |
| actions | Ordered array, 0–100 exact action records |
| decisions | Ordered array, 0–100 exact decision records |
| warnings | Ordered array, 0–100 nonempty strings, each at most 512 Unicode code points |

An action is exactly `{id,title,revision,state,context}`. A decision is exactly `{id,title,revision,state}`; decisions have no context in v1. Nothing is silently dropped to fit these shapes.

| Record field | Definition |
| --- | --- |
| id | Case-sensitive ASCII string matching `^[-A-Za-z0-9_]{1,64}$`; globally unique across actions and decisions in this snapshot |
| title | Nonempty string, at most 200 Unicode code points |
| revision | Integer from 0 through 9007199254740991, representing the source's record revision |
| state | Exactly open, retaining FR-GL03-18's existing supported state profile |
| context | Actions only; exactly 10min or lenovo |

Strings must be well-formed Unicode and contain no U+0000–U+001F or U+007F. Titles/warnings are text, not HTML; clients must render as text. Whitespace-only nonempty strings are not normalized; source values are retained. Code-point length deliberately follows JSON Schema, rather than JavaScript UTF-16 code-unit length. Previously valid FR-GL03-18 text remains accepted; astral-character boundaries are explicitly tested against both validators.

All ID duplicates are rejected, including identical repeated records and cross-kind collisions. Unknown states/contexts are rejected rather than guessed, renamed or coerced. Record revision and snapshot revision have distinct semantics; the API does not fabricate, increment or derive either. An inconsistent requested action context is an upstream failure, not repaired by hiding records. Decisions remain snapshot-wide in all current views, matching the existing synthetic adapter.

The UTF-8 bytes of the entire serialized dashboard JSON must be <=65,536, inclusive. This is enforced after bounded shape/text validation and before the server writes success headers. The gateway also caps actual streamed response bytes before JSON parsing and validates the same DTO again. A 65,536-byte valid response succeeds; 65,537 bytes fails. Each collection is dense; the executable server validator also rejects accessor properties, unexpected prototypes, symbol/hidden keys, custom serialization hooks and extra array properties from a local adapter. It serializes a validated defensive copy, never the mutable adapter object.

Example:

```json
{
  "schemaVersion": 1,
  "revision": "synthetic-1",
  "source": "synthetic-fixture",
  "actions": [
    {"id":"SYN-A01","title":"Review fictional project plan","revision":1,"state":"open","context":"10min"},
    {"id":"SYN-A02","title":"Inspect example inventory","revision":1,"state":"open","context":"lenovo"}
  ],
  "decisions": [
    {"id":"SYN-D01","title":"Choose demo layout","revision":1,"state":"open"}
  ],
  "warnings": []
}
```

## Ordering and reserved extension boundaries

Array position is part of the source-provided snapshot. Validation, versioning, HTTP serialization and gateway/presenter acceptance MUST preserve it exactly. No sorting, deduplication, truncation or priority calculation occurs in this API. The existing FR-GL03-16 renderer displays the first five entries as supplied; this is presentation slicing, **not proof of canonical Top 5 ranking**. The full view model retains all accepted records and metadata.

The explicit future authority boundary is the trusted read-only source interface `getDashboard(view)`. A future authorized ranking implementation must supply its final ordered snapshot there, with stable IDs and revisions and a documented tie-break/snapshot-consistency policy. No client-provided rank/pin query or speculative comparator is implemented. Tests use intentionally nonlexical source order to prove that no client/server layer reorders it.

Pin status, rank scores, due dates, priority, ranking-policy metadata, extra states/contexts and per-record ownership are intentionally not v1 fields. They are rejected today. Adding such fields/semantics requires a reviewed new schema/path version and explicit coordinated server/gateway/presenter acceptance tests; do not create an unchecked extensions dictionary or silently accept them on /v1. Vision must decide authoritative Top 5, pinning, conflict/tie-break and canonical access policy before implementing those extensions. No fallback or default pin/rank values are supplied here.

## Failure and security behavior

- Missing/invalid credentials: 401 with generic Bearer challenge. Verified identity lacking subject allowlisting or scope: 403. Neither may invoke the dashboard source.
- Provider unavailable with no valid cached key or verifier capacity exhausted: generic 503 with Retry-After. Existing short-lived key cache policy is unchanged.
- Malformed query: 400; write methods and HEAD: 405 with Allow: GET; prohibited bodies: 413; long target: 414; parser header overflow: 431. Narrow approved preflight remains 204 without authentication; rejected preflight/origin remains 403.
- Source exception/timeout, unsupported schema, bad records or response over the byte cap: generic 502 `{ "error": "upstream_failure" }`. No source payload, identity claim or exception is returned.
- Busy adapter: 503. Existing adapter deadline and retained-slot behavior, connection/request limits, CORS and security headers remain unchanged. Public /health is unchanged synthetic process liveness, not a dashboard DTO or identity-provider readiness signal.

An error response is not a successful empty dashboard. Consumers clear display records on failed refresh; no cached or fabricated canonical success is produced.
