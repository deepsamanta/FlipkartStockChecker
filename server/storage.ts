import { ProductCheck, InsertProductCheck, PincodeAvailability } from "@shared/schema";

export interface IStorage {
  getCachedResults(productUrl: string): Promise<PincodeAvailability[] | null>;
  saveResults(productUrl: string, results: PincodeAvailability[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private cache: Map<string, {
    results: PincodeAvailability[];
    timestamp: number;
  }>;
  private CACHE_TTL = 1000 * 60 * 15; // 15 minutes

  constructor() {
    this.cache = new Map();
  }

  async getCachedResults(productUrl: string): Promise<PincodeAvailability[] | null> {
    const cached = this.cache.get(productUrl);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(productUrl);
      return null;
    }

    return cached.results;
  }

  async saveResults(productUrl: string, results: PincodeAvailability[]): Promise<void> {
    this.cache.set(productUrl, {
      results,
      timestamp: Date.now()
    });
  }
}

export const storage = new MemStorage();
