# EtsyOrchestrator — Store Operator Pivot Design Spec
**Date:** 2026-06-15
**Status:** Approved
**Supersedes:** `2026-06-14-etsy-orchestrator-design.md` (original venture-generator spec)

---

## Overview

This spec defines the refactor of EtsyOrchestrator from an "Autonomous Venture Generator" (spin up niche experiments across multiple stores) into an **autonomous Etsy store operator**. The system manages a single Etsy store, continuously adding new products and optimizing existing listings based on performance data — all while keeping a human approval gate before any live changes are made.

The pivot is driven by Etsy API's 5-store connection limit, and by the insight that a single store with accumulated sales history and brand coherence outperforms fragmented micro-stores for Etsy's algorithm.

---

## What Changes vs. What Stays

### Unchanged
- Core pipeline structure: Researcher → Creative Director → Marketer → [Human Gate] → Operator
- BullMQ queue, Redis, all existing worker plumbing
- All 4 existing handoff schemas (TrendReport, DesignBatch, ProductCopy, PublishResult) and their Vitest tests
- Frontend pages and components (with minor additions)
- All service wrappers: Printify, Etsy, Reddit, Google Trends
- Human gate — applies to **everything**, always. Nothing goes live without manual approval.

### Changed
- All 3 LLM agents (Researcher, Creative Director, Marketer) migrate from `claude-sonnet-4-6` → `claude-haiku-4-5-20251001`
- `signal-analyst.ts` cron gains a second job: weekly Haiku synthesis that produces an `AnalystReport` and queues pending runs
- `runs` DB table gains `run_type`, `triggered_by`, and `source_product_id` columns
- `run_status` enum gains `updating` value
- Operator gains a branch: `copy_refresh` runs call Etsy update-listing instead of create-listing
- Researcher system prompt gains store-context injection (existing products + niche names)
- CLAUDE.md framing updated: "autonomous store operator" replaces "venture generator"
- `ETSY_SHOP_ID` is now the single canonical store — multi-shop concept is gone

### New
- `agents/handoffs/AnalystReport.ts` + Vitest test
- `backend/queue/workers/copy-refresh.worker.ts` (skips Researcher + Creative Director; Marketer-only path)
- `backend/db/migrations/` — new migration for schema changes
- `backend/db/schema.ts` — `analyst_reports` table, updated `runs` table
- `backend/db/queries/analyst-reports.ts`
- Two env vars: `MAX_WEEKLY_AUTO_NEW_PRODUCTS`, `MAX_WEEKLY_COPY_REFRESHES`

---

## Conceptual Reframe: Store Operator

The orchestrator's job is to grow **one store**, not to test niches across many. Every decision the system makes — what to research, what to refresh, what copy to write — is informed by what the store already sells and what's performing.

Concretely:
- The Researcher receives the store's existing product catalog (niche names, what's selling) as context so new ideas complement the existing brand rather than scatter it
- The AnalystReport reasons at store level: "what should this store sell next?" and "what direction is the catalog growing?" — not just "which listing is underperforming?"
- The Analyst's new-niche seeds are directional: build on what's working, fill adjacent gaps

---

## Revised Pipeline Architecture

```
Weekly Analyst Cron
  → AnalystReport (Haiku)
  → queue copy_refresh runs (up to MAX_WEEKLY_COPY_REFRESHES)
  → queue new_product runs with seed keywords (up to MAX_WEEKLY_AUTO_NEW_PRODUCTS)
       ↓
All queued runs + human-triggered runs feed into:

new_product path:
  Trigger → ① Researcher (store context injected) → ② Creative Director → ③ Marketer
                                                                                ↓
                                                                        [HUMAN GATE]
                                                                                ↓
                                                                   ④ Operator (create listing)

copy_refresh path:
  Trigger (Analyst) → [skip ①②] → ③ Marketer (existing design + weakness context)
                                                          ↓
                                                  [HUMAN GATE]
                                                          ↓
                                         ④ Operator (update listing)

⑤ Analyst (signal polling cron, every 6h, free)
⑤ Analyst (synthesis cron, weekly, Haiku)
```

---

## Model Migration

All LLM calls migrate to `claude-haiku-4-5-20251001`. This is a proof-of-concept system — output quality is intentionally traded for dramatically lower token cost. Every file that previously referenced `claude-sonnet-4-6` (Researcher, Creative Director, Marketer agents) is updated to `claude-haiku-4-5-20251001`. The weekly Analyst synthesis also uses Haiku.

---

## The Analyst — Revised Architecture

### Signal polling (unchanged)
Runs every 6h via `node-cron`. Queries Etsy Stats API for all live listings, writes `listing_signals` rows. No LLM. Free.

### Weekly synthesis (new)
Runs every Sunday at midnight (default; configurable via cron expression env var `ANALYST_SYNTHESIS_CRON`).

**Step 1 — Aggregate (free)**
Query DB: all live products + their last 7 days of `listing_signals`. Compute per-listing: total views, favorites, orders, revenue, days-since-published. Also load niche names and existing product copy for store-context.

**Step 2 — Haiku synthesis (one LLM call)**
System prompt instructs Haiku to act as a store growth analyst. Input: aggregated signals JSON + current product catalog. Output: `AnalystReport`.

**Step 3 — Queue runs (respects caps)**
For each `copy_refresh_candidate`: create a `copy_refresh` run (`triggered_by: "analyst"`, `source_product_id` set). For each `new_niche_seed`: create a `new_product` run (`triggered_by: "analyst"`, `seed_keywords` set). Both types sit `pending_approval` in the queue — nothing publishes until human approves.

Weekly budget caps are checked before queuing: if `MAX_WEEKLY_AUTO_NEW_PRODUCTS` or `MAX_WEEKLY_COPY_REFRESHES` would be exceeded, the excess items are skipped and logged.

---

## AnalystReport Handoff Schema

```ts
{
  generated_at: string,           // ISO date
  store_summary: string,          // 1-2 sentence store-level narrative
  top_performers: [{
    product_id: string,
    reason: string,
  }],
  copy_refresh_candidates: [{
    product_id: string,
    current_listing_url: string,
    weakness_summary: string,     // passed to Marketer as context
  }],
  new_niche_seeds: [{
    keywords: string[],
    rationale: string,            // how this complements the existing store
  }],
}
```

Validated with Zod. `validate()` helper exported. Full Vitest test suite (valid shape, missing fields, wrong types).

---

## Copy Refresh Pipeline Path

**Trigger:** Analyst queues a `copy_refresh` run with `source_product_id` set.

**Workers:**
- `trend-research.worker.ts` — checks `run_type`, no-ops and passes job to next step
- `design-generation.worker.ts` — checks `run_type`, no-ops and passes job to next step
- `seo-copy.worker.ts` — resolves the design image URL by following: `source_product_id` → `products` row → `run_id` → source run's `design_batch.designs[selected_design].image_url` (the copy_refresh run's own `design_batch` is null — the image lives on the *source* run); calls Haiku-Marketer with the image URL, existing `product_copy`, and the `weakness_summary` from the AnalystReport; produces new `ProductCopy`; sets status → `pending_approval`

**Human gate (run detail page):**
- Design picker is hidden (design is fixed — reuses source product's image)
- "Refreshing copy for: [listing URL]" context line shown
- New title/tags/description shown (editable)
- Button reads "Approve & Update" instead of "Approve & Publish"

**On approve:**
- Operator checks `run_type === "copy_refresh"` → skips Printify, calls Etsy update-listing API with new `ProductCopy` on `source_product_id`'s `etsy_listing_id`
- Run status → `live`

---

## Data Model Changes

### `runs` table — three new columns

| Column | Type | Notes |
|---|---|---|
| `run_type` | enum `new_product\|copy_refresh` | NOT NULL, DEFAULT `new_product` |
| `triggered_by` | enum `human\|analyst` | NOT NULL, DEFAULT `human` |
| `source_product_id` | uuid FK → products, NULLABLE | Set only for `copy_refresh` runs |

For `copy_refresh` runs, `trend_report` and `design_batch` columns remain null (those steps are skipped).

### `run_status` enum — one new value

`updating` — used while Operator is patching an existing Etsy listing. Full enum:
```
researching | designing | generating_copy | pending_approval |
deploying | updating | live | rejected | failed
```

### New `analyst_reports` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `report` | jsonb NOT NULL | Full AnalystReport output |
| `created_at` | timestamp NOT NULL DEFAULT now() | |

No foreign keys — standalone audit log.

---

## Researcher: Store Context Injection

When the Analyst seeds a new product run, it passes `seed_keywords` as today. Additionally, the `trend-research.worker.ts` now queries the DB for all live products' niche names and top-performing items before calling the Researcher agent, and injects them into the system prompt:

```
You are researching new product ideas for an existing Etsy store.
Current store catalog: [niche names + brief descriptions]
Top performers: [top_performers from latest AnalystReport]
Goal: identify a niche that complements the existing store rather than scattering the brand.
```

This context injection is only applied for `triggered_by: "analyst"` runs (the Analyst's seeds are directional). Human-triggered runs with manual seed keywords use the original prompt (no store context injected) — the human is explicitly choosing a direction.

---

## Frontend Changes (Minimal)

### Runs list + dashboard
- `triggered_by` badge: "Analyst" (purple) vs no badge (human-triggered)
- `run_type` badge: "Copy Refresh" vs "New Product"

### Run detail page (`/runs/[id]`)
- For `copy_refresh` runs: hide design picker, show "Refreshing copy for: [URL]" header, relabel approve button to "Approve & Update"

### Analytics page
- New "Analyst Reports" section: last 3 weekly reports, each showing `store_summary`, what was queued, and timestamp

---

## Environment Variables

Two new vars added to `.env.example`:

```
# Analyst autonomy caps (runs queued per week, not auto-published — human still approves)
MAX_WEEKLY_AUTO_NEW_PRODUCTS=2
MAX_WEEKLY_COPY_REFRESHES=5

# Optional: override default weekly synthesis schedule (default: "0 0 * * 0" = Sunday midnight)
ANALYST_SYNTHESIS_CRON=0 0 * * 0
```

---

## Testing

- `agents/handoffs/AnalystReport.ts` — Zod schema + `validate()` helper
- `agents/handoffs/__tests__/AnalystReport.test.ts` — valid shape, missing fields, wrong types, boundary cases
- `backend/queue/workers/__tests__/pipeline.smoke.test.ts` — extend existing smoke test to cover `copy_refresh` run type path (no-op for Researcher/Creative Director workers)
- Model ID string updated in any existing tests that assert on it

---

## Tech Stack Summary (delta)

| Change | Before | After |
|---|---|---|
| LLM model | `claude-sonnet-4-6` | `claude-haiku-4-5-20251001` |
| Analyst | Signal polling only | Signal polling (6h) + store synthesis (weekly, Haiku) |
| Run types | `new_product` only (implicit) | `new_product \| copy_refresh` (explicit) |
| Store model | Multi-store (intended) | Single store (`ETSY_SHOP_ID`) |
| Autonomous triggering | None | Analyst queues runs; human still approves all |
