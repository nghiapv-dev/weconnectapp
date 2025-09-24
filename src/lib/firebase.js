import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "chat-app-5209e.firebaseapp.com",
  projectId: "chat-app-5209e",
  storageBucket: "chat-app-5209e.firebasestorage.app",
  messagingSenderId: "1070334476440",
  appId: "1:1070334476440:web:95b11a55fcf922939e90ed",
  measurementId: "G-L6G76BM885",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);
