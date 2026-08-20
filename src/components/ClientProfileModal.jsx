import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, MapPin, Calendar, CreditCard, ShoppingBag, PlusCircle, AlertTriangle, CheckCircle, Activity, Edit2, ClipboardList, DollarSign, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClientProfileModal = ({ isOpen, onClose, clientData, clientHistory, onUpdateStatus, onAddPurchase, onEditClick, onGenerateOS, onRegisterPayment, onDeleteSale, receberData = [], onUpdateRow }) => {
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentOS, setPaymentOS] = useState('');
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);
  const [newPurchase, setNewPurchase] = useState({
    'DATA  DA VENDA': new Date().toISOString().split('T')[0],
    'PRODUTO': '',
    'VALOR TOTAL': '',
    'SITUAÇÃO': 'Pago',
    'OS DA VENDA': ''
  });

  if (typeof document === 'undefined') return null;

  const clientErpInvoices = receberData.filter(item => {
    if (!clientData) return false;
    const clientName = (clientData['Nome Completo'] || clientData['NOME'] || '').toLowerCase().trim();
    const itemClientName = (item.CLIENTE || item.cliente || '').toLowerCase().trim();
    return clientName && (itemClientName === clientName || itemClientName.includes(clientName) || clientName.includes(itemClientName));
  });

  const handleStatusToggle = () => {
    const currentStatus = clientData['Status de Pagamento'] || 'Em dia';
    const newStatus = currentStatus === 'Em dia' ? 'Inadimplente' : 'Em dia';
    onUpdateStatus(newStatus);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    onAddPurchase({
      ...newPurchase,
      'NOME CLIENTE': clientData['Nome Completo'] || clientData['NOME'],
      'TELEFONE': clientData['WhatsApp'] || ''
    });
    setIsAddingPurchase(false);
    setNewPurchase({
      'DATA  DA VENDA': new Date().toISOString().split('T')[0],
      'PRODUTO': '',
      'VALOR TOTAL': '',
      'SITUAÇÃO': 'Pago',
      'OS DA VENDA': ''
    });
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && clientData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto custom-scrollbar"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-[#0b1120] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col my-auto max-h-full"
          >
            {/* Header com Efeito Vidro */}
            <div className="relative p-6 sm:p-8 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center z-10 shrink-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
              
              <div className="flex items-center gap-5 w-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500/20 to-indigo-500/20 flex items-center justify-center border border-sky-500/30 shadow-[0_0_30px_rgba(56,189,248,0.15)] shrink-0">
                  <User className="text-sky-400" size={30} />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                    {clientData['Nome Completo'] || clientData['NOME'] || 'Cliente Sem Nome'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {clientData['WhatsApp'] && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <Phone size={12} className="text-emerald-400"/> {clientData['WhatsApp']}
                      </span>
                    )}
                    {clientData['Referência 1'] && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium" title="Referência 1">
                        <Phone size={12} className="text-sky-400"/> {clientData['Referência 1']}
                      </span>
                    )}
                    {clientData['Referência 2'] && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium" title="Referência 2">
                        <Phone size={12} className="text-sky-400"/> {clientData['Referência 2']}
                      </span>
                    )}
                    {clientData['Cidade'] && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <MapPin size={12} className="text-fuchsia-400"/> {clientData['Cidade']}
                      </span>
                    )}
                    {clientData['Instagram'] && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <AtSign size={12} className="text-pink-400"/> {clientData['Instagram']}
                      </span>
                    )}
                    {clientData['Facebook'] && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <AtSign size={12} className="text-blue-500"/> {clientData['Facebook']}
                      </span>
                    )}
                    {clientData['TikTok'] && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <AtSign size={12} className="text-gray-300"/> {clientData['TikTok']}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
                  <button
                    onClick={handleStatusToggle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all border ${
                      (clientData['Status de Pagamento'] || 'Em dia') === 'Em dia'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                    }`}
                  >
                    {(clientData['Status de Pagamento'] || 'Em dia') === 'Em dia' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                    {(clientData['Status de Pagamento'] || 'Em dia').toUpperCase()}
                  </button>

                  <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all bg-white/5 border border-white/10">
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar bg-black/20 flex-1">
              
              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5"><CreditCard size={12} className="text-amber-400"/> CPF/CNPJ</p>
                  <p className="text-sm font-bold text-slate-200">{clientData['CPF / CNPJ'] || 'Não informado'}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5"><CreditCard size={12} className="text-blue-400"/> RG</p>
                  <p className="text-sm font-bold text-slate-200">{clientData['RG'] || 'Não informado'}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5"><User size={12} className="text-emerald-400"/> Responsável</p>
                  <p className="text-sm font-bold text-slate-200">{clientData['Responsável'] || 'Não informado'}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5"><Calendar size={12} className="text-pink-400"/> Vencimento</p>
                  <p className="text-sm font-bold text-slate-200">{clientData['Data de Vencimento'] || '—'}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5"><Activity size={12} className="text-cyan-400"/> Lente Atual</p>
                  <p className="text-sm font-bold text-slate-200">{clientData['Marca de Lente'] || '—'}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5"><ShoppingBag size={12} className="text-indigo-400"/> Total Compras</p>
                  <p className="text-sm font-bold text-slate-200">{clientHistory.length} registros</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1 flex items-center gap-1.5"><DollarSign size={12}/> Saldo Devedor</p>
                  <p className="text-sm font-bold text-rose-400">{clientData['Valor Devido'] ? `R$ ${clientData['Valor Devido']}` : 'R$ 0,00'}</p>
                </div>
              </div>

              {/* Histórico de Compras e Ações */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black flex items-center gap-2"><ShoppingBag className="text-sky-400" size={18}/> Histórico de Compras</h3>
              </div>

              {/* Timeline de Histórico */}
              {clientHistory.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent mb-8">
                  {clientHistory.map((compra, index) => {
                    const dt = compra['DATA  DA VENDA'] || compra['DATA'] || compra['DATA ENTREGA ÓCULOS'] || 'Data Desconhecida';
                    const formatDt = dt instanceof Date ? dt.toLocaleDateString('pt-BR') : typeof dt === 'number' && dt > 30000 ? new Date((dt - 25569) * 86400 * 1000).toLocaleDateString('pt-BR') : dt;
                    return (
                      <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Icon */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-[#0b1120] text-slate-500 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">
                          <CheckCircle size={16} />
                        </div>
                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">{formatDt}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400">OS: {compra['OS DA VENDA'] || compra['OS'] || '—'}</span>
                              {onDeleteSale && (
                                confirmDeleteIndex === index ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => { onDeleteSale(index); setConfirmDeleteIndex(null); }}
                                      className="px-2 py-0.5 bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-black rounded-lg transition-all"
                                    >Confirmar</button>
                                    <button
                                      onClick={() => setConfirmDeleteIndex(null)}
                                      className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] font-bold rounded-lg transition-all"
                                    >Não</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteIndex(index)}
                                    className="w-5 h-5 flex items-center justify-center rounded-full bg-white/0 hover:bg-rose-500/20 text-slate-600 hover:text-rose-400 transition-all"
                                    title="Apagar registro"
                                  >
                                    <X size={12} />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-medium text-slate-200 mb-2">{compra['PRODUTO'] || compra['ARMAÇÃO'] || 'Produto não especificado'}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-emerald-400">R$ {compra['VALOR TOTAL'] || compra['VALOR DO ORÇAMENTO'] || '0,00'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-white/5 border border-white/5 rounded-3xl mb-8">
                  <ShoppingBag size={36} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium text-sm">Nenhuma compra registrada para este cliente.</p>
                </div>
              )}

              {/* Títulos / Contas no ERP Óptica */}
              <div className="flex items-center justify-between mb-4 mt-6 border-t border-white/10 pt-6">
                <h3 className="text-lg font-black flex items-center gap-2 text-white">
                  <DollarSign className="text-emerald-400" size={18}/> Contas e Títulos no ERP Óptica
                </h3>
              </div>

              {clientErpInvoices && clientErpInvoices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientErpInvoices.map((inv, idx) => {
                    const st = (inv.STATUS || inv.status || 'Pendente').trim();
                    const isPendente = st === 'Pendente' || st === 'Atrasado' || st === 'Inadimplente';
                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isPendente ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                              {st}
                            </span>
                            <span className="text-xs font-bold text-slate-400">Venc: {inv.DATA_VENCIMENTO || inv.data_vencimento || '—'}</span>
                          </div>
                          <p className="text-sm font-bold text-white mb-1">{inv.DESCRICAO || inv.descricao || 'Título Financeiro ERP'}</p>
                          <p className="text-xs text-slate-400">OS / Venda: {inv.VENDA_OS || inv.venda_os || 'N/A'}</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-base font-black text-emerald-400">R$ {inv.VALOR || inv.valor || '0,00'}</span>
                          {isPendente && onUpdateRow && (
                            <button
                              onClick={() => {
                                onUpdateRow('CONTAS_RECEBER', inv, {
                                  ...inv,
                                  STATUS: 'Recebido',
                                  DATA_RECEBIMENTO: new Date().toISOString().split('T')[0]
                                });
                              }}
                              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <CheckCircle size={14} /> Dar Baixa ERP
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-white/5 border border-white/5 rounded-2xl">
                  <p className="text-slate-400 text-xs font-medium">Nenhum título financeiro ou conta a receber pendente no ERP para este cliente.</p>
                </div>
              )}

            </div>
            
            {/* Footer e Ações Extras */}
            <div className="p-6 border-t border-white/5 bg-black/40 flex flex-col gap-4 shrink-0">
               <AnimatePresence>
                 {isRegisteringPayment && (
                   <motion.form
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     onSubmit={(e) => {
                       e.preventDefault();
                       if (onRegisterPayment) {
                         onRegisterPayment(paymentAmount, paymentOS);
                       }
                       setPaymentAmount('');
                       setPaymentOS('');
                       setIsRegisteringPayment(false);
                     }}
                     className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-end gap-3 flex-wrap sm:flex-nowrap"
                   >
                     <div className="flex-1 space-y-1 min-w-[120px]">
                       <label className="text-[10px] uppercase text-emerald-400 font-bold ml-1">Valor do Pagamento (R$)</label>
                       <input 
                         type="text" 
                         required 
                         placeholder="Ex: 150,00" 
                         value={paymentAmount} 
                         onChange={e => setPaymentAmount(e.target.value)} 
                         className="w-full bg-black/40 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/60" 
                       />
                     </div>
                     <div className="flex-1 space-y-1 min-w-[120px]">
                       <label className="text-[10px] uppercase text-emerald-400 font-bold ml-1">Nº da OS (Opcional)</label>
                       <input 
                         type="text" 
                         placeholder="Ex: OS-1234" 
                         value={paymentOS} 
                         onChange={e => setPaymentOS(e.target.value)} 
                         className="w-full bg-black/40 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/60" 
                       />
                     </div>
                     <button type="submit" className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-emerald-500/25 shrink-0">
                       Confirmar
                     </button>
                     <button type="button" onClick={() => setIsRegisteringPayment(false)} className="px-5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition-all shrink-0">
                       Cancelar
                     </button>
                   </motion.form>
                 )}
               </AnimatePresence>

               <div className="flex justify-between items-center w-full">
                 <div className="flex flex-wrap items-center gap-3">
                   <button
                      onClick={onEditClick}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
                    >
                      <Edit2 size={16} /> Editar Cadastro
                    </button>
                    {onGenerateOS && (
                      <button
                        onClick={() => onGenerateOS(clientData)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-fuchsia-500 hover:bg-fuchsia-400 text-white transition-all shadow-lg shadow-fuchsia-500/20"
                      >
                        <ClipboardList size={16} /> Gerar OS
                      </button>
                    )}
                    <button
                      onClick={() => setIsRegisteringPayment(!isRegisteringPayment)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isRegisteringPayment ? 'bg-white/10 text-white' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'}`}
                    >
                      <DollarSign size={16} /> Registrar Pagamento
                    </button>
                 </div>
                 <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                  Fechar
                </button>
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ClientProfileModal;
