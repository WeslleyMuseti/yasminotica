import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Printer, User, Eye, FileText, Calendar, DollarSign, Activity } from 'lucide-react';

const parseCurrency = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/R\$/g, '').trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', '').trim();
};

const OSGeneratorModal = ({ isOpen, onClose, clientData, onSaveAndPrint, lentesData = [], armacoesData = [] }) => {
  const [formData, setFormData] = useState({
    medico: '',
    dataEntrega: '',
    lente: '',
    armacao: '',
    odEsf: '', odCil: '', odEixo: '', odDnp: '', odAlt: '', odDp: '', odOpa: '',
    oeEsf: '', oeCil: '', oeEixo: '', oeDnp: '', oeAlt: '', oeDp: '', oeOpa: '',
    adicao: '',
    valorTotal: '',
    valorEntrada: '',
    restante: '',
    observacoes: '',
    numeroOS: '',
    formasPagamento: '',
    responsavel: '',
    voucher: '',
    rg: ''
  });

  useEffect(() => {
    if (clientData && isOpen) {
      setFormData({
        medico: '',
        dataEntrega: '',
        lente: clientData['Marca de Lente'] || '',
        armacao: clientData['Modelo de Armação'] || '',
        odEsf: '', odCil: '', odEixo: '', odDnp: '', odAlt: '',
        oeEsf: '', oeCil: '', oeEixo: '', oeDnp: '', oeAlt: '',
        adicao: '',
        valorTotal: clientData['Valor Devido'] || '',
        valorEntrada: '',
        restante: '',
        observacoes: '',
        numeroOS: `OS-${Math.floor(1000 + Math.random() * 9000)}`
      });
    }
  }, [clientData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === 'lente' || name === 'armacao') {
      // Find prices from ERP
      const selectedLente = lentesData.find(l => {
        const nome = `${l.MARCA || l.marca || ''} ${l.MODELO || l.modelo || ''}`.trim();
        return nome === (name === 'lente' ? value : newFormData.lente);
      });
      const selectedArmacao = armacoesData.find(a => {
        const nome = `${a.MARCA || a.marca || ''} ${a.MODELO || a.modelo || ''}`.trim();
        return nome === (name === 'armacao' ? value : newFormData.armacao);
      });

      let totalProdutos = 0;
      if (selectedLente) totalProdutos += parseCurrency(selectedLente.PRECO_VENDA || selectedLente.preco_venda);
      if (selectedArmacao) totalProdutos += parseCurrency(selectedArmacao.PRECO_VENDA || selectedArmacao.preco_venda);
      
      if (totalProdutos > 0) {
        newFormData.valorTotal = formatCurrency(totalProdutos);
        
        // Recalculate restante
        const entrada = parseCurrency(newFormData.valorEntrada) || 0;
        const rest = totalProdutos - entrada;
        newFormData.restante = rest > 0 ? formatCurrency(rest) : '0,00';
      }
    }

    if (name === 'valorTotal' || name === 'valorEntrada') {
      const total = parseCurrency(newFormData.valorTotal) || 0;
      const entrada = parseCurrency(newFormData.valorEntrada) || 0;
      const rest = total - entrada;
      newFormData.restante = rest > 0 ? formatCurrency(rest) : '0,00';
    }

    setFormData(newFormData);
  };

  const handleCalculateRestante = () => {
    const total = parseCurrency(formData.valorTotal) || 0;
    const entrada = parseCurrency(formData.valorEntrada) || 0;
    const rest = total - entrada;
    setFormData({ ...formData, restante: rest > 0 ? formatCurrency(rest) : '0,00' });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card border border-white/10 shadow-2xl rounded-2xl flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-fuchsia-500/20 rounded-xl flex items-center justify-center">
                <FileText className="text-fuchsia-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Gerar Ordem de Serviço</h3>
                <p className="text-xs text-slate-400">Cliente: <span className="text-sky-400 font-bold">{clientData?.['Nome Completo'] || 'Desconhecido'}</span></p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-8">
            
            {/* Bloco 1: Receita / Dioptria */}
            <div className="space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2 border-b border-white/10 pb-2">
                <Activity size={16} className="text-sky-400"/> Receita / Dioptria
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Nº da OS</label>
                  <input type="text" name="numeroOS" value={formData.numeroOS} onChange={handleChange} placeholder="Ex: OS-1234" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-fuchsia-400 font-bold focus:outline-none focus:border-fuchsia-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Médico Oftalmologista</label>
                  <input type="text" name="medico" value={formData.medico} onChange={handleChange} placeholder="Nome do Médico" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Data de Entrega Prevista</label>
                  <input type="date" name="dataEntrega" value={formData.dataEntrega} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-4">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-500 text-left">
                      <th className="pb-2">Olho</th>
                      <th className="pb-2">Esférico</th>
                      <th className="pb-2">Cilíndrico</th>
                      <th className="pb-2">Eixo</th>
                      <th className="pb-2">DNP</th>
                      <th className="pb-2">Altura</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    <tr>
                      <td className="font-bold text-sky-400 pr-2">OD</td>
                      <td className="pr-2"><input type="text" name="odEsf" value={formData.odEsf} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                      <td className="pr-2"><input type="text" name="odCil" value={formData.odCil} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                      <td className="pr-2"><input type="text" name="odEixo" value={formData.odEixo} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                      <td className="pr-2"><input type="text" name="odDnp" value={formData.odDnp} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                      <td className="pr-2"><input type="text" name="odAlt" value={formData.odAlt} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                    </tr>
                    <tr>
                      <td className="font-bold text-emerald-400 pr-2 pt-2">OE</td>
                      <td className="pr-2 pt-2"><input type="text" name="oeEsf" value={formData.oeEsf} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                      <td className="pr-2 pt-2"><input type="text" name="oeCil" value={formData.oeCil} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                      <td className="pr-2 pt-2"><input type="text" name="oeEixo" value={formData.oeEixo} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                      <td className="pr-2 pt-2"><input type="text" name="oeDnp" value={formData.oeDnp} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                      <td className="pr-2 pt-2"><input type="text" name="oeAlt" value={formData.oeAlt} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="w-1/3 mt-2">
                <label className="text-[10px] uppercase text-slate-500 font-bold">Adição</label>
                <input type="text" name="adicao" value={formData.adicao} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-center text-white" />
              </div>
            </div>

            {/* Bloco 2: Produtos */}
            <div className="space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2 border-b border-white/10 pb-2">
                <Eye size={16} className="text-fuchsia-400"/> Lente & Armação
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Marca/Tipo da Lente</label>
                  <input 
                    list="datalist-lentes-os"
                    type="text" 
                    name="lente" 
                    value={formData.lente} 
                    onChange={handleChange} 
                    placeholder="Selecione ou digite..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" 
                  />
                  <datalist id="datalist-lentes-os">
                    {lentesData.map((l, idx) => {
                      const nome = `${l.MARCA || l.marca || ''} ${l.MODELO || l.modelo || ''}`.trim();
                      const preco = l.PRECO_VENDA || l.preco_venda || '0,00';
                      return <option key={idx} value={nome}>{`R$ ${preco}`}</option>;
                    })}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Modelo da Armação</label>
                  <input 
                    list="datalist-armacoes-os"
                    type="text" 
                    name="armacao" 
                    value={formData.armacao} 
                    onChange={handleChange} 
                    placeholder="Selecione ou digite..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" 
                  />
                  <datalist id="datalist-armacoes-os">
                    {armacoesData.map((a, idx) => {
                      const nome = `${a.MARCA || a.marca || ''} ${a.MODELO || a.modelo || ''}`.trim();
                      const preco = a.PRECO_VENDA || a.preco_venda || '0,00';
                      return <option key={idx} value={nome}>{`R$ ${preco}`}</option>;
                    })}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Bloco 3: Financeiro */}
            <div className="space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2 border-b border-white/10 pb-2">
                <DollarSign size={16} className="text-emerald-400"/> Financeiro
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Valor Total (R$)</label>
                  <input type="text" name="valorTotal" value={formData.valorTotal} onChange={handleChange} onBlur={handleCalculateRestante} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Sinal / Entrada (R$)</label>
                  <input type="text" name="valorEntrada" value={formData.valorEntrada} onChange={handleChange} onBlur={handleCalculateRestante} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Restante (R$)</label>
                  <input type="text" name="restante" value={formData.restante} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white bg-white/5" readOnly />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-slate-500 font-bold">Observações Adicionais</label>
              <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows="2" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white resize-none"></textarea>
            </div>

          </div>

          {/* Footer / Actions */}
          <div className="sticky bottom-0 border-t border-white/10 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white transition-colors">
              Cancelar
            </button>
            <button 
              onClick={() => onSaveAndPrint(formData)}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-white font-black rounded-xl shadow-lg shadow-fuchsia-500/20 transition-all"
            >
              <Printer size={16} /> Salvar e Imprimir OS
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OSGeneratorModal;
