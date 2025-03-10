
import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import path from 'path';
import { registerRoutes } from './routes';

// Create an Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup the routes
const setup = async () => {
  await registerRoutes(app);
  
  // Serve static files from the public directory
  app.use(express.static(path.join(process.cwd(), 'dist/public')));
  
  // Always return index.html for any other route
  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
  });
  
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
      },
      sendFile: function(path) {
        // Read the file and send it
        const fs = require('fs');
        try {
          const content = fs.readFileSync(path, 'utf8');
          res.setHeader('Content-Type', 'text/html');
          res.end(content);
          resolve(undefined);
        } catch (err) {
          res.statusCode = 404;
          res.end('File not found');
          resolve(undefined);
        }
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
