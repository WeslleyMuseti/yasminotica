import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, Download, Table2 } from 'lucide-react';

const PAGE_SIZE = 15;

const COLUMN_LABELS = {
  'OS': 'OS', 'DATA': 'Data', 'ANO': 'Ano', 'MÊS': 'Mês', 'CIDADE': 'Cidade',
  'NOME': 'Nome', 'DATA NASCIMENTO': 'Dt. Nasc.', 'TELEFONE CLIENTE': 'Telefone',
  'PRODUTO': 'Produto', 'DATA ENTREGA ÓCULOS': 'Entrega',
  'SATISFAÇÃO DO CLIENTE': 'Satisfação', 'RESULTADO DA LIGAÇÃO/ MENSAGEM (30 DIAS)': 'Result. 30d',
  'RESULTADO DA LIGAÇÃO/ MENSAGE (6 MESES)': 'Result. 6m',
  'DATA VENCIMENTO': 'Vencimento', 'MÊS': 'Mês', 'LOJA': 'Loja', 'NOME': 'Nome',
  'VALOR PARCELA': 'Valor Parcela', 'PARCELA': 'Parcela', 'MOVIMENTAÇÃO': 'Moviment.',
  'N': 'Nº', 'DATA ORÇAMENTO': 'Data Orç.', 'NOME DO CLIENTE': 'Cliente',
  'VALOR DO ORÇAMENTO': 'Valor', 'ARMAÇÃO': 'Armação', 'LENTE': 'Lente',
  'OS DA VENDA': 'OS Venda', 'DATA  DA VENDA': 'Dt. Venda',
  'DATA DO CADASTRAMENTO': 'Dt. Cadastro', 'DIOPTRIA': 'Dioptria',
  'TIPO PRODUTO': 'Tipo', 'QTD (PAR)': 'Qtd.',
};

const fmt = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  if (val instanceof Date) return val.toLocaleDateString('pt-BR');
  if (typeof val === 'number') {
    // Detecta datas seriais do Excel (entre 30000 e 60000 = anos 1982-2064)
    if (val > 30000 && val < 60000) {
      const d = new Date((val - 25569) * 86400 * 1000);
      return d.toLocaleDateString('pt-BR');
    }
    return val.toLocaleString('pt-BR');
  }
  const s = String(val);
  return s.length > 35 ? s.slice(0, 35) + '…' : s;
};

const DataTable = ({ sheetName, rows }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const allCols = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const keys = new Set();
    rows.slice(0, 20).forEach(r => Object.keys(r).forEach(k => keys.add(k)));
    return [...keys].filter(k => k && k !== '').slice(0, 18);
  }, [rows]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Table2 size={40} className="mb-4 opacity-30" />
        <p className="font-bold">Nenhum dado encontrado nesta aba.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            {filtered.length.toLocaleString()} registros
          </span>
          {search && <span className="text-xs text-sky-400 font-bold">· filtrado</span>}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/5">
              {allCols.map(col => (
                <th key={col} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
                  {COLUMN_LABELS[col] || col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                {allCols.map(col => (
                  <td key={col} className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                    {fmt(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500 font-bold">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const num = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button key={num} onClick={() => setPage(num)}
                  className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                    page === num ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}>
                  {num}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DataTable;
