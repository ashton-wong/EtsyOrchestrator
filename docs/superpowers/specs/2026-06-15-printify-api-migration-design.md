# Printify API Migration — Drop Etsy API Dependency

**Date:** 2026-06-15
**Status:** Approved

## Context

The Etsy API key was banned. The operator was using it for two things: updating listings (copy_refresh) and collecting per-listing stats (views, favorites) for the analyst. Printify's native Etsy integration handles listing creation and sync already, so we can replace both use cases with Printify API calls and drop `etsy.ts` entirely.

Views and favorites are Etsy-only metrics with no Printify equivalent. We drop them and rely on Printify order data instead — order count and revenue are more meaningful signals anyway. The existing `orders` and `revenue_cents` columns in the `signals` table were hardcoded to `0` before; now they get real data.

## Approach

Direct swap (no new abstractions). Two new functions added to `printify.ts`, callers in `signal-analyst.ts` and `deploy.worker.ts` updated, `etsy.ts` deleted, DB migration drops the dead columns.

## Changes

### 1. `backend/services/printify.ts` — two new functions

```typescript
updateProduct(productId: string, copy: { title: string; description: string; tags: string[] }): Promise<void>
// PUT /v1/shops/{shop_id}/products/{product_id}.json

getShopOrders(): Promise<Array<{ line_items: Array<{ product_id: string; quantity: number; price: number }> }>>
// GET /v1/shops/{shop_id}/orders.json
```

The existing `publishProduct` is reused for copy_refresh — calling it after `updateProduct` pushes the new copy to the existing Etsy listing in place (no new listing created).

### 2. `agents/analyst/index.ts` — updated `runAnalyst` signature

Remove: `shopId`, `getShopListings`, `getListingStats`, `getProductByListingId`

Add:
- `getShopOrders()` — returns raw Printify orders
- `getProductByPrintifyId(printifyProductId)` — DB lookup by Printify product ID

Aggregation logic inside `runAnalyst`: group line items by `product_id`, sum `quantity` for order count and `price * quantity` for revenue, call `insertSignal` per matched product.

`insertSignal` call drops `views` and `favorites` parameters.

Updated `copy_refresh_candidates` rule in `runAnalystSynthesis` system prompt:
- **Before:** products live > 14 days with < 30 total_views, OR favorites < 2% of views
- **After:** products live > 21 days with 0 total_orders

`productSignals` array passed to the LLM drops `total_views` and `total_favorites` keys.

`top_performers` description updated to reference orders and revenue relative to days_live.

### 3. `backend/cron/signal-analyst.ts` — updated cron wiring

Remove: `getShopListings`, `getListingStats` imports from `etsy.ts`, `ETSY_SHOP_ID` env var reference, `getProductByListingId` local function.

Add: `getShopOrders` from `printify.ts`, `getProductByPrintifyId` from DB queries.

### 4. `backend/queue/workers/deploy.worker.ts` — copy_refresh path

**Before:**
```typescript
await updateListing(sourceProduct.etsy_listing_id, productCopy);
```

**After:**
```typescript
await updateProduct(sourceProduct.printify_product_id, productCopy);
await publishProduct(sourceProduct.printify_product_id);
```

Remove `updateListing` import and `etsy.ts` import entirely.

`etsy_listing_id` on the source product is not touched — still used for `listing_url` references in the analyst report and frontend.

### 5. DB migration — drop columns from `signals`

Remove `views` and `favorites` columns from the `signals` table.

Update `backend/db/schema.ts` to remove those two columns.

Update `backend/db/queries/signals.ts` — `insertSignal` drops `views` and `favorites` from its parameter type and INSERT statement.

Add `getProductByPrintifyId` to `backend/db/queries/products.ts`.

No other schema changes. `etsy_listing_id` on `products` stays (used for listing URL display).

### 6. Cleanup

- Delete `backend/services/etsy.ts`
- Remove `ETSY_SHOP_ID` from any env references in `signal-analyst.ts`

### 7. Tests

- `backend/queue/workers/__tests__/pipeline.smoke.test.ts`: update copy_refresh mock from `updateListing` to `updateProduct` + `publishProduct`
- `agents/handoffs/__tests__/AnalystReport.test.ts`: drop `views`/`favorites` from signal fixture data if present

## Out of Scope

- Pagination for `getShopOrders` — implement if the shop grows to > 1 page of orders; not needed now
- Removing `etsy_listing_id` column from `products` — still needed for listing URL display in the frontend and analyst reports
