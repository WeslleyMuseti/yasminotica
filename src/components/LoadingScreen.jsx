import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Database, Eye } from 'lucide-react';

const LoadingScreen = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { text: "Conectando ao banco de dados em tempo real...", icon: Database },
    { text: "Carregando catálogo de armações e lentes...", icon: Eye },
    { text: "Sincronizando clientes e ordens de serviço...", icon: Sparkles },
    { text: "Ambiente pronto e seguro!", icon: ShieldCheck }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 400);
    return () => clearInterval(interval);
  }, [steps.length]);

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center text-white overflow-hidden select-none animate-in fade-in duration-300"
      style={{
        backgroundColor: '#F2EFE7',
        backgroundImage: 'radial-gradient(at 0% 0%, hsla(210, 100%, 12%, 0.95) 0, transparent 65%), radial-gradient(at 100% 100%, hsla(260, 100%, 12%, 0.95) 0, transparent 65%)'
      }}
    >
      {/* Luzes de fundo / Efeito Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Conteúdo Central */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center">
        
        {/* Logo com Glow Pulsante */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 via-purple-500 to-emerald-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 animate-pulse transition-opacity duration-1000" />
          <div className="relative bg-[#0f172a]/90 p-4 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl flex items-center justify-center">
            <img 
              src="/logo-yasmin-transparent.png" 
              alt="Yasmin Ótica" 
              className="h-16 md:h-20 w-auto object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.4)]"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/logo-yasmin.png";
              }}
            />
          </div>
        </div>

        {/* Título & Badge */}
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-1.5 flex items-center gap-2 font-['Outfit']">
          <span>YASMIN ÓTICA</span>
        </h1>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6 bg-white/5 px-3.5 py-1 rounded-full border border-white/5">
          Sistema de Gestão & ERP Integrado
        </p>

        {/* Barra de Progresso Animada */}
        <div className="w-full bg-slate-900/90 border border-white/10 rounded-full h-2 overflow-hidden p-0.5 mb-4 shadow-inner relative">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 via-fuchsia-400 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(236,72,153,0.8)]"
            style={{ width: `${Math.min(100, Math.max(15, ((currentStep + 1) / steps.length) * 100))}%` }}
          />
        </div>

        {/* Mensagem Dinâmica do Passo Atual */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 min-h-[24px] transition-all duration-300">
          <CurrentIcon size={14} className="text-pink-400 shrink-0" />
          <span>{steps[currentStep].text}</span>
        </div>

        {/* Rodapé Seguro */}
        <div className="mt-8 flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Conexão Segura e Criptografada</span>
        </div>

      </div>
    </div>
  );
};

export default LoadingScreen;
