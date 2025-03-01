// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";

import { initializeApp, getApps } from "firebase/app";
//import { firebaseConfig } from "./config";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDak0XH1Fu6N8a21zyUZm2BbpOuajZST4s",
  authDomain: "arumstore-inventory.firebaseapp.com",
  projectId: "arumstore-inventory",
  storageBucket: "arumstore-inventory.firebasestorage.app",
  messagingSenderId: "1049773607158",
  appId: "1:1049773607158:web:508a5d0d32bf60163ac4d7",
  measurementId: "G-BPJSSK3SX0"
};

// Initialize Firebase
export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
// export const auth = getAuth(firebaseApp);
// export const db = getFirestore(firebaseApp);
// export const storage = getStorage(firebaseApp);