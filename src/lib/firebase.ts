import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";

// Direct loading of Firebase configurations from the provisioned config file
const firebaseConfig = {
  apiKey: "AIzaSyAI2RTMVcclJkxDhGNjBJAWhEmZCf22fKs",
  authDomain: "academic-transducer-s8t0d.firebaseapp.com",
  projectId: "academic-transducer-s8t0d",
  storageBucket: "academic-transducer-s8t0d.firebasestorage.app",
  messagingSenderId: "703730099531",
  appId: "1:703730099531:web:af099caa21c98a6e2634ce"
};

// Singleton initialization pattern
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Enforce Google Account Picker to open on every sign-in attempt
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
};
