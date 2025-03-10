import axios from "axios";
import * as cheerio from "cheerio";
import { PincodeAvailability } from "@shared/schema";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const MAX_RETRIES = 2;
const TIMEOUT = 30000; // 30 seconds
const BATCH_SIZE = 2;

async function fetchWithRetry(url: string, options: any, retries = 0): Promise<any> {
  try {
    return await axios(url, options);
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`Retrying request (${retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      return fetchWithRetry(url, options, retries + 1);
    }
    throw error;
  }
}

export async function checkAvailability(productUrl: string, pincode: string): Promise<boolean> {
  try {
    console.log(`Checking availability for pincode ${pincode}`);

    const response = await fetchWithRetry(productUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
        'Cookie': `pincode=${pincode}`, // Set pincode in cookie
        'Cache-Control': 'no-cache',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: TIMEOUT
    });

    const $ = cheerio.load(response.data);

    // Find all elements that might contain delivery information
    let foundDeliveryText = false;

    // Look for delivery information in specific sections first
    const commonSelectors = [
      '._16FRp0', // Out of stock indicator
      '._1tBBEs', // Delivery container
      '._3XINqE', // Alternative delivery container
      '.delivering-to', // Delivery location section
      '[data-testid="delivery-details"]', // Data attribute for delivery details
    ];

    // Check specific sections first
    for (const selector of commonSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((_, element) => {
          const text = $(element).text().trim().toLowerCase();
          console.log(`Found text in ${selector}:`, text);
          if (text.includes('delivery by')) {
            foundDeliveryText = true;
            return false; // Break the loop
          }
        });
        if (foundDeliveryText) break;
      }
    }

    // If not found in specific sections, search all elements
    if (!foundDeliveryText) {
      $('*').each((_, element) => {
        const text = $(element).text().trim().toLowerCase();
        if (text.includes('delivery by')) {
          console.log(`Found delivery text in element:`, text);
          foundDeliveryText = true;
          return false; // Break the loop
        }
      });
    }

    // Log more detailed HTML content for debugging
    const htmlContent = $('body').html() || '';
    console.log(`HTML content length: ${htmlContent.length}`);
    console.log(`First 2000 chars of HTML: ${htmlContent.substring(0, 2000)}`); // Increased logging
    console.log(`No delivery information found for pincode ${pincode}`);
    return foundDeliveryText;

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