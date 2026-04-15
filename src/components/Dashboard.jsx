import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  DollarSign, CheckCircle, TrendingUp, Users, ShoppingBag,
  MapPin, Sparkles, AlertCircle, Package, CreditCard,
  MonitorSmartphone, Layers, Table2, BarChart2
} from 'lucide-react';
import StatsCard from './StatsCard';
import DataTable from './DataTable';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#38bdf8', '#818cf8', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#fb7185', '#34d399'];

const SHEET_TABS = [
  { key: 'BD MARKETING',            label: 'BD Marketing',       icon: Users,           color: 'sky'     },
  { key: 'BD MARKETING ANTIGO',     label: 'Mktg. Antigo',       icon: Layers,          color: 'slate'   },
  { key: 'Controle_Parcelas',       label: 'Parcelas',           icon: CreditCard,      color: 'amber'   },
  { key: 'RELATÓRIO PARCELAS',      label: 'Rel. Parcelas',      icon: Table2,          color: 'orange'  },
  { key: 'ORÇAMENTOS',              label: 'Orçamentos',         icon: ShoppingBag,     color: 'violet'  },
  { key: 'Cópia de DADOS DIOPTRIA', label: 'Dioptria',           icon: Package,         color: 'teal'    },
  { key: 'AnáliseInfluencer',       label: 'Influencers',        icon: MonitorSmartphone,color: 'pink'   },
  { key: 'ESTOQUE ENTRADA SAÍDAS',  label: 'Estoque',            icon: BarChart2,       color: 'emerald' },
];

// Parseia valor monetário
const cleanVal = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/R\$\s?/,'').replace(/\./g,'').replace(',','.').trim()) || 0;
};

// Converte serial Excel para data
const excelDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number' && v > 30000 && v < 60000)
    return new Date((v - 25569) * 86400 * 1000);
  return null;
};

// ─── OVERVIEW do BD MARKETING ────────────────────────────────────────────────
const MarketingOverview = ({ rows }) => {
  const stats = useMemo(() => {
    const clientesMap = new Set();
    const produtosMap = {};
    const cidadeMap = {};
    const mesMap = {};
    const statusMap = {};
    let withPhone = 0, withInstagram = 0, vip = 0;

    rows.forEach(r => {
      const nome = r['NOME'] || '';
      const prod = r['PRODUTO'] || 'Outros';
      const cidade = r['CIDADE'] || '';
      const mes = r['MÊS'] || '';
      const status = r['RESULTADO DA LIGAÇÃO/ MENSAGEM (30 DIAS)'] || 'Sem contato';
      const qtd = parseInt(r['QTD VEZES COMPROU NA LOJA ?(ANOS)'] || 1);

      if (nome) clientesMap.add(nome.trim().toUpperCase());
      produtosMap[prod] = (produtosMap[prod] || 0) + 1;
      if (cidade) cidadeMap[cidade] = (cidadeMap[cidade] || 0) + 1;
      if (mes) mesMap[mes] = (mesMap[mes] || 0) + 1;
      statusMap[status] = (statusMap[status] || 0) + 1;
      if (r['TELEFONE CLIENTE']) withPhone++;
      if (r['INSTAGRAM']) withInstagram++;
      if (qtd > 1) vip++;
    });

    return {
      totalClientes: clientesMap.size,
      totalOS: rows.length,
      withPhone, withInstagram, vip,
      topProducts: Object.entries(produtosMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>({name: name.length>22?name.slice(0,22)+'…':name,count})),
      cidades: Object.entries(cidadeMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value})),
      followupStatus: Object.entries(statusMap).filter(([k])=>k).slice(0,5).map(([name,value])=>({name,value})),
      meses: Object.entries(mesMap).map(([name,value])=>({name,value})),
    };
  }, [rows]);

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="flex flex-wrap gap-5">
        <StatsCard title="Total de OS" value={stats.totalOS.toLocaleString()} icon={ShoppingBag} trend={10} color="sky" delay={0.1} />
        <StatsCard title="Clientes Únicos" value={stats.totalClientes.toLocaleString()} icon={Users} trend={8} color="indigo" delay={0.2} />
        <StatsCard title="Com WhatsApp" value={stats.withPhone.toLocaleString()} icon={MonitorSmartphone} trend={5} color="emerald" delay={0.3} />
        <StatsCard title="No Instagram" value={stats.withInstagram.toLocaleString()} icon={Sparkles} trend={12} color="violet" delay={0.4} />
        <StatsCard title="Clientes VIP (2+)" value={stats.vip.toLocaleString()} icon={CheckCircle} trend={3} color="amber" delay={0.5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Produtos */}
        <motion.div variants={{ hidden:{opacity:0,y:20}, show:{opacity:1,y:0} }} className="glass-card p-8">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Package className="text-sky-400" size={20}/>Top Produtos</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={stats.topProducts}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={130} fontSize={10} fontWeight={700} stroke="#94a3b8"/>
                <Tooltip contentStyle={{ backgroundColor:'#0f172a', border:'none', borderRadius:'8px' }}/>
                <Bar dataKey="count" radius={[0,4,4,0]}>
                  {stats.topProducts.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Cidades */}
        <motion.div variants={{ hidden:{opacity:0,y:20}, show:{opacity:1,y:0} }} className="glass-card p-8">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2"><MapPin className="text-violet-400" size={20}/>Vendas por Cidade</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.cidades}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight={700} tickLine={false} axisLine={false}/>
                <YAxis stroke="#64748b" fontSize={10} fontWeight={700} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={{ backgroundColor:'#0f172a', border:'none', borderRadius:'8px' }}/>
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {stats.cidades.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ─── OVERVIEW de PARCELAS ─────────────────────────────────────────────────────
const ParcelasOverview = ({ rows }) => {
  const stats = useMemo(() => {
    let totalEmAberto = 0, totalPago = 0, totalGeral = 0;
    const lojaMap = {};
    rows.forEach(r => {
      const val = cleanVal(r['VALOR PARCELA']);
      const mov = String(r['MOVIMENTAÇÃO'] || '').toUpperCase();
      totalGeral += val;
      if (mov.includes('PAGO')) totalPago += val;
      else totalEmAberto += val;
      const loja = r['LOJA'] || 'Outros';
      lojaMap[loja] = (lojaMap[loja] || 0) + val;
    });
    return {
      totalGeral, totalPago, totalEmAberto,
      lojas: Object.entries(lojaMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,value])=>({name,value})),
    };
  }, [rows]);

  const fmt = (v) => `R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-5">
        <StatsCard title="Total em Carteira" value={fmt(stats.totalGeral)} icon={CreditCard} trend={0} color="sky" delay={0.1}/>
        <StatsCard title="Valor Pago" value={fmt(stats.totalPago)} icon={CheckCircle} trend={5} color="emerald" delay={0.2}/>
        <StatsCard title="Em Aberto" value={fmt(stats.totalEmAberto)} icon={AlertCircle} trend={-3} color="rose" delay={0.3}/>
      </div>
      <div className="glass-card p-8">
        <h3 className="text-xl font-black mb-6">Parcelas por Loja</h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.lojas}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight={700} tickLine={false} axisLine={false}/>
              <YAxis stroke="#64748b" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={{ backgroundColor:'#0f172a', border:'none', borderRadius:'8px' }} formatter={v=>fmt(v)}/>
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {stats.lojas.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ─── OVERVIEW de ORÇAMENTOS ───────────────────────────────────────────────────
const OrcamentosOverview = ({ rows }) => {
  const stats = useMemo(() => {
    let totalVal = 0; let convertidos = 0;
    const lojaMap = {};
    rows.forEach(r => {
      const val = cleanVal(r['VALOR DO ORÇAMENTO']);
      totalVal += val;
      const res = String(r['RESULTADO DA MENSAGEM'] || '').toUpperCase();
      if (res.includes('VENDA')) convertidos++;
      const loja = r['LOJA'] || 'Outros';
      lojaMap[loja] = (lojaMap[loja] || 0) + 1;
    });
    return {
      totalOrcamentos: rows.length, totalVal, convertidos,
      taxaConversao: rows.length ? (convertidos/rows.length*100) : 0,
      lojas: Object.entries(lojaMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,value])=>({name,value})),
    };
  }, [rows]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-5">
        <StatsCard title="Total Orçamentos" value={stats.totalOrcamentos.toLocaleString()} icon={ShoppingBag} trend={0} color="violet" delay={0.1}/>
        <StatsCard title="Valor Total" value={`R$ ${stats.totalVal.toLocaleString('pt-BR',{minimumFractionDigits:2})}`} icon={DollarSign} trend={5} color="sky" delay={0.2}/>
        <StatsCard title="Convertidos" value={stats.convertidos.toLocaleString()} icon={CheckCircle} trend={10} color="emerald" delay={0.3}/>
        <StatsCard title="Taxa Conversão" value={`${stats.taxaConversao.toFixed(1)}%`} icon={TrendingUp} trend={stats.taxaConversao>50?5:-3} color={stats.taxaConversao>50?'emerald':'rose'} delay={0.4}/>
      </div>
    </div>
  );
};

// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────────────────────
const Dashboard = ({ data, isSynced }) => {
  const [activeTab, setActiveTab] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'table'

  // data pode ser objeto {sheetName: rows[]} ou array direto (legado CSV)
  const sheets = useMemo(() => {
    if (!data) return {};
    if (Array.isArray(data)) return { 'Planilha': data };
    return data;
  }, [data]);

  const availableTabs = useMemo(() => {
    return SHEET_TABS.filter(t => sheets[t.key] && sheets[t.key].length > 0);
  }, [sheets]);

  const currentTab = activeTab || availableTabs[0]?.key;
  const currentRows = sheets[currentTab] || [];
  const currentConfig = SHEET_TABS.find(t => t.key === currentTab);

  const container = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.08}} };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-20">

      {/* Badge sincronizado */}
      {isSynced && (
        <motion.div variants={{ hidden:{opacity:0}, show:{opacity:1} }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">
          <CheckCircle size={12}/> Dados Sincronizados · {availableTabs.length} tabelas · Yasmin Ótica
        </motion.div>
      )}

      {/* ─── TAB BAR ─── */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.key;
            const count = (sheets[tab.key] || []).length;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setViewMode('overview'); }}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition-all whitespace-nowrap border ${
                  isActive
                    ? `bg-${tab.color}-500/20 border-${tab.color}-500/30 text-${tab.color}-400`
                    : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
                }`}
              >
                <Icon size={15}/>
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? `bg-${tab.color}-500/20 text-${tab.color}-300` : 'bg-white/10 text-slate-500'
                }`}>
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── VIEW MODE TOGGLE ─── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            viewMode === 'overview' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <BarChart2 size={14}/> Visão Geral
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            viewMode === 'table' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Table2 size={14}/> Ver Tabela Completa
        </button>
      </div>

      {/* ─── CONTENT ─── */}
      <AnimatePresence mode="wait">
        <motion.div key={`${currentTab}-${viewMode}`} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>

          {viewMode === 'table' ? (
            <div className="glass-card p-6">
              <DataTable sheetName={currentTab} rows={currentRows} />
            </div>
          ) : (
            <>
              {(currentTab === 'BD MARKETING' || currentTab === 'BD MARKETING ANTIGO') && (
                <MarketingOverview rows={currentRows} />
              )}
              {(currentTab === 'Controle_Parcelas' || currentTab === 'RELATÓRIO PARCELAS') && (
                <ParcelasOverview rows={currentRows} />
              )}
              {currentTab === 'ORÇAMENTOS' && (
                <OrcamentosOverview rows={currentRows} />
              )}
              {/* Outros sheets mostram diretamente a tabela */}
              {!['BD MARKETING','BD MARKETING ANTIGO','Controle_Parcelas','RELATÓRIO PARCELAS','ORÇAMENTOS'].includes(currentTab) && (
                <div className="glass-card p-6">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">
                    {currentConfig?.label} · {currentRows.length.toLocaleString()} registros
                  </p>
                  <DataTable sheetName={currentTab} rows={currentRows} />
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

    </motion.div>
  );
};

export default Dashboard;
