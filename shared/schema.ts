import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const productChecks = pgTable("product_checks", {
  id: serial("id").primaryKey(),
  productUrl: text("product_url").notNull(),
  pincode: text("pincode").notNull(),
  isAvailable: integer("is_available").notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

export const urlSchema = z.object({
  url: z.string().url().refine((url) => url.includes("flipkart.com"), {
    message: "Must be a valid Flipkart product URL"
  })
});

export const pincodeSchema = z.object({
  pincode: z.string().length(6).regex(/^\d+$/, "Must contain only numbers")
});

export const insertProductCheckSchema = createInsertSchema(productChecks);

export type InsertProductCheck = z.infer<typeof insertProductCheckSchema>;
export type ProductCheck = typeof productChecks.$inferSelect;

export interface PincodeAvailability {
  pincode: string;
  city: string;
  state: string;
  isAvailable: boolean;
}
