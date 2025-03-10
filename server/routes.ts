import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { checkAvailability, validateFlipkartUrl } from "./scraper";
import { urlSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { majorPincodes } from "../client/src/lib/pincodes";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

export async function registerRoutes(app: Express) {
  app.use("/api", limiter);

  app.post("/api/check-availability", async (req, res) => {
    try {
      const { url } = urlSchema.parse(req.body);
      
      if (!validateFlipkartUrl(url)) {
        return res.status(400).json({ message: "Invalid Flipkart product URL" });
      }

      // Check cache first
      const cached = await storage.getCachedResults(url);
      if (cached) {
        return res.json({ results: cached, cached: true });
      }

      // Check availability for all major pincodes
      const results = await Promise.all(
        majorPincodes.map(async (pincode) => {
          const isAvailable = await checkAvailability(url, pincode.pincode);
          return {
            pincode: pincode.pincode,
            city: pincode.city,
            state: pincode.state,
            isAvailable
          };
        })
      );

      await storage.saveResults(url, results);
      
      res.json({ results, cached: false });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
