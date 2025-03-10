
import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from './routes';

// Create an Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup the routes
const setup = async () => {
  await registerRoutes(app);
  return app;
};

let appPromise = setup();

// Export the handler function for Vercel
export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return new Promise((resolve, reject) => {
    // Create a mock response to capture Express's response
    const mockRes = {
      ...res,
      end: function(chunk) {
        res.end(chunk);
        resolve(undefined);
        return this;
      }
    };
    
    // Forward the request to the Express app
    app(req, mockRes, (e) => {
      if (e) reject(e);
      resolve(undefined);
    });
  });
}
