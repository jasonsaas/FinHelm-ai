const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Serve static files from quickstart directory
  let filePath = './quickstart' + (req.url === '/' ? '/index.html' : req.url);
  
  // Security: prevent directory traversal
  filePath = path.normalize(filePath);
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>404 - Not Found</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #333; }
              a { color: #007bff; text-decoration: none; }
            </style>
          </head>
          <body>
            <h1>404 - Page Not Found</h1>
            <p>The requested page <code>${req.url}</code> was not found.</p>
            <p><a href="/">Go to Home</a></p>
          </body>
          </html>
        `);
      } else {
        // Server error
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     FinHelm AI - Local Test Server                      ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║     Server running at: http://localhost:${PORT}            ║
║                                                           ║
║     Pages available:                                      ║
║     • http://localhost:${PORT}/index.html                  ║
║     • http://localhost:${PORT}/oauth.html                  ║
║     • http://localhost:${PORT}/dashboard.html              ║
║                                                           ║
║     Press Ctrl+C to stop the server                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Note: This is for testing static files only.
For full OAuth functionality, use 'netlify dev' instead.
  `);
  
  // Open browser automatically
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : 
                  platform === 'win32' ? 'start' : 'xdg-open';
  
  require('child_process').exec(`${command} http://localhost:${PORT}`);
});