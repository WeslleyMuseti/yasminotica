import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  runTransaction, 
  increment, 
  updateDoc, 
  getDoc 
} from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "./firebase.js";

// Nome das coleções sincronizadas
const COLLECTIONS = [
  'CLIENTES_CADASTRADOS',
  'Registro_Vendas',
  'CAD_LENTES',
  'CAD_ARMACOES',
  'CAD_BRINDES',
  'CONTAS_PAGAR',
  'CONTAS_RECEBER',
  'USUARIOS',
  'DELETED_ITEMS',
  'FLUXO_CAIXA',
  'TRANSFERENCIAS_ESTOQUE',
  'VOUCHERS'
];

/**
 * Escuta todas as coleções do Firestore em tempo real
 */
export const subscribeToCollections = (onDataUpdate) => {
  if (!db) return () => {};

  const unsubscribes = [];
  const state = {};

  COLLECTIONS.forEach(colName => {
    state[colName] = [];
    const colRef = collection(db, colName);
    
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const docs = [];
      snapshot.forEach(docSnap => {
        docs.push({ id: docSnap.id, ...docSnap.data() });
      });
      state[colName] = docs;
      onDataUpdate({ ...state });
    }, (error) => {
      console.warn(`Aviso ao escutar coleção ${colName}:`, error);
    });
    
    unsubscribes.push(unsubscribe);
  });

  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
};

// ══════════════════════════════════════════════════════════════════
// 0. GERENCIADOR DE FILA OFFLINE & CONTINGÊNCIA (OFFLINE-FIRST)
// ══════════════════════════════════════════════════════════════════
export const OFFLINE_QUEUE_KEY = 'YASMIN_OFFLINE_SYNC_QUEUE';
export const OFFLINE_BACKUP_KEY = 'YASMIN_OFFLINE_DATA_BACKUP';

export const getOfflineQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const enqueueOfflineOp = (type, collectionName, id, data) => {
  try {
    const queue = getOfflineQueue();
    const op = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type, // 'save', 'delete', 'decrement_stock'
      collectionName,
      docId: String(id),
      data
    };
    queue.push(op);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    notifySyncStatus(queue.length);
    return op;
  } catch (e) {
    console.warn('Erro ao enfileirar operação offline:', e);
  }
};

export const clearOfflineQueue = () => {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    notifySyncStatus(0);
  } catch {}
};

export const notifySyncStatus = (pendingCount) => {
  if (typeof window !== 'undefined') {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    window.dispatchEvent(new CustomEvent('yasmin-sync-status', {
      detail: { pendingCount, isOnline }
    }));
  }
};

export const processOfflineQueue = async () => {
  if (!db || (typeof navigator !== 'undefined' && !navigator.onLine)) return 0;
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    notifySyncStatus(0);
    return 0;
  }

  const remaining = [];
  let processed = 0;

  for (const op of queue) {
    try {
      if (op.type === 'save') {
        const docRef = doc(db, op.collectionName, op.docId);
        await setDoc(docRef, op.data, { merge: true });
        processed++;
      } else if (op.type === 'delete') {
        const docRef = doc(db, op.collectionName, op.docId);
        await deleteDoc(docRef);
        processed++;
      } else if (op.type === 'decrement_stock') {
        const docRef = doc(db, op.collectionName, op.docId);
        await updateDoc(docRef, {
          ESTOQUE: increment(-op.data.quantity),
          updatedAt: new Date().toISOString()
        });
        processed++;
      }
    } catch (err) {
      console.warn(`[Sync Offline] Falha ao sincronizar item pendente ${op.collectionName}/${op.docId}:`, err);
      remaining.push(op);
    }
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  notifySyncStatus(remaining.length);

  if (processed > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('yasmin-sync-finished', {
      detail: { processedCount: processed, remainingCount: remaining.length }
    }));
  }
  return processed;
};

export const saveOfflineSnapshot = (dataObj) => {
  if (!dataObj || typeof dataObj !== 'object') return;
  try {
    localStorage.setItem(OFFLINE_BACKUP_KEY, JSON.stringify(dataObj));
  } catch (e) {
    console.warn('Aviso ao salvar snapshot offline no localStorage:', e);
  }
};

export const loadOfflineSnapshot = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

// Auto-processa quando o navegador detecta retorno de conexão
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processOfflineQueue();
  });
}

/**
 * Salva ou atualiza um documento no Firestore (com suporte offline automático)
 */
export const saveDocument = async (collectionName, dataObj, customId = null) => {
  if (!dataObj) return;
  const id = String(customId || dataObj.id || dataObj['_id'] || (Date.now().toString() + Math.random().toString(36).substring(2, 9)));
  
  const cleanData = { ...dataObj };
  delete cleanData._id;
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) cleanData[key] = null;
  });

  if (db) {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, cleanData, { merge: true });
    } catch (err) {
      console.warn(`[Modo Offline] Documento ${collectionName}/${id} salvo no cache local e enfileirado:`, err);
      enqueueOfflineOp('save', collectionName, id, cleanData);
    }
  } else {
    enqueueOfflineOp('save', collectionName, id, cleanData);
  }
  return id;
};

/**
 * Exclui um documento do Firestore (com suporte offline automático)
 */
export const deleteDocument = async (collectionName, id) => {
  if (!id) return;
  const docId = String(id);
  if (db) {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`[Modo Offline] Exclusão de ${collectionName}/${docId} registrada na fila offline:`, err);
      enqueueOfflineOp('delete', collectionName, docId, null);
    }
  } else {
    enqueueOfflineOp('delete', collectionName, docId, null);
  }
};

/**
 * Busca documento específico de um usuário pelo login de forma segura (sem vazar a coleção inteira)
 */
export const fetchUserDocument = async (username) => {
  if (!db || !username) return null;
  try {
    const cleanUser = String(username).toLowerCase().trim();
    const docRef = doc(db, 'USUARIOS', cleanUser);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (err) {
    console.warn('Aviso ao buscar usuário para autenticação:', err);
    return null;
  }
};

// ══════════════════════════════════════════════════════════════════
// 1. TRANSAÇÕES ATÔMICAS DE ESTOQUE (CONCORRÊNCIA MULTILOJA)
// ══════════════════════════════════════════════════════════════════

/**
 * Baixa atômica de estoque no Firestore utilizando runTransaction
 * Evita concorrência e venda duplicada do mesmo produto por duas lojas/abas.
 */
export const decrementStockAtomically = async (collectionName, docId, quantity = 1) => {
  if (!db || !docId) {
    return { success: false, reason: 'db_or_id_missing' };
  }

  const id = String(docId);
  const docRef = doc(db, collectionName, id);
  const qtyToSubtract = Math.max(1, parseInt(quantity, 10) || 1);

  try {
    const transactionResult = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Doc ${id} não existe no Firestore`);
      }

      const data = docSnap.data();
      const currentStock = parseInt(
        data.ESTOQUE !== undefined ? data.ESTOQUE : (data['EM ESTOQUE'] !== undefined ? data['EM ESTOQUE'] : (data.estoque || 0)),
        10
      ) || 0;

      if (currentStock < qtyToSubtract) {
        const err = new Error(`Estoque insuficiente: atual (${currentStock}) menor que o solicitado (${qtyToSubtract})`);
        err.code = 'INSUFFICIENT_STOCK';
        err.currentStock = currentStock;
        throw err;
      }

      const newStock = Math.max(0, currentStock - qtyToSubtract);

      const updateData = {
        ESTOQUE: newStock,
        updatedAt: new Date().toISOString()
      };

      if (data['EM ESTOQUE'] !== undefined) {
        updateData['EM ESTOQUE'] = newStock;
      }
      if (data['estoque'] !== undefined) {
        updateData['estoque'] = newStock;
      }

      transaction.update(docRef, updateData);
      return { success: true, previousStock: currentStock, newStock };
    });

    return transactionResult;
  } catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK') {
      console.warn(`Estoque insuficiente para ${collectionName}/${id}:`, err.message);
      return { success: false, reason: 'insufficient_stock', currentStock: err.currentStock, error: err };
    }

    console.warn(`Transação atômica falhou para ${collectionName}/${id}, aplicando fallback com increment():`, err);
    try {
      await updateDoc(docRef, {
        ESTOQUE: increment(-qtyToSubtract),
        updatedAt: new Date().toISOString()
      });
      return { success: true, fallback: true };
    } catch (fallbackErr) {
      console.warn(`[Modo Offline] Fallback no Firestore falhou para ${collectionName}/${id}, registrando decremento na fila offline:`, fallbackErr);
      enqueueOfflineOp('decrement_stock', collectionName, id, { quantity: qtyToSubtract });
      return { success: true, offlineQueue: true };
    }
  }
};

/**
 * Incremento atômico de estoque no Firestore
 */
export const incrementStockAtomically = async (collectionName, docId, quantity = 1) => {
  if (!db || !docId) return { success: false };
  const id = String(docId);
  const docRef = doc(db, collectionName, id);
  const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

  try {
    const res = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Doc ${id} não existe`);
      }
      const data = docSnap.data();
      const currentStock = parseInt(data.ESTOQUE ?? data['EM ESTOQUE'] ?? data.estoque ?? 0, 10);
      const newStock = currentStock + qtyToAdd;

      const updateData = {
        ESTOQUE: newStock,
        updatedAt: new Date().toISOString()
      };
      if (data['EM ESTOQUE'] !== undefined) updateData['EM ESTOQUE'] = newStock;
      if (data['estoque'] !== undefined) updateData['estoque'] = newStock;

      transaction.update(docRef, updateData);
      return { success: true, previousStock: currentStock, newStock };
    });
    return res;
  } catch (err) {
    try {
      await updateDoc(docRef, {
        ESTOQUE: increment(qtyToAdd),
        updatedAt: new Date().toISOString()
      });
      return { success: true, fallback: true };
    } catch (e) {
      return { success: false, error: e };
    }
  }
};

/**
 * Transferência atômica entre dois itens de estoque (Origem -> Destino)
 */
export const transferStockAtomically = async (collectionName, originDocId, destDocId, quantity = 1) => {
  if (!db || !originDocId) return { success: false };
  const originRef = doc(db, collectionName, String(originDocId));
  const destRef = destDocId ? doc(db, collectionName, String(destDocId)) : null;
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  try {
    await runTransaction(db, async (transaction) => {
      const originSnap = await transaction.get(originRef);
      if (!originSnap.exists()) throw new Error('Origem não encontrada');

      const originData = originSnap.data();
      const origStock = parseInt(originData.ESTOQUE ?? originData['EM ESTOQUE'] ?? originData.estoque ?? 0, 10);
      if (origStock < qty) {
        const err = new Error(`Estoque insuficiente na origem: ${origStock} < ${qty}`);
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
      }
      const newOrigStock = origStock - qty;

      transaction.update(originRef, {
        ESTOQUE: newOrigStock,
        ...(originData['EM ESTOQUE'] !== undefined ? { 'EM ESTOQUE': newOrigStock } : {}),
        ...(originData.estoque !== undefined ? { estoque: newOrigStock } : {}),
        updatedAt: new Date().toISOString()
      });

      if (destRef) {
        const destSnap = await transaction.get(destRef);
        if (destSnap.exists()) {
          const destData = destSnap.data();
          const destStock = parseInt(destData.ESTOQUE ?? destData['EM ESTOQUE'] ?? destData.estoque ?? 0, 10);
          const newDestStock = destStock + qty;

          transaction.update(destRef, {
            ESTOQUE: newDestStock,
            ...(destData['EM ESTOQUE'] !== undefined ? { 'EM ESTOQUE': newDestStock } : {}),
            ...(destData.estoque !== undefined ? { estoque: newDestStock } : {}),
            updatedAt: new Date().toISOString()
          });
        }
      }
    });
    return { success: true };
  } catch (err) {
    console.error('Erro na transferência atômica:', err);
    return { success: false, error: err };
  }
};

// ══════════════════════════════════════════════════════════════════
// 2. CRIPTOGRAFIA & AUTENTICAÇÃO SEGURA (PBKDF2 / SHA-256 + AUTH)
// ══════════════════════════════════════════════════════════════════

/**
 * Gera hash criptográfico seguro (PBKDF2 / SHA-256 com salt) para a senha
 */
export const hashPassword = async (plainPassword, salt = null) => {
  if (!plainPassword) return '';
  const effectiveSalt = salt || Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  try {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(plainPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode(effectiveSalt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    const hashHex = Array.from(new Uint8Array(derivedBits))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return `pbkdf2:${effectiveSalt}:${hashHex}`;
  } catch (err) {
    // Fallback padrão SHA-256 se PBKDF2 falhar em ambiente limitado
    const enc = new TextEncoder();
    const data = enc.encode(effectiveSalt + plainPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${effectiveSalt}:${hashHex}`;
  }
};

/**
 * Verifica se uma senha fornecida corresponde ao hash ou senha armazenada
 */
export const verifyPassword = async (plainPassword, storedPasswordOrHash) => {
  if (!plainPassword || !storedPasswordOrHash) return false;

  const plainStr = String(plainPassword).trim();
  const storedStr = String(storedPasswordOrHash).trim();

  // Se já está no formato seguro PBKDF2
  if (storedStr.startsWith('pbkdf2:')) {
    const parts = storedStr.split(':');
    if (parts.length === 3) {
      const salt = parts[1];
      const computed = await hashPassword(plainStr, salt);
      return computed === storedStr;
    }
  }

  // Se está no formato SHA-256
  if (storedStr.startsWith('sha256:')) {
    const parts = storedStr.split(':');
    if (parts.length === 3) {
      const salt = parts[1];
      const expectedHash = parts[2];
      const enc = new TextEncoder();
      const data = enc.encode(salt + plainStr);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex === expectedHash;
    }
  }

  // Compatibilidade com senhas legadas em texto puro (migração transparente)
  return plainStr === storedStr;
};

/**
 * Verifica se a senha já possui formato hash seguro
 */
export const isPasswordHashed = (password) => {
  return typeof password === 'string' && (password.startsWith('pbkdf2:') || password.startsWith('sha256:'));
};

/**
 * Autenticação com Firebase Auth (quando usuário usar email) ou fallback criptográfico
 */
export const loginWithFirebaseAuth = async (email, password) => {
  if (!auth) return { success: false, reason: 'auth_not_configured' };
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (err) {
    return { success: false, error: err };
  }
};

export const registerWithFirebaseAuth = async (email, password) => {
  if (!auth) return { success: false, reason: 'auth_not_configured' };
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (err) {
    return { success: false, error: err };
  }
};

// ══════════════════════════════════════════════════════════════════
// 3. VÍNCULO FINANCEIRO ESTRITO POR ID E CPF ÚNICO (ANTI-HOMÔNIMOS)
// ══════════════════════════════════════════════════════════════════

/**
 * Extrai o ID de cliente de um objeto (seja ele um cadastro de cliente ou um registro com chave estrangeira)
 */
export const extractClientId = (obj) => {
  if (!obj || typeof obj !== 'object') return null;
  // 1. Chave estrangeira explícita apontando para o cliente
  const fk = obj.CLIENTE_ID ?? obj.cliente_id ?? obj.CLIENT_ID ?? obj.clientId ?? obj.client_id;
  if (fk !== undefined && fk !== null && String(fk).trim() !== '') {
    return String(fk).trim();
  }
  // 2. Se for um objeto de cadastro de cliente (possui 'Nome Completo', ou não é transação/movimentação)
  const isTransaction = (
    obj.VALOR !== undefined ||
    obj['VALOR TOTAL'] !== undefined ||
    obj.VALOR_TOTAL !== undefined ||
    obj.VALOR_PARCELA !== undefined ||
    obj.DOCUMENTO !== undefined ||
    obj.FORMA_PAGTO !== undefined ||
    obj.formaPagamento !== undefined ||
    obj.TIPO_TRANSACAO !== undefined ||
    obj.DATA_VENCIMENTO !== undefined ||
    obj['DATA VENCIMENTO'] !== undefined ||
    obj.tipo === 'VENDA' ||
    obj.tipo === 'ABERTURA' ||
    obj.tipo === 'SANGRIA' ||
    obj.tipo === 'SUPRIMENTO' ||
    obj.tipo === 'FECHAMENTO'
  );
  if (!isTransaction) {
    const rawId = obj.id ?? obj._id;
    if (rawId !== undefined && rawId !== null && String(rawId).trim() !== '') {
      return String(rawId).trim();
    }
  }
  return null;
};

/**
 * Extrai o CPF/CNPJ limpo (apenas dígitos)
 */
export const extractCpf = (obj) => {
  if (!obj || typeof obj !== 'object') return '';
  const rawCpf = obj['CPF / CNPJ'] ?? obj['CPF'] ?? obj['CLIENTE_CPF'] ?? obj['cliente_cpf'] ?? obj['cpf'] ?? obj['Responsável CPF'] ?? '';
  return String(rawCpf || '').replace(/\D/g, '');
};

/**
 * Extrai o Nome do cliente
 */
export const extractClientName = (obj) => {
  if (!obj || typeof obj !== 'object') return '';
  const rawName = obj['Nome Completo'] ?? obj['NOME'] ?? obj['CLIENTE'] ?? obj['NOME CLIENTE'] ?? obj['NOME DO CLIENTE'] ?? obj['Cliente'] ?? obj['cliente'] ?? '';
  return String(rawName || '').trim().toLowerCase();
};

/**
 * Utilitário de comparação estrita entre cliente e registros financeiros / OS / Carnês
 * Impede que homônimos com o mesmo nome tenham parcelas misturadas.
 */
export const isSameClient = (clientA, clientB) => {
  if (!clientA || !clientB) return false;
  if (typeof clientA !== 'object' || typeof clientB !== 'object') return false;

  const idA = extractClientId(clientA);
  const idB = extractClientId(clientB);

  // 1. Se AMBOS possuem ID de cliente identificado:
  if (idA && idB) {
    return idA.toLowerCase() === idB.toLowerCase();
  }

  // 2. Se ao menos um não possui ID de cliente, compara por CPF/CNPJ único (mínimo 7 dígitos)
  const cpfA = extractCpf(clientA);
  const cpfB = extractCpf(clientB);
  if (cpfA.length >= 7 && cpfB.length >= 7) {
    return cpfA === cpfB;
  }

  // 3. Fallback: Casamento por Nome apenas se nenhum dos dois possuir CPF/ID cadastrado
  const nameA = extractClientName(clientA);
  const nameB = extractClientName(clientB);
  if (nameA && nameB && nameA === nameB) {
    return true;
  }

  return false;
};
