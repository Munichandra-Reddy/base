import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAFJCJ5JqYohhGXxn7XmPtxyaWZpMiaR3k",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "workorbit-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "workorbit-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "workorbit-app.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "850265976443",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:850265976443:web:3f9b4d1d840246c24d7cde",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-SZW1VETMQQ",
};

// Initialize Firebase app singleton safely across SSR and Client
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect transport and multi-tab cache
let firestoreDb: ReturnType<typeof getFirestore>;
if (typeof window !== 'undefined') {
  try {
    setLogLevel('silent');
  } catch {}

  try {
    firestoreDb = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    try {
      firestoreDb = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      });
    } catch {
      firestoreDb = getFirestore(app);
    }
  }
} else {
  firestoreDb = getFirestore(app);
}

// Initialize Auth without popupRedirectResolver to prevent injecting iframe.js and CONFIGURATION_NOT_FOUND errors
let authInstance: Auth;
if (typeof window !== 'undefined') {
  try {
    authInstance = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
    });
  } catch {
    authInstance = getAuth(app);
  }
} else {
  authInstance = getAuth(app);
}

export const db = firestoreDb;
export const auth = authInstance;
export default app;
