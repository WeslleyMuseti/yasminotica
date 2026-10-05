import React, { useState } from 'react';
import { User, Check, X, Shield, Trash2, ArrowLeft, KeyRound, Lock, ShieldCheck, Download, UploadCloud, FileSpreadsheet, Database } from 'lucide-react';
import { hashPassword, saveDocument, deleteDocument, isPasswordHashed, registerWithFirebaseAuth, syncUserPasswordToFirestore } from '../firebaseSync';
import { isConfigured } from '../firebase';
import FileUploader from './FileUploader';

const AdminUsers = ({ users, setUsers, onBack, data, onDataLoaded, onDownloadExcel, onClearFinancialAndOS }) => {
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState('vendedor');
  const [newCity, setNewCity] = useState('');
  const [passwordEdit, setPasswordEdit] = useState({ username: '', newPass: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const savePassword = async (username) => {
    if (!passwordEdit.newPass.trim()) {
      alert('Por favor, digite uma nova senha!');
      return;
    }

    if (passwordEdit.newPass.trim().length < 4) {
      alert('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    setIsProcessing(true);
    try {
      const cleanUsername = String(username).toLowerCase().trim();
      const hashed = await hashPassword(passwordEdit.newPass.trim());
      const targetUser = users.find(u => u.username.toLowerCase() === cleanUsername) || {
        username: cleanUsername,
        role: 'vendedor',
        authorized: true
      };

      // Grava diretamente no Banco de Dados em Nuvem (Firestore) e no localStorage
      const syncResult = await syncUserPasswordToFirestore(cleanUsername, hashed, targetUser);

      const nowIso = syncResult?.userDoc?.updatedAt || new Date().toISOString();
      const updated = users.map(u => {
        if (u.username.toLowerCase() === cleanUsername) {
          return { ...u, username: cleanUsername, password: hashed, updatedAt: nowIso };
        }
        return u;
      });
      setUsers(updated);

      setPasswordEdit({ username: '', newPass: '' });
      alert(
        syncResult?.savedInCloud
          ? `✅ Senha do usuário "${username}" alterada e atualizada com sucesso no Banco de Dados (Firestore)!`
          : `✅ Senha do usuário "${username}" alterada e sincronizada com sucesso!`
      );
    } catch (err) {
      console.error('Erro ao atualizar senha:', err);
      alert('Erro ao criptografar e sincronizar senha: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoleChange = async (username, newRole) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const cleanUser = String(username).toLowerCase().trim();
      const nowIso = new Date().toISOString();
      let updatedUserDoc = null;
      const updated = users.map(usr => {
        if (usr.username?.toLowerCase().trim() === cleanUser) {
          updatedUserDoc = {
            ...usr,
            role: newRole,
            city: newRole === 'vendedor' ? (usr.city || 'Cajati') : '',
            updatedAt: nowIso
          };
          return updatedUserDoc;
        }
        return usr;
      });
      setUsers(updated);
      localStorage.setItem('users', JSON.stringify(updated));

      if (isConfigured && updatedUserDoc) {
        await saveDocument('USUARIOS', updatedUserDoc, cleanUser);
      }
    } catch (err) {
      console.error('Erro ao alterar cargo do usuário:', err);
      alert('Erro ao salvar alteração de perfil no banco de dados.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCityChange = async (username, newCity) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const cleanUser = String(username).toLowerCase().trim();
      const nowIso = new Date().toISOString();
      let updatedUserDoc = null;
      const updated = users.map(usr => {
        if (usr.username?.toLowerCase().trim() === cleanUser) {
          updatedUserDoc = {
            ...usr,
            city: newCity,
            updatedAt: nowIso
          };
          return updatedUserDoc;
        }
        return usr;
      });
      setUsers(updated);
      localStorage.setItem('users', JSON.stringify(updated));

      if (isConfigured && updatedUserDoc) {
        await saveDocument('USUARIOS', updatedUserDoc, cleanUser);
      }
    } catch (err) {
      console.error('Erro ao alterar cidade da unidade:', err);
      alert('Erro ao salvar alteração de unidade no banco de dados.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleAuth = async (username) => {
    if (isProcessing) return;
    if (username === 'wmusete') {
      alert('A conta master wmusete é permanente e não pode ser bloqueada.');
      return;
    }
    setIsProcessing(true);
    try {
      const cleanUser = String(username).toLowerCase().trim();
      const nowIso = new Date().toISOString();
      let targetUser = null;
      const updated = users.map(u => {
        if (u.username?.toLowerCase().trim() === cleanUser) {
          targetUser = { ...u, authorized: !u.authorized, updatedAt: nowIso };
          return targetUser;
        }
        return u;
      });
      setUsers(updated);
      localStorage.setItem('users', JSON.stringify(updated));

      if (isConfigured && targetUser) {
        await saveDocument('USUARIOS', targetUser, cleanUser);
      }
    } catch (err) {
      console.error('Erro ao alterar status de autorização:', err);
      alert('Erro ao salvar status de autorização.');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteUser = async (username) => {
    if (isProcessing) return;
    if (username === 'wmusete') {
      alert('O usuário wmusete é a conta Master protegida e não pode ser excluído.');
      return;
    }
    if (users.length <= 1) {
      alert('Não é possível excluir o único usuário restante do sistema.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o usuário "${username}"?`)) {
      setIsProcessing(true);
      try {
        const cleanUser = String(username).toLowerCase().trim();
        const updated = users.filter(u => u.username?.toLowerCase().trim() !== cleanUser);
        setUsers(updated);
        localStorage.setItem('users', JSON.stringify(updated));

        if (isConfigured) {
          await deleteDocument('USUARIOS', cleanUser);
        }
      } catch (err) {
        console.error('Erro ao excluir usuário:', err);
        alert('Erro ao excluir usuário.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    if (!newUser || !newPass) return;
    if (newRole === 'vendedor' && !newCity) {
      alert('Selecione a unidade do vendedor!');
      return;
    }
    const cleanUser = newUser.trim().toLowerCase().replace(/\s/g, '');
    if (users.find(u => u.username.toLowerCase() === cleanUser)) {
      alert('Já existe um usuário com este login!');
      return;
    }

    setIsProcessing(true);
    try {
      const hashed = await hashPassword(newPass.trim());

      if (cleanUser.includes('@')) {
        await registerWithFirebaseAuth(cleanUser, newPass.trim());
      }

      const nowIso = new Date().toISOString();
      const newUserObj = { 
        id: cleanUser,
        username: cleanUser, 
        password: hashed, 
        role: newRole, 
        city: newRole === 'vendedor' ? newCity : '', 
        authorized: true,
        updatedAt: nowIso
      };

      const updated = [...users, newUserObj];
      setUsers(updated);
      localStorage.setItem('users', JSON.stringify(updated));

      if (isConfigured) {
        await saveDocument('USUARIOS', newUserObj, cleanUser);
      }

      setNewUser('');
      setNewPass('');
      setNewCity('');
      alert(`Usuário "${cleanUser}" cadastrado com sucesso e credenciais protegidas!`);
    } catch (err) {
      console.error('Erro ao adicionar usuário:', err);
      alert('Erro ao cadastrar usuário.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto pt-8">
      <div className="flex items-center gap-4 mb-8 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl backdrop-blur-md">
        <button onClick={onBack} className="p-2 glass-card hover:bg-white/5 transition-all rounded-xl text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-black title-gradient uppercase">Gerenciar Usuários</h2>
          <p className="text-slate-400 text-sm mt-1">Autorize, adicione, altere senhas ou remova contas de acesso ao sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 glass-card p-6">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2"><User className="text-sky-400"/> Lista de Contas</h3>
          <div className="space-y-3">
            {users.map(u => {
              const isMaster = u.username === 'wmusete';

              return (
                <div key={u.username} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl gap-4 border transition-all ${isMaster ? 'bg-gradient-to-r from-fuchsia-950/40 to-slate-900/80 border-fuchsia-500/30 shadow-lg shadow-fuchsia-500/5' : 'bg-black/40 border-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isMaster ? 'bg-gradient-to-tr from-fuchsia-600 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30' : ['admin', 'administrativo'].includes(u.role) ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-sky-500/20 text-sky-400'}`}>
                      {['admin', 'administrativo'].includes(u.role) ? <Shield size={18} /> : <User size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-white flex items-center gap-2">
                        <span>{u.username}</span>
                        {isMaster ? (
                          <span className="text-[10px] bg-gradient-to-r from-amber-500 to-fuchsia-500 text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm">Master Protegido</span>
                        ) : ['admin', 'administrativo'].includes(u.role) ? (
                          <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 px-2 py-0.5 rounded-full font-black uppercase">Admin</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>Perfil: {isMaster ? 'Super Administrador (Raiz)' : ['admin', 'administrativo'].includes(u.role) ? 'Administrador' : 'Vendedor'}{u.city && ` | Loja: ${u.city}`}</span>
                        {isPasswordHashed(u.password) && (
                          <span className="text-[10px] text-emerald-400/90 font-medium inline-flex items-center gap-0.5">
                            <ShieldCheck size={11} className="text-emerald-400" /> Hash PBKDF2
                          </span>
                        )}
                      </p>
                      
                      {passwordEdit.username === u.username ? (
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            savePassword(u.username);
                          }} 
                          className="flex items-center gap-2 mt-2"
                        >
                          <input 
                            type="password" 
                            placeholder={isMaster ? "Nova senha master..." : "Nova senha..."} 
                            value={passwordEdit.newPass} 
                            onChange={(e) => setPasswordEdit({ ...passwordEdit, newPass: e.target.value })}
                            className="bg-black/60 border border-sky-500/40 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                            autoFocus
                            disabled={isProcessing}
                          />
                          <button 
                            type="submit" 
                            disabled={isProcessing}
                            className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                          >
                            {isProcessing ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setPasswordEdit({ username: '', newPass: '' })} 
                            className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-lg font-bold hover:bg-rose-500/30 transition-all"
                          >
                            Cancelar
                          </button>
                        </form>
                      ) : (
                        <button 
                          onClick={() => setPasswordEdit({ username: u.username, newPass: '' })}
                          className={`text-[11px] font-black transition-colors mt-1 inline-flex items-center gap-1 ${isMaster ? 'text-amber-400 hover:text-amber-300' : 'text-sky-400 hover:text-sky-300'}`}
                        >
                          🔑 {isMaster ? 'Alterar Senha Master' : 'Alterar Senha'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 sm:self-center">
                    {isMaster ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold">
                          Admin Fixo
                        </span>
                        <span className="text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                          <Check size={12} /> Permanente
                        </span>
                      </div>
                    ) : (
                      <>
                        <select 
                          value={['admin', 'administrativo'].includes(u.role) ? 'administrativo' : (u.role || 'vendedor')}
                          onChange={(e) => handleRoleChange(u.username, e.target.value)}
                          disabled={isProcessing}
                          className="bg-black/40 border border-white/10 rounded-lg text-xs font-bold px-2 py-1.5 text-slate-300 focus:outline-none disabled:opacity-50"
                        >
                          <option value="vendedor">Vendedor</option>
                          <option value="administrativo">Admin</option>
                        </select>

                        {!['admin', 'administrativo'].includes(u.role) && (
                          <select
                            value={u.city || u.assignedStore || 'Cajati'}
                            onChange={(e) => handleCityChange(u.username, e.target.value)}
                            disabled={isProcessing}
                            className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold px-2 py-1.5 focus:outline-none disabled:opacity-50"
                            title="Unidade Fixa do Vendedor"
                          >
                            <option value="Cajati" className="bg-slate-900 text-white">Cajati</option>
                            <option value="Registro" className="bg-slate-900 text-white">Registro</option>
                            <option value="Jacupiranga" className="bg-slate-900 text-white">Jacupiranga</option>
                            <option value="Venda Externa" className="bg-slate-900 text-white">Venda Externa</option>
                          </select>
                        )}

                        <button 
                          onClick={() => toggleAuth(u.username)}
                          disabled={isProcessing}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 ${u.authorized ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'}`}
                        >
                          {u.authorized ? <><Check size={12}/> Autorizado</> : <><X size={12}/> Bloqueado</>}
                        </button>
                        
                        <button 
                          onClick={() => deleteUser(u.username)} 
                          disabled={isProcessing}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all border border-transparent hover:border-rose-500/20 disabled:opacity-50"
                          title={`Excluir usuário ${u.username}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-1">
          <form onSubmit={addUser} className="glass-card p-6 sticky top-24">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Shield className="text-fuchsia-400"/> Criar Usuário (Admin)</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Login</label>
                <input type="text" disabled={isProcessing} value={newUser} onChange={e => setNewUser(e.target.value.toLowerCase().replace(/\s/g,''))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 mt-1 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50" placeholder="usuario123" />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Senha</label>
                <input type="password" disabled={isProcessing} value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 mt-1 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50" placeholder="••••••••" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Perfil</label>
                <select disabled={isProcessing} value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 mt-1 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50">
                  <option value="vendedor">Vendedor (PDV / Caixa & Clientes)</option>
                  <option value="administrativo">Administrativo (Tudo)</option>
                </select>
              </div>

              {newRole === 'vendedor' && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Unidade (Cidade)</label>
                  <select disabled={isProcessing} value={newCity} onChange={e => setNewCity(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 mt-1 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50">
                    <option value="">Selecione a cidade...</option>
                    <option value="Cajati">Cajati (CAJ)</option>
                    <option value="Registro">Registro (REG)</option>
                    <option value="Jacupiranga">Jacupiranga (JAC)</option>
                    <option value="Venda Externa">Venda Externa (EXT)</option>
                  </select>
                </div>
              )}

              <button type="submit" disabled={isProcessing} className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl transition-all disabled:opacity-50">
                {isProcessing ? 'Processando...' : 'Adicionar Conta'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Seção de Backup & Importação de Dados */}
      <div className="mt-8 glass-card p-6 rounded-3xl border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Database size={16} />
              <span>Gerenciamento de Dados &amp; Planilhas</span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">Backup e Importação da Base</h3>
          </div>

          <div className="flex items-center gap-3">
            {onDownloadExcel && (
              <button
                type="button"
                onClick={onDownloadExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
              >
                <Download size={14} />
                <span>Baixar Planilha (.xlsx)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowImport(!showImport)}
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white border border-sky-500/40 rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
            >
              <UploadCloud size={14} />
              <span>{showImport ? 'Ocultar Importador' : 'Importar Planilha (.xlsx)'}</span>
            </button>
          </div>
        </div>

        {showImport && (
          <div className="bg-black/40 border border-white/10 p-5 rounded-2xl">
            <FileUploader 
              onDataLoaded={(loadedData) => {
                setShowImport(false);
                if (onDataLoaded) onDataLoaded(loadedData);
              }} 
              onCancel={() => setShowImport(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
