import React, { useState } from 'react';
import { Eye, Lock, User, ShieldAlert, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = ({ onLogin, users, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    if (isRegistering) {
      if (users.find(u => u.username === username)) {
        setError('Usuário já existe.');
        return;
      }
      onRegister({ username, password, role: 'vendedor', authorized: false });
      setSuccess('Conta criada! Aguarde autorização do administrador.');
      setUsername('');
      setPassword('');
      setIsRegistering(false);
    } else {
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) {
        setError('Usuário ou senha incorretos.');
        return;
      }
      if (!user.authorized) {
        setError('Conta aguardando autorização do administrador.');
        return;
      }
      onLogin(user);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden">
      <div className="absolute top-1/4 -right-1/4 w-[50vw] h-[50vw] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-1/4 -left-1/4 w-[50vw] h-[50vw] bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-sky-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/20">
            <Eye className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black title-gradient uppercase tracking-tight">Yasmin Ótica</h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">
            {isRegistering ? 'Criar Conta' : 'Acesso ao Sistema'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Usuário</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={16} className="text-slate-500" />
              </div>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                placeholder="Seu login"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={16} className="text-slate-500" />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                placeholder="••••••"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg p-3 flex items-center gap-2 mt-4">
                <ShieldAlert size={14} /> {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg p-3 flex items-center gap-2 mt-4">
                <ShieldAlert size={14} /> {success}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-black rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {isRegistering ? <><UserPlus size={18} /> Cadastrar</> : <><LogIn size={18} /> Entrar</>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }}
            className="text-xs text-slate-400 hover:text-white transition-all font-bold"
          >
            {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Solicite acesso'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
