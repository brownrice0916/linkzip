import { initializeApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from "firebase/storage";
import { useStore } from '../store/useStore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgMYuiKL_b0Z_f7APE32GArBR3PxVv8d0",
  authDomain: "linkzip.kr",
  projectId: "profilelinks-d81ec",
  storageBucket: "profilelinks-d81ec.firebasestorage.app",
  messagingSenderId: "648530645305",
  appId: "1:648530645305:web:919392cf9c7e054af418e8",
  measurementId: "G-LGZDC4Q4FB"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
// Force Google to always show account selector modal instead of auto-logging in with cached session
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const GOOGLE_REDIRECT_PENDING_KEY = 'linkzip_google_redirect_pending';
export const EMAIL_SIGNUP_PENDING_KEY = 'linkzip_email_signup_pending';

const shouldUseGoogleRedirect = () => {
  if (typeof window === 'undefined') return false;

  const mobileUserAgent = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  const compactViewport = window.matchMedia?.('(max-width: 767px)').matches ?? false;
  return mobileUserAgent || compactViewport;
};

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    // Mobile browsers frequently turn Firebase popups into a separate browser
    // tab/window. Redirect auth keeps the flow in the current tab instead.
    if (shouldUseGoogleRedirect()) {
      sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const finishGoogleRedirectLogin = async (): Promise<User | null> => {
  if (
    typeof window === 'undefined' ||
    sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) !== '1'
  ) {
    return null;
  }

  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? auth.currentUser;
  } finally {
    sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
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
