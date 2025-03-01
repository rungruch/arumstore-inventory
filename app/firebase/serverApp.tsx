// enforces that this code can only be called on the server
// https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment
import "server-only";

import { headers } from "next/headers";
import { initializeServerApp } from "firebase/app";

import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyDak0XH1Fu6N8a21zyUZm2BbpOuajZST4s",
  authDomain: "arumstore-inventory.firebaseapp.com",
  projectId: "arumstore-inventory",
  storageBucket: "arumstore-inventory.firebasestorage.app",
  messagingSenderId: "1049773607158",
  appId: "1:1049773607158:web:508a5d0d32bf60163ac4d7",
  measurementId: "G-BPJSSK3SX0"
};

export async function getAuthenticatedAppForUser() {
  const idToken = (await headers()).get("Authorization")?.split("Bearer ")[1];
  
  console.log('firebaseConfig', JSON.stringify(firebaseConfig));
  const firebaseServerApp = initializeServerApp(
    firebaseConfig,
    idToken
      ? {
          authIdToken: idToken,
        }
      : {}
  );

  const auth = getAuth(firebaseServerApp);
  await auth.authStateReady();

  return { firebaseServerApp, currentUser: auth.currentUser };
}