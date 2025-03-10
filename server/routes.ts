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

      // Process pincodes one at a time to be more reliable
      const results = [];
      const batchSize = 1; // Reduced to 1 for more reliable checks
      const delayBetweenChecks = 2000; // 2 seconds delay between checks

      for (let i = 0; i < majorPincodes.length; i += batchSize) {
        console.log(`Processing pincode ${i + 1} of ${majorPincodes.length}`);
        const pincode = majorPincodes[i];

        try {
          const isAvailable = await checkAvailability(url, pincode.pincode);
          results.push({
            pincode: pincode.pincode,
            city: pincode.city,
            state: pincode.state,
            isAvailable
          });

          // Add delay between checks
          if (i + batchSize < majorPincodes.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenChecks));
          }
        } catch (error) {
          console.error(`Error checking pincode ${pincode.pincode}:`, error);
          // Continue with next pincode even if one fails
          results.push({
            pincode: pincode.pincode,
            city: pincode.city,
            state: pincode.state,
            isAvailable: false
          });
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