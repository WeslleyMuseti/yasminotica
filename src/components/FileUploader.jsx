import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Sparkles, Download, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const SHEET_CONFIG = {
  'BD MARKETING':           { label: 'BD Marketing',         color: 'sky'     },
  'BD MARKETING ANTIGO':    { label: 'BD Marketing Antigo',  color: 'slate'   },
  'Controle_Parcelas':      { label: 'Parcelas',             color: 'amber'   },
  'RELATÓRIO PARCELAS':     { label: 'Relatório Parcelas',   color: 'orange'  },
  'ORÇAMENTOS':             { label: 'Orçamentos',           color: 'violet'  },
  'Cópia de DADOS DIOPTRIA':{ label: 'Dioptria (Estoque)',   color: 'teal'    },
  'AnáliseInfluencer':      { label: 'Influencers',          color: 'pink'    },
  'ESTOQUE ENTRADA SAÍDAS': { label: 'Estoque',              color: 'emerald' },
};

const FileUploader = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile]   = useState(null);
  const [status, setStatus] = useState('idle');
  const [sheets, setSheets] = useState([]);

  const processFile = async (f) => {
    if (!f) return;
    setStatus('loading');
    setFile(f);

    const reader = new FileReader();
    const ext = f.name.split('.').pop().toLowerCase();

    reader.onload = (e) => {
      try {
        if (ext === 'csv') {
          const parsed = Papa.parse(e.target.result, { header: true, dynamicTyping: true });
          const sheetData = { 'Planilha': parsed.data.filter(r => Object.values(r).some(v => v)) };
          setTimeout(() => { setSheets(Object.keys(sheetData)); onDataLoaded(sheetData); setStatus('success'); }, 800);
        } else {
          // XLSX: carrega todas as abas
          const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
          const sheetData = {};
          wb.SheetNames.forEach(name => {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' });
            if (rows.length > 0) sheetData[name] = rows;
          });
          const names = Object.keys(sheetData);
          setTimeout(() => { setSheets(names); onDataLoaded(sheetData); setStatus('success'); }, 800);
        }
      } catch {
        setStatus('error');
      }
    };

    if (ext === 'csv') reader.readAsText(f);
    else reader.readAsBinaryString(f);
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}
        animate={{ scale: isDragging ? 1.02 : 1, borderColor: isDragging ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)' }}
        className="glass-card p-16 relative overflow-hidden flex flex-col items-center justify-center border-2 border-dashed transition-colors duration-500"
      >
        <AnimatePresence>
          {isDragging && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-sky-500/5 pointer-events-none" />
          )}
        </AnimatePresence>

        <input type="file" id="file-upload" className="hidden" accept=".csv,.xlsx,.xls"
          onChange={(e) => processFile(e.target.files[0])} />

        <motion.div
          animate={status === 'loading' ? { rotate: 360 } : {}}
          transition={status === 'loading' ? { repeat: Infinity, duration: 1.5, ease: 'linear' } : {}}
          className={`p-6 rounded-3xl bg-gradient-to-br transition-all duration-500 shadow-2xl ${
            status === 'success' ? 'from-emerald-500 to-teal-600' :
            status === 'error' ? 'from-rose-500 to-pink-600' : 'from-sky-500 to-indigo-600'
          }`}
        >
          {status === 'idle' && <Upload className="w-10 h-10 text-white" />}
          {status === 'loading' && <Sparkles className="w-10 h-10 text-white" />}
          {status === 'success' && <CheckCircle2 className="w-10 h-10 text-white" />}
          {status === 'error' && <AlertCircle className="w-10 h-10 text-white" />}
        </motion.div>

        <div className="mt-10 text-center relative z-10">
          <h3 className="text-2xl font-black mb-3">
            {status === 'success' ? `${sheets.length} abas carregadas!` : 'Conectar Planilha'}
          </h3>
          <p className="text-slate-400 max-w-xs mx-auto mb-10 text-sm leading-relaxed">
            {status === 'success'
              ? 'Todas as tabelas foram detectadas automaticamente.'
              : 'Carregue seu arquivo Excel ou CSV. Todas as abas serão processadas individualmente.'
            }
          </p>

          {/* Abas detectadas */}
          <AnimatePresence>
            {status === 'success' && sheets.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap justify-center gap-2 mb-8">
                {sheets.map(s => {
                  const cfg = SHEET_CONFIG[s] || { label: s, color: 'slate' };
                  return (
                    <span key={s} className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20 uppercase tracking-widest`}>
                      <Layers size={10} /> {cfg.label}
                    </span>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <label htmlFor="file-upload" className="button-primary" style={{ cursor: 'pointer', display: 'inline-block', margin: 0 }}>
              {status === 'success' ? 'Trocar Arquivo' : 'Escolher Arquivo'}
            </label>
            <a href="/planilha_teste_otica.csv" download
              className="px-6 py-4 rounded-full border border-slate-600 hover:border-slate-400 hover:bg-slate-800 transition-all text-sm font-bold flex items-center gap-2">
              <Download size={16} /> Baixar Modelo
            </a>
          </div>
        </div>

        <AnimatePresence>
          {file && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-8 flex items-center gap-3 text-xs font-bold text-sky-400 bg-sky-500/5 px-4 py-2 rounded-full border border-sky-500/10">
              <FileText size={14} />
              <span>{file.name.toUpperCase()}</span>
              <button onClick={() => { setFile(null); setStatus('idle'); setSheets([]); }} className="hover:text-rose-400 transition-colors">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default FileUploader;
