import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, trend, color, delay = 0 }) => {
  const isPositive = trend > 0;

  const colorMap = {
    emerald: 'from-emerald-400 to-green-600',
    sky: 'from-sky-400 to-blue-600',
    indigo: 'from-indigo-400 to-violet-600',
    rose: 'from-rose-400 to-pink-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, type: 'spring', stiffness: 100 }}
      className="glass-card p-6 min-w-[280px] flex-1 relative overflow-hidden group"
    >
      {/* Background Glow */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${colorMap[color]} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorMap[color]} shadow-lg shadow-sky-500/10`}>
          <Icon size={24} className="text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
            }`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="relative z-10">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.15em] mb-2">{title}</p>
        <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
      </div>

      {/* Decorative Line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </motion.div>
  );
};

export default StatsCard;
