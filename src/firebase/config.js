// ─────────────────────────────────────────────────────────────────
//  STEP 1: Go to https://console.firebase.google.com
//  STEP 2: Create a project → Add a Web App → Copy the config below
//  STEP 3: Replace every value below with your own Firebase config
// ─────────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
 apiKey: "AIzaSyA2vaXFUezYtOsKKhTltWEp2uL5NuCBVVI",
  authDomain: "brainblocks-e3e01.firebaseapp.com",
  databaseURL: "https://brainblocks-e3e01-default-rtdb.firebaseio.com",
  projectId: "brainblocks-e3e01",
  storageBucket: "brainblocks-e3e01.firebasestorage.app",
  messagingSenderId: "129015662920",
  appId: "1:129015662920:web:ed6884beae456d5d808b7d",
  measurementId: "G-LFEC9N2M4B"
};

const app  = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const provider = new GoogleAuthProvider();
