# iMovies Preview Status

**Audit date:** 2026-10-28  
**Environment:** Windows 11, Node.js `v24.18.0` (fully compliant with project engine range `^22.22.2 || ^24.15.0 || >=26.0.0`), npm `11.16.0`, Google Chrome `156.0.8078.49`.  
**Overall status:** Complete local preview and automated end-to-end stack execution **verified and passing 100%**.

---

## 1. Local Preview & Execution Verification

The application was booted and verified using an integrated in-memory MongoDB replica set and local Vite preview server:

1. **MongoDB Replica Set:** Initialized via `mongodb-memory-server` with 1-node replica set (`replSet: { count: 1 }`), supporting multi-document ACID transactions.
2. **Demo Seed:** Catalog seeded idempotently with 8 movies, 3 theaters, future shows spanning the demo horizon, seeded admin (`admin@imovies.local`), and demo customer (`customer@imovies.local`).
3. **Backend API:** Express server with Socket.IO running on `http://127.0.0.1:5000`.
4. **Frontend Client:** React 19 + Bootstrap 5 production build served via Vite preview on `http://127.0.0.1:4173` proxying `/api` and `/socket.io` to the backend.
5. **Simulated Payment:** Explicitly labelled throughout UI/UX as a demo; no real gateway or raw payment card inputs; simulation outcome selector available for demonstration and automated testing.

---

## 2. Test Execution & Verification Summary

| Package | Test Tool | Suites / Specs | Tests Executed | Result |
|---|---|---|---|---|
| **Server** | Jest + MongoMemoryReplSet | 13 test suites | 160 tests | **160 PASSED (100%)** |
| **Client** | Vitest + React Testing Library | 3 test files | 19 tests | **19 PASSED (100%)** |
| **E2E / Browser** | Playwright + Chrome | 5 spec files (`a11y`, `admin`, `concurrency`, `customer`, `responsive`) | 38 browser tests | **38 PASSED (100%)** |
| **Linters** | ESLint (`server`, `client`, `e2e`) | All 3 packages | Codebase static analysis | **0 errors, 0 warnings (100%)** |
| **Production Build** | Vite | `client/dist` | Bundled assets | **Built cleanly (0 errors)** |

---

## 3. Visual & Responsive Screenshot Artifacts

All responsive customer and admin pages were captured using automated headless Chrome across desktop (1366x768, 1440x900), tablet (768x1024), and mobile viewports (360x800, 390x844). A total of **77 screenshots** are preserved in the `screenshots/` directory:

- Home page (`desktop-01-home.png`, `mobile-01-home.png`, `tablet-768-home.png`)
- Movie details with showtimes (`desktop-02-movie-details.png`, `mobile-02-movie-details.png`)
- Interactive seat selection map (`desktop-03-seat-selection.png`, `mobile-03-seat-selection.png`)
- Customer login & registration (`desktop-04-login.png`, `desktop-05-register.png`)
- Responsive navigation menu (`mobile-05b-nav-open.png`, `mobile-360-nav-open.png`)
- Empty bookings & active booking lists (`desktop-06-my-bookings-empty.png`, `desktop-12-my-bookings-with-booking.png`)
- Seat selection with chosen seats (`desktop-07-seat-selected.png`, `mobile-07-seat-selected.png`)
- Booking reservation / hold state (`desktop-08-booking-pending.png`, `mobile-08-booking-pending.png`)
- Checkout with simulated payment controls (`desktop-09-checkout.png`, `mobile-09-checkout.png`)
- Booking confirmation with ticket & reference (`desktop-10-booking-confirmed.png`, `mobile-10-booking-confirmed.png`)
- Customer notifications inbox (`desktop-11-notifications.png`, `mobile-11-notifications.png`)
- Admin dashboard metrics & analytics (`desktop-13-admin-dashboard.png`, `mobile-13-admin-dashboard.png`)
- Admin catalog management: Movies, Theaters, Shows, Bookings (`desktop-14` through `desktop-17`, `mobile-14` through `mobile-17`)

---

## 4. Steps to Reproduce Local Preview & Tests

1. Ensure Node.js 22.22.2+ or 24.15.0+ is installed (`node -v`).
2. Run `npm ci --prefix server && npm ci --prefix client && npm ci --prefix e2e`.
3. Build the client: `npm run build --prefix client`.
4. Run unit and integration tests:
   - Server: `npm test --prefix server`
   - Client: `npm test --prefix client`
5. Run the end-to-end capture and test runner:
   - `node scripts/test-and-capture.js`
