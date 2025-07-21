// lib/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // <--- ADD THIS LINE

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDgv9Dywk_Hmf-X0qeftWvPasWGy1QCGaY", // Your actual API Key
  authDomain: "athlinq-5f395.firebaseapp.com",
  projectId: "athlinq-5f395",
  storageBucket: "athlinq-5f395.firebasestorage.app",
  messagingSenderId: "910085081545",
  appId: "1:910085081545:web:09f96154a81e01270d4018",
  measurementId: "G-PPQ8YMW020" // You might not have this if you didn't enable Analytics. Keep it if it's in your console config.
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // <--- ADD THIS LINE

export { app, auth, db }; // <--- EXPORT 'db'