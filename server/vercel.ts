
import express from 'express';
import path from 'path';
import { registerRoutes } from './routes';

// Create an Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
export default async function handler(req, res) {
  try {
    const app = await appPromise;
    
    return new Promise((resolve, reject) => {
      const mockRes = {
        ...res,
        end: function(chunk) {
          res.end(chunk);
          resolve();
          return this;
        },
        sendFile: function(filePath) {
          const fs = require('fs');
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            res.setHeader('Content-Type', 'text/html');
            res.end(content);
            resolve();
          } catch (err) {
            res.statusCode = 404;
            res.end('File not found');
            resolve();
          }
          return this;
        }
      };
      
      app(req, mockRes, (e) => {
        if (e) {
          console.error('Express error:', e);
          res.status(500).send('Internal Server Error');
          reject(e);
        }
        resolve();
      });
    });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).send('Internal Server Error');
    throw error;
  }
}
