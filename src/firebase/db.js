import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, getDocs, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

// ── USER PROFILE ──────────────────────────────────────────────────
export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

// ── MODULES ───────────────────────────────────────────────────────
export async function getModules(uid) {
  const q = query(collection(db, 'users', uid, 'modules'), orderBy('createdAt'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addModule(uid, mod) {
  return await addDoc(collection(db, 'users', uid, 'modules'), {
    ...mod, createdAt: serverTimestamp()
  });
}

export async function updateModule(uid, modId, data) {
  await updateDoc(doc(db, 'users', uid, 'modules', modId), data);
}

export async function deleteModule(uid, modId) {
  await deleteDoc(doc(db, 'users', uid, 'modules', modId));
}

// ── TRACKER PROGRESS ──────────────────────────────────────────────
export async function getProgress(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'meta', 'progress'));
  return snap.exists() ? snap.data() : { tasks: {}, sessions: {}, lastReset: '' };
}

export async function saveProgress(uid, data) {
  await setDoc(doc(db, 'users', uid, 'meta', 'progress'), data, { merge: true });
}

// ── STUDY LOG ─────────────────────────────────────────────────────
export async function getLogs(uid) {
  const q = query(collection(db, 'users', uid, 'logs'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addLog(uid, entry) {
  return await addDoc(collection(db, 'users', uid, 'logs'), {
    ...entry, date: serverTimestamp()
  });
}

export async function deleteLog(uid, logId) {
  await deleteDoc(doc(db, 'users', uid, 'logs', logId));
}

// ── PUBLIC PROFILE (share link) ───────────────────────────────────
export async function getPublicProfile(uid) {
  const snap = await getDoc(doc(db, 'public', uid));
  return snap.exists() ? snap.data() : null;
}

export async function updatePublicProfile(uid, data) {
  await setDoc(doc(db, 'public', uid), data, { merge: true });
}
