import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, provider } from '../firebase/config';
import { saveProfile } from '../firebase/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  async function syncProfileSafe(firebaseUser, fallbackName) {
    if (!firebaseUser?.uid) return;
    try {
      await saveProfile(firebaseUser.uid, {
        displayName: firebaseUser.displayName || fallbackName || 'StudyHub User',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || '',
        uid: firebaseUser.uid,
      });
    } catch (e) {
      console.warn('Profile sync failed:', e?.code || e?.message || e);
    }
  }

  useEffect(() => {
    getRedirectResult(auth)
      .then(async result => {
        if (!result?.user) return;
        await syncProfileSafe(result.user);
      })
      .catch(() => {});

    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, provider);
      await syncProfileSafe(result.user);
      return result.user;
    } catch (e) {
      const shouldFallbackToRedirect = [
        'auth/popup-blocked',
        'auth/cancelled-popup-request',
        'auth/operation-not-supported-in-this-environment',
      ].includes(e?.code);

      if (shouldFallbackToRedirect) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw e;
    }
  }

  async function loginWithEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  }

  async function registerWithEmail(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await syncProfileSafe({ ...result.user, displayName: name }, name);
    return result.user;
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
