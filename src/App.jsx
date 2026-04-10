import React, { useState } from 'react';
import FileUploader from './components/FileUploader';
import Dashboard from './components/Dashboard';
import { Eye, BarChart3, Users, Zap, ArrowDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import heroImage from './assets/hero-visual.png';

function App() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('landing'); // landing, dashboard

  const handleDataLoaded = (loadedData) => {
    setData(loadedData);
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToUploader = () => {
    document.getElementById('start').scrollIntoView({ behavior: 'smooth' });
  };

  if (view === 'dashboard') {
    return (
      <div className="container min-h-screen">
        <nav className="flex justify-between items-center py-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
              <Eye className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-black title-gradient uppercase">Vision Analytics</h1>
          </div>
          <button 
            onClick={() => { setView('landing'); setData(null); }}
            className="px-6 py-2 glass-card text-sky-400 text-sm font-bold border-sky-400/20 hover:bg-sky-400/10 transition-all rounded-full"
          >
            Sair do Dashboard
          </button>
        </nav>
        <Dashboard data={data} />
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-md border-b border-white/5 bg-black/10">
        <div className="max-w-[1300px] mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Eye className="text-sky-400" size={28} />
            <span className="text-xl font-black tracking-tighter uppercase whitespace-nowrap">Vision <span className="text-sky-400">Analytics</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
            <a href="#features" className="hover:text-white transition-colors">Benefícios</a>
            <a href="#start" className="px-5 py-2 glass-card text-white hover:bg-white/5 transition-all rounded-full border-white/10">Entrar</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section pt-32 lg:pt-0">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="flex-1 space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-black uppercase tracking-widest">
            <Zap size={14} /> Inteligência Artificial para Óticas
          </div>
          <h1 className="text-7xl md:text-8xl font-black leading-[0.9] tracking-tighter">
            Enxergue além <br/>
            <span className="title-gradient">dos números.</span>
          </h1>
          <p className="text-slate-400 text-xl max-w-xl leading-relaxed">
            A plataforma líder em análise preditiva para redes de óticas. 
            Transforme suas planilhas de faturamento e redes sociais em lucro real.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button onClick={scrollToUploader} className="button-primary flex items-center gap-2">
              Começar Analisar <ChevronRight size={20} />
            </button>
            <button className="px-8 py-4 glass-card font-bold hover:bg-white/5 transition-all rounded-full border-white/10">
              Ver Demo
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="flex-1 flex justify-center lg:justify-end"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-sky-500/20 blur-[120px] rounded-full"></div>
            <img 
              src={heroImage} 
              alt="Vision Analytics Visual" 
              className="relative z-10 w-full max-w-[500px] drop-shadow-2xl animate-float"
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black mb-6">Tudo em um único lugar</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Nossas ferramentas foram desenhadas especificamente para o fluxo de trabalho de óticas modernas.</p>
        </div>

        <div className="feature-grid">
          {[
            { 
              title: "Social Insight", 
              desc: "Analise engajamento do Instagram e Facebook em segundos.", 
              icon: Users,
              color: "from-sky-400 to-blue-600"
            },
            { 
              title: "Fluxo de Caixa", 
              desc: "Veja tendências de faturamento e sazonalidade de vendas.", 
              icon: BarChart3,
              color: "from-emerald-400 to-teal-600"
            },
            { 
              title: "IA Preditiva", 
              desc: "Resumos gerados por inteligência para decisões rápidas.", 
              icon: Zap,
              color: "from-indigo-400 to-violet-600"
            }
          ].map((f, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="glass-card feature-card group"
            >
              <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-8 shadow-2xl`}>
                <f.icon className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Uploader Section */}
      <section id="start" className="py-40 bg-gradient-to-b from-transparent to-sky-500/5">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black mb-6">Pronto para começar?</h2>
          <p className="text-slate-400">Suba sua planilha abaixo e veja a mágica acontecer.</p>
        </div>
        <FileUploader onDataLoaded={handleDataLoaded} />
      </section>

      <footer className="py-20 border-t border-white/5 bg-black/20 mt-20">
        <div className="container text-center space-y-6">
          <div className="flex justify-center items-center gap-3 mb-8">
            <Eye className="text-sky-400" size={32} />
            <span className="text-2xl font-black tracking-tighter uppercase">Vision <span className="text-sky-400">Analytics</span></span>
          </div>
          <p className="text-slate-500 text-sm font-medium tracking-[0.3em] uppercase">Excelência em Gestão Visual</p>
          <div className="pt-10 text-slate-600 text-[10px] uppercase tracking-widest">
            &copy; 2026 Ótica Vision Analytics System. Proprietary Technology.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
