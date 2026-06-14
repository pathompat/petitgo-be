# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local development (NestJS HTTP server on port 3000)
npm run start:dev

# Build
npm run build

# Lint (also runs as predeploy step)
npm run lint

# Test
npm run test                  # all unit tests
npm run test:watch            # watch mode
npm run test -- --testPathPattern=bigseller  # single test file

# Firebase emulator (requires build first)
npm run serve

# Deploy Cloud Functions
npm run deploy
```

## Architecture

This project has **two entry points** that share the same NestJS `AppModule`:

- **`src/main.ts`** — standard NestJS HTTP server, used for local development
- **`index.ts`** (project root) — Firebase Cloud Functions v2 entry point (`exports.api`), used in production

`src/firebase.ts` initializes Firebase Admin SDK once (guarded against double-init for the Cloud Functions case where `index.ts` calls `initializeApp()` first). It exports `adminAuth` and `adminDb` for use across services.

## Auth Flow

`JwtAuthGuard` is registered globally via `APP_GUARD` in `AppModule`, so **all routes require a JWT by default**. Mark public routes with the `@Public()` decorator.

Login flow (`POST /auth/login`):
1. Client sends a Firebase ID token (obtained from Google Sign-In on the frontend)
2. `AuthService.loginWithFirebaseToken` verifies it with Firebase Admin
3. Looks up the user in the Firestore `users` collection by `uid`
4. Issues our own JWT (7-day expiry) containing `{ uid, username, role }`

The old `AuthMiddleware` (header API key via `passport-headerapikey`) is superseded by JWT and is no longer wired up.

## Modules

- **`AuthModule`** — global module; exports `JwtModule` and `JwtAuthGuard` for use anywhere
- **`ProductsModule`** — CRUD against Firestore `products` collection; `GET /products` merges Firestore data with live Bigseller data
- **`BigsellerModule`** — proxies requests to the Bigseller API using a cookie stored in Firestore `cookies` collection; `GET /bigseller/cookie` updates that cookie
- **`SlipsModule`** — accounting slip uploads against Firestore `slips` collection. `POST /slip/upload` stores the image in Firebase Storage under `slip/{yyyy}/{mm}/` and returns a tokenized download URL; `POST /slip` creates a log entry; `GET /slip` lists logs. `total_amount` and all other fields are supplied **manually** in the request body (there is no QR scanning — a Thai transfer-slip QR carries the sending bank + transaction reference but not the amount, and decoding full-resolution phone photos server-side was OOM-prone). After the slip is saved, if `DISCORD_SLIP_WEBHOOK_URL` is set, the description is posted to that Discord channel with the slip image attached as a photo (via the webhook's multipart form). The post is awaited but never fails the request.

## Environment Variables

Required in `.env` for local dev (Cloud Functions reads these from Firebase runtime config):

| Variable | Purpose |
|---|---|
| `FB_PROJECT_ID` | Firebase Admin init (local dev only — Cloud Functions uses ADC) |
| `FB_CLIENT_EMAIL` | Firebase Admin init (local dev only) |
| `FB_PRIVATE_KEY` | Firebase Admin init (local dev only, newlines as `\n`) |
| `FB_STORAGE_BUCKET` | Cloud Storage bucket for slip uploads (optional; defaults to `<projectId>.appspot.com`) |
| `DISCORD_SLIP_WEBHOOK_URL` | Discord Incoming Webhook URL; when set, each created slip is posted there (description + image). Optional — notifications are skipped if unset. |
| `BIGSELLER_COOKIE` | Auth cookie for Bigseller API calls |
| `API_KEY` | Legacy API key (no longer actively used) |
| `JWT_SECRET` | Signs/verifies app JWTs |
