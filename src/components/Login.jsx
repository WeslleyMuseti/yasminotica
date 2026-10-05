import React, { useState } from 'react';
import { Eye, Lock, User, ShieldAlert, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyPassword, hashPassword, isPasswordHashed, loginWithFirebaseAuth, registerWithFirebaseAuth, fetchUserDocument } from '../firebaseSync';
import { isConfigured } from '../firebase';

// Hash seguro PBKDF2 padrão para a conta master de primeiro acesso (sem senha em texto claro no código)
const DEFAULT_MASTER_HASH = "pbkdf2:b3bb279090a24beecaa987cfde1224a1:b473c3a43b120e5f624792b560dff6edc6b56d1865a8fb3d9a0433d7ab13804a";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000; // 30 segundos após 5 tentativas

const Login = ({ onLogin, users = [], onRegister, onUpgradeUserPassword, onUpdateUsers }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Inicializa e verifica bloqueio por força bruta
  React.useEffect(() => {
    const checkLockout = () => {
      try {
        const throttle = JSON.parse(sessionStorage.getItem('YASMIN_AUTH_THROTTLE') || '{}');
        if (throttle.lockedUntil && throttle.lockedUntil > Date.now()) {
          const remaining = Math.ceil((throttle.lockedUntil - Date.now()) / 1000);
          setLockoutRemaining(remaining);
        } else {
          setLockoutRemaining(0);
        }
      } catch {
        setLockoutRemaining(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const registerFailedAttempt = () => {
    try {
      const throttle = JSON.parse(sessionStorage.getItem('YASMIN_AUTH_THROTTLE') || '{}');
      const attempts = (throttle.attempts || 0) + 1;
      let lockedUntil = throttle.lockedUntil || 0;

      if (attempts >= MAX_ATTEMPTS) {
        const duration = attempts >= 10 ? 300000 : LOCKOUT_DURATION_MS;
        lockedUntil = Date.now() + duration;
        setLockoutRemaining(Math.ceil(duration / 1000));
      }

      sessionStorage.setItem('YASMIN_AUTH_THROTTLE', JSON.stringify({ attempts, lockedUntil }));
    } catch (e) {
      console.warn('Erro no throttle de login:', e);
    }
  };

  const resetFailedAttempts = () => {
    try {
      sessionStorage.removeItem('YASMIN_AUTH_THROTTLE');
      setLockoutRemaining(0);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (lockoutRemaining > 0) {
      setError(`Acesso temporariamente bloqueado por segurança. Aguarde ${lockoutRemaining}s.`);
      return;
    }

    if (!username || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegistering) {
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
          setError('Usuário já existe.');
          setIsLoading(false);
          return;
        }

        // Criptografa a senha com PBKDF2 / SHA-256 + Salt
        const hashedPassword = await hashPassword(password);
        
        // Tenta registrar no Firebase Auth se for formato email
        if (username.includes('@')) {
          await registerWithFirebaseAuth(username, password);
        }

        await onRegister({ 
          username: username.toLowerCase().trim(), 
          password: hashedPassword, 
          role: 'vendedor', 
          authorized: false,
          updatedAt: new Date().toISOString()
        });
        setSuccess('Conta criada com segurança criptográfica! Aguarde autorização do administrador.');
        setUsername('');
        setPassword('');
        setIsRegistering(false);
      } else {
        const cleanUser = username.toLowerCase().trim();
        let user = (users || []).find(u => u && u.username && u.username.toLowerCase() === cleanUser);
        
        // Consulta o Banco de Dados em Nuvem (Firestore) para obter o documento oficial mais atualizado
        let remoteUser = null;
        if (isConfigured) {
          try {
            remoteUser = await fetchUserDocument(cleanUser);
          } catch (e) {
            console.warn('Aviso ao consultar usuário no Firestore:', e);
          }
        }

        // O documento do Banco de Dados tem prioridade absoluta; fallback para cache local
        const activeUser = remoteUser || user;
        const isMaster = cleanUser === 'wmusete';
        let isPassValid = false;

        if (activeUser && activeUser.password) {
          isPassValid = await verifyPassword(password, activeUser.password);
          // Se for o master 'wmusete', e a senha não bateu com a do activeUser,
          // verifica também o hash master padrão de segurança para garantir acesso imediato
          if (!isPassValid && isMaster && activeUser.password !== DEFAULT_MASTER_HASH) {
            isPassValid = await verifyPassword(password, DEFAULT_MASTER_HASH);
          }
        } else if (isMaster) {
          // Fallback para primeiro acesso da conta master wmusete antes de cadastrar senha no banco
          isPassValid = await verifyPassword(password, DEFAULT_MASTER_HASH);
        }

        if (isPassValid) {
          user = activeUser || (isMaster ? { 
            username: 'wmusete', 
            password: DEFAULT_MASTER_HASH,
            role: 'administrativo', 
            authorized: true 
          } : null);

          if (user) {
            const updatedUsers = (users || []).some(u => u && u.username && u.username.toLowerCase() === cleanUser)
              ? (users || []).map(u => (u && u.username && u.username.toLowerCase() === cleanUser) ? user : u)
              : [...(users || []), user];
            if (typeof onUpdateUsers === 'function') {
              onUpdateUsers(updatedUsers);
            }
            try {
              localStorage.setItem('users', JSON.stringify(updatedUsers));
            } catch (storageErr) {
              console.warn('Aviso ao salvar users no localStorage:', storageErr);
            }
          }
        }

        if (!isPassValid) {
          // Tenta via Firebase Auth se for formato email
          if (cleanUser.includes('@')) {
            try {
              const authRes = await loginWithFirebaseAuth(cleanUser, password);
              if (authRes && authRes.success) {
                const matchedByEmail = (users || []).find(u => u && (u.email === cleanUser || u.username === cleanUser));
                if (matchedByEmail) {
                  if (!matchedByEmail.authorized) {
                    setError('Conta aguardando autorização do administrador.');
                    setIsLoading(false);
                    return;
                  }
                  resetFailedAttempts();
                  onLogin(matchedByEmail);
                  setIsLoading(false);
                  return;
                }
              }
            } catch (authErr) {
              console.warn('Tentativa via Firebase Auth falhou:', authErr);
            }
          }

          registerFailedAttempt();
          setError('Usuário ou senha incorretos.');
          setIsLoading(false);
          return;
        }

        const targetUser = user || { 
          username: 'wmusete', 
          password: DEFAULT_MASTER_HASH,
          role: 'administrativo', 
          authorized: true 
        };

        if (!targetUser.authorized) {
          setError('Conta aguardando autorização do administrador.');
          setIsLoading(false);
          return;
        }

        // Migração transparente de senha legada em texto plano para Hash Seguro
        if (targetUser && !isPasswordHashed(targetUser.password)) {
          try {
            const secureHash = await hashPassword(password);
            if (onUpgradeUserPassword) {
              onUpgradeUserPassword(targetUser.username, secureHash);
            }
          } catch (migErr) {
            console.warn('Aviso ao atualizar senha legada:', migErr);
          }
        }

        resetFailedAttempts();
        onLogin(targetUser);
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setError('Ocorreu um erro ao processar a autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        backgroundColor: '#F2EFE7',
        backgroundImage: 'radial-gradient(at 0% 0%, hsla(210, 100%, 12%, 0.95) 0, transparent 65%), radial-gradient(at 100% 100%, hsla(260, 100%, 12%, 0.95) 0, transparent 65%)'
      }}
    >
      <div className="absolute top-1/4 -right-1/4 w-[50vw] h-[50vw] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-1/4 -left-1/4 w-[50vw] h-[50vw] bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="bg-white/95 rounded-2xl p-4 shadow-2xl border border-white/20 mb-4 flex items-center justify-center max-w-[280px] mx-auto">
            <img src="/logo-yasmin.png" alt="Yasmin Ótica" className="w-full h-auto max-h-20 object-contain" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
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
                disabled={lockoutRemaining > 0}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all disabled:opacity-50"
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
                disabled={lockoutRemaining > 0}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all disabled:opacity-50"
                placeholder="••••••"
              />
            </div>
          </div>

          <AnimatePresence>
            {lockoutRemaining > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg p-3 flex items-center gap-2 mt-4">
                <ShieldAlert size={16} className="animate-pulse flex-shrink-0" />
                <span>Bloqueio temporário anti-força bruta: aguarde <strong>{lockoutRemaining}s</strong> para tentar novamente.</span>
              </motion.div>
            )}
            {error && !lockoutRemaining && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg p-3 flex items-center gap-2 mt-4">
                <ShieldAlert size={14} className="flex-shrink-0" /> {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg p-3 flex items-center gap-2 mt-4">
                <ShieldAlert size={14} className="flex-shrink-0" /> {success}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={isLoading || lockoutRemaining > 0}
            className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 disabled:opacity-50 text-white font-black rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <><Loader2 size={18} className="animate-spin" /> Autenticando...</>
            ) : lockoutRemaining > 0 ? (
              <><Lock size={18} /> Bloqueado ({lockoutRemaining}s)</>
            ) : isRegistering ? (
              <><UserPlus size={18} /> Cadastrar</>
            ) : (
              <><LogIn size={18} /> Entrar</>
            )}
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
