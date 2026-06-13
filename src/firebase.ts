import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

// Mirror of petitgo-fe/src/firebase.js — one init, shared exports.
// Cloud Functions (index.ts) calls initializeApp() first; the guard below
// prevents double-init. For local dev (src/main.ts), this block runs first
// and reads credentials from .env via ConfigModule / process.env.
if (!getApps().length) {
  if (
    process.env.FB_PROJECT_ID &&
    process.env.FB_CLIENT_EMAIL &&
    process.env.FB_PRIVATE_KEY
  ) {
    // Local dev: explicit service account credentials from .env
    initializeApp({
      credential: cert({
        projectId: process.env.FB_PROJECT_ID,
        clientEmail: process.env.FB_CLIENT_EMAIL,
        privateKey: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  } else {
    // Cloud Functions runtime & CI deploy: use Application Default Credentials
    initializeApp()
  }
}

export const adminAuth = getAuth()
export const adminDb = getFirestore()

// Cloud Storage bucket. The bucket name is resolved explicitly so it works in
// both local dev (cert init, no default bucket) and Cloud Functions (ADC init).
const projectId =
  process.env.FB_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  'pet-it-go'
export const adminBucketName =
  process.env.FB_STORAGE_BUCKET || `${projectId}.appspot.com`
export const adminBucket = getStorage().bucket(adminBucketName)
