// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAm8qT1eboC9e7qgVi2v0HpfRvIqzY-fck",
  authDomain: "manara-academy-4ec08.firebaseapp.com",
  projectId: "manara-academy-4ec08",
  storageBucket: "manara-academy-4ec08.firebasestorage.app",
  messagingSenderId: "641540215231",
  appId: "1:641540215231:web:93cb1b7af2b3f7c293110a",
  measurementId: "G-69KFVL3ZSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;