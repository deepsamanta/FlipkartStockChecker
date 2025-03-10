
// This file is the entry point for the Vercel serverless function
import { default as handler } from '../dist/api/vercel.js';

// Export the handler function for Vercel
export default async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).send('Internal Server Error');
  }
};
