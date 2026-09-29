import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

const colorThemes = {
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16, 185, 129, 0.25)',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  sky: {
    gradient: 'from-sky-500 to-blue-600',
    glow: 'rgba(56, 189, 248, 0.25)',
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20'
  },
  indigo: {
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'rgba(99, 102, 241, 0.25)',
    text: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20'
  },
  violet: {
    gradient: 'from-violet-500 to-purple-600',
    glow: 'rgba(139, 92, 246, 0.25)',
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20'
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    glow: 'rgba(245, 158, 11, 0.25)',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  },
  rose: {
    gradient: 'from-rose-500 to-red-600',
    glow: 'rgba(244, 63, 94, 0.25)',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20'
  },
  teal: {
    gradient: 'from-teal-500 to-emerald-600',
    glow: 'rgba(20, 184, 166, 0.25)',
    text: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20'
  },
  pink: {
    gradient: 'from-pink-500 to-rose-600',
    glow: 'rgba(236, 72, 153, 0.25)',
    text: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20'
  }
};

const StatsCard = ({ title, value, icon: Icon, trend, color = 'sky', delay = 0, subtitle }) => {
  const theme = colorThemes[color] || colorThemes.sky;
  const isPositive = trend > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-3xl bg-slate-900/70 border border-white/10 p-6 backdrop-blur-xl shadow-xl hover:border-white/20 transition-all group min-w-[240px] flex-1"
      style={{
        boxShadow: `0 10px 30px -10px ${theme.glow}`
      }}
    >
      {/* Luz ambiente de fundo no hover */}
      <div 
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)` }}
      />

      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-lg shadow-black/40 group-hover:scale-105 transition-transform`}>
          <Icon size={22} className="text-white" />
        </div>
        {trend !== undefined && trend !== null && trend !== 0 && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide ${
            isPositive ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
          }`}>
            {isPositive ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="relative z-10 space-y-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{title}</p>
        <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight truncate">{value}</h3>
        {subtitle && (
          <p className="text-[11px] font-medium text-slate-500 truncate pt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Linha de gradiente decorativa na borda inferior */}
      <div className={`absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r ${theme.gradient} opacity-40 group-hover:opacity-100 transition-opacity`} />
    </motion.div>
  );
};

export default StatsCard;
