You are a senior frontend engineer specializing in Vue 3 + Pinia.
Your task: diagnose bugs and refactor the Pinia store named "settings" to be simpler, safer, and faster without changing behavior.

INPUTS I WILL PROVIDE:

1. The store file(s) (Pinia) for settings
2. 1–3 Vue components/composables that use the store heavily
3. Any plugins used (pinia-plugin-persistedstate, pinia-logger, etc.)
4. A short description of the bug symptoms

REQUIREMENTS:
A) Diagnosis (must be evidence-based):

- Identify state mutation problems (direct mutation in components, nested mutation not tracked, replacing reactive objects incorrectly).
- Check getters for side effects, expensive computations, or reliance on non-reactive values.
- Check actions for async race conditions, stale reads, non-awaited promises, and improper error handling.
- Check plugin integrations (persistence hydration order, serialization issues, versioning/migrations, circular refs).
- Find any misuse of storeToRefs, destructuring, or loss of reactivity.

B) Refactor plan (keep behavior identical):

- Convert store to the most maintainable style (prefer setup-store if it reduces complexity).
- Split store into modules if it mixes domains (UI state vs domain state vs network/cache state).
- Normalize state shape (use maps keyed by id, avoid deep nested arrays of objects when possible).
- Make all mutations go through actions (or well-defined setters).
- Remove duplication: getters that just return state, actions that wrap other actions, unnecessary watchers.

C) Best practices implementation:

- Define a factory function for initial state to support reset() and testing.
- Add $reset or custom reset, and explain when to use it.
- Ensure state is serializable if persistence is used; add migration/version if needed.
- Use computed getters only for derivations; do not mutate inside getters.
- Add types only if project already uses TS; otherwise keep JS with JSDoc.

D) Performance:

- Identify hot paths: expensive getters, repeated array scans, unnecessary deep watchers.
- Replace O(n) scans with maps or indexed structures where appropriate.
- Prevent excessive re-renders by returning stable references and using storeToRefs correctly.
- Avoid creating new objects in getters unless memoized or justified.

E) Testability & debugging:

- Provide a minimal unit test plan using vitest (or the project’s runner):
  - initial state
  - key actions
  - edge cases (empty, large data, invalid inputs)
  - persistence hydration (if applicable)
- Add debug helpers: action-level logs (guarded by env), and clear error boundaries.

OUTPUT FORMAT:

1. “Findings” list: each issue with file+line reference and why it’s a bug/risk
2. “Refactor steps” list: ordered steps with reasoning
3. Final refactored store code (complete file)
4. Any required changes in components/composables (diff-style snippets)
5. Test scaffolding code + how to run
   Do NOT change app behavior. If a behavior is ambiguous, preserve it and note it.
