import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBkK6RmHqSU9rivBUJ2sJ5VVqFgCoOBmso",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "wendex-7438c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "wendex-7438c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "wendex-7438c.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "682166033434",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:682166033434:web:f29e18b1b8f94170029498"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;