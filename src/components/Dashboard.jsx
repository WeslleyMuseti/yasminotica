import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  DollarSign, CheckCircle, TrendingUp, Users, ShoppingBag,
  MapPin, Sparkles, AlertCircle, Package, CreditCard,
  MonitorSmartphone, Layers, Table2, BarChart2, PlusCircle
} from 'lucide-react';
import StatsCard from './StatsCard';
import DataTable from './DataTable';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#38bdf8', '#818cf8', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#fb7185', '#34d399'];

const SHEET_TABS = [
  { key: 'MARKETING',               label: 'Marketing',          icon: Users,            color: 'sky'     },
  { key: 'BD MARKETING',            label: 'BD Marketing',       icon: Users,            color: 'indigo'  },
  { key: 'BD MARKETING ANTIGO',     label: 'Mktg. Antigo',       icon: Layers,           color: 'slate'   },
  { key: 'Registro_Vendas',         label: 'Registro Vendas',    icon: ShoppingBag,      color: 'emerald' },
  { key: 'Controle_Parcelas',       label: 'Parcelas',           icon: CreditCard,       color: 'amber'   },
  { key: 'RELATÓRIO PARCELAS',      label: 'Rel. Parcelas',      icon: Table2,           color: 'orange'  },
  { key: 'ORÇAMENTOS',              label: 'Orçamentos',         icon: ShoppingBag,      color: 'violet'  },
  { key: 'Cópia de DADOS DIOPTRIA', label: 'Dioptria',           icon: Package,          color: 'teal'    },
  { key: 'AnáliseInfluencer',       label: 'Influencers',        icon: MonitorSmartphone, color: 'pink'   },
  { key: 'ESTOQUE ENTRADA SAÍDAS',  label: 'Estoque',            icon: BarChart2,        color: 'emerald' },
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
    const clienteFreq = {}; // conta quantas OS por nome
    const produtosMap = {};
    const cidadeMap = {};
    const mesMap = {};
    const statusMap = {};
    let withPhone = 0, withInstagram = 0;
    let tirouFoto = 0, lojaMarcou = 0;

    // Retorna true apenas para valores reais (exclui vazio, erros Excel, "Sem Registro...")
    const isValid = (v) => {
      if (v === null || v === undefined || v === '') return false;
      const s = String(v).trim();
      if (s === '') return false;
      if (['#N/A','#VALUE!','#REF!','#NAME?','#NULL!','#NUM!','#DIV/0!'].includes(s)) return false;
      if (s.toLowerCase().startsWith('sem registro')) return false;
      return true;
    };

    rows.forEach(r => {
      // Nomes de coluna EXATOS da planilha
      const nome      = isValid(r['NOME'])    ? String(r['NOME']).trim()    : '';
      const prod      = isValid(r['PRODUTO']) ? String(r['PRODUTO']).trim() : null;
      const cidade    = isValid(r['CIDADE'])  ? String(r['CIDADE']).trim()  : null;
      const mes       = isValid(r['MÊS'])     ? String(r['MÊS']).trim()    : null;
      const statusRaw = r['RESULTADO DA LIGAÇÃO/ MENSAGEM (30 DIAS)'];
      const status    = isValid(statusRaw)    ? String(statusRaw).trim()    : null;

      const nomeKey = nome.toUpperCase();
      if (nomeKey) {
        clientesMap.add(nomeKey);
        clienteFreq[nomeKey] = (clienteFreq[nomeKey] || 0) + 1;
      }

      if (prod)   produtosMap[prod]   = (produtosMap[prod]   || 0) + 1;

      // Produto real: LENTE e ARMAÇÃO são colunas separadas na aba MARKETING
      const lente  = isValid(r['LENTE'])   ? String(r['LENTE']).trim()   : null;
      const armaca = isValid(r['ARMAÇÃO']) ? String(r['ARMAÇÃO']).trim() : null;
      if (lente)  produtosMap['Lente: ' + lente]     = (produtosMap['Lente: ' + lente]     || 0) + 1;
      if (armaca) produtosMap['Armação: ' + armaca] = (produtosMap['Armação: ' + armaca] || 0) + 1;
      if (cidade) cidadeMap[cidade]   = (cidadeMap[cidade]   || 0) + 1;
      if (mes)    mesMap[mes]         = (mesMap[mes]         || 0) + 1;
      if (status) statusMap[status]   = (statusMap[status]   || 0) + 1;

      // WhatsApp: telefone real preenchido (aceita números e strings não-vazias)
      const tel = r['TELEFONE CLIENTE'];
      if (tel !== '' && tel !== null && tel !== undefined && !isNaN(Number(tel)) && Number(tel) > 0) withPhone++;

      // Instagram: @ preenchido OU marcou no post
      if (isValid(r['INSTAGRAM']) || isValid(r['REMARCOU INSTAGRAM']) || isValid(r['MARCOU NO INSTAGRAM'])) withInstagram++;

      // Engajamento Social
      if (isValid(r['TIROU FOTO?']) || isValid(r['TIROU FOTO ÓCULOS?'])) tirouFoto++;
      if (isValid(r['LOJA MARCOU  CLIENTE?']) || isValid(r['LOJA MARCOU CLIENTE?']) || isValid(r['LOJA MARCOU CLIENTE ÓCULOS?'])) lojaMarcou++;
    });

    // VIP = clientes com 2+ ordens de serviço (voltaram à loja)
    const vip = Object.values(clienteFreq).filter(c => c >= 2).length;

    return {
      totalClientes: clientesMap.size,
      totalOS: rows.length,
      withPhone, withInstagram, vip, tirouFoto, lojaMarcou,
      topProducts: Object.entries(produtosMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([name, count]) => ({ name: name.length > 22 ? name.slice(0, 22) + '…' : name, count })),
      cidades: Object.entries(cidadeMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([name, value]) => ({ name, value })),
      followupStatus: Object.entries(statusMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([name, value]) => ({ name, value })),
      meses: Object.entries(mesMap).map(([name, value]) => ({ name, value })),
    };
  }, [rows]);

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="flex flex-wrap gap-5">
        <StatsCard title="Total de OS" value={stats.totalOS.toLocaleString()} icon={ShoppingBag} trend={10} color="sky" delay={0.1} />
        <StatsCard title="Clientes Únicos" value={stats.totalClientes.toLocaleString()} icon={Users} trend={8} color="indigo" delay={0.2} />
        <StatsCard title="Clientes VIP (2+)" value={stats.vip.toLocaleString()} icon={CheckCircle} trend={3} color="amber" delay={0.3} />
        <StatsCard title="Com WhatsApp" value={stats.withPhone.toLocaleString()} icon={MonitorSmartphone} trend={5} color="emerald" delay={0.4} />
        <StatsCard title="No Instagram" value={stats.withInstagram.toLocaleString()} icon={Sparkles} trend={12} color="violet" delay={0.5} />
        <StatsCard title="Tirou Foto" value={stats.tirouFoto.toLocaleString()} icon={CheckCircle} trend={0} color="pink" delay={0.6} />
        <StatsCard title="Loja Marcou" value={stats.lojaMarcou.toLocaleString()} icon={TrendingUp} trend={0} color="teal" delay={0.7} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Top Produtos */}
        <div className="glass-card p-8">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Package className="text-sky-400" size={20}/>Top Produtos</h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="99%" height="100%">
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
        </div>

        {/* Cidades */}
        <div className="glass-card p-8">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2"><MapPin className="text-violet-400" size={20}/>Vendas por Cidade</h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="99%" height="100%">
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
        </div>
      </div>
    </div>
  );
};

// ─── OVERVIEW de PARCELAS ─────────────────────────────────────────────────────
const ParcelasOverview = ({ rows }) => {
  const stats = useMemo(() => {
    let totalEmAberto = 0, totalPago = 0, totalGeral = 0;
    let qtdPago = 0, qtdAberto = 0;
    const lojaMap = {};
    const clientesSet = new Set();

    rows.forEach(r => {
      // Nomes exatos das colunas reais da planilha
      const val  = cleanVal(r['Valor Parcela'] || r['VALOR PARCELA'] || r['VALOR TOTAL'] || 0);
      // Moviment. = '—' ou vazio = pendente; qualquer outro valor = pago/acordo
      const mov  = String(r['Moviment.'] || r['MOVIMENTAÇÃO'] || r['SITUAÇÃO'] || '—').trim();
      const loja = String(r['Loja'] || r['LOJA'] || 'Outros').trim();
      // Busca o nome do cliente em várias possíveis colunas
      const nomeRaw = r['Nome'] || r['NOME'] || r['NOME CLIENTE'] || r['Cliente'] || r['CLIENTE'] || '';
      const nome = String(nomeRaw).trim().toUpperCase();

      totalGeral += val;

      const isPago = mov !== '—' && mov !== '' && !mov.toLowerCase().includes('pendente');
      if (isPago) {
        totalPago += val;
        qtdPago++;
      } else {
        totalEmAberto += val;
        qtdAberto++;
      }

      if (loja && loja !== 'Outros') lojaMap[loja] = (lojaMap[loja] || 0) + val;
      if (nome) clientesSet.add(nome);
    });

    return {
      totalGeral, totalPago, totalEmAberto,
      qtdPago, qtdAberto,
      totalClientes: clientesSet.size,
      lojas: Object.entries(lojaMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([name, value]) => ({ name, value })),
    };
  }, [rows]);

  const fmt = (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-5">
        <StatsCard title="Total em Carteira"  value={fmt(stats.totalGeral)}      icon={CreditCard}  trend={0}  color="sky"     delay={0.1}/>
        <StatsCard title="Valor Quitado"      value={fmt(stats.totalPago)}       icon={CheckCircle} trend={5}  color="emerald" delay={0.2}/>
        <StatsCard title="Em Aberto"          value={fmt(stats.totalEmAberto)}   icon={AlertCircle} trend={-3} color="rose"    delay={0.3}/>
        <StatsCard title="Parcelas Pagas"     value={stats.qtdPago.toLocaleString()}    icon={CheckCircle} trend={0}  color="teal"    delay={0.4}/>
        <StatsCard title="Parcelas Pendentes" value={stats.qtdAberto.toLocaleString()}  icon={AlertCircle} trend={0}  color="amber"   delay={0.5}/>
        <StatsCard title="Clientes"           value={stats.totalClientes.toLocaleString()} icon={Users}   trend={0}  color="indigo"  delay={0.6}/>
      </div>
      <div className="glass-card p-8 mt-8">
        <h3 className="text-xl font-black mb-6">Carteira por Loja</h3>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="99%" height="100%">
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
const Dashboard = ({ data, isSynced, onRowUpdate, onAddClick }) => {
  const [activeTab, setActiveTab] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'table'

  // data pode ser objeto {sheetName: rows[]} ou array direto (legado CSV)
  const sheets = useMemo(() => {
    if (!data) return {};
    if (Array.isArray(data)) return { 'Planilha': data };
    return data;
  }, [data]);

  const availableTabs = useMemo(() => {
    // Guias pré-configuradas (com ícones/cores específicas)
    const predefined = SHEET_TABS.filter(t => sheets[t.key] && sheets[t.key].length > 0);
    const predefinedKeys = new Set(SHEET_TABS.map(t => t.key));
    
    // Guias extras (qualquer outra aba do Excel que tenha dados)
    const extraTabs = Object.keys(sheets)
      .filter(key => !predefinedKeys.has(key) && sheets[key].length > 0)
      .map((key, index) => ({
        key,
        label: key, // Usando o nome original
        icon: Table2,
        color: ['slate', 'sky', 'emerald', 'amber', 'rose', 'fuchsia'][index % 6]
      }));

    return [...predefined, ...extraTabs];
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
      <div className="flex flex-wrap items-center gap-2 justify-between w-full">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              viewMode === 'overview' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-500 hover:text-slate-300 bg-white/5 border border-transparent'
            }`}
          >
            <BarChart2 size={14}/> Visão Geral
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              viewMode === 'table' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-500 hover:text-slate-300 bg-white/5 border border-transparent'
            }`}
          >
            <Table2 size={14}/> Ver Tabela Completa
          </button>
        </div>

        {/* Botão Adicionar Informações */}
        {onAddClick && currentRows && (
          <button
            onClick={() => {
              const emptyRow = {};
              if (currentRows.length > 0) {
                Object.keys(currentRows[0]).forEach(k => emptyRow[k] = '');
              }
              onAddClick(currentTab, emptyRow);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30 transition-all ml-auto"
          >
            <PlusCircle size={14}/> Adicionar Informações
          </button>
        )}
      </div>

      {/* ─── CONTENT ─── */}
      <AnimatePresence mode="wait">
        <motion.div key={`${currentTab}-${viewMode}`} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>

          {viewMode === 'table' ? (
            <div className="glass-card p-6">
              <DataTable sheetName={currentTab} rows={currentRows} onRowUpdate={onRowUpdate} />
            </div>
          ) : (
            <>
              {(['MARKETING', 'BD MARKETING', 'BD MARKETING ANTIGO', 'Registro_Vendas'].includes(currentTab)) && (
                <MarketingOverview rows={currentRows} />
              )}
              {(currentTab === 'Controle_Parcelas' || currentTab === 'RELATÓRIO PARCELAS') && (
                <ParcelasOverview rows={currentRows} />
              )}
              {currentTab === 'ORÇAMENTOS' && (
                <OrcamentosOverview rows={currentRows} />
              )}
              {/* Outros sheets mostram diretamente a tabela */}
              {!['MARKETING','BD MARKETING','BD MARKETING ANTIGO','Registro_Vendas','Controle_Parcelas','RELATÓRIO PARCELAS','ORÇAMENTOS'].includes(currentTab) && (
                <div className="glass-card p-6">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">
                    {currentConfig?.label} · {currentRows.length.toLocaleString()} registros
                  </p>
                  <DataTable sheetName={currentTab} rows={currentRows} onRowUpdate={onRowUpdate} />
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
