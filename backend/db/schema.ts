import {
  pgTable, pgEnum, uuid, text, timestamp,
  jsonb, integer, index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const runStatusEnum = pgEnum("run_status", [
  "researching", "designing", "generating_copy", "pending_approval",
  "deploying", "live", "rejected", "failed",
]);

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: runStatusEnum("status").notNull().default("researching"),
  seed_keywords: text("seed_keywords").array(),
  trend_report: jsonb("trend_report"),
  design_batch: jsonb("design_batch"),
  product_copy: jsonb("product_copy"),
  selected_design: integer("selected_design"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  run_id: uuid("run_id").notNull().references(() => runs.id),
  printify_product_id: text("printify_product_id").notNull(),
  etsy_listing_id: text("etsy_listing_id").notNull(),
  listing_url: text("listing_url").notNull(),
  published_at: timestamp("published_at").notNull().defaultNow(),
});

export const listing_signals = pgTable("listing_signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  product_id: uuid("product_id").notNull().references(() => products.id),
  views: integer("views").notNull().default(0),
  favorites: integer("favorites").notNull().default(0),
  orders: integer("orders").notNull().default(0),
  revenue_cents: integer("revenue_cents").notNull().default(0),
  checked_at: timestamp("checked_at").notNull().defaultNow(),
}, (t) => ({
  productIdx: index("signals_product_idx").on(t.product_id),
}));

// Relations — REQUIRED so the Drizzle relational query builder (db.query.*.findMany
// with `with: {...}`) used in the query helpers below can resolve nested relations.
export const runsRelations = relations(runs, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  run: one(runs, { fields: [products.run_id], references: [runs.id] }),
  listing_signals: many(listing_signals),
}));

export const listingSignalsRelations = relations(listing_signals, ({ one }) => ({
  product: one(products, { fields: [listing_signals.product_id], references: [products.id] }),
}));
