import axios from "axios";
import * as cheerio from "cheerio";
import { PincodeAvailability } from "@shared/schema";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

export async function checkAvailability(productUrl: string, pincode: string): Promise<boolean> {
  try {
    // First try scraping the product page
    const productPage = await axios.get(productUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
        'Cookie': `pincode=${pincode}`
      },
      timeout: 10000
    });

    const $ = cheerio.load(productPage.data);

    // Look for delivery date text in commonly used Flipkart classes
    const deliverySelectors = [
      '._3XINqE', // Delivery date container
      '._1tBBEs', // Alternative delivery date container
      '.delivery-info', // Generic delivery info container
      'div:contains("Delivery by")',
      'div:contains("Expected Delivery")'
    ];

    for (const selector of deliverySelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().toLowerCase();
        console.log(`Found text in ${selector}:`, text);

        if (text.includes('delivery by') || text.includes('expected delivery')) {
          console.log(`Found valid delivery text for pincode ${pincode}: ${text}`);
          return true;
        }
      }
    }

    // If HTML scraping doesn't work, try the API
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
      timeout: 5000  // Lower timeout to fail faster
    });

    // Parse the delivery response
    const deliveryData = deliveryCheck.data;
    console.log('Delivery API response:', JSON.stringify(deliveryData, null, 2));

    if (deliveryData && typeof deliveryData === 'object') {
      // Check if we have delivery date information
      if (deliveryData.serviceability?.deliveryDate || 
          deliveryData.serviceability?.estimatedDate ||
          deliveryData.serviceability?.promiseDate) {
        console.log(`Found delivery date for pincode ${pincode}`);
        return true;
      }

      // Fallback to checking serviceable status
      const isServiceable = deliveryData.serviceability?.status === "Serviceable" ||
                          deliveryData.serviceability?.message?.toLowerCase().includes("delivery") ||
                          deliveryData.serviceability?.estimatedDays > 0;

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