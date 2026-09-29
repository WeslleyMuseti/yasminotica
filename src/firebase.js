import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBTWtMcNnRT1ljm1hH3G7x1-FVQi3MrjAs",
  authDomain: "projeto-carla-431bc.firebaseapp.com",
  projectId: "projeto-carla-431bc",
  storageBucket: "projeto-carla-431bc.firebasestorage.app",
  messagingSenderId: "445458889894",
  appId: "1:445458889894:web:fc8ab3dc83bdf4202b0867",
  measurementId: "G-V4CC3CSSDK"
};

let app = null;
let db = null;
let auth = null;
let isConfigured = false;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  try {
    auth = getAuth(app);
  } catch (err) {
    console.warn("Aviso ao inicializar Firebase Auth:", err);
  }
  isConfigured = true;
}

export { app, db, auth, isConfigured };

