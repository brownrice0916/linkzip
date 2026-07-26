import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { useStore } from '../store/useStore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgMYuiKL_b0Z_f7APE32GArBR3PxVv8d0",
  authDomain: "profilelinks-d81ec.firebaseapp.com",
  projectId: "profilelinks-d81ec",
  storageBucket: "profilelinks-d81ec.firebasestorage.app",
  messagingSenderId: "648530645305",
  appId: "1:648530645305:web:919392cf9c7e054af418e8",
  measurementId: "G-LGZDC4Q4FB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
// Force Google to always show account selector modal instead of auto-logging in with cached session
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    useStore.getState().setUser(null);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
