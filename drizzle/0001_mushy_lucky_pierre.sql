ALTER TABLE "system_credentials" ALTER COLUMN "key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "system_credentials" ALTER COLUMN "value" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "system_credentials" ADD COLUMN "username" varchar(255);--> statement-breakpoint
ALTER TABLE "system_credentials" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "system_credentials" ADD COLUMN "role" varchar(50);--> statement-breakpoint
ALTER TABLE "system_credentials" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "system_sessions" ADD COLUMN "credential_id" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "system_credentials" ADD CONSTRAINT "system_credentials_username_unique" UNIQUE("username");