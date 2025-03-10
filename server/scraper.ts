import axios from "axios";
import * as cheerio from "cheerio";
import { PincodeAvailability } from "@shared/schema";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

export async function checkAvailability(productUrl: string, pincode: string): Promise<boolean> {
  try {
    // First get the product ID from the URL
    const productId = productUrl.match(/pid=([^&]*)/)?.[1];
    if (!productId) {
      console.error("Could not extract product ID from URL");
      return false;
    }

    console.log(`Checking availability for product ${productId} at pincode ${pincode}`);

    // Make request to the Flipkart delivery API directly
    const checkUrl = `https://www.flipkart.com/api/6/product/delivery/serviceable`;
    const deliveryCheck = await axios.post(checkUrl, {
      productId: productId,
      pincode: pincode
    }, {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': productUrl,
        'X-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop'
      },
      timeout: 15000
    });

    // Parse the delivery response
    const deliveryData = deliveryCheck.data;
    console.log('Delivery API response:', JSON.stringify(deliveryData, null, 2));

    if (deliveryData && typeof deliveryData === 'object') {
      // Check if the product is serviceable at this pincode
      const isServiceable = deliveryData.serviceability?.status === "Serviceable";
      console.log(`Product serviceability at ${pincode}: ${isServiceable}`);
      return isServiceable;
    }

    return false;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error checking availability for pincode ${pincode}:`, {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url,
        data: error.response?.data
      });
    } else {
      console.error(`Error checking availability for pincode ${pincode}:`, error);
    }
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