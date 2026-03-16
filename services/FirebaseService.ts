import * as admin from 'firebase-admin';

let initialized = false;

export const initFirebase = () => {
  if (initialized) return;

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!process.env.FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.warn('[Firebase] Missing credentials, push notifications disabled');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });

    initialized = true;
    console.log('✅ Firebase Admin initialized');
  } catch (err: any) {
    console.error('[Firebase] Init error:', err.message);
  }
};

export const getFirebaseAdmin = () => {
  if (!initialized) return null;
  return admin;
};
