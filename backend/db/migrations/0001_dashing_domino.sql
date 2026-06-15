DO $$ BEGIN
 CREATE TYPE "public"."run_type" AS ENUM('new_product', 'copy_refresh');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."triggered_by" AS ENUM('human', 'analyst');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "run_status" ADD VALUE 'updating';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analyst_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "run_type" "run_type" DEFAULT 'new_product' NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "triggered_by" "triggered_by" DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "source_product_id" uuid;