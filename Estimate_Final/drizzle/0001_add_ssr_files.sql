-- Migration: Add SSR Files table
-- Created: 2025-11-03

CREATE TABLE IF NOT EXISTS "ssr_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"upload_date" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"version" text,
	"category" text,
	"sheet_names" jsonb,
	"items_count" integer DEFAULT 0,
	"file_path" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);