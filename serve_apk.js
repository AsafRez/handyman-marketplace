import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;

const server = http.createServer((req, res) => {
  // Decode URL in case of spaces
  const decodedUrl = decodeURIComponent(req.url);
  let filePath = path.join(__dirname, decodedUrl === '/' ? 'index.html' : decodedUrl);
  
  const extname = path.extname(filePath);
  if (extname === '.apk') {
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('APK File Not Found');
    }
  } else if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>HandyHub APK Download</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            text-align: center;
            padding: 40px 20px;
            background: #f3f4f6;
            color: #1f2937;
          }
          .card {
            background: white;
            padding: 40px 20px;
            border-radius: 16px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
            display: inline-block;
            max-width: 400px;
            width: 100%;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 8px;
            color: #111827;
          }
          p {
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 24px;
          }
          a {
            display: block;
            background: #2563eb;
            color: white;
            padding: 14px 24px;
            margin: 12px 0;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: background 0.2s;
          }
          a:hover {
            background: #1d4ed8;
          }
          .release-btn {
            background: #10b981;
          }
          .release-btn:hover {
            background: #059669;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Download HandyHub</h1>
          <p>Choose an option below to download and install the APK on your Android device:</p>
          <a class="release-btn" href="/HandyHub-Release.apk">Download Release APK (3.3 MB)</a>
          <a href="/HandyHub.apk">Download Debug APK (4.5 MB)</a>
        </div>
      </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Local network URL: http://192.168.1.188:${PORT}/`);
});
