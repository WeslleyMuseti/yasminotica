import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
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

// Limpeza preventiva de chaves corrompidas de mutações do Firestore no WebStorage
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('firestore_mutations') || k.startsWith('firestore_clients') || k === 'YASMIN_OFFLINE_DATA_BACKUP')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
  app = initializeApp(firebaseConfig);
  
  // 🛡️ MODO OFFLINE / CONTINGÊNCIA: Ativa persistência IndexedDB multi-aba
  // Garante que todo o sistema (clientes, produtos, vendas, OS e caixa) funcione
  // perfeitamente mesmo sem internet, salvando no disco e sincronizando ao reconectar.
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
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
