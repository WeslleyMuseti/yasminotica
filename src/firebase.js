import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager, 
  getFirestore 
} from "firebase/firestore";
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

// Remove apenas se o snapshot exceder o limite seguro (> 1.5MB) para evitar QuotaExceededError
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const raw = localStorage.getItem('YASMIN_OFFLINE_DATA_BACKUP');
    if (raw && raw.length > 1500000) {
      localStorage.removeItem('YASMIN_OFFLINE_DATA_BACKUP');
    }
  } catch (e) {}
}

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
  app = initializeApp(firebaseConfig);
  
  // 🛡️ PERSISTÊNCIA EM INDEXEDDB VIA persistentSingleTabManager:
  // Usa EXCLUSIVAMENTE o IndexedDB (com capacidade de Gigabytes), eliminando por completo
  // o risco de QuotaExceededError (5MB) e ASSERTION FAILED do WebStorage.
  // Permite sincronização instantânea em tempo real com o Firebase da Google.
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager()
      })
    });
  } catch (err) {
    console.warn("Aviso ao ativar cache persistente do Firestore, usando fallback padrão:", err);
    try {
      db = getFirestore(app);
    } catch (fallbackErr) {
      console.warn("Aviso no fallback do Firestore:", fallbackErr);
    }
  }

  try {
    auth = getAuth(app);
  } catch (err) {
    console.warn("Aviso ao inicializar Firebase Auth:", err);
  }
  isConfigured = true;
}

export { app, db, auth, isConfigured };
