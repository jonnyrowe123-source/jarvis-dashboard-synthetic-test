// FR-GL03-10 — isolated read-only contract adapter (synthetic data only).
// This module has NO network, secrets, local storage, or canonical Jarvis access.
export const syntheticSnapshot = Object.freeze({
  revision: "synthetic-1",
  source: "synthetic-fixture",
  actions: [
    { id: "SYN-A01", title: "Review fictional project plan", revision: 1, state: "open", context: "10min" },
    { id: "SYN-A02", title: "Inspect example inventory", revision: 1, state: "open", context: "lenovo" }
  ],
  decisions: [{ id: "SYN-D01", title: "Choose demo layout", revision: 1, state: "open" }],
  warnings: []
});
const allowedViews = new Set(["overall", "10min", "lenovo"]);
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
export function validateSnapshot(payload) {
  if (!isObject(payload) || typeof payload.revision !== "string" || !Array.isArray(payload.actions) ||
      !Array.isArray(payload.decisions) || !Array.isArray(payload.warnings)) throw new TypeError("Invalid dashboard snapshot");
  const ids = new Set();
  for (const [kind, items] of [["action", payload.actions], ["decision", payload.decisions]]) {
    if (items.length > 1000) throw new TypeError("Oversized collection");
    for (const item of items) {
      if (!isObject(item) || typeof item.id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(item.id) ||
          typeof item.title !== "string" || item.title.length > 200 || !Number.isSafeInteger(item.revision) ||
          item.revision < 0 || typeof item.state !== "string" || ids.has(item.id)) throw new TypeError("Invalid "+kind+" record");
      ids.add(item.id);
    }
  }
  return payload;
}
export function createSyntheticReadOnlyAdapter() {
  return Object.freeze({
    async getDashboard(view = "overall") {
      if (!allowedViews.has(view)) throw new TypeError("Unknown dashboard view");
      const snapshot = structuredClone(syntheticSnapshot);
      snapshot.actions = snapshot.actions.filter(a => view === "overall" || a.context === view);
      return validateSnapshot(snapshot);
    },
    async transitionAction() { throw new Error("WRITE_DISABLED: Synthetic read-only adapter"); },
    async resolveDecision() { throw new Error("WRITE_DISABLED: Synthetic read-only adapter"); }
  });
}
