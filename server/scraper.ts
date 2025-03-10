import axios from "axios";
import cheerio from "cheerio";
import { PincodeAvailability } from "@shared/schema";

const FLIPKART_PINCODE_API = "https://www.flipkart.com/api/4/product/stock";

export async function checkAvailability(productUrl: string, pincode: string): Promise<boolean> {
  try {
    // Extract product ID from URL
    const productId = productUrl.match(/pid=([^&]*)/)?.[1];
    if (!productId) throw new Error("Invalid product URL");

    const response = await axios.get(`${FLIPKART_PINCODE_API}?pid=${productId}&pincode=${pincode}`);
    
    // Parse response to determine availability
    return response.data?.stockInfo?.serviceable === true;
  } catch (error) {
    console.error(`Error checking availability for pincode ${pincode}:`, error);
    return false;
  }
}

export function validateFlipkartUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("flipkart.com") && url.includes("/p/");
  } catch {
    return false;
  }
}
