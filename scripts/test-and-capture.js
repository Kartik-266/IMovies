const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server');

async function waitHttp(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  const shotsDir = path.resolve(__dirname, '../screenshots');
  fs.mkdirSync(shotsDir, { recursive: true });

  console.log('1. Starting MongoDB in-memory replica set...');
  const { MongoMemoryReplSet } = require('../server/node_modules/mongodb-memory-server');
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const mongoUri = rs.getUri();
  console.log(`   Replica set ready at ${mongoUri}`);

  process.env.NODE_ENV = 'development';
  process.env.PORT = '5000';
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'supersecretlongjwtsecret1234567890abcdefghijklmnopqrstuvwxyz';
  process.env.CLIENT_ORIGIN = 'http://localhost:4173,http://127.0.0.1:4173,http://localhost:5173,http://127.0.0.1:5173';
  process.env.ADMIN_EMAIL = 'admin@imovies.local';
  process.env.ADMIN_PASSWORD = 'AdminPassword123!';
  process.env.SEED_CUSTOMER_EMAIL = 'customer@imovies.local';
  process.env.SEED_CUSTOMER_PASSWORD = 'CustomerPassword123!';
  process.env.SEED_SHOW_DAYS = '4';
  process.env.AUTH_RATE_LIMIT_MAX = '10000';
  process.env.RESERVE_RATE_LIMIT_MAX = '10000';

  console.log('2. Seeding database with movies, theaters, shows, admin, and demo customer...');
  const seed = require('../server/src/seed/seed');
  await seed.main();
  console.log('   Database seeded successfully.');

  console.log('3. Starting Express backend with Socket.IO on http://127.0.0.1:5000...');
  const app = require('../server/src/app');
  const realtime = require('../server/src/realtime');
  const { connectDb } = require('../server/src/config/db');
  await connectDb(mongoUri);
  const server = http.createServer(app);
  realtime.init(server);
  await new Promise((resolve) => server.listen(5000, '127.0.0.1', resolve));
  console.log('   Express server listening on http://127.0.0.1:5000');

  console.log('4. Starting Vite preview on http://127.0.0.1:4173...');
  const vite = spawn('cmd.exe', ['/c', 'npx.cmd', 'vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '../client'),
    env: { ...process.env, VITE_PROXY_TARGET: 'http://127.0.0.1:5000', VITE_ALLOW_SIMULATED_OUTCOME_SELECTION: 'true' },
    stdio: 'ignore',
  });

  try {
    await waitHttp('http://127.0.0.1:4173');
    console.log('   Vite preview server is up and responsive.');

    console.log('5. Running Playwright E2E test suite...');
    const e2eEnv = {
      ...process.env,
      E2E_ADMIN_EMAIL: 'admin@imovies.local',
      E2E_ADMIN_PASSWORD: 'AdminPassword123!',
      E2E_BASE_URL: 'http://127.0.0.1:4173',
      E2E_CHROMIUM_PATH: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      E2E_SHOTS_DIR: shotsDir,
    };

    const e2eProcess = spawn('cmd.exe', ['/c', 'npx.cmd', 'playwright', 'test'], {
      cwd: path.resolve(__dirname, '../e2e'),
      env: e2eEnv,
      stdio: 'inherit',
    });

    const e2eCode = await new Promise((resolve) => e2eProcess.on('close', resolve));
    console.log(`\nPlaywright E2E suite exited with code: ${e2eCode}`);
    if (e2eCode !== 0) {
      process.exitCode = e2eCode;
    }

    console.log('6. Capturing baseline screenshots with Playwright...');
    const { chromium } = require('../e2e/node_modules/@playwright/test');
    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const viewports = [
      { name: 'desktop', width: 1366, height: 768 },
      { name: 'mobile', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      console.log(`   Capturing ${vp.name} (${vp.width}x${vp.height})...`);
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, baseURL: 'http://127.0.0.1:4173' });
      const page = await ctx.newPage();

      // Home
      await page.goto('/');
      await page.waitForSelector('.movie-card');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-01-home.png`) });

      // Movie Details
      await page.locator('.movie-card', { hasText: 'Orbit Station Nine' }).click();
      await page.waitForSelector('h1.h2');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-02-movie-details.png`) });

      // Seat Selection
      const showLink = page.getByRole('link', { name: /seats left/i }).first();
      if (await showLink.count()) {
        await showLink.click();
        await page.waitForSelector('.screen-bar');
        await page.screenshot({ path: path.join(shotsDir, `${vp.name}-03-seat-selection.png`) });
      }

      // Login page
      await page.goto('/login');
      await page.waitForSelector('#email');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-04-login.png`) });

      // Register page
      await page.goto('/register');
      await page.waitForSelector('#name');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-05-register.png`) });

      // Log in as Customer
      await page.goto('/login');
      await page.getByLabel('Email').fill('customer@imovies.local');
      await page.getByLabel('Password').fill('CustomerPassword123!');
      await page.getByRole('button', { name: 'Log in' }).click();
      await page.waitForSelector('text=Hi, Demo', { state: 'attached' });

      // If mobile, capture open navigation menu
      if (vp.width < 768) {
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
        await page.waitForSelector('text=Hi, Demo', { state: 'visible' });
        await page.screenshot({ path: path.join(shotsDir, `${vp.name}-05b-nav-open.png`) });
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
      }

      // My Bookings (empty initially)
      await page.goto('/bookings');
      await page.waitForSelector('h1:has-text("My bookings")');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-06-my-bookings-empty.png`) });

      // Customer Booking Journey: Select Seats -> Reserve -> Pending -> Checkout -> Pay
      await page.goto('/');
      await page.locator('.movie-card', { hasText: 'Orbit Station Nine' }).click();
      await page.getByRole('link', { name: /seats left/i }).first().click();
      await page.waitForSelector('button.seat-available');
      const availSeats = page.locator('button.seat-available');
      await availSeats.nth(0).click();
      await availSeats.nth(1).click();
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-07-seat-selected.png`) });

      const reserveBtn = page.getByRole('button', { name: /Reserve 2 seats/i });
      await reserveBtn.click();
      await page.waitForURL(/\/bookings\/[a-f0-9]+$/);
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-08-booking-pending.png`) });

      // Checkout screen
      await page.getByRole('link', { name: 'Proceed to payment' }).click();
      await page.waitForURL(/\/checkout$/);
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-09-checkout.png`) });

      // Pay (simulated) -> Confirmed screen
      await page.getByRole('button', { name: /Pay .* \(simulated\)/i }).click();
      await page.waitForURL(/\/bookings\/[a-f0-9]+$/);
      await page.waitForSelector('text=Payment successful');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-10-booking-confirmed.png`) });

      // Notifications screen
      await page.goto('/notifications');
      await page.waitForSelector('h1:has-text("Notifications")');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-11-notifications.png`) });

      // My Bookings with confirmed booking
      await page.goto('/bookings');
      await page.waitForSelector('.list-group-item');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-12-my-bookings-with-booking.png`) });

      // Log out
      if (vp.width < 768) {
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
      }
      await page.getByRole('button', { name: 'Log out' }).click();
      await page.goto('/login');
      await page.waitForSelector('h1:has-text("Log in")');

      // Log in as Admin
      await page.goto('/login');
      await page.getByLabel('Email').fill('admin@imovies.local');
      await page.getByLabel('Password').fill('AdminPassword123!');
      await page.getByRole('button', { name: 'Log in' }).click();
      await page.waitForSelector('text=Hi, iMovies', { state: 'attached' });

      // Admin Dashboard
      await page.goto('/admin');
      await page.waitForSelector('text=Active movies');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-13-admin-dashboard.png`) });

      // Admin Movies
      await page.getByRole('tab', { name: 'Movies' }).click();
      await page.waitForSelector('h2:has-text("Movies")');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-14-admin-movies.png`) });

      // Admin Theaters
      await page.getByRole('tab', { name: 'Theaters' }).click();
      await page.waitForSelector('h2:has-text("Theaters")');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-15-admin-theaters.png`) });

      // Admin Shows
      await page.getByRole('tab', { name: 'Shows' }).click();
      await page.waitForSelector('h2:has-text("Upcoming shows")');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-16-admin-shows.png`) });

      // Admin Bookings
      await page.getByRole('tab', { name: 'Bookings' }).click();
      await page.waitForSelector('h2:has-text("Bookings")');
      await page.screenshot({ path: path.join(shotsDir, `${vp.name}-17-admin-bookings.png`) });

      await ctx.close();
    }
    await browser.close();
    console.log('   All baseline screenshots saved in screenshots/.');
  } finally {
    console.log('7. Cleaning up servers and replica set...');
    try { vite.kill(); } catch {}
    try { await new Promise((r) => server.close(r)); } catch {}
    try { const mongoose = require('mongoose'); await mongoose.disconnect(); } catch {}
    try { await rs.stop(); } catch {}
    console.log('   Teardown complete.');
  }
}

main().catch((err) => {
  console.error('Fatal test-and-capture error:', err);
  process.exit(1);
});
