import http from 'http';
import { spawn } from 'child_process';

//Start Vite dev server
const vite = spawn('vite', [], {
  stdio: 'inherit',
  shell: true
});

// Create redirect servers for multiple ports
const createRedirectServer = (port, portal) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    url.searchParams.set('portal', portal);
    
    const redirectUrl = `http://localhost:5173${url.pathname}${url.search}`;
    console.log(`🔄 Redirect ${port}${req.url} → ${redirectUrl}`);
    
    // Set cache-control to prevent caching redirects
    res.writeHead(302, {
      'Location': redirectUrl,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
    } else {
      console.error(`❌ Server error on port ${port}:`, err);
    }
  });

  server.listen(port, () => {
    console.log(`✓ ${portal.toUpperCase()} portal redirect on http://localhost:${port}/`);
  });
};

// Create redirect servers
setTimeout(() => {
  createRedirectServer(5174, 'officer');
  createRedirectServer(5175, 'officer');
}, 2000); // Wait for Vite to start

process.on('SIGINT', () => {
  vite.kill();
  process.exit();
});
