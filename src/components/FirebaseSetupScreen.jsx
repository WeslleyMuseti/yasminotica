import React from 'react';
import { Database, ShieldAlert, CheckCircle } from 'lucide-react';

const FirebaseSetupScreen = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center">
            <Database size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Banco de Dados Pendente</h1>
            <p className="text-slate-400">O sistema já está programado, mas falta conectar o servidor.</p>
          </div>
        </div>

        <div className="space-y-4 text-slate-300 text-sm mb-8 bg-black/30 p-6 rounded-2xl border border-white/5">
          <p>Para que os dados sejam salvos em tempo real na internet, você precisa criar o seu Banco de Dados gratuito no Google Firebase e colar as chaves no sistema.</p>
          
          <h3 className="font-bold text-white text-base mt-4 mb-2">Passo a passo:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Acesse <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-sky-400 font-bold hover:underline">console.firebase.google.com</a> e faça login.</li>
            <li>Clique em <strong>Adicionar projeto</strong> e dê o nome de <strong>yasmin-otica</strong>.</li>
            <li>Na tela principal, clique no botão redondo <strong>&lt;/&gt; (Web)</strong> para registrar o app.</li>
            <li>O Google vai gerar um código com as suas <strong>chaves de configuração</strong> (apiKey, authDomain, etc).</li>
            <li>Copie essas chaves.</li>
            <li>Mande essas chaves no chat para que eu configure, ou cole diretamente no arquivo <code className="bg-black text-emerald-400 px-2 py-1 rounded">src/firebase.js</code>.</li>
          </ol>
        </div>

        <div className="flex items-center gap-3 p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
          <ShieldAlert size={20} className="shrink-0" />
          <p className="text-xs font-bold">Por que você precisa fazer isso? Porque eu sou uma Inteligência Artificial e não tenho autorização para criar uma conta Google no seu nome. Os dados da sua loja precisam estar 100% no seu controle.</p>
        </div>
      </div>
    </div>
  );
};

export default FirebaseSetupScreen;
