import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, UserCheck, PackageCheck, FileStack,
  RefreshCw, CheckCircle2, ChevronRight, Zap,
  ShoppingBag, PieChart, Users, Layers
} from 'lucide-react';

const ENTITIES = [
  { key: 'clientes', label: 'Normalizar Clientes',            icon: Users,       color: 'sky'     },
  { key: 'produtos', label: 'Categorizar Produtos',           icon: PackageCheck, color: 'indigo'  },
  { key: 'vendas',   label: 'Registrar Ordens de Serviço',    icon: ShoppingBag, color: 'emerald'  },
  { key: 'followup', label: 'Mapear Follow-ups de Marketing', icon: PieChart,    color: 'violet'   },
];

// rawData = { sheetName: rows[] }
const DataSync = ({ rawData, onSyncComplete }) => {
  const [step, setStep] = useState('review');
  const [progress, setProgress] = useState(0);
  const [currentEntity, setCurrentEntity] = useState(0);
  const [normalized, setNormalized] = useState({ clientes: 0, produtos: 0, vendas: 0, followup: 0 });

  const sheetStats = useMemo(() =>
    Object.entries(rawData || {}).map(([name, rows]) => ({ name, count: rows.length }))
  , [rawData]);

  const totalRecords = sheetStats.reduce((a, s) => a + s.count, 0);

  const clientesCount = useMemo(() => {
    const main = rawData?.['BD MARKETING'] || rawData?.['BD MARKETING ANTIGO'] || Object.values(rawData || {})[0] || [];
    const s = new Set();
    main.forEach(r => { const n = r['NOME'] || r['NOME DO CLIENTE'] || ''; if (n) s.add(n.trim().toUpperCase()); });
    return s.size;
  }, [rawData]);

  const produtosCount = useMemo(() => {
    const main = rawData?.['BD MARKETING'] || Object.values(rawData || {})[0] || [];
    const s = new Set();
    main.forEach(r => { const p = r['PRODUTO'] || ''; if (p) s.add(String(p).trim()); });
    return s.size;
  }, [rawData]);

  const followupCount = useMemo(() => {
    const main = rawData?.['BD MARKETING'] || [];
    return main.filter(r => r['DATA DA LIGAÇÃO/MENSAGEM (30 DIAS)'] || r['DATA CONTATO 6 MESES']).length;
  }, [rawData]);

  const normalizeData = () => {
    setStep('syncing');
    setNormalized({ clientes: clientesCount, produtos: produtosCount, vendas: (rawData?.['BD MARKETING'] || []).length, followup: followupCount });

    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      setProgress(p);
      setCurrentEntity(Math.min(3, Math.floor((p / 100) * 4)));
      if (p >= 100) { clearInterval(interval); setTimeout(() => setStep('done'), 600); }
    }, 40);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <AnimatePresence mode="wait">

        {/* ─── REVISÃO ─── */}
        {step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="glass-card p-12">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-sky-500/10 rounded-2xl"><FileStack className="text-sky-400" size={32} /></div>
              <div>
                <h2 className="text-3xl font-black">Central de Dados</h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Yasmin Ótica · Sincronização Relacional 3FN</p>
              </div>
            </div>

            {/* Stats por aba */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <PreviewStat label="Total de Registros" value={totalRecords} color="sky" />
              <PreviewStat label="Tabelas / Abas" value={sheetStats.length} color="indigo" />
              <PreviewStat label="Clientes Únicos" value={clientesCount} color="emerald" />
              <PreviewStat label="Produtos Únicos" value={produtosCount} color="violet" />
            </div>

            {/* Lista das abas detectadas */}
            <div className="mb-10 p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Abas / Tabelas Detectadas</p>
              {sheetStats.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={12} className="text-sky-400" />
                    <span className="text-sm font-bold text-slate-300">{s.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-500">{s.count.toLocaleString()} registros</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4">
              <p className="text-slate-400 text-center max-w-lg text-sm leading-relaxed">
                O sistema irá criar <b>{sheetStats.length} tabelas</b> com <b>{totalRecords.toLocaleString()} registros</b> normalizados, organizados por <b>Clientes, Produtos, OS e Follow-ups</b>.
              </p>
              <button onClick={normalizeData} className="button-primary flex items-center gap-2 group w-full justify-center mt-4">
                Efetivar Sincronização <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── SINCRONIZANDO ─── */}
        {step === 'syncing' && (
          <motion.div key="syncing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-16">
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-sky-500/20 blur-[60px] rounded-full animate-pulse" />
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                className="relative z-10 w-28 h-28 border-4 border-sky-500/20 border-t-sky-500 rounded-full flex items-center justify-center">
                <Database size={36} className="text-sky-400" />
              </motion.div>
            </div>
            <h2 className="text-3xl font-black mb-2">Migrando Informações...</h2>
            <p className="text-slate-400 mb-8 font-bold tracking-[0.2em] uppercase text-xs">Normalização 3FN em Progresso</p>
            <div className="w-full max-w-sm bg-white/5 h-2 rounded-full overflow-hidden mb-10">
              <motion.div animate={{ width: `${progress}%` }} className="h-full bg-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.5)]" />
            </div>
            <div className="grid gap-3 w-full max-w-md">
              {ENTITIES.map((e, i) => (
                <SyncItem key={e.key} label={e.label} active={currentEntity === i} done={currentEntity > i} color={e.color} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── CONCLUÍDO ─── */}
        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="text-emerald-400" size={40} />
            </div>
            <h2 className="text-4xl font-black mb-2">Sincronização Concluída!</h2>
            <p className="text-slate-400 mb-12 text-sm">{sheetStats.length} tabelas processadas · {totalRecords.toLocaleString()} registros normalizados</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <ResultStat label="Clientes" count={normalized.clientes} icon={UserCheck} color="text-sky-400" />
              <ResultStat label="Produtos" count={normalized.produtos} icon={PackageCheck} color="text-indigo-400" />
              <ResultStat label="OS (Vendas)" count={normalized.vendas} icon={ShoppingBag} color="text-emerald-400" />
              <ResultStat label="Follow-ups" count={normalized.followup} icon={Zap} color="text-violet-400" />
            </div>
            <button onClick={() => onSyncComplete(rawData)} className="button-primary px-12">
              Ver Dashboard por Tabelas
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PreviewStat = ({ label, value, color }) => (
  <div className={`p-5 rounded-2xl bg-${color}-500/5 border border-${color}-500/10`}>
    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">{label}</p>
    <p className="text-2xl font-black">{typeof value === 'number' ? value.toLocaleString() : value}</p>
  </div>
);

const SyncItem = ({ label, active, done, color }) => (
  <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 ${
    done ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
    active ? `bg-${color}-500/5 border-${color}-400/20 text-${color}-400` :
    'bg-white/5 border-white/5 text-slate-500'
  }`}>
    <span className="font-bold text-sm tracking-wide">{label}</span>
    {done ? <CheckCircle2 size={16} /> : active ? <RefreshCw size={16} className="animate-spin" /> : null}
  </div>
);

const ResultStat = ({ label, count, icon: Icon, color }) => (
  <div className="flex flex-col items-center gap-2">
    <Icon className={color} size={24} />
    <span className="text-3xl font-black">{count.toLocaleString()}</span>
    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{label}</span>
  </div>
);

export default DataSync;
