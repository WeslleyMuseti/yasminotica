import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalSearch = ({ data, onSelect }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Evita que a busca seja executada a cada tecla pressionada (debounce)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2 || !data) return [];
    
    // Normalizar a query para remover acentos e case
    const normalizedQuery = debouncedQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    // Extrair apenas números para busca limpa de CPF ou Telefone
    const queryNumbersOnly = debouncedQuery.replace(/\D/g, '');
    const isNumberQuery = queryNumbersOnly.length >= 3;
    
    const found = [];
    const nameCols = ['NOME', 'NOME CLIENTE', 'CLIENTE', 'Nome', 'Cliente', 'NOME DO CLIENTE'];

    for (const [sheetName, rows] of Object.entries(data)) {
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        
        let clientName = '';
        // 1. Encontrar o nome do cliente nesta linha
        for (let col of nameCols) {
          if (row[col] && String(row[col]).trim() !== '') {
            clientName = String(row[col]).trim();
            break;
          }
        }
        
        let isMatch = false;
        
        // 2. Tentar bater com o nome do cliente (ignorando acentos)
        if (clientName) {
            const normalizedName = clientName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            if (normalizedName.includes(normalizedQuery)) {
                isMatch = true;
            }
        }
        
        // 3. Se não achou pelo nome, varrer todas as colunas
        if (!isMatch) {
            for (const key in row) {
                const val = row[key];
                if (val !== null && val !== undefined && val !== '') {
                    const strVal = String(val);
                    const normalizedVal = strVal.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    
                    if (normalizedVal.includes(normalizedQuery)) {
                        isMatch = true;
                        break;
                    }
                    
                    // Se a busca tiver números, tentar achar ignorando pontuações (ex: CPF, Telefone)
                    if (isNumberQuery) {
                        const valNumbersOnly = strVal.replace(/\D/g, '');
                        if (valNumbersOnly && valNumbersOnly.includes(queryNumbersOnly)) {
                            isMatch = true;
                            break;
                        }
                    }
                }
            }
        }

        if (isMatch) {
          const date = row['DATA'] || row['Data'] || row['MÊS'] || row['DATA DO CADASTRAMENTO'] || '';
          
          // Pegar cidade
          const city = row['CIDADE'] || row['Cidade'] || '';

          // Pegar situação financeira
          let debtStatus = null;
          const mov = String(row['MOVIMENTAÇÃO'] || row['Moviment.'] || row['SITUAÇÃO'] || '').trim().toLowerCase();
          
          if (mov) {
              if (mov === '—' || mov === '' || mov.includes('pendente')) {
                  debtStatus = 'pendente';
              } else {
                  debtStatus = 'pago';
              }
          }
          
          const val = row['VALOR PARCELA'] || row['VALOR TOTAL'] || row['VALOR DO ORÇAMENTO'] || '';
          const extraInfo = row['CPF'] || row['TELEFONE CLIENTE'] || val || '';
          
          found.push({
            sheetName,
            rowIndex,
            clientName: clientName || 'Registro sem Nome',
            info: date || extraInfo || '',
            extra: { city, debtStatus, val },
            row
          });
          
          // SHORT-CIRCUIT: Evitar que a aplicação trave parando ao encontrar 50 itens
          if (found.length >= 50) {
            return found;
          }
        }
      }
    }

    return found;
  }, [debouncedQuery, data]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar cliente, CPF..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="w-48 sm:w-64 bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-8 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500/50 focus:bg-white/10 transition-all"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && debouncedQuery.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-[300px] sm:w-96 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[400px] flex flex-col"
          >
            <div className="p-3 border-b border-white/5 bg-slate-800/50 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Resultados da Busca</span>
              <span className="text-xs text-sky-400 font-bold">{results.length} enc.</span>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
              {results.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">Nenhum resultado encontrado.</div>
              ) : (
                <div className="space-y-1">
                  {results.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setIsOpen(false);
                        if (onSelect) onSelect(res);
                      }}
                      className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-all group flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                        <FileText size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate group-hover:text-sky-400 transition-colors">
                          {res.clientName}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {res.sheetName}
                          </span>
                          
                          {res.extra.city && (
                            <span className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                               📍 {res.extra.city}
                            </span>
                          )}
                          
                          {res.extra.debtStatus === 'pendente' && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" /> Inadimplente
                            </span>
                          )}
                          
                          {res.extra.debtStatus === 'pago' && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                              ✔ Pago
                            </span>
                          )}
                          
                          {(!res.extra.city && !res.extra.debtStatus && res.info) && (
                            <span className="text-[10px] text-slate-400 truncate ml-1">{res.info}</span>
                          )}
                          
                          {res.extra.val && (
                             <span className="text-[10px] text-slate-300 font-bold ml-auto bg-white/5 px-2 py-0.5 rounded-full">
                               R$ {res.extra.val}
                             </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
