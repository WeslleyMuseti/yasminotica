import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Sparkles, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const FileUploader = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file) => {
    if (!file) return;
    setStatus('loading');
    setFile(file);

    try {
      const reader = new FileReader();
      const extension = file.name.split('.').pop().toLowerCase();

      reader.onload = (e) => {
        try {
          let data = [];
          if (extension === 'xlsx' || extension === 'xls') {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          } else if (extension === 'csv') {
            const csvData = Papa.parse(e.target.result, { header: true, dynamicTyping: true });
            data = csvData.data;
          } else {
            throw new Error('Formato de arquivo não suportado');
          }

          setTimeout(() => {
            onDataLoaded(data);
            setStatus('success');
          }, 800);
        } catch (err) {
          setStatus('error');
        }
      };

      if (extension === 'xlsx' || extension === 'xls') {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsText(file);
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          processFile(e.dataTransfer.files[0]);
        }}
        animate={{ 
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.1)'
        }}
        className={`glass-card p-16 relative overflow-hidden flex flex-col items-center justify-center border-2 border-dashed transition-colors duration-500`}
      >
        {/* Decorative Glow */}
        <AnimatePresence>
          {isDragging && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-sky-500/5 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => processFile(e.target.files[0])}
        />

        <motion.div 
          animate={status === 'loading' ? { scale: [1, 1.1, 1], rotate: 360 } : {}}
          transition={status === 'loading' ? { repeat: Infinity, duration: 2 } : {}}
          className={`p-6 rounded-3xl bg-gradient-to-br transition-all duration-500 shadow-2xl ${
            status === 'success' ? 'from-emerald-500 to-teal-600' : 
            status === 'error' ? 'from-rose-500 to-pink-600' : 
            'from-sky-500 to-indigo-600'
          }`}
        >
          {status === 'idle' && <Upload className="w-10 h-10 text-white" />}
          {status === 'loading' && <Sparkles className="w-10 h-10 text-white" />}
          {status === 'success' && <CheckCircle2 className="w-10 h-10 text-white" />}
          {status === 'error' && <AlertCircle className="w-10 h-10 text-white" />}
        </motion.div>

        <div className="mt-10 text-center relative z-10">
          <h3 className="text-2xl font-black mb-3">
            {status === 'success' ? 'Dados Sincronizados!' : 'Conectar Planilha'}
          </h3>
          <p className="text-slate-400 max-w-xs mx-auto mb-10 text-sm leading-relaxed">
            Nossa inteligência vai resumir seus dados de faturamento e redes sociais automaticamente.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <label
              htmlFor="file-upload"
              className="button-primary"
              style={{ cursor: 'pointer', display: 'inline-block', margin: 0 }}
            >
              Escolher Arquivo
            </label>
            
            <a 
              href="/planilha_teste_otica.csv" 
              download 
              className="px-6 py-4 rounded-full border border-slate-600 hover:border-slate-400 hover:bg-slate-800 transition-all text-sm font-bold flex items-center gap-2"
            >
              <Download size={16} />
              Baixar Modelo
            </a>
          </div>
        </div>

        <AnimatePresence>
          {file && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 flex items-center gap-3 text-xs font-bold text-sky-400 bg-sky-500/5 px-4 py-2 rounded-full border border-sky-500/10"
            >
              <FileText size={14} />
              <span>{file.name.toUpperCase()}</span>
              <button onClick={() => {setFile(null); setStatus('idle');}} className="hover:text-rose-400 transition-colors">
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
