import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, KeyRound, Eye, EyeOff, Check, X, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyPassword, hashPassword } from '../firebaseSync';

const ChangePasswordModal = ({ isOpen, onClose, currentUser, onPasswordChanged }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || success) return;
    setError('');
    setSuccess('');

    if (!newPassword.trim()) {
      setError('Por favor, informe a nova senha.');
      return;
    }

    if (newPassword.trim().length < 4) {
      setError('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação não coincide com a nova senha.');
      return;
    }

    // Se o usuário já tiver uma senha cadastrada, exige e confere a senha atual
    if (currentUser?.password) {
      if (!currentPassword) {
        setError('Por favor, digite sua senha atual para confirmar.');
        return;
      }
      setIsLoading(true);
      const isCurrentValid = await verifyPassword(currentPassword, currentUser.password);
      if (!isCurrentValid) {
        setError('Senha atual incorreta.');
        setIsLoading(false);
        return;
      }
    } else {
      setIsLoading(true);
    }

    try {
      const hashed = await hashPassword(newPassword.trim());
      let syncResult = null;
      if (onPasswordChanged) {
        syncResult = await onPasswordChanged(currentUser.username, hashed);
      }
      setSuccess(
        syncResult?.savedInCloud
          ? '✅ Senha alterada e atualizada no Banco de Dados (Firestore)!'
          : '✅ Senha alterada com sucesso e sincronizada!'
      );
      setTimeout(() => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      setError('Ocorreu um erro ao criptografar e salvar a senha: ' + (err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-white/15 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl z-10 text-white max-h-[90vh] overflow-y-auto erp-scroll"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-white uppercase">
                  Alterar Senha
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Usuário: <span className="text-sky-400 font-bold">@{currentUser?.username || 'operador'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all active:scale-95"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Senha Atual */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Senha Atual
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Nova Senha */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 4 caracteres"
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmar Nova Senha */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Confirmar Nova Senha
              </label>
              <input
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-slate-950/80 border border-white/15 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Alertas */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-xl p-3 flex items-center gap-2"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl p-3 flex items-center gap-2"
                >
                  <Check size={15} className="shrink-0" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botões de Ação */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-black text-xs shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Salvar Senha</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Dica de Segurança */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-400">
            <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
            <span>Sua nova senha será protegida com criptografia PBKDF2 padrão de banco.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ChangePasswordModal;
