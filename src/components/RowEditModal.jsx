import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, FileEdit, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RowEditModal = ({ isOpen, onClose, onSave, rowData, allCols, COLUMN_LABELS, mode = 'edit' }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (rowData) {
      // Formata dados iniciais (trata datas se necessário)
      const initialData = {};
      Object.keys(rowData).forEach(key => {
        let val = rowData[key];
        if (val instanceof Date) {
          // Converter Data para YYYY-MM-DD para input date (se houver), ou string
          val = val.toLocaleDateString('pt-BR');
        } else if (typeof val === 'number' && val > 30000 && val < 60000) {
          // Data do Excel
          const d = new Date((val - 25569) * 86400 * 1000);
          val = d.toLocaleDateString('pt-BR');
        }
        initialData[key] = val !== undefined && val !== null ? String(val) : '';
      });
      setFormData(initialData);
    }
  }, [rowData]);

  const handleChange = (col, value) => {
    setFormData(prev => ({ ...prev, [col]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && rowData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0b1120] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
          >
            {/* Header com glow e gradiente */}
            <div className="relative p-6 sm:p-8 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent flex justify-between items-start z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
              
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 flex items-center justify-center border border-sky-500/30 shadow-[0_0_30px_rgba(56,189,248,0.15)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                  {mode === 'add' ? <PlusCircle className="text-sky-400 relative z-10" size={26} /> : <FileEdit className="text-sky-400 relative z-10" size={26} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                    {mode === 'add' ? 'Adicionar Registro' : 'Editar Registro'}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1.5 font-medium">
                    {mode === 'add' ? 'Preencha as informações para adicionar à tabela.' : 'Atualize as informações do cliente ou venda.'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar bg-black/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {allCols.map(col => (
                  <div key={col} className="group flex flex-col relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 truncate group-focus-within:text-sky-400 transition-colors">
                      {COLUMN_LABELS[col] || col}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData[col] || ''}
                        onChange={(e) => handleChange(col, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:bg-white/10 focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/10 transition-all placeholder-slate-600"
                        placeholder="Em branco..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 sm:p-8 border-t border-white/5 bg-black/40 flex justify-end gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="relative flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 transition-all shadow-[0_0_20px_rgba(56,189,248,0.2)] hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] hover:-translate-y-0.5"
              >
                <Save size={18} />
                {mode === 'add' ? 'Salvar Novo Registro' : 'Salvar Alterações'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
};

export default RowEditModal;
