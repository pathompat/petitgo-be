import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Mirror of petitgo-fe/src/firebase.js — one init, shared exports.
// Cloud Functions (index.ts) calls initializeApp() first; the guard below
// prevents double-init. For local dev (src/main.ts), this block runs first
// and reads credentials from .env via ConfigModule / process.env.
if (!getApps().length) {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    // Local dev: explicit service account credentials from .env
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  } else {
    // Cloud Functions runtime & CI deploy: use Application Default Credentials
    initializeApp()
  }
}

export const adminAuth = getAuth()
export const adminDb = getFirestore()
