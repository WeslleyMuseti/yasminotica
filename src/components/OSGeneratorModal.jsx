import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Printer, User, Eye, FileText, Calendar, DollarSign, Activity } from 'lucide-react';

const parseCurrency = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).replace(/R\$\s?/g, '').trim();
  if (!str) return 0;
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      str = str.replace(/\./g, '');
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', '').trim();
};

const OSGeneratorModal = ({ isOpen, onClose, clientData, onSaveAndPrint, lentesData = [], armacoesData = [], salesData = [], currentUser }) => {
  const [selectedCity, setSelectedCity] = useState('');
  
  const userCity = currentUser?.role === 'vendedor' ? (currentUser.city || currentUser.assignedStore || 'Cajati') : null;
  const filteredLentes = userCity 
    ? lentesData.filter(l => {
        const u = String(l.UNIDADE || l.CIDADE || l.LOJA || l.Unidade || '').trim().toUpperCase();
        return u && u !== 'CENTRAL' && u.includes(userCity.toUpperCase());
      })
    : lentesData;
  const filteredArmacoes = userCity 
    ? armacoesData.filter(a => {
        const u = String(a.UNIDADE || a.CIDADE || a.LOJA || a.Unidade || '').trim().toUpperCase();
        return u && u !== 'CENTRAL' && u.includes(userCity.toUpperCase());
      })
    : armacoesData;

  // Payment builder state
  const [payMethod, setPayMethod] = useState('Dinheiro');
  const [payValue, setPayValue] = useState('');
  const [payInstallments, setPayInstallments] = useState('1');
  const [osCustomDueDates, setOsCustomDueDates] = useState({});

  const handleAddPayment = () => {
    if (!payValue) return;
    const v = parseCurrency(payValue);
    if (v <= 0) return;
    const n = parseInt(payInstallments, 10) || 1;
    const formattedV = formatCurrency(v);
    let text = `R$ ${formattedV} no ${payMethod}`;
    if ((payMethod === 'Crédito' || payMethod === 'Boleto' || payMethod === 'Carnê') && n > 1) {
      const parcVal = (v / n).toFixed(2).replace('.', ',');
      const vencs = [];
      for (let i = 1; i <= n; i++) {
        let calculatedDate = '';
        if (osCustomDueDates[i]) {
          const parts = osCustomDueDates[i].split('-');
          calculatedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : osCustomDueDates[i];
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 30 * i);
          calculatedDate = d.toLocaleDateString('pt-BR');
        }
        vencs.push(`${i}ª ${calculatedDate}`);
      }
      text = `${payMethod}: ${n}x de R$ ${parcVal} (Total: R$ ${formattedV}) | Vencimentos: ${vencs.join(', ')}`;
    }
    setFormData(prev => {
      const current = prev.formasPagamento ? prev.formasPagamento + '\n' : '';
      const isImediato = !['Boleto', 'Carnê'].includes(payMethod);
      const currentEntrada = parseCurrency(prev.valorEntrada) || 0;
      const total = parseCurrency(prev.valorTotal) || 0;
      const newEntrada = isImediato ? currentEntrada + v : currentEntrada;
      const rest = Math.max(0, total - newEntrada);

      // Create structured parcelas if Boleto/Carnê
      let newParcelas = [];
      if (!isImediato && n >= 1) {
        const parcVal = formatCurrency(v / n);
        for (let i = 1; i <= n; i++) {
          let calculatedDate = '';
          if (osCustomDueDates[i]) {
            calculatedDate = osCustomDueDates[i]; // already YYYY-MM-DD from input type=date
          } else {
            const d = new Date();
            d.setDate(d.getDate() + 30 * i);
            calculatedDate = d.toISOString().split('T')[0];
          }
          newParcelas.push({
            numero: i,
            totalParcelas: n,
            valor: parcVal,
            vencimento: calculatedDate
          });
        }
      }

      return { 
        ...prev, 
        formasPagamento: current + text,
        parcelas: [...(prev.parcelas || []), ...newParcelas],
        valorEntrada: newEntrada > 0 ? formatCurrency(newEntrada) : (isImediato ? formatCurrency(v) : prev.valorEntrada || '0,00'),
        restante: rest > 0 ? formatCurrency(rest) : '0,00'
      };
    });
    setPayValue('');
    setPayInstallments('1');
    setOsCustomDueDates({});
  };

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
    parcelas: [],
    responsavel: '',
    voucher: '',
    rg: ''
  });

  useEffect(() => {
    if (clientData && isOpen) {
      const vTotal = clientData['valorTotal'] || clientData['Valor Devido'] || (clientData['VALOR TOTAL'] ? String(clientData['VALOR TOTAL']) : '') || '';
      const vFormas = clientData['formasPagamento'] || clientData['FORMA_PAGTO'] || clientData['FORMA DE PAGAMENTO'] || '';
      const isBoletoOrCarne = /boleto|carnê|carne/i.test(vFormas);
      const vEntrada = clientData['valorEntrada'] !== undefined && clientData['valorEntrada'] !== '' 
        ? clientData['valorEntrada'] 
        : (isBoletoOrCarne ? '0,00' : (clientData['restante'] ? '0,00' : vTotal));
      const vRestante = clientData['restante'] !== undefined && clientData['restante'] !== '' 
        ? clientData['restante'] 
        : (isBoletoOrCarne ? vTotal : '0,00');
      const vCidade = clientData['Cidade'] || clientData['CIDADE'] || clientData['LOJA'] || clientData['selectedCity'] || (currentUser?.role === 'vendedor' ? currentUser.city : '') || 'Cajati';

      setFormData(prev => ({
        ...prev,
        medico: clientData['medico'] || clientData['MEDICO'] || '',
        dataEntrega: clientData['dataEntrega'] || clientData['PREVISAO_ENTREGA'] || '',
        lente: clientData['Marca de Lente'] || clientData['Lente'] || clientData['lente'] || '',
        armacao: clientData['Modelo de Armação'] || clientData['Armação'] || clientData['armacao'] || '',
        odEsf: clientData['OD_ESF'] || clientData['odEsf'] || '',
        odCil: clientData['OD_CIL'] || clientData['odCil'] || '',
        odEixo: clientData['OD_EIXO'] || clientData['odEixo'] || '',
        odDnp: clientData['OD_DNP'] || clientData['odDnp'] || '',
        odAlt: clientData['OD_ALT'] || clientData['odAlt'] || '',
        oeEsf: clientData['OE_ESF'] || clientData['oeEsf'] || '',
        oeCil: clientData['OE_CIL'] || clientData['oeCil'] || '',
        oeEixo: clientData['OE_EIXO'] || clientData['oeEixo'] || '',
        oeDnp: clientData['OE_DNP'] || clientData['oeDnp'] || '',
        oeAlt: clientData['OE_ALT'] || clientData['oeAlt'] || '',
        adicao: clientData['ADICAO'] || clientData['adicao'] || '',
        valorTotal: vTotal,
        valorEntrada: vEntrada,
        restante: vRestante,
        formasPagamento: vFormas,
        observacoes: clientData['observacoes'] || clientData['OBSERVACOES'] || '',
        parcelas: (Array.isArray(clientData['parcelas']) && clientData['parcelas'].length > 0)
          ? clientData['parcelas']
          : (clientData['PARCELAS_JSON'] ? (typeof clientData['PARCELAS_JSON'] === 'string' ? JSON.parse(clientData['PARCELAS_JSON']) : clientData['PARCELAS_JSON']) : []),
        responsavel: clientData['Responsável Nome'] || clientData['Responsável'] || clientData['responsavel'] || '',
        rg: clientData['RG'] || clientData['rg'] || '',
        numeroOS: ''
      }));

      setSelectedCity(userCity || vCidade || 'Cajati');
    }
  }, [clientData, isOpen, currentUser, userCity]);

  // Handle auto generation of OS when city changes
  useEffect(() => {
    if (selectedCity && isOpen) {
      let prefix = '';
      if (selectedCity === 'Cajati') prefix = 'CAJ';
      else if (selectedCity === 'Registro') prefix = 'REG';
      else if (selectedCity === 'Jacupiranga') prefix = 'JAC';
      else if (selectedCity === 'Venda Externa') prefix = 'EXT';

      if (prefix) {
        let maxNum = 0;
        salesData.forEach(sale => {
          const os = sale['OS DA VENDA'] || sale['OS'] || sale['VENDA_OS'];
          if (os && os.startsWith(prefix + '-')) {
            const numPart = parseInt(os.replace(prefix + '-', ''), 10);
            if (!isNaN(numPart) && numPart > maxNum) {
              maxNum = numPart;
            }
          }
        });
        const nextNum = maxNum + 1;
        setFormData(prev => ({ ...prev, numeroOS: `${prefix}-${nextNum}` }));
      }
    }
  }, [selectedCity, isOpen, salesData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === 'lente' || name === 'armacao') {
      // Find prices from ERP
      const selectedLente = filteredLentes.find(l => {
        const nome = `${l.MARCA || l.marca || ''} ${l.MODELO || l.modelo || ''}`.trim();
        return nome === (name === 'lente' ? value : newFormData.lente);
      });
      const selectedArmacao = filteredArmacoes.find(a => {
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
    const rest = Math.max(0, total - entrada);
    setFormData(prev => ({
      ...prev,
      valorTotal: total > 0 ? formatCurrency(total) : prev.valorTotal,
      valorEntrada: entrada > 0 ? formatCurrency(entrada) : prev.valorEntrada,
      restante: rest > 0 ? formatCurrency(rest) : '0,00'
    }));
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
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Unidade (Cidade)</label>
                  {userCity ? (
                    <div className="w-full bg-black/60 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-bold flex items-center justify-between">
                      <span>{selectedCity}</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-black uppercase">Unidade Fixa</span>
                    </div>
                  ) : (
                    <select 
                      value={selectedCity} 
                      onChange={(e) => setSelectedCity(e.target.value)} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-sky-400 font-bold focus:outline-none focus:border-sky-500/50"
                    >
                      <option value="">Selecione...</option>
                      <option value="Cajati">Cajati (CAJ)</option>
                      <option value="Registro">Registro (REG)</option>
                      <option value="Jacupiranga">Jacupiranga (JAC)</option>
                      <option value="Venda Externa">Venda Externa (EXT)</option>
                    </select>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Nº da OS</label>
                  <input type="text" name="numeroOS" value={formData.numeroOS} onChange={handleChange} placeholder="CAJ-001" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-fuchsia-400 font-bold focus:outline-none focus:border-fuchsia-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Médico Oftalmologista</label>
                  <input type="text" name="medico" value={formData.medico} onChange={handleChange} placeholder="Nome do Médico" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Data de Entrega</label>
                  <input type="date" name="dataEntrega" value={formData.dataEntrega} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-4 border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-400 text-center">
                      <th className="pb-2 text-left w-12">Olho</th>
                      <th className="pb-2">Esférico</th>
                      <th className="pb-2">Cilíndrico</th>
                      <th className="pb-2">Eixo</th>
                      <th className="pb-2">DNP</th>
                      <th className="pb-2">Altura</th>
                      <th className="pb-2">DP</th>
                      <th className="pb-2">OPA</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    <tr>
                      <td className="font-black text-sky-400 pr-2 text-left">OD</td>
                      <td className="px-1"><input type="text" name="odEsf" value={formData.odEsf} onChange={handleChange} placeholder="0.00" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1"><input type="text" name="odCil" value={formData.odCil} onChange={handleChange} placeholder="0.00" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1"><input type="text" name="odEixo" value={formData.odEixo} onChange={handleChange} placeholder="0°" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1"><input type="text" name="odDnp" value={formData.odDnp} onChange={handleChange} placeholder="mm" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1"><input type="text" name="odAlt" value={formData.odAlt} onChange={handleChange} placeholder="mm" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1"><input type="text" name="odDp" value={formData.odDp} onChange={handleChange} placeholder="mm" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1"><input type="text" name="odOpa" value={formData.odOpa} onChange={handleChange} placeholder="---" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                    </tr>
                    <tr>
                      <td className="font-black text-emerald-400 pr-2 pt-2 text-left">OE</td>
                      <td className="px-1 pt-2"><input type="text" name="oeEsf" value={formData.oeEsf} onChange={handleChange} placeholder="0.00" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1 pt-2"><input type="text" name="oeCil" value={formData.oeCil} onChange={handleChange} placeholder="0.00" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1 pt-2"><input type="text" name="oeEixo" value={formData.oeEixo} onChange={handleChange} placeholder="0°" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1 pt-2"><input type="text" name="oeDnp" value={formData.oeDnp} onChange={handleChange} placeholder="mm" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1 pt-2"><input type="text" name="oeAlt" value={formData.oeAlt} onChange={handleChange} placeholder="mm" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1 pt-2"><input type="text" name="oeDp" value={formData.oeDp} onChange={handleChange} placeholder="mm" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                      <td className="px-1 pt-2"><input type="text" name="oeOpa" value={formData.oeOpa} onChange={handleChange} placeholder="---" className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="w-full sm:w-1/3 mt-3">
                <label className="text-[10px] uppercase text-slate-400 font-bold">Adição (Perto)</label>
                <input type="text" name="adicao" value={formData.adicao} onChange={handleChange} placeholder="+0.00" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-center text-white font-mono text-sm" />
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
                    {filteredLentes.map((l, idx) => {
                      const nome = `${l.MARCA || l.marca || ''} ${l.MODELO || l.modelo || ''}`.trim();
                      const preco = l.PRECO_VENDA || l.preco_venda || '0,00';
                      return <option key={idx} value={nome}>{`R$ ${preco}`}</option>;
                    })}
                  </datalist>
                </div>
                <div className="space-y-1 relative">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Modelo da Armação</label>
                  <div className="flex items-center gap-3">
                    <input 
                      list="datalist-armacoes-os"
                      type="text" 
                      name="armacao" 
                      value={formData.armacao} 
                      onChange={handleChange} 
                      placeholder="Selecione ou digite..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" 
                    />
                    {(() => {
                      const selectedArmacaoObj = filteredArmacoes.find(a => `${a.MARCA || a.marca || ''} ${a.MODELO || a.modelo || ''}`.trim() === formData.armacao);
                      if (selectedArmacaoObj && selectedArmacaoObj.IMAGEM) {
                        return (
                          <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/40 shadow-xl">
                            <img src={selectedArmacaoObj.IMAGEM} alt="Armação" className="w-full h-full object-cover" />
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <datalist id="datalist-armacoes-os">
                    {filteredArmacoes.map((a, idx) => {
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
                <div className="space-y-3 md:col-span-3 p-4 border border-emerald-500/30 rounded-xl bg-emerald-500/5">
                  <label className="text-[10px] uppercase text-emerald-400 font-bold block mb-2">Adicionar Pagamento</label>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Boleto'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPayMethod(method)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${payMethod === method ? 'bg-emerald-500 text-white' : 'bg-black/40 text-slate-400 hover:text-white'}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] uppercase text-slate-500 font-bold">Valor (R$)</label>
                      <input type="text" value={payValue} onChange={e => setPayValue(e.target.value)} placeholder="0,00" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 outline-none" />
                    </div>
                    {(payMethod === 'Crédito' || payMethod === 'Boleto') && (
                      <div className="w-28 space-y-1">
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Quantas Vezes</label>
                        <select value={payInstallments} onChange={e => setPayInstallments(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-2.5 text-sm text-white focus:border-emerald-500/50 outline-none">
                          {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
                            <option key={n} value={n}>{n}x</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button type="button" onClick={handleAddPayment} className="px-4 py-2.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl font-bold transition-colors text-sm">
                      + Adicionar
                    </button>
                  </div>

                  {parseInt(payInstallments, 10) > 1 && ['Crédito', 'Boleto'].includes(payMethod) && (
                    <div className="mt-3 p-3 bg-black/40 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold border-b border-white/10 pb-1.5">
                        <span className="uppercase tracking-wider font-black flex items-center gap-1.5">
                          <Calendar size={13} /> Datas de Vencimento ({payInstallments}x)
                        </span>
                        <span className="text-slate-400">
                          {formatCurrency(parseCurrency(payValue) / parseInt(payInstallments, 10))} / parc
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {Array.from({ length: parseInt(payInstallments, 10) }, (_, i) => {
                          const num = i + 1;
                          const d = new Date();
                          d.setDate(d.getDate() + 30 * num);
                          const calculatedDate = d.toISOString().split('T')[0];
                          const currentDateVal = osCustomDueDates[num] || calculatedDate;
                          return (
                            <div key={num} className="bg-white/5 p-2 rounded-lg border border-white/5 flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-slate-300">{num}ª Parcela:</span>
                              <input
                                type="date"
                                value={currentDateVal}
                                onChange={e => setOsCustomDueDates(prev => ({ ...prev, [num]: e.target.value }))}
                                className="bg-black/60 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Formas de Pagamento Selecionadas (Editável)</label>
                  <textarea 
                    name="formasPagamento" 
                    value={formData.formasPagamento} 
                    onChange={handleChange} 
                    rows="2"
                    placeholder="Adicione pelos botões acima ou digite aqui..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:border-emerald-500/50" 
                  />
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
              onClick={() => onSaveAndPrint({ ...formData, selectedCity: selectedCity || 'Cajati', unidade: selectedCity || 'Cajati' })}
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
