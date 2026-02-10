## Plan: UI2 Clean Architecture Setup

Build a clean-slate UI2 using Vue 3 with Vuetify + Tailwind 4 while reusing existing IPC channels from the current UI. Since apps/ui2 is empty, we’ll define the entrypoint, app bootstrap, router, store layer, IPC clients, and module boundaries for Customers/Products/Sales/Auth/Settings. We’ll mirror IPC behavior from the existing UI only at the channel level, but keep UI2’s internal architecture clean and modular. The outcome is a consistent, testable structure where stores are state-only, IPC clients are the data boundary, modules own their routes/views, and shared components/layouts stay cross-feature.

**Steps**

1. Create the UI2 entrypoint and app bootstrap, including Vuetify + Tailwind 4 setup, in apps/ui2/src/app and apps/ui2/index.html.
2. Define router + route modules under apps/ui2/src/app and apps/ui2/src/modules, using module-owned route registries with layout wrappers in apps/ui2/src/layouts.
3. Implement IPC invoke wrapper + per-domain IPC clients in apps/ui2/src/ipc, reusing channel names/shape from the existing UI.
4. Implement Pinia store conventions in apps/ui2/src/stores as state-only layers that depend on IPC clients.
5. Build feature modules for Customers/Products/Sales/Auth/Settings in apps/ui2/src/modules with views in apps/ui2/src/views and shared UI in apps/ui2/src/components.
6. Add auth guards and uiAccess utilities in apps/ui2/src/auth wired into routing.
7. Document architectural conventions and data flow in a short README or module-level doc to keep the boundaries clear.

**Verification**

- Start dev server and open UI2 to validate bootstraps and router navigation.
- Smoke-test IPC calls from stores for each module using a simple list page per module.
- Verify auth guard redirects with an unauthenticated state.

**Decisions**

- Clean-slate UI2 architecture with Vue 3 + Vuetify + Tailwind 4.
- Reuse existing IPC channels from the current UI, but design new module boundaries and store conventions.
