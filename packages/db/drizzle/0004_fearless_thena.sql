CREATE TABLE "voice_tool_log" (
	"id" text PRIMARY KEY NOT NULL,
	"tool" text NOT NULL,
	"args" jsonb,
	"http_status" integer NOT NULL,
	"ok" boolean,
	"ms" integer NOT NULL,
	"spoken" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "voice_log_time_idx" ON "voice_tool_log" USING btree ("created_at");
--> statement-breakpoint
ALTER TABLE "voice_tool_log" ENABLE ROW LEVEL SECURITY;
