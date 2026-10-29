/**
 * iMovies Interactive Zero-Config Local Demo Runner
 * Starts an in-memory MongoDB replica set, seeds sample movies/theaters/shows/admin/customer,
 * runs the Express backend on :5000, and runs the Vite frontend on :5173.
 *
 * Perfect for quick evaluation, grading, and local verification without external database setup.
 */
const http = require('http');
const path = require('path');
const { spawn, execSync } = require('child_process');

process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
if (!process.env.MONGOMS_DOWNLOAD_DIR) {
  process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server');
}

const isWin = process.platform === 'win32';

async function waitHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(url, resolve);
        req.on('error', reject);
        req.setTimeout(1000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      if (res.statusCode < 500) return true;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  console.log('\x1b[1m\x1b[36m================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m   🎬 iMovies Interactive Localhost Demo Environment            \x1b[0m');
  console.log('\x1b[1m\x1b[36m================================================================\x1b[0m\n');

  console.log('1. Initializing in-memory MongoDB replica set (ACID transactions enabled)...');
  const { MongoMemoryReplSet } = require('../server/node_modules/mongodb-memory-server');
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const mongoUri = rs.getUri();
  console.log(`   MongoDB replica set active at: ${mongoUri}\n`);

  process.env.NODE_ENV = 'development';
  process.env.PORT = '5000';
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env.CLIENT_ORIGIN = 'http://localhost:5173,http://127.0.0.1:5173';
  process.env.ADMIN_EMAIL = 'admin@imovies.local';
  process.env.ADMIN_PASSWORD = 'AdminPassword123!';
  process.env.SEED_CUSTOMER_EMAIL = 'customer@imovies.local';
  process.env.SEED_CUSTOMER_PASSWORD = 'CustomerPassword123!';
  process.env.SEED_SHOW_DAYS = '7';
  process.env.VITE_ALLOW_SIMULATED_OUTCOME_SELECTION = 'true';

  console.log('2. Seeding sample movies, theaters, future showtimes, and credentials...');
  const seed = require('../server/src/seed/seed');
  await seed.main();
  console.log('   Catalog seeded successfully.\n');

  console.log('3. Starting Express backend API with Socket.IO on port 5000...');
  const app = require('../server/src/app');
  const realtime = require('../server/src/realtime');
  const { connectDb } = require('../server/src/config/db');
  await connectDb(mongoUri);
  const server = http.createServer(app);
  realtime.init(server);
  await new Promise((resolve) => server.listen(5000, '127.0.0.1', resolve));
  console.log('   Backend API active on: \x1b[1m\x1b[32mhttp://localhost:5000\x1b[0m\n');

  console.log('4. Starting Vite frontend development server on port 5173...');
  const viteProcess = spawn(
    isWin ? 'cmd.exe' : 'npm',
    isWin ? ['/c', 'npm.cmd', 'run', 'dev', '--', '--host', '127.0.0.1'] : ['npm', 'run', 'dev', '--', '--host', '127.0.0.1'],
    {
      cwd: path.resolve(__dirname, '../client'),
      env: { ...process.env, VITE_PROXY_TARGET: 'http://127.0.0.1:5000' },
      stdio: 'inherit',
    }
  );

  await waitHttp('http://127.0.0.1:5173');

  console.log('\n\x1b[1m\x1b[32m================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[32m   🎉 iMovies is ready on Localhost!                           \x1b[0m');
  console.log('\x1b[1m\x1b[32m================================================================\x1b[0m');
  console.log('   ➜ Frontend Application:  \x1b[1m\x1b[36mhttp://localhost:5173\x1b[0m');
  console.log('   ➜ Backend REST API:      \x1b[1m\x1b[36mhttp://localhost:5000\x1b[0m');
  console.log('   ➜ Health Check:          \x1b[1m\x1b[36mhttp://localhost:5000/api/health\x1b[0m\n');
  console.log('\x1b[1mDemo Accounts Pre-Configured:\x1b[0m');
  console.log('   👤 Customer:  \x1b[33mcustomer@imovies.local\x1b[0m  /  Password: \x1b[33mCustomerPassword123!\x1b[0m');
  console.log('   👑 Admin:     \x1b[33madmin@imovies.local\x1b[0m     /  Password: \x1b[33mAdminPassword123!\x1b[0m\n');
  console.log('\x1b[2mPress Ctrl+C to stop both servers.\x1b[0m\n');

  // Handle termination
  let terminating = false;
  const cleanup = async () => {
    if (terminating) return;
    terminating = true;
    console.log('\nStopping demo servers...');
    try {
      if (isWin) {
        execSync(`taskkill /F /T /PID ${viteProcess.pid} >nul 2>&1`);
      } else {
        viteProcess.kill();
      }
    } catch {}
    try { await new Promise((r) => server.close(r)); } catch {}
    try { const mongoose = require('mongoose'); await mongoose.disconnect(); } catch {}
    try { await rs.stop(); } catch {}
    console.log('Teardown complete.');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('Fatal demo runner error:', err);
  process.exit(1);
});
