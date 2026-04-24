ALTER TABLE "menu_categories" ALTER COLUMN "display_order" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "menu_categories" ALTER COLUMN "display_order" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ALTER COLUMN "display_order" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "menu_items" ALTER COLUMN "display_order" DROP NOT NULL;