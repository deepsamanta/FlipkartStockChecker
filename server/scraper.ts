import axios from "axios";
import * as cheerio from "cheerio";
import { PincodeAvailability } from "@shared/schema";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

export async function checkAvailability(productUrl: string, pincode: string): Promise<boolean> {
  try {
    // Make an initial request to get the product page
    const response = await axios.get(productUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      maxRedirects: 5,
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Look for specific elements that indicate product availability
    const outOfStock = $('._16FRp0').length > 0; // "OUT OF STOCK" text
    const comingSoon = $('._2ZaX8Q').length > 0; // "COMING SOON" text
    const soldOut = $('._3GJfMF').length > 0; // "SOLD OUT" text

    // If any of these indicators are present, product is not available
    if (outOfStock || comingSoon || soldOut) {
      return false;
    }

    // Check for pincode input field and availability text
    const pincodeInput = $('input[placeholder*="pincode"]');
    if (!pincodeInput.length) {
      return false; // Can't find pincode input, assume not available
    }

    // Check delivery availability by making a second request
    const productId = productUrl.match(/pid=([^&]*)/)?.[1] || 
                     productUrl.match(/itm\/([^\/]*)/)?.[1];

    if (!productId) {
      console.error("Could not extract product ID from URL");
      return false;
    }

    // Make request to check delivery availability
    const checkUrl = `https://www.flipkart.com/api/6/product/delivery/${productId}/pincode/${pincode}`;
    const deliveryCheck = await axios.get(checkUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': productUrl,
      }
    });

    // Parse the delivery response
    const deliveryData = deliveryCheck.data;
    if (deliveryData && typeof deliveryData === 'object') {
      return !deliveryData.error && deliveryData.serviceable;
    }

    return false;
  } catch (error) {
    console.error(`Error checking availability for pincode ${pincode}:`, error);
    return false;
  }
}

export function validateFlipkartUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("flipkart.com") && 
           (url.includes("/p/") || url.includes("/itm/"));
  } catch {
    return false;
  }
}