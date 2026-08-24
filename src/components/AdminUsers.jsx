import React, { useState } from 'react';
import { User, Check, X, Shield, Trash2, ArrowLeft } from 'lucide-react';

const AdminUsers = ({ users, setUsers, onBack }) => {
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState('vendedor');
  const [newCity, setNewCity] = useState('');

  const toggleAuth = (username) => {
    setUsers(users.map(u => u.username === username ? { ...u, authorized: !u.authorized } : u));
  };

  const deleteUser = (username) => {
    if (username === 'wmusete') return; // Cannot delete master admin
    setUsers(users.filter(u => u.username !== username));
  };

  const addUser = (e) => {
    e.preventDefault();
    if (!newUser || !newPass) return;
    if (newRole === 'vendedor' && !newCity) {
      alert('Selecione a unidade do vendedor!');
      return;
    }
    if (users.find(u => u.username === newUser)) return;
    setUsers([...users, { username: newUser, password: newPass, role: newRole, city: newRole === 'vendedor' ? newCity : '', authorized: true }]);
    setNewUser('');
    setNewPass('');
    setNewCity('');
  };

  return (
    <div className="max-w-[1000px] mx-auto pt-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 glass-card hover:bg-white/5 transition-all rounded-xl text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-black title-gradient uppercase">Gerenciar Usuários</h2>
          <p className="text-slate-400 text-sm mt-1">Autorize, adicione ou remova contas de acesso ao sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 glass-card p-6">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2"><User className="text-sky-400"/> Lista de Contas</h3>
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.username} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${['admin', 'administrativo'].includes(u.role) ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-sky-500/20 text-sky-400'}`}>
                    {['admin', 'administrativo'].includes(u.role) ? <Shield size={18} /> : <User size={18} />}
                  </div>
                  <div>
                    
                    <p className="font-bold text-white">{u.username} {u.username === 'wmusete' && <span className="text-[10px] bg-fuchsia-500 text-white px-2 py-0.5 rounded-full ml-2">Master</span>}</p>
                    <p className="text-xs text-slate-400">Senha: {u.password} | Perfil: {u.role}{u.city && ` | Unidade: ${u.city}`}</p>

                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {u.username !== 'wmusete' && (
                    <>
                      <select 
                        value={['admin', 'administrativo'].includes(u.role) ? 'administrativo' : (u.role || 'vendedor')}
                        onChange={(e) => setUsers(users.map(usr => usr.username === u.username ? { ...usr, role: e.target.value } : usr))}
                        className="bg-black/40 border border-white/10 rounded-lg text-xs font-bold px-2 py-1.5 text-slate-300 focus:outline-none"
                      >
                        <option value="vendedor">Vendedor</option>
                        <option value="administrativo">Admin</option>
                      </select>
                      <button 
                        onClick={() => toggleAuth(u.username)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${u.authorized ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'}`}
                      >
                        {u.authorized ? <><Check size={12}/> Autorizado</> : <><X size={12}/> Bloqueado</>}
                      </button>
                      
                      <button onClick={() => deleteUser(u.username)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all border border-transparent hover:border-rose-500/20">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-1">
          <form onSubmit={addUser} className="glass-card p-6 sticky top-24">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Shield className="text-fuchsia-400"/> Criar Usuário (Admin)</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Login</label>
                <input type="text" value={newUser} onChange={e => setNewUser(e.target.value.toLowerCase().replace(/\s/g,''))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 mt-1 text-white focus:outline-none focus:border-sky-500" placeholder="usuario123" />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Senha</label>
                <input type="text" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 mt-1 text-white focus:outline-none focus:border-sky-500" placeholder="senha123" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Perfil</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 mt-1 text-white focus:outline-none focus:border-sky-500">
                  <option value="vendedor">Vendedor (Apenas Clientes)</option>
                  <option value="administrativo">Administrativo (Tudo)</option>
                </select>
              </div>

              {newRole === 'vendedor' && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Unidade (Cidade)</label>
                  <select value={newCity} onChange={e => setNewCity(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 mt-1 text-white focus:outline-none focus:border-sky-500">
                    <option value="">Selecione a cidade...</option>
                    <option value="Cajati">Cajati (CAJ)</option>
                    <option value="Registro">Registro (REG)</option>
                    <option value="Pariquera-Açu">Pariquera-Açu (PAR)</option>
                  </select>
                </div>
              )}

              <button type="submit" className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl transition-all">
                Adicionar Conta
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
