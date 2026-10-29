# iMovies — Technical Architecture & Known Limitations Report

**Project:** iMovies Movie-Ticket Booking System (MERN Stack)  
**Document Version:** 1.0.0 (Phase 7 Final Release)  
**Target Audience:** Academic Reviewers, Evaluators, and Systems Engineers  

---

## 1. System Architecture Overview

```
                                  +------------------------------------+
                                  |         Web Browser Client         |
                                  | (React 19 SPA + Bootstrap 5 + CSS) |
                                  +-----------------+------------------+
                                                    |
                               +--------------------+--------------------+
                               |                                         |
                       HTTP / REST API                           WebSocket (Socket.IO)
                    (Cookies: SameSite/Secure)                      (/socket.io/)
                               |                                         |
                               v                                         v
               +-----------------------------------------------------------------+
               |                      Express 5 Backend Server                    |
               |                                                                 |
               |  - Security: Helmet, Strict Origin CSRF check, Zod Validation   |
               |  - Auth: bcryptjs hash (pre-warmed), HTTP-only JWT cookies       |
               |  - Concurrency: ScreenSchedule Locks & Retried ACID Transactions|
               |  - Background: 60s Stale Hold Expiration & Notification Dispatch |
               +--------------------------------+--------------------------------+
                                                |
                                    Mongoose 9 / MongoDB Driver
                                                |
                                                v
               +-----------------------------------------------------------------+
               |                   MongoDB Replica Set (6.0+)                    |
               |                                                                 |
               |  - Multi-Document ACID Transactions (Snapshot Read, Majority)   |
               |  - Unique Indexes (ScreenSchedule, Show slots, Seat Inventory)   |
               |  - Single source of truth: SeatInventory (AVAILABLE/HELD/BOOKED)|
               +-----------------------------------------------------------------+
```

---

## 2. Technical Limitations & Design Decisions

### A. MongoDB Replica Set Requirement for ACID Transactions
- **Condition:** Multi-seat hold reservation, checkout payment confirmation, booking cancellations, and screen schedule contention resolution all rely on MongoDB multi-document ACID transactions (`session.startTransaction({ readConcern: 'snapshot', writeConcern: 'majority' })`).
- **Limitation:** Standalone MongoDB instances do not support transaction sessions. Connecting to a standalone `mongod` fails fast at startup with an actionable error.
- **Resolution Provided:** 
  1. **Zero-Config In-Memory Replica Set:** Built-in `npm run demo` starts an ephemeral, fully isolated replica set without requiring external database installation.
  2. **MongoDB Atlas:** Compatible with Atlas free tier (M0) which operates as a replica set by default.
  3. **Local mongod:** Supported by starting `mongod --replSet rs0` and running `npm run db:init-replset`.

### B. Single-Instance Socket.IO Realtime Engine
- **Condition:** Seat status broadcasts (`seats:update`) and client room subscriptions are managed directly by the in-memory Socket.IO instance attached to the Express HTTP server.
- **Limitation:** Horizontal scaling across multiple independent server processes or serverless functions would require an external message broker (such as `@socket.io/redis-adapter` or RabbitMQ).
- **Graceful Fallback:** If WebSocket transport is unavailable or blocked by network firewalls, the client seat map automatically falls back to HTTP polling every 15 seconds.

### C. Demonstration Payment Gateway
- **Condition:** The checkout flow simulates payment verification to allow testing of both successful tickets and payment declines.
- **Limitation:** No real payment processor (Stripe, Razorpay, PayPal) is integrated.
- **Security Invariant:** No real credit card, CVV, or banking details are collected, stored, or transmitted. The application is completely isolated from PCI-DSS scope.

### D. Booking and Schedule Immutability Rules
- **Condition:** Once a show has accumulated customer reservations or booking history, structural parameters (the movie, theater, screen, or start time) cannot be altered.
- **Rationale:** Preserves audit trail integrity and prevents invalidating confirmed customer tickets. Price changes on scheduled shows affect available seats only; existing confirmed and held tickets preserve their original price snapshot.
- **Limitation:** Entire show cancellation (e.g., in the event of projector failure) requires individual booking cancellations rather than a mass automated refund cascade.

### E. Seed Safety and Boundary Logic
- **Condition:** Future show generation tops up the schedule up to `SEED_SHOW_DAYS` (default 21 days; 7 days in demo runner).
- **Invariant:** The seeder enforces a 15-minute cleaning buffer between shows and strictly rejects scheduling any movie prior to its official release date.

