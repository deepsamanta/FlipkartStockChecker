import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { checkAvailability, validateFlipkartUrl } from "./scraper";
import { urlSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { majorPincodes } from "../client/src/lib/pincodes";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Lower limit to avoid hitting Flipkart's rate limits
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express) {
  app.use("/api", limiter);

  app.post("/api/check-availability", async (req, res) => {
    try {
      const { url } = urlSchema.parse(req.body);

      if (!validateFlipkartUrl(url)) {
        return res.status(400).json({ message: "Invalid Flipkart product URL" });
      }

      console.log('Checking availability for URL:', url);

      // Check cache first
      const cached = await storage.getCachedResults(url);
      if (cached) {
        console.log('Returning cached results');
        return res.json({ results: cached, cached: true });
      }

      // Check availability for all major pincodes
      // Use Promise.all with a concurrency limit to avoid overwhelming the server
      const batchSize = 2;
      const results = [];

      for (let i = 0; i < majorPincodes.length; i += batchSize) {
        const batch = majorPincodes.slice(i, i + batchSize);
        console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(majorPincodes.length/batchSize)}`);

        const batchResults = await Promise.all(
          batch.map(async (pincode) => {
            const isAvailable = await checkAvailability(url, pincode.pincode);
            return {
              pincode: pincode.pincode,
              city: pincode.city,
              state: pincode.state,
              isAvailable
            };
          })
        );
        results.push(...batchResults);

        // Add a small delay between batches
        if (i + batchSize < majorPincodes.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('Final availability results:', results);
      await storage.saveResults(url, results);

      res.json({ results, cached: false });
    } catch (error: any) {
      console.error("Error checking availability:", error);
      res.status(400).json({ message: error.message || "Failed to check availability" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}