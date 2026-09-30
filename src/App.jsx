import React, { useState, useEffect, useRef, useMemo } from 'react';
import Login from './components/Login';
import AdminUsers from './components/AdminUsers';
import DataSync from './components/DataSync';
import Dashboard from './components/Dashboard';
import GlobalSearch from './components/GlobalSearch';
import RowDetailsModal from './components/RowDetailsModal';
import RowEditModal from './components/RowEditModal';
import { COLUMN_LABELS } from './components/DataTable';
import ClientRegistration from './components/ClientRegistration';
import ErpOptica from './components/ErpOptica';
import OSManagement from './components/OSManagement';
import POSRegister from './components/POSRegister';
import LoadingScreen from './components/LoadingScreen';
import { Eye, Upload, Download, RefreshCw, Users, AlertTriangle, Package, UserCog, ClipboardList, LogOut, ShoppingCart, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import FirebaseSetupScreen from './components/FirebaseSetupScreen';
import NavigationDrawer from './components/NavigationDrawer';
import { isConfigured, db } from './firebase';
import { subscribeToCollections, saveDocument, deleteDocument, hashPassword, isPasswordHashed } from './firebaseSync';

// Hash seguro PBKDF2 padrão para primeiro acesso da conta master
const DEFAULT_MASTER_HASH = "pbkdf2:b3bb279090a24beecaa987cfde1224a1:b473c3a43b120e5f624792b560dff6edc6b56d1865a8fb3d9a0433d7ab13804a";

function App() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [data, setData] = useState({
    'CLIENTES_CADASTRADOS': [],
    'Registro_Vendas': [],
    'CAD_LENTES': [],
    'CAD_ARMACOES': [],
    'CAD_BRINDES': [],
    'CONTAS_PAGAR': [],
    'CONTAS_RECEBER': [],
    'FLUXO_CAIXA': JSON.parse(localStorage.getItem('YASMIN_FLUXO_CAIXA') || '[]')
  });
  const [view, setView] = useState('login'); // login, loading, dashboard, syncing, clients, erp, admin
  const [currentUser, setCurrentUser] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [users, setUsers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('users'));
      if (Array.isArray(saved) && saved.length > 0) {
        if (!saved.some(u => u.username === 'wmusete')) {
          return [{ username: 'wmusete', password: DEFAULT_MASTER_HASH, role: 'administrativo', authorized: true }, ...saved];
        }
        return saved;
      }
    } catch (e) {}
    return [{ username: 'wmusete', password: DEFAULT_MASTER_HASH, role: 'administrativo', authorized: true }];
  });

  // Migração transparente de senhas legadas em texto plano para Hash Criptográfico PBKDF2
  useEffect(() => {
    let isMounted = true;
    const upgradePasswords = async () => {
      let needsUpdate = false;
      const updatedList = await Promise.all(users.map(async (u) => {
        if (!isPasswordHashed(u.password)) {
          needsUpdate = true;
          const hashed = await hashPassword(u.password);
          return { ...u, password: hashed };
        }
        return u;
      }));
      if (needsUpdate && isMounted) {
        setUsers(updatedList);
      }
    };
    upgradePasswords();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
    if (isConfigured && currentUser && ['admin', 'administrativo'].includes(currentUser.role)) {
      users.forEach(u => {
        saveDocument('USUARIOS', u, u.username);
      });
    }
  }, [users, currentUser]);

  useEffect(() => {
    if (data['FLUXO_CAIXA'] && data['FLUXO_CAIXA'].length > 0) {
      localStorage.setItem('YASMIN_FLUXO_CAIXA', JSON.stringify(data['FLUXO_CAIXA']));
    }
  }, [data['FLUXO_CAIXA']]);

  // Sanitização e Remoção de Duplicidades em CONTAS_RECEBER (Lançamentos de Saldo Único que duplicam Parcelas de Carnê/Boleto)
  useEffect(() => {
    const receberList = data?.['CONTAS_RECEBER'];
    if (!receberList || !Array.isArray(receberList) || receberList.length === 0) return;

    let hasChange = false;
    const toDeleteIds = [];

    // Agrupa por cliente para identificar duplicidades
    const byClient = {};
    receberList.forEach(r => {
      const client = String(r['CLIENTE'] || r['NOME CLIENTE'] || r['NOME'] || '').trim().toUpperCase();
      if (!client) return;
      if (!byClient[client]) byClient[client] = [];
      byClient[client].push(r);
    });

    const resultList = [];

    Object.entries(byClient).forEach(([client, rows]) => {
      // Identifica se há parcelas de carnê/boleto (ex: BOLETO 1/12, etc.)
      const installmentRows = rows.filter(r => {
        const doc = String(r.DOCUMENTO || r.documento || '').toUpperCase();
        const desc = String(r.DESCRICAO || r.descricao || '').toUpperCase();
        return doc.includes('BOLETO') || doc.includes('CARNÊ') || doc.includes('PARCELA') || /\d+\/\d+/.test(doc) || /\d+\/\d+/.test(desc);
      });

      if (installmentRows.length > 1) {
        // Calcula soma das parcelas
        const installmentsSum = installmentRows.reduce((acc, r) => acc + (parseFloat(String(r.VALOR || r.valor || '0').replace('.', '').replace(',', '.')) || 0), 0);

        rows.forEach(r => {
          const isInst = installmentRows.includes(r);
          const rVal = parseFloat(String(r.VALOR || r.valor || '0').replace('.', '').replace(',', '.')) || 0;
          const isDuplicateLumpSum = !isInst && 
            Math.abs(rVal - installmentsSum) < 2.0 && 
            (String(r.DOCUMENTO || '').toUpperCase().includes('SALDO') || String(r.DESCRICAO || '').toUpperCase().includes('VENDA OS') || String(r.MEIO_PAGAMENTO || '').toUpperCase().includes('BOLETO'));

          if (isDuplicateLumpSum) {
            hasChange = true;
            if (r.id) toDeleteIds.push(r.id);
          } else {
            // Normaliza as parcelas para que a tabela exiba perfeitamente
            if (isInst) {
              const enriched = { ...r };
              if (!enriched.MEIO_PAGAMENTO && !enriched.meio_pagamento) {
                enriched.MEIO_PAGAMENTO = 'Boleto Bancário / Carnê';
                enriched.meio_pagamento = 'Boleto Bancário / Carnê';
              }
              if (!enriched.DATA_VENCIMENTO && enriched['DATA VENCIMENTO']) {
                enriched.DATA_VENCIMENTO = enriched['DATA VENCIMENTO'];
              }
              if (!enriched['DATA VENCIMENTO'] && enriched.DATA_VENCIMENTO) {
                enriched['DATA VENCIMENTO'] = enriched.DATA_VENCIMENTO;
              }
              if (!enriched.DESCRICAO && enriched.DOCUMENTO) {
                enriched.DESCRICAO = enriched.DOCUMENTO;
                enriched.descricao = enriched.DOCUMENTO;
              }
              resultList.push(enriched);
            } else {
              resultList.push(r);
            }
          }
        });
      } else {
        rows.forEach(r => resultList.push(r));
      }
    });

    if (hasChange) {
      setData(prev => ({
        ...prev,
        'CONTAS_RECEBER': resultList
      }));

      if (isConfigured && toDeleteIds.length > 0) {
        toDeleteIds.forEach(id => {
          deleteDocument('CONTAS_RECEBER', id).catch(() => {});
        });
      }
    }
  }, [data['CONTAS_RECEBER'], isConfigured]);

  const [selectedRow, setSelectedRow] = useState(null);
  const [editingRowData, setEditingRowData] = useState(null);
  const [addingRowData, setAddingRowData] = useState(null); // { sheetName, row }
  const [clientInitialTab, setClientInitialTab] = useState('todos');
  const fileInputRef = useRef(null);

  // Utilitário: verifica se uma linha possui dados reais e significativos
  const isMeaningfulRow = (row) => {
    if (!row || typeof row !== 'object') return false;
    return Object.entries(row).some(([k, v]) => {
      if (v === null || v === undefined || v === '') return false;
      const s = String(v).trim();
      return s !== '' && s !== '—' && s !== '-' && s !== '#N/A' && s !== 'Sem Registro na Base Antiga';
    });
  };

  // Utilitário: parseia uma aba detectando a linha de cabeçalho real
  const parseSheet = (ws) => {
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!raw || raw.length === 0) return [];

    let headerIdx = 0;
    let maxNonEmpty = 0;
    for (let i = 0; i < Math.min(raw.length, 15); i++) {
      const count = raw[i].filter(c => c !== '' && c !== null && c !== undefined && String(c).trim() !== '').length;
      if (count > maxNonEmpty) {
        maxNonEmpty = count;
        headerIdx = i;
      }
    }

    const headers = raw[headerIdx].map((h, i) => (h !== '' && h !== null && h !== undefined ? String(h).trim() : `COL_${i}`));
    const dataRows = raw.slice(headerIdx + 1);

    return dataRows
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj;
      })
      .filter(isMeaningfulRow);
  };

  // Utilitário para gerar chave única do item (para garantir exclusão permanente e não recarregar)
  const getItemKey = (row) => {
    if (!row || typeof row !== 'object') return '';
    if (row.id) return `id:${row.id}`;
    if (row._id) return `id:${row._id}`;
    if (row.DOCUMENTO) return `doc:${row.DOCUMENTO}_${row.VALOR || ''}_${row.DATA_VENCIMENTO || row['DATA VENCIMENTO'] || ''}`;
    const name = String(row['Nome Completo'] || row['NOME'] || row['NOME DO CLIENTE'] || row['CLIENTE'] || '').trim().toLowerCase();
    const cpf = String(row['CPF / CNPJ'] || row['CPF'] || '').replace(/\D/g, '');
    const os = String(row['OS'] || row['OS DA VENDA'] || row['OS da COMPRA'] || row['VENDA_OS'] || '').trim();
    const tel = String(row['WhatsApp'] || row['TELEFONE'] || row['TELEFONE CLIENTE'] || '').replace(/\D/g, '');
    const sku = String(row['REFERENCIA_SKU'] || row['referencia_sku'] || '').trim();

    if (cpf && cpf.length >= 7) return `cpf:${cpf}`;
    if (os) return `os:${os}`;
    if (sku) return `sku:${sku}`;
    if (name && tel) return `name_tel:${name}_${tel}`;
    if (name) return `name:${name}`;
    try {
      return JSON.stringify(row);
    } catch {
      return '';
    }
  };

  const getDeletedKeys = () => {
    try {
      return JSON.parse(localStorage.getItem('YASMIN_DELETED_KEYS') || '[]');
    } catch {
      return [];
    }
  };

  const addDeletedKey = (key) => {
    if (!key) return;
    const current = getDeletedKeys();
    if (!current.includes(key)) {
      const updated = [...current, key];
      localStorage.setItem('YASMIN_DELETED_KEYS', JSON.stringify(updated));
    }
  };

  // Carrega automaticamente a planilha base com os dados históricos somente após autenticação bem-sucedida
  useEffect(() => {
    if (!currentUser) {
      setIsInitialLoading(false);
      return;
    }

    let isMounted = true;
    const autoLoad = async () => {
      try {
        const res = await fetch('/YASMIN ÓTICA.Sheets.xlsx?v=' + Date.now());
        if (!res.ok) {
          if (isMounted) setIsInitialLoading(false);
          return;
        }
        const arrayBuffer = await res.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const sheets = {};
        const deletedKeys = getDeletedKeys();
        const financialCleared = localStorage.getItem('YASMIN_FINANCIAL_AND_OS_CLEARED') === 'true';
        wb.SheetNames.forEach(name => {
          // Se o financeiro e OS foram zerados para produção, não recarrega vendas e contas antigas da planilha base
          if (financialCleared && ['Registro_Vendas', 'BD MARKETING', 'Controle_Parcelas', 'RELATÓRIO PARCELAS', 'CONTAS_PAGAR', 'CONTAS_RECEBER', 'FLUXO_CAIXA'].includes(name)) {
            return;
          }
          const rows = parseSheet(wb.Sheets[name]);
          const cleanRows = rows.filter(r => !deletedKeys.includes(getItemKey(r)));
          if (cleanRows.length > 0) sheets[name] = cleanRows;
        });
        if (isMounted) {
          setData(prev => ({ ...sheets, ...prev }));
        }
      } catch (err) {
        console.warn('Aviso: Planilha base não carregada, usando apenas banco na nuvem.', err);
      } finally {
        setTimeout(() => {
          if (isMounted) setIsInitialLoading(false);
        }, 800);
      }
    };
    autoLoad();
    return () => { isMounted = false; };
  }, [currentUser]);

  // Carrega automaticamente do Firebase ao iniciar e escuta atualizações ao vivo somente após login
  useEffect(() => {
    if (!isConfigured || !currentUser) return;

    const unsubscribe = subscribeToCollections((newData) => {
      // Coleta chaves deletadas do Firestore se houver
      if (newData['DELETED_ITEMS'] && newData['DELETED_ITEMS'].length > 0) {
        newData['DELETED_ITEMS'].forEach(d => {
          if (d.key) addDeletedKey(d.key);
        });
      }

      const deletedKeys = getDeletedKeys();
      const financialCleared = localStorage.getItem('YASMIN_FINANCIAL_AND_OS_CLEARED') === 'true';

      // Quando o firebase retorna dados, atualizamos o state central sincronizado
      setData(prev => {
        const merged = { ...prev };
        Object.keys(newData).forEach(key => {
          if (key === 'DELETED_ITEMS' || key === 'USUARIOS') return;
          // Coleções sincronizadas do Firebase sobrescrevem o estado local
          const list = (newData[key] || []).filter(r => !deletedKeys.includes(getItemKey(r)));
          merged[key] = list;
        });

        if (financialCleared) {
          if (!merged['Registro_Vendas']) merged['Registro_Vendas'] = [];
          if (!merged['CONTAS_RECEBER']) merged['CONTAS_RECEBER'] = [];
          if (!merged['CONTAS_PAGAR']) merged['CONTAS_PAGAR'] = [];
          if (!merged['FLUXO_CAIXA']) merged['FLUXO_CAIXA'] = [];
          merged['BD MARKETING'] = [];
        }

        return merged;
      });
      
      // Update users se vier do banco (se já migrou)
      if (newData['USUARIOS'] && newData['USUARIOS'].length > 0) {
        setUsers(newData['USUARIOS']);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleDataLoaded = (loadedData) => {
    // Legacy support para importar arquivo se precisar (opcional)
    setView('syncing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSyncComplete = (syncedData) => {
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setData({
      'CLIENTES_CADASTRADOS': [],
      'Registro_Vendas': [],
      'CAD_LENTES': [],
      'CAD_ARMACOES': [],
      'CONTAS_PAGAR': [],
      'CONTAS_RECEBER': [],
      'FLUXO_CAIXA': []
    });
    setIsDrawerOpen(false);
    setView('login');
  };

  const handleRowUpdate = async (sheetName, oldRow, newRow) => {
    const rowId = oldRow?.id || newRow?.id || oldRow?.['id'] || newRow?.['id'];
    const mergedNewRow = {
      ...newRow,
      id: rowId || `row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    const oldKey = getItemKey(oldRow);

    setData(prev => {
      if (!prev || !prev[sheetName]) return prev;
      return {
        ...prev,
        [sheetName]: prev[sheetName].map(r => {
          const isMatch = r === oldRow ||
            (rowId && (r?.id === rowId || r?.['_id'] === rowId)) ||
            (oldKey && getItemKey(r) === oldKey);
          return isMatch ? mergedNewRow : r;
        })
      };
    });

    if (isConfigured) {
      try {
        await saveDocument(sheetName, mergedNewRow, rowId);
      } catch (err) {
        console.error("Erro ao salvar no banco de dados (Firebase):", err);
      }
    }
  };

  const handleAddRow = async (sheetName, newRow) => {
    const rowWithId = {
      ...newRow,
      id: newRow.id || `row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };

    // 1. Atualização Imediata em Memória Local (Zero Delay / Reativo)
    setData(prev => ({
      ...prev,
      [sheetName]: [...(prev[sheetName] || []), rowWithId]
    }));

    // 2. Persistência na Nuvem (Firebase)
    if (isConfigured) {
      try {
        await saveDocument(sheetName, rowWithId, rowWithId.id);
      } catch (err) {
        console.warn("Aviso ao salvar no Firestore (mantido localmente):", err);
      }
    }
  };

  const handleDeleteRow = async (sheetName, rowToDelete) => {
    if (!rowToDelete) return;
    const delKey = getItemKey(rowToDelete);
    addDeletedKey(delKey);

    // 1. Atualiza imediatamente o estado local em memória
    setData(prev => {
      if (!prev || !prev[sheetName]) return prev;
      return {
        ...prev,
        [sheetName]: prev[sheetName].filter(r => {
          if (r === rowToDelete) return false;
          if (rowToDelete.id && r.id && r.id === rowToDelete.id) return false;
          const rKey = getItemKey(r);
          return rKey !== delKey;
        })
      };
    });

    // 2. Se o Firebase estiver configurado, remove o documento e registra exclusão permanente
    if (isConfigured) {
      if (rowToDelete.id) {
        try {
          await deleteDocument(sheetName, rowToDelete.id);
        } catch (err) {
          console.warn("Erro ao deletar no Firestore:", err);
        }
      }
      try {
        await saveDocument('DELETED_ITEMS', {
          key: delKey,
          sheetName,
          rowSummary: rowToDelete['Nome Completo'] || rowToDelete['NOME'] || rowToDelete['OS'] || '',
          deletedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Erro ao registrar exclusão no Firestore:", err);
      }
    }
  };

  const handleDownload = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    Object.keys(data).forEach(sheetName => {
      const ws = XLSX.utils.json_to_sheet(data[sheetName]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    XLSX.writeFile(wb, "YASMIN_OTICA_ATUALIZADO.xlsx");
  };

  const handleClearFinancialAndOSHistory = async () => {
    const confirmation = window.prompt(
      "⚠️ ZERAR TODO O FINANCEIRO E BASE DE OS:\n\n" +
      "Isso irá apagar permanentemente:\n" +
      "• Todas as Ordens de Serviço (OS) e Vendas registradas\n" +
      "• Todas as Contas a Receber (boletos, carnês, mensalidades)\n" +
      "• Todas as Contas a Pagar\n" +
      "• Todo o Fluxo de Caixa (fechamentos, sangrias, suprimentos)\n" +
      "• Zerará o saldo devedor dos clientes mantendo cadastros e receitas\n\n" +
      "Digite 'RESET' em letras maiúsculas para confirmar:"
    );

    if (confirmation !== "RESET") {
      alert("Ação cancelada pelo usuário.");
      return;
    }

    try {
      setIsInitialLoading(true);

      // 1. Limpar coleções no Firestore
      if (isConfigured && db) {
        const { collection, getDocs, deleteDoc, doc, updateDoc } = await import("firebase/firestore");
        const cols = ["Registro_Vendas", "CONTAS_RECEBER", "CONTAS_PAGAR", "FLUXO_CAIXA"];
        for (const c of cols) {
          const snap = await getDocs(collection(db, c));
          for (const d of snap.docs) {
            await deleteDoc(doc(db, c, d.id));
          }
        }

        // Resetar débitos de clientes
        const clientSnap = await getDocs(collection(db, "CLIENTES_CADASTRADOS"));
        for (const d of clientSnap.docs) {
          const cData = d.data();
          if (cData["Valor Devido"] !== "0,00" || cData["Status de Pagamento"] !== "Em dia") {
            await updateDoc(doc(db, "CLIENTES_CADASTRADOS", d.id), {
              "Valor Devido": "0,00",
              "Status de Pagamento": "Em dia"
            });
          }
        }
      }

      // 2. Atualizar estado local em memória
      setData(prev => {
        const updatedClients = (prev['CLIENTES_CADASTRADOS'] || []).map(c => ({
          ...c,
          'Valor Devido': '0,00',
          'Status de Pagamento': 'Em dia'
        }));

        return {
          ...prev,
          'Registro_Vendas': [],
          'BD MARKETING': [],
          'CONTAS_RECEBER': [],
          'CONTAS_PAGAR': [],
          'FLUXO_CAIXA': [],
          'CLIENTES_CADASTRADOS': updatedClients
        };
      });

      // 3. Limpar chaves locais
      localStorage.setItem('YASMIN_FINANCIAL_AND_OS_CLEARED', 'true');
      localStorage.removeItem('yasmin_cash_registers');
      localStorage.removeItem('yasmin_cash_history');
      localStorage.removeItem('YASMIN_FLUXO_CAIXA');

      alert("✅ Histórico financeiro e base de OS zerados com sucesso! O sistema está pronto e limpo para produção.");
    } catch (err) {
      console.error("Erro ao resetar histórico financeiro:", err);
      alert("Ocorreu um erro ao resetar: " + err.message);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const sanitizedDashboardData = useMemo(() => {
    if (!data) return data;
    const clean = {};
    const sensitive = ['USUARIOS', 'usuarios', 'users', 'Users', 'DELETED_ITEMS', 'senhas', 'passwords', 'credenciais'];
    Object.keys(data).forEach(key => {
      const kLower = key.toLowerCase().trim();
      if (!sensitive.includes(key) && !kLower.includes('usuario') && !kLower.includes('user') && !kLower.includes('senha') && !kLower.includes('pass')) {
        clean[key] = data[key];
      }
    });
    return clean;
  }, [data]);

  useEffect(() => {
    if (view === 'loading' && data) {
      if (currentUser?.role === 'vendedor') {
        setView('pos');
      } else {
        setView('dashboard');
      }
    }
  }, [view, data, currentUser]);

  // ─── TELA DE CARREGAMENTO INICIAL / SPLASH SCREEN ─────────────
  if (isInitialLoading) {
    return <LoadingScreen />;
  }

  // ─── SETUP FIREBASE ────────────────────────────────────────────
  if (!isConfigured) {
    return <FirebaseSetupScreen />;
  }

  // ─── LOGIN ───────────────────────────────────────────────────
  if (view === 'login') {
    return (
      <Login 
        users={users}
        onLogin={(user) => {
          setCurrentUser(user);
          setView(user.role === 'vendedor' ? 'pos' : 'dashboard');
        }}
        onRegister={(newUser) => setUsers([...users, newUser])}
        onUpgradeUserPassword={(uname, newHash) => {
          setUsers(prev => prev.map(u => u.username === uname ? { ...u, password: newHash } : u));
        }}
      />
    );
  }

  // ─── LOADING ───────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-sky-500/20 blur-[60px] rounded-full animate-pulse" />
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className="relative z-10 w-20 h-20 border-4 border-sky-500/20 border-t-sky-500 rounded-full flex items-center justify-center">
            <Eye size={28} className="text-sky-400" />
          </motion.div>
        </div>
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Carregando dados da Yasmin Ótica...</p>
      </div>
    );
  }

  // ─── SYNCING ───────────────────────────────────────────────────
  if (view === 'syncing') {
    return (
      <div className="container min-h-screen pt-20">
        <DataSync rawData={data} onSyncComplete={handleSyncComplete} />
      </div>
    );
  }

  // ─── ADMIN (PROTEGIDO POR RBAC) ──────────────────────────────
  if (view === 'admin') {
    if (!['admin', 'administrativo'].includes(currentUser?.role)) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-950">
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-8 rounded-2xl max-w-md shadow-2xl backdrop-blur-xl">
            <AlertTriangle size={40} className="mx-auto mb-4 text-rose-400 animate-pulse" />
            <h2 className="text-base font-black uppercase tracking-wider mb-2 text-white">Acesso Negado (403)</h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Você não possui privilégios de administrador para visualizar o gerenciador de usuários e configurações.
            </p>
            <button 
              onClick={() => setView(currentUser?.role === 'vendedor' ? 'pos' : 'dashboard')} 
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-500/25"
            >
              Voltar à Área Autorizada
            </button>
          </div>
        </div>
      );
    }
    return (
      <AdminUsers 
        users={users} 
        setUsers={setUsers} 
        onBack={() => setView('dashboard')}
        data={data}
        onDataLoaded={handleDataLoaded}
        onDownloadExcel={handleDownload}
        onClearFinancialAndOS={handleClearFinancialAndOSHistory}
      />
    );
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Navbar estática no topo com design moderno SaaS */}
      <nav className="relative z-40 border-b border-white/10 bg-slate-950/95 shadow-2xl">
        <div className="max-w-[1550px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          
          {/* Lado Esquerdo: Botão Hamburguer + Logo e Identidade */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Botão Hamburguer do Menu Lateral */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all shadow-sm active:scale-95 group"
              title="Abrir Menu Lateral (ESC fecha)"
            >
              <Menu size={20} className="text-sky-400 group-hover:rotate-12 transition-transform" />
              <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Menu</span>
            </button>

            {/* Logo */}
            <div 
              onClick={() => setIsDrawerOpen(true)}
              className="h-11 px-3 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/40 border border-white/40 ring-1 ring-white/10 transition-transform hover:scale-105 cursor-pointer"
              title="Clique para abrir o Menu"
            >
              <img src="/logo-yasmin.png" alt="Yasmin Ótica" className="h-7 w-auto object-contain" />
            </div>

            <div className="hidden md:block">
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white uppercase">
                  Yasmin <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Ótica</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  v1.6
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Dados ao Vivo
              </span>
            </div>
          </div>

          {/* Centro: Indicador Visual do Módulo Ativo */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/5 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Módulo:</span>
            {view === 'pos' && (
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <ShoppingCart size={13} /> Caixa (PDV)
              </span>
            )}
            {view === 'clients' && (
              <span className="text-xs font-black text-fuchsia-400 flex items-center gap-1.5">
                <Users size={13} /> Clientes &amp; Receitas
              </span>
            )}
            {view === 'dashboard' && (
              <span className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                <Eye size={13} /> Dashboard Geral
              </span>
            )}
            {view === 'erp' && (
              <span className="text-xs font-black text-indigo-400 flex items-center gap-1.5">
                <Package size={13} /> ERP Ótica &amp; Estoque
              </span>
            )}
            {view === 'os-management' && (
              <span className="text-xs font-black text-pink-400 flex items-center gap-1.5">
                <ClipboardList size={13} /> Gestão de OS
              </span>
            )}
            {view === 'admin' && (
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <UserCog size={13} /> Administração
              </span>
            )}
          </div>

          {/* Lado Direito: Atalho do Caixa + Avatar do Usuário + Sair */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Atalho Rápido para o Caixa (PDV) */}
            {view !== 'pos' && (
              <button
                onClick={() => setView('pos')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all shadow-sm active:scale-95"
                title="Acessar Caixa (PDV)"
              >
                <ShoppingCart size={14} />
                <span>Caixa</span>
              </button>
            )}

            {/* Atalho Rápido para Clientes se estiver no Caixa */}
            {view === 'pos' && (
              <button
                onClick={() => {
                  setClientInitialTab('todos');
                  setView('clients');
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-400 border border-fuchsia-500/30 transition-all shadow-sm active:scale-95"
                title="Acessar Clientes"
              >
                <Users size={14} />
                <span>Clientes</span>
              </button>
            )}

            {/* Atalho Rápido para Gestão de OS */}
            {view !== 'os-management' && (
              <button
                onClick={() => setView('os-management')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-pink-500/15 hover:bg-pink-500/25 text-pink-400 border border-pink-500/30 transition-all shadow-sm active:scale-95"
                title="Acessar Gestão de Ordens de Serviço"
              >
                <ClipboardList size={14} />
                <span>Gestão de OS</span>
              </button>
            )}

            {/* Chip do Usuário Logado (abre o menu lateral) */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all text-left group"
              title="Abrir Menu e Perfil"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white font-black text-[11px] shadow-sm">
                {String(currentUser?.username || 'U').substring(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left pr-1">
                <p className="text-xs font-black text-white leading-tight truncate max-w-[90px]">
                  {currentUser?.username || 'Usuário'}
                </p>
                <p className="text-[9px] text-slate-400 uppercase font-bold leading-none">
                  {currentUser?.role === 'vendedor' ? 'Vendedor' : 'Admin'}
                </p>
              </div>
            </button>

            {/* Botão Sair */}
            <button
              onClick={handleLogout}
              className="p-2.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/20 hover:border-rose-500 rounded-xl transition-all shadow-sm active:scale-95"
              title="Sair do Sistema"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Menu Hamburguer Lateral (Navigation Drawer) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView={view}
        onNavigate={(newView) => {
          if (newView === 'clients') {
            setClientInitialTab('todos');
          }
          setView(newView);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        isConfigured={isConfigured}
      />


      {/* Conteúdo do Dashboard */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {view === 'pos' ? (
          <POSRegister
            data={data}
            clientsData={data?.['CLIENTES_CADASTRADOS'] || []}
            salesData={data?.['Registro_Vendas'] || data?.['BD MARKETING'] || []}
            armacoesData={data?.['CAD_ARMACOES'] || []}
            lentesData={data?.['CAD_LENTES'] || []}
            receberData={data?.['CONTAS_RECEBER'] || []}
            currentUser={currentUser}
            onAddSale={(newSale) => handleAddRow(data?.['Registro_Vendas'] ? 'Registro_Vendas' : 'BD MARKETING', newSale)}
            onAddClient={(newClient) => handleAddRow('CLIENTES_CADASTRADOS', newClient)}
            onUpdateRow={handleRowUpdate}
            onAddRow={handleAddRow}
            onNavigateToNewClient={() => {
              setClientInitialTab('novo');
              setView('clients');
            }}
            onNavigateToERP={() => setView('erp')}
            onBack={() => setView(currentUser?.role === 'vendedor' ? 'clients' : 'dashboard')}
          />
        ) : view === 'clients' ? (

          <ClientRegistration 
            currentUser={currentUser}
            initialTab={clientInitialTab}
            clientsData={data?.['CLIENTES_CADASTRADOS'] || []}
            salesData={data?.['Registro_Vendas'] || data?.['BD MARKETING'] || []}
            lentesData={data?.['CAD_LENTES'] || []}
            armacoesData={data?.['CAD_ARMACOES'] || []}
            receberData={data?.['CONTAS_RECEBER'] || []}
            onAddClient={(newClient) => handleAddRow('CLIENTES_CADASTRADOS', newClient)}
            onUpdateClient={(updatedClient) => handleRowUpdate('CLIENTES_CADASTRADOS', updatedClient.oldRow, updatedClient.newRow)}
            onDeleteClient={(clientToDelete) => handleDeleteRow('CLIENTES_CADASTRADOS', clientToDelete)}
            onAddSale={(newSale) => handleAddRow(data?.['Registro_Vendas'] ? 'Registro_Vendas' : 'BD MARKETING', newSale)}
            onUpdateSale={(oldSale, updatedSale) => handleRowUpdate(data?.['Registro_Vendas'] ? 'Registro_Vendas' : 'BD MARKETING', oldSale, updatedSale)}
            onDeleteSale={(saleToDelete) => handleDeleteRow(data?.['Registro_Vendas'] ? 'Registro_Vendas' : 'BD MARKETING', saleToDelete)}
            onAddRow={handleAddRow}
            onUpdateRow={handleRowUpdate}
            onBack={() => setView(currentUser?.role === 'vendedor' ? 'pos' : 'dashboard')} 
          />
        ) : view === 'erp' ? (
          <ErpOptica
            data={data}
            currentUser={currentUser}
            clientsData={data?.['CLIENTES_CADASTRADOS'] || []}
            onAddRow={handleAddRow}
            onUpdateRow={handleRowUpdate}
            onDeleteRow={handleDeleteRow}
            onClearFinancialAndOS={handleClearFinancialAndOSHistory}
            onBack={() => setView('dashboard')}
          />
        ) : view === 'os-management' ? (
          <OSManagement
            data={data}
            salesData={data?.['Registro_Vendas'] || data?.['BD MARKETING'] || []}
            clientsData={data?.['CLIENTES_CADASTRADOS'] || []}
            currentUser={currentUser}
            onAddRow={handleAddRow}
            onUpdateRow={handleRowUpdate}
            onDeleteRow={handleDeleteRow}
            onClearFinancialAndOS={handleClearFinancialAndOSHistory}
            onBack={() => setView(currentUser?.role === 'vendedor' ? 'pos' : 'dashboard')}
          />
        ) : (
          <Dashboard 
            onDataLoaded={handleDataLoaded}
            data={sanitizedDashboardData} 
            isSynced={true} 
            onRowUpdate={handleRowUpdate} 
            onAddClick={(sheetName, emptyRow) => setAddingRowData({ sheetName, row: emptyRow })}
            onOpenOSManagement={() => setView('os-management')}
            onOpenPOS={() => setView('pos')}
          />
        )}
      </div>

      {/* Modal de Detalhes da Busca Global */}
      <RowDetailsModal
        isOpen={!!selectedRow && !editingRowData}
        data={selectedRow}
        onClose={() => setSelectedRow(null)}
        onEditClick={() => {
          setEditingRowData(selectedRow);
          setSelectedRow(null); // Revertendo para fechar o modal de detalhes
        }}
      />

      {/* Modal de Edição Global */}
      <RowEditModal
        isOpen={!!editingRowData}
        onClose={() => setEditingRowData(null)}
        onSave={(updatedRow) => {
          handleRowUpdate(editingRowData.sheetName, editingRowData.row, updatedRow);
          setEditingRowData(null); // Fecha o modal após salvar
        }}
        rowData={editingRowData?.row}
        allCols={editingRowData ? Object.keys(editingRowData.row) : []}
        COLUMN_LABELS={COLUMN_LABELS}
        sheetName={editingRowData?.sheetName}
      />

      {/* Modal de Adição Global */}
      <RowEditModal
        isOpen={!!addingRowData}
        mode="add"
        onClose={() => setAddingRowData(null)}
        onSave={(newRow) => {
          handleAddRow(addingRowData.sheetName, newRow);
          setAddingRowData(null);
        }}
        rowData={addingRowData?.row}
        allCols={addingRowData ? Object.keys(addingRowData.row) : []}
        COLUMN_LABELS={COLUMN_LABELS}
        sheetName={addingRowData?.sheetName}
      />
    </div>
  );
}

export default App;
