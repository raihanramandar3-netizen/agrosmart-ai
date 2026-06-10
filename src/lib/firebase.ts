import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithCredential,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Enable persistence for mobile apps to prevent losing login state
setPersistence(auth, browserLocalPersistence);

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      console.log("Trying native Google Sign-In (Legacy Picker)...");
      // Disable Credential Manager to force the standard Google Account Picker dialog
      // This prevents the 'No credentials available' error and allows adding accounts
      const result = await FirebaseAuthentication.signInWithGoogle({
        useCredentialManager: false,
      });
      
      // CRITICAL STEP: Sync the native credential with the Firebase JS SDK
      // Native SDK logs in successfully, but JS SDK needs the token to update AuthContext
      if (result.credential?.idToken) {
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        await signInWithCredential(auth, credential);
      } else {
        throw new Error("No ID Token received from Google");
      }

      console.log("Native sign-in success:", result.user?.email);
      return result;
    } catch (nativeError: any) {
      console.warn("Native sign-in failed:", nativeError.message);
      
      // User cancelled
      if (nativeError.message?.includes('cancel') || 
          nativeError.message?.includes('The user canceled') ||
          nativeError.message?.includes('CANCELED')) {
        return null;
      }
      
      // Show explicit error for Android
      alert("Gagal Login Google: " + (nativeError.message || "Pastikan ada akun Google di HP ini."));
      throw nativeError;
    }
  }
  
  // WEB/DESKTOP ONLY: Use standard popup
  try {
    console.log("Web platform: using popup sign-in...");
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Auth Error:", error);
    if (error.code === 'auth/popup-closed-by-user') return null;
    alert("Gagal Login: " + (error.message || "Kesalahan tidak dikenal."));
    throw error;
  }
};

// No longer needed — native plugin handles everything
export const checkRedirectResult = async () => null;

export const logout = async () => {
  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut();
  }
  return signOut(auth);
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
