import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import config from '../firebase-applet-config.json';

let app;
let db: any = null;
let auth: any = null;
let isFirebaseAvailable = false;

try {
  if (config && config.apiKey && config.apiKey !== 'mock-api-key') {
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseAvailable = true;
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

export { db, auth, isFirebaseAvailable };
export default config;
