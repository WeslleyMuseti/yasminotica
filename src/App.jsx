import React, { useState, useEffect, useRef } from 'react';
import FileUploader from './components/FileUploader';
import DataSync from './components/DataSync';
import Dashboard from './components/Dashboard';
import GlobalSearch from './components/GlobalSearch';
import RowDetailsModal from './components/RowDetailsModal';
import RowEditModal from './components/RowEditModal';
import { COLUMN_LABELS } from './components/DataTable';
import ClientRegistration from './components/ClientRegistration';
import { Eye, Upload, Download, RefreshCw, Users, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

function App() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('loading'); // loading, dashboard, syncing, upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editingRowData, setEditingRowData] = useState(null);
  const [addingRowData, setAddingRowData] = useState(null); // { sheetName, row }
  const fileInputRef = useRef(null);

  // Utilitário: parseia uma aba detectando a linha de cabeçalho real
  const parseSheet = (ws) => {
    // Pega como array de arrays para encontrar o cabeçalho real
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!raw || raw.length === 0) return [];

    // Encontra a primeira linha onde a maioria das células são não-vazias (cabeçalho real)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(raw.length, 10); i++) {
      const nonEmpty = raw[i].filter(c => c !== '' && c !== null && c !== undefined && String(c).trim() !== '').length;
      if (nonEmpty >= 2) { 
        headerIdx = i; 
        break; 
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
      .filter(r => Object.values(r).some(v => v !== '' && v !== null && v !== undefined));
  };

  // Carrega automaticamente o arquivo da pasta public ao iniciar
  useEffect(() => {
    const autoLoad = async () => {
      try {
        const res = await fetch('/YASMIN ÓTICA.Sheets.xlsx?v=' + Date.now());
        if (!res.ok) throw new Error('Arquivo não encontrado');
        const arrayBuffer = await res.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const sheets = {};
        wb.SheetNames.forEach(name => {
          const rows = parseSheet(wb.Sheets[name]);
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

  const handleRowUpdate = (sheetName, oldRow, newRow) => {
    setData(prev => ({
      ...prev,
      [sheetName]: prev[sheetName].map(r => r === oldRow ? newRow : r)
    }));
  };

  const handleAddRow = (sheetName, newRow) => {
    setData(prev => ({
      ...prev,
      [sheetName]: [...(prev[sheetName] || []), newRow]
    }));
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
        <FileUploader 
          onDataLoaded={handleDataLoaded} 
          onCancel={data ? () => setView('dashboard') : undefined}
        />
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

          {/* Ações e Busca */}
          <div className="flex items-center gap-3 sm:gap-6">
            <GlobalSearch data={data} onSelect={(res) => setSelectedRow(res)} />

            <span className="hidden lg:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Dados ao Vivo
            </span>

            {/* Botões Ações do Arquivo */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('clients')}
                className={`flex items-center gap-2 px-4 py-2 glass-card text-xs font-black transition-all rounded-full ${
                  view === 'clients' ? 'text-white bg-fuchsia-500/30 border-fuchsia-400' : 'text-fuchsia-400 border-fuchsia-400/20 hover:bg-fuchsia-400/10'
                }`}
              >
                <Users size={13} /> Clientes
              </button>
              <button
                onClick={() => setView('inadimplentes')}
                className={`flex items-center gap-2 px-4 py-2 glass-card text-xs font-black transition-all rounded-full ${
                  view === 'inadimplentes' ? 'text-white bg-rose-500/30 border-rose-400' : 'text-rose-400 border-rose-400/20 hover:bg-rose-400/10'
                }`}
              >
                <AlertTriangle size={13} /> Inadimplentes
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 glass-card text-emerald-400 text-xs font-black border-emerald-400/20 hover:bg-emerald-400/10 transition-all rounded-full"
              >
                <Download size={13} /> Baixar
              </button>
              <button
                onClick={() => setView('upload')}
                className="flex items-center gap-2 px-4 py-2 glass-card text-sky-400 text-xs font-black border-sky-400/20 hover:bg-sky-400/10 transition-all rounded-full"
              >
                <Upload size={13} /> Trocar
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo do Dashboard */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {(view === 'clients' || view === 'inadimplentes') ? (
          <ClientRegistration 
            initialTab={view === 'inadimplentes' ? 'inadimplentes' : 'todos'}
            clientsData={data?.['CLIENTES_CADASTRADOS'] || []}
            onAddClient={(newClient) => handleAddRow('CLIENTES_CADASTRADOS', newClient)}
            onBack={() => setView('dashboard')} 
          />
        ) : (
          <Dashboard 
            data={data} 
            isSynced={true} 
            onRowUpdate={handleRowUpdate} 
            onAddClick={(sheetName, emptyRow) => setAddingRowData({ sheetName, row: emptyRow })}
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
      />
    </div>
  );
}

export default App;
