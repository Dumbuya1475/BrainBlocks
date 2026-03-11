import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, provider);
    await saveProfile(result.user.uid, {
      displayName: result.user.displayName,
      email:       result.user.email,
      photoURL:    result.user.photoURL,
      uid:         result.user.uid,
    });
    return result.user;
  }

  async function loginWithEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  }

  async function registerWithEmail(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await saveProfile(result.user.uid, {
      displayName: name,
      email,
      uid: result.user.uid,
    });
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
