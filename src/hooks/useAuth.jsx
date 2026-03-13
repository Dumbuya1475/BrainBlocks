import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  linkWithCredential,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, provider } from '../firebase/config';
import { saveProfile } from '../firebase/db';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const AuthContext = createContext(null);
let pendingGoogleCredential = null;
let pendingGoogleEmail = '';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  async function syncProfileSafe(firebaseUser, fallbackName) {
    if (!firebaseUser?.uid) return;
    try {
      await saveProfile(firebaseUser.uid, {
        displayName: firebaseUser.displayName || fallbackName || 'BrainBlocks User',
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
    if (Capacitor.isNativePlatform()) {
      try {
        const nativeResult = await FirebaseAuthentication.signInWithGoogle();
        const idToken = nativeResult?.credential?.idToken || null;
        const accessToken = nativeResult?.credential?.accessToken || null;

        if (!idToken && !accessToken) {
          const err = new Error('Native Google sign-in returned no credential token.');
          err.code = 'auth/native-google-no-token';
          throw err;
        }

        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        const result = await signInWithCredential(auth, credential);
        await syncProfileSafe(result.user);
        return result.user;
      } catch (e) {
        if (e?.code === 'auth/account-exists-with-different-credential') {
          pendingGoogleCredential = GoogleAuthProvider.credential(
            e?.credential?.idToken || null,
            e?.credential?.accessToken || null
          );
          pendingGoogleEmail = String(e?.customData?.email || '').toLowerCase();
          const err = new Error('Use your existing email/password once to link Google sign-in to this account.');
          err.code = 'auth/google-needs-password-link';
          throw err;
        }
        const err = new Error(e?.message || 'Native Google sign-in failed.');
        err.code = e?.code || 'auth/native-google-failed';
        throw err;
      }
    }

    try {
      const result = await signInWithPopup(auth, provider);
      pendingGoogleCredential = null;
      pendingGoogleEmail = '';
      await syncProfileSafe(result.user);
      return result.user;
    } catch (e) {
      if (e?.code === 'auth/account-exists-with-different-credential') {
        pendingGoogleCredential = GoogleAuthProvider.credentialFromError(e);
        pendingGoogleEmail = String(e?.customData?.email || '').toLowerCase();
        const err = new Error('Use your existing email/password once to link Google sign-in to this account.');
        err.code = 'auth/google-needs-password-link';
        throw err;
      }

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
    const result = await signInWithEmailAndPassword(auth, email, password);

    const normalizedEmail = String(email || '').toLowerCase();
    const shouldLinkPendingGoogle = Boolean(
      pendingGoogleCredential &&
      (!pendingGoogleEmail || pendingGoogleEmail === normalizedEmail)
    );

    if (shouldLinkPendingGoogle && result?.user) {
      try {
        await linkWithCredential(result.user, pendingGoogleCredential);
      } catch (e) {
        const linkCode = e?.code || '';
        const safeToIgnore = [
          'auth/provider-already-linked',
          'auth/credential-already-in-use',
          'auth/email-already-in-use',
        ].includes(linkCode);

        if (!safeToIgnore) {
          const err = new Error(e?.message || 'Failed to link Google sign-in to this account.');
          err.code = linkCode || 'auth/google-link-failed';
          throw err;
        }
      } finally {
        pendingGoogleCredential = null;
        pendingGoogleEmail = '';
      }
    }

    await syncProfileSafe(result.user);
    return result.user;
  }

  async function registerWithEmail(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await syncProfileSafe({ ...result.user, displayName: name }, name);
    return result.user;
  }

  async function logout() {
    pendingGoogleCredential = null;
    pendingGoogleEmail = '';
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
