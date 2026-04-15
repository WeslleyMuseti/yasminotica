import React, { useState, useEffect, useRef } from 'react';
import FileUploader from './components/FileUploader';
import DataSync from './components/DataSync';
import Dashboard from './components/Dashboard';
import { Eye, Upload, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

function App() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('loading'); // loading, dashboard, syncing, upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Carrega automaticamente o arquivo da pasta public ao iniciar
  useEffect(() => {
    const autoLoad = async () => {
      try {
        const res = await fetch('/YASMIN ÓTICA.Sheets.xlsx');
        if (!res.ok) throw new Error('Arquivo não encontrado');
        const arrayBuffer = await res.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const sheets = {};
        wb.SheetNames.forEach(name => {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' });
          if (rows.length > 0) sheets[name] = rows;
        });
        setData(sheets);
        setView('dashboard');
      } catch {
        // Se não encontrar o arquivo, vai para tela de upload
        setView('upload');
      }
    };
    autoLoad();
  }, []);

  const handleDataLoaded = (loadedData) => {
    const sheets = Array.isArray(loadedData) ? { 'Planilha': loadedData } : loadedData;
    setData(sheets);
    setUploadOpen(false);
    setView('syncing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSyncComplete = (syncedData) => {
    setData(syncedData);
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // ─── UPLOAD (fallback ou troca de arquivo) ─────────────────────
  if (view === 'upload') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
            <Eye className="text-white" size={22} />
          </div>
          <h1 className="text-2xl font-black title-gradient uppercase">Yasmin Ótica <span className="text-sky-500 text-sm ml-1">Analytics</span></h1>
        </div>
        <div className="w-full max-w-2xl text-center mb-8">
          <h2 className="text-3xl font-black mb-3">Conectar Planilha</h2>
          <p className="text-slate-400">Selecione o arquivo <b>YASMIN ÓTICA.Sheets.xlsx</b> para carregar o dashboard.</p>
        </div>
        <FileUploader onDataLoaded={handleDataLoaded} />
      </div>
    );
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Navbar fixa */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 bg-black/20">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Eye className="text-white" size={18} />
            </div>
            <div>
              <span className="text-base font-black uppercase tracking-tight">Yasmin <span className="text-sky-400">Ótica</span></span>
              <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest -mt-0.5">Analytics Dashboard</span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Dados ao Vivo
            </span>

            {/* Botão Trocar Arquivo */}
            <button
              onClick={() => setView('upload')}
              className="flex items-center gap-2 px-4 py-2 glass-card text-sky-400 text-xs font-black border-sky-400/20 hover:bg-sky-400/10 transition-all rounded-full"
            >
              <Upload size={13} /> Trocar Arquivo
            </button>
          </div>
        </div>
      </nav>

      {/* Conteúdo do Dashboard */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <Dashboard data={data} isSynced={true} />
      </div>
    </div>
  );
}

export default App;
