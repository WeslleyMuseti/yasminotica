import React, { useState, useMemo } from 'react';
import {
  Trophy, Medal, Award, Crown, Sparkles, TrendingUp,
  DollarSign, ShoppingBag, MapPin, Search, Filter,
  Calendar, Flame, Zap, ChevronRight, UserCheck, Star
} from 'lucide-react';

const cleanVal = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  let str = String(v).replace(/R\$\s?/g, '').trim();
  if (!str) return 0;
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      str = str.replace(/\./g, '');
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isValidText = (v) => {
  if (!v) return false;
  const s = String(v).trim();
  if (s === '' || s === '-' || s === '—') return false;
  const lower = s.toLowerCase();
  if (['#n/a', '#value!', '#ref!', '#name?', '#null!', '#num!', '#div/0!', 'null', 'undefined'].includes(lower)) return false;
  if (lower.startsWith('sem registro') || lower.startsWith('sem vendedor') || lower === 'nenhum' || lower === '0') return false;
  return true;
};

const VendorRanking = ({ data, selectedCity = 'ALL', onSelectVendor }) => {
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all', 'this_month', 'last_month', 'today'
  const [metricSort, setMetricSort] = useState('faturamento'); // 'faturamento', 'qtd', 'ticket'
  const [localCity, setLocalCity] = useState(selectedCity);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all sales from all available sources
  const vendorsData = useMemo(() => {
    if (!data) return [];

    const sheets = Array.isArray(data) ? { 'Planilha': data } : data;
    const allSales = [
      ...(sheets['Registro_Vendas'] || []),
      ...(sheets['BD MARKETING'] || []),
      ...(sheets['BD MARKETING ANTIGO'] || [])
    ];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const vendorMap = {};

    allSales.forEach(row => {
      // Extract vendor name
      let vendor = String(
        row['VENDEDOR'] ||
        row['OPERADOR'] ||
        row['Vendedor'] ||
        row['Operador'] ||
        row['ATENDENTE'] ||
        row['Atendente'] ||
        row['RESPONSAVEL'] ||
        row['Responsável'] ||
        row['NOME VENDEDOR'] ||
        ''
      ).trim();

      if (!isValidText(vendor)) return;

      // Filter by city/store
      const city = String(
        row['CIDADE'] ||
        row['Cidade'] ||
        row['UNIDADE'] ||
        row['Unidade'] ||
        row['LOJA'] ||
        row['Loja'] ||
        row['QUAL LOJA'] ||
        'Central'
      ).trim();

      if (localCity !== 'ALL') {
        const cLower = city.toLowerCase();
        const tLower = localCity.toLowerCase();
        if (!cLower.includes(tLower) && !tLower.includes(cLower)) {
          return;
        }
      }

      // Filter by date/period
      const rawDate = row['DATA  DA VENDA'] || row['DATA DA VENDA'] || row['DATA'] || row['Data'] || row['DATA_VENDA'] || row['createdAt'] || '';
      if (periodFilter !== 'all' && rawDate) {
        let saleDate = null;
        if (typeof rawDate === 'string') {
          if (rawDate.includes('/')) {
            const parts = rawDate.split('/');
            if (parts.length === 3) {
              const d = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10);
              const y = parseInt(parts[2].slice(0, 4), 10);
              if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                saleDate = new Date(y, m - 1, d);
              }
            }
          } else if (rawDate.includes('-')) {
            saleDate = new Date(rawDate);
          }
        } else if (rawDate instanceof Date) {
          saleDate = rawDate;
        }

        if (saleDate && !isNaN(saleDate.getTime())) {
          const sYear = saleDate.getFullYear();
          const sMonth = saleDate.getMonth() + 1;
          const sDay = saleDate.getDate();

          if (periodFilter === 'this_month') {
            if (sYear !== currentYear || sMonth !== currentMonth) return;
          } else if (periodFilter === 'last_month') {
            if (sYear !== lastMonthYear || sMonth !== lastMonth) return;
          } else if (periodFilter === 'today') {
            if (sYear !== currentYear || sMonth !== currentMonth || sDay !== now.getDate()) return;
          }
        }
      }

      const val = cleanVal(
        row['VALOR TOTAL'] ||
        row['VALOR DA VENDA'] ||
        row['VALOR'] ||
        row['VALOR DO ORÇAMENTO'] ||
        row['Valor'] ||
        0
      );

      // Normaliza chave de agrupamento
      const key = vendor.toUpperCase();

      if (!vendorMap[key]) {
        vendorMap[key] = {
          name: vendor,
          city: city || 'Geral',
          totalRevenue: 0,
          totalSales: 0,
          cities: {}
        };
      }

      vendorMap[key].totalRevenue += val;
      vendorMap[key].totalSales += 1;
      if (city) {
        vendorMap[key].cities[city] = (vendorMap[key].cities[city] || 0) + 1;
      }
    });

    let list = Object.values(vendorMap).map(v => {
      // Encontrar cidade predominante
      const predominantCity = Object.entries(v.cities).sort((a, b) => b[1] - a[1])[0]?.[0] || v.city;
      const ticketMedio = v.totalSales > 0 ? v.totalRevenue / v.totalSales : 0;
      return {
        ...v,
        city: predominantCity,
        ticketMedio
      };
    });

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => v.name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q));
    }

    // Sorting
    list.sort((a, b) => {
      if (metricSort === 'qtd') return b.totalSales - a.totalSales;
      if (metricSort === 'ticket') return b.ticketMedio - a.ticketMedio;
      return b.totalRevenue - a.totalRevenue;
    });

    return list;
  }, [data, localCity, periodFilter, metricSort, searchQuery]);

  const top3 = useMemo(() => vendorsData.slice(0, 3), [vendorsData]);
  const firstPlace = top3[0] || null;
  const secondPlace = top3[1] || null;
  const thirdPlace = top3[2] || null;

  const top10 = useMemo(() => vendorsData.slice(0, 10), [vendorsData]);

  // Team summary statistics
  const teamStats = useMemo(() => {
    let totalRevenue = 0;
    let totalSales = 0;
    let maxTicket = 0;
    let topVendorByTicket = null;

    vendorsData.forEach(v => {
      totalRevenue += v.totalRevenue;
      totalSales += v.totalSales;
      if (v.ticketMedio > maxTicket && v.totalSales >= 3) {
        maxTicket = v.ticketMedio;
        topVendorByTicket = v.name;
      }
    });

    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    const averagePerVendor = vendorsData.length > 0 ? totalRevenue / vendorsData.length : 0;

    return {
      totalRevenue,
      totalSales,
      averageTicket,
      averagePerVendor,
      totalVendors: vendorsData.length,
      topVendorByTicket: topVendorByTicket || (firstPlace?.name || '—')
    };
  }, [vendorsData, firstPlace]);

  const maxVal = firstPlace ? (metricSort === 'qtd' ? firstPlace.totalSales : metricSort === 'ticket' ? firstPlace.ticketMedio : firstPlace.totalRevenue) : 1;

  const getInitials = (name) => {
    if (!name) return 'VD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-8">
      
      {/* ─── CABEÇALHO & FILTROS INTELIGENTES ─── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Trophy size={26} className="stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  Ranking de Vendedores
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                    TOP 10 + PÓDIO
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Desempenho comercial, metas, ticket médio e pódio de líderes em tempo real.
                </p>
              </div>
            </div>
          </div>

          {/* Filtros em Barra */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Período */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 px-2 flex items-center gap-1 font-semibold">
                <Calendar size={13} className="text-sky-400" /> Período:
              </span>
              {[
                { id: 'all', label: 'Geral' },
                { id: 'this_month', label: 'Este Mês' },
                { id: 'last_month', label: 'Mês Passado' },
                { id: 'today', label: 'Hoje' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriodFilter(p.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                    periodFilter === p.id
                      ? 'bg-sky-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Métrica de Ordenação */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 px-2 flex items-center gap-1 font-semibold">
                <Filter size={13} className="text-amber-400" /> Ordenar por:
              </span>
              {[
                { id: 'faturamento', label: '💰 Faturamento' },
                { id: 'qtd', label: '📦 Qtd Vendas' },
                { id: 'ticket', label: '🎯 Ticket Médio' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMetricSort(m.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                    metricSort === m.id
                      ? 'bg-amber-500 text-slate-950 shadow font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Linha Secundária: Filtro por Loja e Busca por Nome */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <MapPin size={13} className="text-rose-400" /> Unidade:
            </span>
            {[
              { id: 'ALL', label: 'Todas as Lojas' },
              { id: 'Cajati', label: 'Cajati' },
              { id: 'Registro', label: 'Registro' },
              { id: 'Jacupiranga', label: 'Jacupiranga' },
              { id: 'Venda Externa', label: 'Venda Externa' },
            ].map(c => (
              <button
                key={c.id}
                onClick={() => setLocalCity(c.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  localCity === c.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Buscar vendedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ─── CARDS DE KPI RESUMO DA EQUIPE COMERCIAL ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Líder Atual (1º)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Crown size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-amber-300 truncate">{firstPlace?.name || 'Nenhum'}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
            <span className="text-emerald-400 font-bold">{fmtMoeda(firstPlace?.totalRevenue || 0)}</span>
            <span>• {firstPlace?.totalSales || 0} OS</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento da Equipe</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-400">{fmtMoeda(teamStats.totalRevenue)}</div>
          <div className="text-xs text-slate-400 mt-1">
            Média de <span className="text-white font-bold">{fmtMoeda(teamStats.averagePerVendor)}</span> / vendedor
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/20 transition-all" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Vendas Realizadas</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-white">{teamStats.totalSales.toLocaleString()} OS</div>
          <div className="text-xs text-slate-400 mt-1">
            {teamStats.totalVendors} vendedores ativos no período
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-violet-500/40 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/20 transition-all" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio Geral</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-xl font-black text-violet-300">{fmtMoeda(teamStats.averageTicket)}</div>
          <div className="text-xs text-slate-400 mt-1 truncate">
            Top Ticket: <span className="text-white font-bold">{teamStats.topVendorByTicket}</span>
          </div>
        </div>
      </div>

      {/* ─── O PÓDIO DOS 3 PRIMEIROS COLOCADOS ─── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2.5">
              <Crown className="text-amber-400 fill-amber-400/20" size={24} />
              Pódio dos Campeões
            </h3>
            <p className="text-xs text-slate-400">Os 3 maiores destaques comerciais do período selecionado.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Sparkles size={14} className="text-amber-400" />
            Classificação Oficial
          </div>
        </div>

        {vendorsData.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm font-semibold">
            Nenhum vendedor encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8 max-w-4xl mx-auto">
            
            {/* 🥈 2º LUGAR (PRATA) - ESQUERDA */}
            <div className="order-2 md:order-1 flex flex-col items-center">
              {secondPlace ? (
                <div className="w-full flex flex-col items-center">
                  {/* Badge & Avatar */}
                  <div className="relative mb-3 flex flex-col items-center group">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-white p-[3px] shadow-xl shadow-slate-500/20 transform group-hover:scale-105 transition-all">
                      <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-black text-slate-200 text-xl tracking-wider">
                        {getInitials(secondPlace.name)}
                      </div>
                    </div>
                    <div className="absolute -bottom-2 bg-gradient-to-r from-slate-400 to-slate-200 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white/40">
                      <Medal size={12} className="stroke-[2.5]" /> 2º LUGAR
                    </div>
                  </div>

                  {/* Informações do Vendedor */}
                  <div className="text-center mt-2 w-full px-2">
                    <h4 className="font-extrabold text-slate-100 text-base truncate max-w-[200px] mx-auto">{secondPlace.name}</h4>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md mt-1">
                      <MapPin size={10} className="text-sky-400" /> {secondPlace.city}
                    </span>
                    <div className="text-xl font-black text-slate-200 mt-2">{fmtMoeda(secondPlace.totalRevenue)}</div>
                    <div className="text-xs text-slate-400 font-semibold mt-0.5">
                      {secondPlace.totalSales} vendas • TM: {fmtMoeda(secondPlace.ticketMedio)}
                    </div>
                  </div>

                  {/* Bloco do Pódio Prata */}
                  <div className="w-full h-36 mt-4 rounded-t-2xl bg-gradient-to-b from-slate-700/80 via-slate-800 to-slate-900 border-t-2 border-x-2 border-slate-400/50 shadow-lg flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="text-5xl font-black text-slate-400/30 select-none">2</div>
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">PRATA</div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-48 border border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 text-xs font-semibold">
                  Sem 2º Colocado
                </div>
              )}
            </div>

            {/* 🥇 1º LUGAR (OURO) - CENTRO (MAIS ALTO E DESTACADO) */}
            <div className="order-1 md:order-2 flex flex-col items-center -mt-6">
              {firstPlace ? (
                <div className="w-full flex flex-col items-center">
                  {/* Coroa & Avatar Ouro */}
                  <div className="relative mb-3 flex flex-col items-center group">
                    <div className="absolute -top-7 text-amber-400 animate-bounce">
                      <Crown size={28} className="fill-amber-400 stroke-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    </div>
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 p-[4px] shadow-2xl shadow-amber-500/40 transform group-hover:scale-105 transition-all">
                      <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-black text-amber-300 text-2xl tracking-wider">
                        {getInitials(firstPlace.name)}
                      </div>
                    </div>
                    <div className="absolute -bottom-2.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-amber-100">
                      <Trophy size={13} className="stroke-[2.5]" /> 1º CAMPEÃO
                    </div>
                  </div>

                  {/* Informações do Vendedor */}
                  <div className="text-center mt-3 w-full px-2">
                    <h4 className="font-black text-white text-lg truncate max-w-[220px] mx-auto">{firstPlace.name}</h4>
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full mt-1">
                      <MapPin size={11} /> {firstPlace.city}
                    </span>
                    <div className="text-2xl font-black text-amber-400 mt-2 drop-shadow-sm">{fmtMoeda(firstPlace.totalRevenue)}</div>
                    <div className="text-xs text-amber-200/80 font-bold mt-0.5">
                      {firstPlace.totalSales} vendas • TM: {fmtMoeda(firstPlace.ticketMedio)}
                    </div>
                  </div>

                  {/* Bloco do Pódio Ouro */}
                  <div className="w-full h-48 mt-4 rounded-t-2xl bg-gradient-to-b from-amber-500/30 via-slate-900 to-slate-950 border-t-4 border-x-2 border-amber-400 shadow-2xl shadow-amber-500/20 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-400/10 to-transparent pointer-events-none" />
                    <div className="text-6xl font-black text-amber-400/40 select-none">1</div>
                    <div className="text-xs font-black text-amber-300 uppercase tracking-widest mt-1 flex items-center gap-1">
                      <Sparkles size={12} /> OURO
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-56 border border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 text-xs font-semibold">
                  Sem 1º Colocado
                </div>
              )}
            </div>

            {/* 🥉 3º LUGAR (BRONZE) - DIREITA */}
            <div className="order-3 flex flex-col items-center">
              {thirdPlace ? (
                <div className="w-full flex flex-col items-center">
                  {/* Badge & Avatar */}
                  <div className="relative mb-3 flex flex-col items-center group">
                    <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-400 p-[3px] shadow-xl shadow-amber-800/20 transform group-hover:scale-105 transition-all">
                      <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center font-black text-amber-400 text-lg tracking-wider">
                        {getInitials(thirdPlace.name)}
                      </div>
                    </div>
                    <div className="absolute -bottom-2 bg-gradient-to-r from-amber-700 to-amber-500 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-amber-300/30">
                      <Medal size={12} className="stroke-[2.5]" /> 3º LUGAR
                    </div>
                  </div>

                  {/* Informações do Vendedor */}
                  <div className="text-center mt-2 w-full px-2">
                    <h4 className="font-extrabold text-slate-100 text-base truncate max-w-[200px] mx-auto">{thirdPlace.name}</h4>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md mt-1">
                      <MapPin size={10} className="text-sky-400" /> {thirdPlace.city}
                    </span>
                    <div className="text-xl font-black text-amber-500 mt-2">{fmtMoeda(thirdPlace.totalRevenue)}</div>
                    <div className="text-xs text-slate-400 font-semibold mt-0.5">
                      {thirdPlace.totalSales} vendas • TM: {fmtMoeda(thirdPlace.ticketMedio)}
                    </div>
                  </div>

                  {/* Bloco do Pódio Bronze */}
                  <div className="w-full h-28 mt-4 rounded-t-2xl bg-gradient-to-b from-amber-900/50 via-slate-900 to-slate-950 border-t-2 border-x-2 border-amber-700/60 shadow-lg flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="text-4xl font-black text-amber-700/40 select-none">3</div>
                    <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">BRONZE</div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-40 border border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 text-xs font-semibold">
                  Sem 3º Colocado
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ─── TABELA / LEADERBOARD TOP 10 (POSIÇÕES 1ª A 10ª E GERAL) ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="text-indigo-400" size={20} />
              Quadro de Líderes Completo (Top 10)
            </h3>
            <p className="text-xs text-slate-400">Classificação progressiva de faturamento, volume de ordens de serviço e metas.</p>
          </div>
          <div className="text-xs font-bold text-slate-400">
            Exibindo {Math.min(10, vendorsData.length)} de {vendorsData.length} vendedores
          </div>
        </div>

        {vendorsData.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-bold">
            Nenhum dado encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="space-y-3">
            {top10.map((v, index) => {
              const rank = index + 1;
              const comparisonVal = metricSort === 'qtd' ? v.totalSales : metricSort === 'ticket' ? v.ticketMedio : v.totalRevenue;
              const percent = maxVal > 0 ? Math.min(100, Math.round((comparisonVal / maxVal) * 100)) : 0;

              return (
                <div
                  key={v.name}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl transition-all border ${
                    rank === 1
                      ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60'
                      : rank === 2
                        ? 'bg-slate-800/80 border-slate-400/30 hover:border-slate-400/50'
                        : rank === 3
                          ? 'bg-amber-950/20 border-amber-700/30 hover:border-amber-700/50'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  {/* Lado Esquerdo: Posição, Avatar e Nome */}
                  <div className="flex items-center gap-3.5 min-w-[220px]">
                    {/* Badge de Posição */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm">
                      {rank === 1 && <span className="text-amber-400 text-lg">🥇</span>}
                      {rank === 2 && <span className="text-slate-300 text-lg">🥈</span>}
                      {rank === 3 && <span className="text-amber-600 text-lg">🥉</span>}
                      {rank > 3 && (
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-700">
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow ${
                      rank === 1
                        ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                        : rank === 2
                          ? 'bg-slate-300 text-slate-900 shadow-slate-400/20'
                          : rank === 3
                            ? 'bg-amber-700 text-amber-100 shadow-amber-700/20'
                            : 'bg-slate-800 text-sky-400 border border-slate-700'
                    }`}>
                      {getInitials(v.name)}
                    </div>

                    {/* Nome & Cidade */}
                    <div className="truncate">
                      <div className="font-extrabold text-white text-sm truncate flex items-center gap-1.5">
                        {v.name}
                        {rank === 1 && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/30">
                            TOP 1
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <MapPin size={10} className="text-sky-400" />
                        {v.city}
                      </div>
                    </div>
                  </div>

                  {/* Centro: Barra de Progresso Comparativo */}
                  <div className="flex-1 max-w-md px-2 hidden lg:block">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span>Proporção frente ao Líder</span>
                      <span className={rank === 1 ? 'text-amber-400 font-black' : 'text-slate-300'}>{percent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          rank === 1
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                            : rank === 2
                              ? 'bg-gradient-to-r from-slate-400 to-slate-200'
                              : rank === 3
                                ? 'bg-gradient-to-r from-amber-700 to-amber-500'
                                : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Lado Direito: Métricas de Desempenho */}
                  <div className="flex items-center justify-between md:justify-end gap-6 text-right">
                    {/* Qtd Vendas */}
                    <div className="text-left md:text-right">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Vendas (OS)</div>
                      <div className="text-sm font-extrabold text-white flex items-center gap-1">
                        <ShoppingBag size={12} className="text-sky-400 hidden sm:inline" />
                        {v.totalSales}
                      </div>
                    </div>

                    {/* Ticket Médio */}
                    <div className="text-left md:text-right">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Ticket Médio</div>
                      <div className="text-sm font-extrabold text-violet-300">
                        {fmtMoeda(v.ticketMedio)}
                      </div>
                    </div>

                    {/* Faturamento Total */}
                    <div className="text-right min-w-[120px]">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Faturamento</div>
                      <div className={`text-base font-black ${
                        rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-200' : rank === 3 ? 'text-amber-500' : 'text-emerald-400'
                      }`}>
                        {fmtMoeda(v.totalRevenue)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default VendorRanking;
