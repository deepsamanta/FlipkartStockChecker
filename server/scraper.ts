import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function fetchWithRetry(url: string, options: any, retries = 3): Promise<any> {
  try {
    return await axios(url, options);
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying request (${4 - retries}/3)...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      return fetchWithRetry(url, options, retries - 1);
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cookie': `pincode=${pincode}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000, // 30 seconds timeout
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // Log HTML content for debugging
    const htmlContent = $('body').html() || '';
    console.log(`HTML content length: ${htmlContent.length}`);

    // First check for out of stock indicators
    const outOfStock = $('._16FRp0').length > 0; // "OUT OF STOCK" text
    if (outOfStock) {
      console.log('Product is out of stock');
      return false;
    }

    // Search for delivery text in all elements
    let foundDeliveryText = false;
    $('*').each((_, element) => {
      const text = $(element).text().trim().toLowerCase();
      if (text.includes('delivery by')) {
        console.log('Found delivery text:', text);
        foundDeliveryText = true;
        return false; // Break the loop
      }
    });

    if (!foundDeliveryText) {
      console.log('No delivery text found for pincode', pincode);
      // Log a sample of the HTML for debugging
      console.log('Sample HTML:', htmlContent.substring(0, 2000));
    }

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
    throw error; // Throw error to be handled by the caller
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