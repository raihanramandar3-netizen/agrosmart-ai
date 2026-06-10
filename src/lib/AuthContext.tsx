import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'user';
  photoURL?: string | null;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = undefined;
        }

        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          
          unsubscribeUserDoc = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const currentData = docSnap.data() as UserData;
              const isTargetAdmin = user.email?.toLowerCase() === 'raihanramanda644@gmail.com';
              let needsUpdate = false;
              const updates: any = {};
              
              if (isTargetAdmin && currentData.role !== 'admin') {
                updates.role = 'admin';
                needsUpdate = true;
              }

              // Sync photoURL if missing from doc but present in Auth
              if (!currentData.photoURL && user.photoURL) {
                updates.photoURL = user.photoURL;
                needsUpdate = true;
              }
              
              if (needsUpdate) {
                try {
                  await setDoc(userDocRef, updates, { merge: true });
                } catch (err) {
                  console.error("Failed to sync user doc:", err);
                }
              }
              setUserData({ ...currentData, ...updates });
            } else {
              const isTargetAdmin = user.email?.toLowerCase() === 'raihanramanda644@gmail.com';
              const role: 'admin' | 'user' = isTargetAdmin ? 'admin' : 'user';
              const newUserData: UserData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Petani Indonesia',
                role: role,
                photoURL: user.photoURL,
              };
              try {
                await setDoc(userDocRef, newUserData);
                setUserData(newUserData);
              } catch (err) {
                console.error("Failed to create user doc:", err);
              }
            }
            setLoading(false);
          }, (err) => {
            console.error("User doc snapshot error:", err);
            setLoading(false);
          });
        } else {
          setUserData(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  const value = {
    user,
    userData,
    loading,
    isAdmin: userData?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
