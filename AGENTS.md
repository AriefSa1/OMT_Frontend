# Repository Guidelines

## Project Structure & Module Organization

This repository is the Next.js 14 (App Router) frontend for a Shopee marketplace and
warehouse analytics service. It renders local snapshots produced by the **OMT_Backend**
repo — it does not talk to Shopee or the warehouse directly.

- `app/`: routed pages, one folder per route (`app/shopee/`, `app/warehouse/`,
  `app/shopee/performance/`, `app/optimization/*`).
- `components/`: shared UI. Check here before writing anything new — `Pagination`,
  `EmptyState`, `StatusBadge`, `MetricCard`, `PageHeader` already exist.
- `lib/api.js`: every backend call goes through here, with response caching.
- `lib/hooks.js`: shared hooks such as `useDebouncedValue` and `useSnapshotRefresh`.

## Build, Test, and Development Commands

```bash
npm install
```

```bash
npm run dev
```

Runs on `http://localhost:3000` and expects the backend on `http://localhost:5000`.

```bash
npm run build
```

```bash
npm run lint
```

## Coding Style & Naming Conventions

Use ES modules and two-space indentation. Components are `PascalCase.jsx` in
`components/`; routes are lowercase folders containing `page.jsx`. Use `camelCase` for
variables, functions, and hooks (`useThing`).

Mark client components with `'use client'`. Keep data fetching in `lib/api.js` rather than
calling `fetch` from a component. Prefer reusing an existing component over adding a
near-duplicate.

## Testing Guidelines

There is no automated test suite. Verify changes by running `npm run dev` against a
running backend and exercising the affected page directly, including its empty and error
states — not just the happy path. Run `npm run lint` before committing.

## Commit & Pull Request Guidelines

Use concise imperative commit messages, such as `use server filters without duplicate
requests`.

Pull requests should include a short summary, the pages affected, any backend contract
they depend on, and how the change was verified in the browser.

## Security & Configuration Tips

Keep secrets out of Git. Do not commit Shopee cookies, warehouse credentials, or API keys.
Anything in `NEXT_PUBLIC_*` is visible to the browser — never put a secret there.

---

# Hard Constraints — Data Validity

Everything above describes *how* to write code here. This section describes what the UI is
**not allowed to show**. These are rules, not suggestions: each traces to a defect found in
the audit that produced the current state of this repo.

The project's absolute requirement is that **no fabricated data reaches the user**.

### 1. Never render an unmeasured figure as `0`

When the backend sends `null`, show an explicit status with a reason and an action — not
`0`, and not a blank cell with no explanation. `0` reads as "no problems".

Follow the pattern already in `app/page.jsx:70`:

```jsx
subtitle={data?.reconciliationTrust && !data.reconciliationTrust.reliable
  ? data.reconciliationTrust.message
  : ...}
```

`components/EmptyState.jsx` exists for this — reuse it.

### 2. Never present a constant as analysis

No text may be shown as if it were computed when it is hardcoded.

### 3. Displayed counts must describe the rows displayed

If you filter on the client but report a total from the server, the number contradicts the
list. This was a real bug on the catalog page and is now fixed by filtering server-side.
Do not reintroduce client-side filtering of a paged list.

### 4. Never claim a time window or coverage without checking it

Do not label something "last 7 days" without counting the data points. Do not print a
fixed percentage over a chart regardless of its data.

### 5. Reuse what exists

`Pagination`, `EmptyState`, `StatusBadge`, `MetricCard`, `useDebouncedValue`,
`useSnapshotRefresh`. Check `components/` and `lib/hooks.js` before adding anything.

### 6. Do not add work outside the plan

If you find a new problem, record it and report it. Do not start on it.

---

# State & Remaining Work

## Already done — do not redo

Verify with `git log`.

- Sessions survive a page refresh; failed responses are no longer cached
- AI panels are honest — fabricated content removed, Gemini key field added in Settings
- Unmeasured figures render as unavailable rather than `0`
- **Catalog filtering moved to the server**, so `pagination.total` matches the rows shown
- **Duplicate requests removed** via an `appliedSearch` guard rather than dropping `page`
  from the loader deps — which would have broken paging
- **`useSnapshotRefresh` stabilised** (`lib/hooks.js`) — the callback lives in a ref and
  the listener registers once, instead of re-registering on every render
- **`components/Navbar.jsx`** now dispatches `snapshot:updated` only when the sync
  actually succeeded
- **Table rows memoised** on the warehouse and performance pages
  (`WarehouseInventoryRow`, `PerformanceRow`)
- `WarehouseDetailModal` refactored away from its fetch→setState→fetch cycle

**Charts corrected, then wired** — `CategoryPieChart` takes its title and subtitle from the
caller and prints the share its slices actually cover instead of a constant "100%";
`SalesChart` derives its window from the rows it received (`n hari tersimpan`, date range,
and how many of those days have a measured ad spend) instead of claiming "7-day window",
and its tooltip renders a missing ad spend or order count as "Belum tersedia" rather than
`0`. Both are now on the dashboard: `SalesChart` replaced the near-duplicate
`SalesTrendChart` (deleted) and consumes `salesTrend[].orders`; `CategoryPieChart` consumes
`categorySales` and labels it with the backend's new `categorySalesMeta.message`, which
states that the share covers only the top-selling page of the catalog.

**Responsiveness and accessibility** — `.table-scroll` moved onto the table's own wrapper
in `app/page.jsx`, added around the `WarehouseDetailModal` history table, and `MetricCard`
now sets `title` on its value so a truncated IDR figure stays readable.

**Idle surfaces built** — `/growth` and `/optimization/{product,store,ads}` are real pages
instead of redirects, `/optimization` is a hub, and both are reachable from the sidebar.
`demandForecast` and `bundleSuggestions` render through an "unavailable" panel carrying the
backend's reason. Shared list rendering lives in `components/RecommendationList.jsx`, which
also creates the task, so the four pages do not each restate it.

## Remaining, in order

### 1. The new pages have not been exercised in a browser

`npm run build` passes and the backend payloads were verified server-side, but
`/growth` and `/optimization/*` have not been opened against a live session — the app
redirects to `/login` and that needs real credentials. Walk both, including their empty
states, before treating them as verified.

### 2. Two real endpoints still have no consumer

`fetchMarketplaceIntelligence()` and `fetchCompetitorIntelligence()` in `lib/api.js` are
never called. `productSignals` and `activeAdCampaigns` now carry real values, and the
competitor lookup is explicit per product — neither is shown anywhere.
