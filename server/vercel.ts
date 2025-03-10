import express from 'express';
import path from 'path';
import { registerRoutes } from './routes';

// Create an Express app for Vercel deployment
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize the app once
const getApp = (() => {
  let appInstance = null;
  let appPromise = null;

  return async () => {
    if (appInstance) return appInstance;

    if (appPromise) return appPromise;

    appPromise = (async () => {
      const appInstance = express();
      // Register API routes
      await registerRoutes(appInstance);

      // Serve static files
      appInstance.use(express.static(path.join(process.cwd(), 'dist/public')));

      // Fallback route for SPA
      appInstance.get('*', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
      });

      return appInstance;
    })();

    appInstance = await appPromise;
    return appInstance;
  };
})();

// Export the handler function for Vercel
export default async function handler(req, res) {
  try {
    const app = await getApp();

    // Process the request with the Express app
    app(req, res);
  } catch (error) {
    console.error('Vercel handler error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'The server encountered an error processing your request'
    });
  }
}