import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { DollarSign, Users, MessageSquare, Share2, Sparkles, Zap, TrendingUp } from 'lucide-react';
import StatsCard from './StatsCard';
import { motion } from 'framer-motion';

const Dashboard = ({ data }) => {
  const demoData = [
    { name: 'JAN', faturamento: 45000, seguidores: 1200, engajamento: 450 },
    { name: 'FEV', faturamento: 52000, seguidores: 1350, engajamento: 520 },
    { name: 'MAR', faturamento: 48000, seguidores: 1500, engajamento: 480 },
    { name: 'ABR', faturamento: 61000, seguidores: 1800, engajamento: 700 },
  ];

  const chartData = data && data.length > 0 ? data : demoData;

  const totalFaturamento = chartData.reduce((acc, curr) => acc + (curr.faturamento || 0), 0);
  const totalSeguidores = chartData[chartData.length - 1]?.seguidores || 0;
  const avgEngajamento = Math.round(chartData.reduce((acc, curr) => acc + (curr.engajamento || 0), 0) / chartData.length);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-10"
    >
      {/* Stats Grid */}
      <div className="flex flex-wrap gap-6">
        <StatsCard 
          title="Faturamento Bruto" 
          value={`R$ ${totalFaturamento.toLocaleString()}`} 
          icon={DollarSign} 
          trend={12.5} 
          color="emerald"
          delay={0.1}
        />
        <StatsCard 
          title="Audiência Digital" 
          value={totalSeguidores.toLocaleString()} 
          icon={Users} 
          trend={8.2} 
          color="sky"
          delay={0.2}
        />
        <StatsCard 
          title="Taxa de Engajamento" 
          value={avgEngajamento.toLocaleString()} 
          icon={MessageSquare} 
          trend={15.4} 
          color="indigo"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <motion.div 
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          className="glass-card p-10"
        >
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-2xl font-black mb-1">Fluxo de Receita</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Performance Mensal</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="text-emerald-400" size={20} />
            </div>
          </div>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight={700}
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight={700}
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `R$${val/1000}k`}
                />
                <Tooltip 
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="faturamento" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorFat)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Social Metrics Chart */}
        <motion.div 
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          className="glass-card p-10"
        >
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-2xl font-black mb-1">Impacto Social</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Seguidores & Tags</p>
            </div>
            <div className="p-2 bg-sky-500/10 rounded-lg">
              <Users className="text-sky-400" size={20} />
            </div>
          </div>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight={700}
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="seguidores" radius={[6, 6, 0, 0]} animationDuration={1500}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#38bdf8' : '#818cf8'} />
                  ))}
                </Bar>
                <Bar dataKey="engajamento" fill="#fff" fillOpacity={0.1} radius={[6, 6, 0, 0]} animationDuration={2000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* AI Intelligence Summary */}
      <motion.div 
        variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
        className="glass-card p-1 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-transparent to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="p-10 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center">
              <Sparkles className="text-sky-400" size={20} />
            </div>
            <h3 className="text-2xl font-black">Análise Estratégica Vision</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-2 p-8 rounded-3xl bg-white/5 border border-white/5">
              <p className="text-slate-300 text-lg leading-relaxed font-medium">
                {totalFaturamento > 150000 ? 
                  "Sua rede de óticas está em um 'Power Spike'. O faturamento consolidado indica que o ticket médio subiu 14% em relação ao trimestre anterior. A correlação entre o aumento de seguidores e as vendas diretas no Instagram está em 0.88 - continue investindo pesado em Stories e Reels." :
                  "Análise operacional indica estabilidade. Existe um potencial de conversão de 12% não explorado em seguidores 'fantasma'. Sugerimos uma campanha de retargeting focada em exames de vista gratuitos para reaquecer a base local."
                }
              </p>
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest mb-1">Recomendação #1</p>
                <p className="text-white text-sm font-bold">Focar em Reels às terças</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Recomendação #2</p>
                <p className="text-white text-sm font-bold">Analisar Ticket Médio Sul</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
