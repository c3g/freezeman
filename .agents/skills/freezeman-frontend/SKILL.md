---
name: freezeman-frontend
description: "Procedures and conventions for the FreezeMan frontend (React, Redux, Ant Design): layout of frontend/src, dev server, TypeScript and JavaScript rules, tables, API calls, verification. Use for any frontend work in this repository."
---

## Stack

- React with React Router, Redux Toolkit (plus `redux-persist` for `auth`), Ant Design 6, webpack, TypeScript mixed with older JavaScript.
- Dev server: `npm start` in `frontend/`, port 9000. It proxies `/api` and `/static/*_templates` to the backend on `localhost:8000`. `FMS_ENV` in `frontend/.env` (see `example.env`) sets the DEV/QC/PROD banner.

## Conventions

- Write new files in TypeScript. Do not convert an existing JavaScript file to TypeScript. Add JSDoc types to the functions in it that you use or change.
- Prefer React hooks (`useState`, `useEffect`, custom hooks, direct `api` calls) to Redux. Use Redux only where the feature already uses it.
- For a new table, use the hooks in `utils/tableHooks.tsx` (`usePaginatedDataProps`, `useTableColumnsProps`, `useFilters`, `useTableSortByProps`, `useSmartSelectionProps`). Examples: `components/experimentRuns/SimpleExperimentRunTable.tsx`, `components/management/PooledSamples/index.tsx`. You can change `tableHooks.tsx` when a table needs it.
- `components/pagedItemsTable/` (`PagedItemsTable`) and the `modules/<entity>Table/` Redux state are deprecated. Do not use them for new tables. Change them only to maintain existing pages.

## Layout (`frontend/src`)

- `index.js`: entry. Mounts `Provider`, `PersistGate`, `BrowserRouter` and `App`.
- `components/app/App.js`: shell. Side menu, auth init, initial data load and the top-level `<Routes>` (one route per page, for example `/samples/*`, `/lab-work/*`).
- `components/<feature>/`: one folder per page. `<Feature>Page` holds the sub-routes (`list`, `add`, `:id`, `:id/update`, `actions/:action`), `<Feature>ListContent` the table, `details/` the detail views.
- `components/` (root files) and `components/shared/`: reusable widgets (`AppPageHeader`, `PageContent`, buttons, `ActionContent` for template actions).
- `components/templateFlow/`: upload flow for template (Excel) submissions.
- `components/labwork/`, `placementVisuals/`, `WorkflowSamplesTable/`: lab work steps, sample placement in containers, workflow sample tables.
- `modules/<entity>/`: Redux state per entity: `actions.ts`, `reducers.ts`, and sometimes `selectors.ts`, `services.ts` (async helpers that call the API without Redux state), `models.ts`.
- `reducers.js`: combines all module reducers. `store.ts`: store, `RootState`, `AppDispatch`, error-notification middleware. `hooks.ts`: `useAppDispatch`, `useAppSelector`. Use them instead of the plain `react-redux` hooks.
- `selectors.ts`: top-level selectors (`selectSamplesByID`, ...).
- `utils/api.ts`: all REST calls, grouped by resource (`api.samples.get`, ...). Base path `/api` (`config.js`). Add new endpoints here.
- `utils/actions.ts`: `createNetworkActionTypes` and `networkAction` (REQUEST/RECEIVE/ERROR action triplet around an `api` call).
- `models/`: `fms_api_models.ts` (`FMS*` types, API responses), `frontend_models.ts` (types stored in Redux), `paged_items*.ts` (models of the deprecated paged tables).
- `hooks/`, `utils/`: shared hooks and helpers. `permissions.tsx`: `hasPermission`. `constants.tsx`: shared constants.
- `styles/`: `global.css`, `antd-adjustments.scss`.

## Redux data flow (existing features)

- A component dispatches a thunk from `modules/<entity>/actions.ts`. The thunk calls `networkAction(TYPES, api.<resource>.<call>(...))`. The reducer stores the result in `itemsByID`.
- A failed network action shows an error notification through the store middleware. Pass `meta: { ignoreError: '<ErrorName>' }` to suppress it.

## Verification

- There are no frontend tests. Verify with `npx tsc --noEmit --skipLibCheck`, plus `npx eslint <files>`. Don't use `prettier`.
