# iMovies Phase 7 — Baseline Audit Report

**Date of Baseline:** 2026-10-29  
**Workspace:** `c:\Users\Asus\Downloads\imovies-phase7-final-submission`  
**Host Environment:** Windows 11, Node.js `v24.18.0`, npm `11.16.0`, Google Chrome `156.0.8078.49`  
**Database Engine:** In-memory MongoDB Replica Set (`mongodb-memory-server@11.3.0` running MongoDB 8.2.6)

---

## 1. Repository Structure & Artifacts

The repository is structured into distinct decoupled packages, each maintaining its own explicit `package.json` and locked `package-lock.json`:

```
.
├── client/                     # Frontend Single Page Application
│   ├── public/                 # Static assets and original SVG posters
│   ├── src/                    # React 19 application components, pages, hooks, tests
│   ├── .env.example            # Client environment template
│   ├── package.json            # Client dependencies and scripts
│   ├── package-lock.json       # Exact locked dependency graph
│   └── vite.config.js          # Vite 8.3 configuration with reverse proxy & outcome toggle
├── server/                     # Backend REST API and Realtime Engine
│   ├── src/                    # Express 5 application, models, services, controllers, routes
│   ├── tests/                  # Jest 30 integration test suites
│   ├── .env.example            # Server environment template
│   ├── package.json            # Server dependencies and scripts
│   └── package-lock.json       # Exact locked dependency graph
├── e2e/                        # End-to-End Browser & Accessibility Test Suite
│   ├── tests/                  # Playwright 1.64 spec files (a11y, admin, concurrency, customer, responsive)
│   ├── package.json            # E2E dependencies and scripts
│   ├── package-lock.json       # Exact locked dependency graph
│   └── playwright.config.js    # Playwright configuration with Chrome auto-discovery
├── scripts/                    # Zero-dependency orchestration runners
│   ├── demo.js                 # 1-Click zero-config local demo with in-memory Mongo replica set
│   ├── dev.js                  # Concurrent root development runner with clean termination
│   ├── verify-localhost.js     # 12-criteria full-stack automated localhost verification
│   └── test-and-capture.js     # Headless Playwright test & responsive screenshot capture
├── screenshots/                # 77 verified responsive baseline screenshots
├── package.json                # Root convenience scripts and engine constraints
├── .gitignore                  # Git hygiene and secret prevention rules
└── .nvmrc                      # Pinned Node version (22.22.2 / >=24.15.0)
```

---

## 2. Detected Environment Requirements

| Requirement | Project Specification | Detected System Value | Compliance Status |
|---|---|---|:---:|
| **Node.js** | `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` | `v24.18.0` | **MATCH (Satisfies engine)** |
| **npm** | Matching lockfile version 3 | `11.16.0` | **MATCH** |
| **Operating System** | Windows 11 (win32) | Windows 11 x64 | **MATCH** |
| **System Browser** | Google Chrome / Chromium | `C:\Program Files\Google\Chrome\Application\chrome.exe` | **MATCH** |
| **Database Support** | MongoDB 6+ Replica Set (ACID transactions) | In-Memory MongoDB 8.2.6 Replica Set | **MATCH** |

---

## 3. Existing Baseline Functionality

- **Architecture:** MERN Stack (MongoDB, Express, React, Node.js) with Socket.IO for live seat updates.
- **Transactions & Concurrency:** Multi-document ACID transactions for seat holds, confirmations, cancellations, and screen schedule locking.
- **Seat Map Engine:** Real-time seat inventory tracking (`AVAILABLE`, `HELD`, `BOOKED`) with server-enforced countdown timers and automatic stale-hold expiration.
- **Authentication:** Password hashing with bcryptjs (pre-warmed constant-time comparison to mitigate user enumeration), HTTP-only JWT cookies, role-based access control (`CUSTOMER`, `ADMIN`).
- **CSRF & Security:** Strict `Origin` validation on all mutating HTTP methods (`POST`, `PUT`, `DELETE`), Helmet security headers, 50 KB body size limit, and Zod input validation schemas.
- **Demonstration Payments:** Explicitly isolated simulated payment gateway that requests no sensitive financial data and never communicates with external payment networks.
- **Accessibility:** High-contrast tokens, accessible DOM naming for buttons and dialogs, keyboard navigation, and zero axe-core violations on scanned pages.

---

## 4. Exact Baseline Test Results

All baseline commands were executed against the codebase in this environment:

### A. Dependency Installation (`npm.cmd ci`)
- **Server:** 516 packages installed cleanly from lockfile (`package-lock.json`) in 41s.
- **Client:** 357 packages installed cleanly from lockfile (`package-lock.json`) in 52s.
- **E2E:** 84 packages installed cleanly from lockfile (`package-lock.json`) in 9s.
- **Status:** **PASS**

### B. Static Analysis & Linting (`npm.cmd run lint`)
- `eslint .` across `server/`: 0 errors, 0 warnings.
- `eslint .` across `client/`: 0 errors, 0 warnings.
- `eslint .` across `e2e/`: 0 errors, 0 warnings.
- **Status:** **PASS**

### C. Client Unit Tests (`npm.cmd test --prefix client`)
- **Framework:** Vitest 5.0.5 + React Testing Library + jsdom.
- **Test Files:** 3 passed, 3 total.
- **Tests Executed:** 19 passed, 19 total (100%).
  - `src/test/phase6.test.jsx`: 1 test passed (navbar unread badge clears immediately upon mark all read).
  - `src/test/client.test.jsx`: 9 tests passed (seat map accessibility, state toggles, countdown timer).
  - `src/test/phase5.test.jsx`: 9 tests passed (checkout demo simulation, cancellation cutoff, payment history).
- **Status:** **PASS**

### D. Production Bundle Build (`npm.cmd run build --prefix client`)
- **Tool:** Vite 8.3.5.
- **Output:** Built `dist/` in 524ms (82 modules transformed, `index.html`, CSS chunk `235.36 kB`, JS chunk `360.38 kB`).
- **Status:** **PASS**

### E. Server Unit & Integration Tests (`npm.cmd test --prefix server`)
- **Framework:** Jest 30.5.2 + `mongodb-memory-server` 1-node replica set.
- **Suites Executed:** 13 passed, 13 total.
- **Tests Executed:** 160 passed, 160 total (100%).
  1. `tests/showSchedule.test.js` (11 tests) — **PASS**
  2. `tests/payments.test.js` (12 tests) — **PASS**
  3. `tests/adminBootstrap.test.js` (9 tests) — **PASS**
  4. `tests/booking.test.js` (24 tests) — **PASS**
  5. `tests/catalog.test.js` (21 tests) — **PASS**
  6. `tests/csrf.test.js` (10 tests) — **PASS**
  7. `tests/security.test.js` (18 tests) — **PASS**
  8. `tests/posters.test.js` (8 tests) — **PASS**
  9. `tests/auth.test.js` (15 tests) — **PASS**
  10. `tests/seedSafety.test.js` (10 tests) — **PASS**
  11. `tests/loginTiming.test.js` (6 tests) — **PASS**
  12. `tests/realtime.test.js` (8 tests) — **PASS**
  13. `tests/ratelimit.test.js` (8 tests) — **PASS**
- **Status:** **PASS**

### F. Full-Stack Localhost Verification (`node scripts/verify-localhost.js`)
- **Runner:** Automated orchestration of in-memory replica set, catalog seeder, Express API (:5000), Vite dev server (:5173), reverse proxy verification, and real Playwright browser automation via Chrome.
- **Verification Steps:** All 12 criteria verified and passed:
  1. In-memory replica set active (ACID transactions enabled)
  2. Database catalog seeded with 8 movies, 3 theaters, 72 shows, admin and customer accounts
  3. Express backend listening on `http://127.0.0.1:5000`
  4. Vite frontend dev server responsive on `http://127.0.0.1:5173`
  5. Reverse-proxy `/api` verified
  6. Homepage catalog rendering (8 movies)
  7. Customer authentication (`customer@imovies.local`)
  8. Movie details and showtime selection
  9. Interactive seat matrix selection and reservation hold creation
  10. Demonstration checkout and simulated payment confirmation
  11. Real-time notification arrival in customer inbox
  12. Booking cancellation, refund processing, and admin dashboard validation
- **Status:** **PASS (100% Green)**

---

## 5. Confirmed Defects, Windows Nuances & Reproduction Steps

1. **PowerShell Script Execution Policy (`npm.ps1`):**
   - *Symptom:* `npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.`
   - *Reproduction:* Executing `npm run ...` in a default Windows PowerShell session.
   - *Remediation:* Explicitly invoke `npm.cmd` in all batch commands, documentation, and root spawn runners (`npm.cmd run dev`, `npm.cmd test`, etc.).

2. **MongoDB Replica Set Port Binding:**
   - *Symptom:* `MongoNetworkError: connect EACCES 127.0.0.1:<port>` when running network-restricted sandbox commands.
   - *Reproduction:* Attempting loopback TCP connection across child processes under strict Windows sandboxing.
   - *Remediation:* Test runners and demo scripts bind loopback ports and execute with necessary system permissions.

---

## 6. Prioritized Remediation Plan

- **Phase 1 (Hygiene & Archive Integrity):** Ensure clean `.gitignore` compliance, eliminate stale build artifacts and temporary files, verify portable forward-slash paths.
- **Phase 2 (Environment Reproducibility):** Document exact Windows PowerShell execution steps and zero-config demo runner.
- **Phase 3 (Backend & Data Audit):** Re-verify concurrency safety, transaction rollback guarantees, and CSRF origin headers.
- **Phase 4 (Frontend UI/UX Audit):** Confirm visual design preservation across mobile, tablet, and desktop viewports.
- **Phase 5 (Automated Testing):** Compile comprehensive verification evidence in `reports/final-verification.md`.
- **Phase 6 (Documentation):** Update `README.md`, `TEST_RESULTS.md`, and generate `reports/known-limitations.md`.
- **Phase 7 (Submission Packaging):** Package the clean, verified repository into `imovies-phase7-final-verified.zip` and validate fresh extraction.

