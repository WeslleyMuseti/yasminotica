import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Printer, User, Eye, FileText, Calendar, DollarSign, Activity, CheckCircle2, AlertTriangle, Trash2, Plus, CreditCard, QrCode } from 'lucide-react';

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

const parseInitialPayments = (clientData) => {
  if (!clientData) return [];
  let parcs = [];
  try {
    if (Array.isArray(clientData['parcelas']) && clientData['parcelas'].length > 0) {
      parcs = clientData['parcelas'];
    } else if (clientData['PARCELAS_JSON']) {
      parcs = typeof clientData['PARCELAS_JSON'] === 'string' ? JSON.parse(clientData['PARCELAS_JSON']) : clientData['PARCELAS_JSON'];
    }
  } catch (e) {}

  const vFormas = clientData['formasPagamento'] || clientData['FORMA_PAGTO'] || clientData['FORMA DE PAGAMENTO'] || clientData['MEIO_PAGAMENTO'] || '';
  if (!vFormas && (!parcs || parcs.length === 0)) return [];

  const lines = String(vFormas)
    .replace(/(?:FORMA DE PAGAMENTO|FORMA_PAGTO|FORMA_PAGAMENTO|MEIO_PAGAMENTO)\s*:\s*/gi, '')
    .split(/\n|\s*\+\s*/)
    .map(l => l.trim())
    .filter(Boolean);

  const parsed = [];
  lines.forEach((line, idx) => {
    let method = 'Dinheiro';
    if (/pix/i.test(line)) method = 'PIX';
    else if (/d[eé]bito/i.test(line)) method = 'Débito';
    else if (/cr[eé]dito/i.test(line)) method = 'Crédito';
    else if (/boleto|carn[eê]/i.test(line)) method = 'Boleto';

    const matchX = line.match(/(\d+)x/i);
    const n = matchX ? parseInt(matchX[1], 10) : 1;

    let val = 0;
    const matchTotal = line.match(/Total:\s*R?\$?\s*([\d.,]+)/i);
    if (matchTotal) {
      val = parseCurrency(matchTotal[1]);
    } else {
      const matchVal = [...line.matchAll(/R\$\s*([\d.,]+)/gi)];
      if (matchVal.length > 0) {
        val = parseCurrency(matchVal[matchVal.length - 1][1]);
      }
    }

    parsed.push({
      id: `init_pay_${Date.now()}_${idx}`,
      method,
      valor: val || (parseCurrency(clientData['valorTotal'] || clientData['VALOR TOTAL']) || 0),
      installments: n,
      parcelas: method === 'Boleto' ? (parcs && parcs.length > 0 ? parcs : []) : [],
      texto: line
    });
  });

  return parsed;
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
  const [payFirstDueDate, setPayFirstDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [osCustomDueDates, setOsCustomDueDates] = useState({});
  const [payments, setPayments] = useState([]);

  const syncPaymentsToFormData = (payList, currentTotal) => {
    const total = currentTotal !== undefined ? parseCurrency(currentTotal) : parseCurrency(formData.valorTotal);
    const entrada = payList.filter(p => p.method !== 'Boleto').reduce((sum, p) => sum + p.valor, 0);
    const boletoTotal = payList.filter(p => p.method === 'Boleto').reduce((sum, p) => sum + p.valor, 0);
    const allParcelas = payList.filter(p => p.method === 'Boleto').flatMap(p => p.parcelas || []);
    
    const rest = boletoTotal > 0 ? boletoTotal : Math.max(0, total - entrada);
    const cleanTexts = payList.map(p => p.texto.trim()).filter(Boolean);
    const textoFinal = cleanTexts.join('\n');

    setFormData(prev => ({
      ...prev,
      valorEntrada: entrada > 0 ? formatCurrency(entrada) : '0,00',
      restante: rest > 0 ? formatCurrency(rest) : '0,00',
      formasPagamento: textoFinal,
      parcelas: allParcelas
    }));
  };

  const handleAddPayment = () => {
    if (!payValue) return;
    const v = parseCurrency(payValue);
    if (v <= 0) return;
    const n = parseInt(payInstallments, 10) || 1;
    const formattedV = formatCurrency(v);
    
    let text = `💵 Dinheiro: R$ ${formattedV}`;
    let parcelasDetalhe = [];

    if (payMethod === 'PIX') {
      text = `⚡ PIX: R$ ${formattedV}`;
    } else if (payMethod === 'Débito') {
      text = `💳 Cartão Débito: R$ ${formattedV}`;
    } else if (payMethod === 'Crédito') {
      if (n > 1) {
        const parcVal = (v / n).toFixed(2).replace('.', ',');
        text = `💳 Cartão Crédito (${n}x de R$ ${parcVal}): R$ ${formattedV}`;
      } else {
        text = `💳 Cartão Crédito (1x à vista): R$ ${formattedV}`;
      }
    } else if (payMethod === 'Boleto') {
      const parcVal = (v / n).toFixed(2).replace('.', ',');
      const vencsTextoArr = [];
      const baseDate = payFirstDueDate ? new Date(payFirstDueDate + 'T12:00:00') : new Date();

      for (let i = 1; i <= n; i++) {
        let calculatedDate = '';
        if (osCustomDueDates[i]) {
          calculatedDate = osCustomDueDates[i];
        } else {
          const d = new Date(baseDate);
          d.setDate(d.getDate() + 30 * (i - 1));
          calculatedDate = d.toISOString().split('T')[0];
        }
        
        const parts = calculatedDate.split('-');
        const ptDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : calculatedDate;
        vencsTextoArr.push(`${i}ª ${ptDate}`);

        parcelasDetalhe.push({
          numero: i,
          totalParcelas: n,
          valor: parcVal,
          vencimento: calculatedDate
        });
      }
      text = `📄 Boleto (${n}x de R$ ${parcVal} | Venc: ${vencsTextoArr.join(', ')}): R$ ${formattedV}`;
    }

    const newPayment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      method: payMethod,
      valor: v,
      installments: n,
      parcelas: parcelasDetalhe,
      texto: text
    };

    const nextPayments = [...payments, newPayment];
    setPayments(nextPayments);
    syncPaymentsToFormData(nextPayments);

    setPayValue('');
    setPayInstallments('1');
    setOsCustomDueDates({});
  };

  const handleRemovePayment = (id) => {
    const nextPayments = payments.filter(p => p.id !== id);
    setPayments(nextPayments);
    syncPaymentsToFormData(nextPayments);
  };

  const handleClearPayments = () => {
    setPayments([]);
    syncPaymentsToFormData([]);
  };

  const handleFillRemaining = () => {
    const total = parseCurrency(formData.valorTotal);
    const covered = payments.reduce((sum, p) => sum + p.valor, 0);
    const remaining = Math.max(0, total - covered);
    if (remaining > 0) {
      setPayValue(formatCurrency(remaining));
    }
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
      const initialPayments = parseInitialPayments(clientData);
      setPayments(initialPayments);

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
            {(() => {
              const totalVal = parseCurrency(formData.valorTotal);
              const coveredVal = payments.reduce((sum, p) => sum + p.valor, 0);
              const remainingVal = Math.max(0, totalVal - coveredVal);
              const isFullyCovered = Math.abs(coveredVal - totalVal) < 0.05 && totalVal > 0;

              return (
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2 border-b border-white/10 pb-2">
                    <DollarSign size={16} className="text-emerald-400"/> Financeiro & Formas de Pagamento
                  </h4>

                  {/* Resumo em 3 Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-500 font-bold">Valor Total (R$)</label>
                      <input 
                        type="text" 
                        name="valorTotal" 
                        value={formData.valorTotal} 
                        onChange={handleChange} 
                        onBlur={handleCalculateRestante} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-black focus:border-emerald-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-500 font-bold">Sinal / Entrada (R$)</label>
                      <input 
                        type="text" 
                        name="valorEntrada" 
                        value={formData.valorEntrada} 
                        onChange={handleChange} 
                        onBlur={handleCalculateRestante} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-teal-300 font-bold focus:border-emerald-500 outline-none" 
                      />
                      <span className="text-[9px] text-slate-500 block">Dinheiro, PIX e Cartões</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-500 font-bold">Restante / A Prazo (R$)</label>
                      <input 
                        type="text" 
                        name="restante" 
                        value={formData.restante} 
                        onChange={handleChange} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-amber-300 font-black bg-white/5 outline-none" 
                        readOnly 
                      />
                      <span className="text-[9px] text-slate-500 block">Boleto Bancário / Carnê</span>
                    </div>
                  </div>

                  {/* Status de Cobertura */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                    isFullyCovered 
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                      : coveredVal > totalVal + 0.01 
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' 
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isFullyCovered ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle size={16} className={coveredVal > totalVal + 0.01 ? 'text-rose-400 shrink-0' : 'text-amber-400 shrink-0'} />
                      )}
                      <div>
                        <span>
                          {isFullyCovered 
                            ? '✅ Total da OS 100% Coberto!' 
                            : coveredVal > totalVal + 0.01 
                            ? `⚠️ Valor lançado excede o total em R$ ${formatCurrency(coveredVal - totalVal)}` 
                            : `⚠️ Falta cobrir: R$ ${formatCurrency(remainingVal)}`}
                        </span>
                        <span className="text-[10px] opacity-75 block font-normal">
                          Lançado: R$ {formatCurrency(coveredVal)} de R$ {formatCurrency(totalVal)}
                        </span>
                      </div>
                    </div>
                    {remainingVal > 0 && (
                      <button
                        type="button"
                        onClick={handleFillRemaining}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[10px] font-black uppercase transition-colors"
                      >
                        Preencher Restante
                      </button>
                    )}
                  </div>

                  {/* Construtor de Pagamentos */}
                  <div className="p-4 border border-emerald-500/30 rounded-xl bg-emerald-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase text-emerald-400 font-bold block">
                        Adicionar Forma de Pagamento
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Selecione o método para lançar
                      </span>
                    </div>

                    {/* Métodos */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'Dinheiro', label: '💵 Dinheiro' },
                        { id: 'PIX', label: '⚡ PIX' },
                        { id: 'Débito', label: '💳 Cartão Débito' },
                        { id: 'Crédito', label: '💳 Cartão Crédito' },
                        { id: 'Boleto', label: '📄 Boleto / Carnê' }
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPayMethod(m.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            payMethod === m.id
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-500/20'
                              : 'bg-black/40 text-slate-400 border-white/5 hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Campos do Pagamento */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                      <div className="sm:col-span-5 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase text-slate-400 font-bold">Valor (R$)</label>
                          {remainingVal > 0 && (
                            <button
                              type="button"
                              onClick={handleFillRemaining}
                              className="text-[9px] text-emerald-400 hover:underline font-bold"
                            >
                              Usar R$ {formatCurrency(remainingVal)}
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={payValue}
                          onChange={e => setPayValue(e.target.value)}
                          placeholder={formatCurrency(remainingVal > 0 ? remainingVal : totalVal)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none font-bold"
                        />
                      </div>

                      {['Crédito', 'Boleto'].includes(payMethod) && (
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[10px] uppercase text-slate-400 font-bold">Parcelas</label>
                          <select
                            value={payInstallments}
                            onChange={e => {
                              setPayInstallments(e.target.value);
                              setOsCustomDueDates({});
                            }}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none font-bold"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map(n => {
                              const vNum = parseCurrency(payValue) || (remainingVal > 0 ? remainingVal : totalVal);
                              const perParc = vNum > 0 ? formatCurrency(vNum / n) : '0,00';
                              return (
                                <option key={n} value={n}>{n}x (R$ {perParc})</option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {payMethod === 'Boleto' && (
                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[10px] uppercase text-slate-400 font-bold">1º Vencimento</label>
                          <input
                            type="date"
                            value={payFirstDueDate}
                            onChange={e => {
                              setPayFirstDueDate(e.target.value);
                              setOsCustomDueDates({});
                            }}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none font-bold"
                          />
                        </div>
                      )}

                      <div className={`sm:col-span-${['Crédito', 'Boleto'].includes(payMethod) ? (payMethod === 'Boleto' ? '12' : '4') : '7'}`}>
                        <button
                          type="button"
                          onClick={handleAddPayment}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                        >
                          <Plus size={14} /> Adicionar Pagamento
                        </button>
                      </div>
                    </div>

                    {/* Grade de Vencimentos do Boleto se > 1x */}
                    {payMethod === 'Boleto' && parseInt(payInstallments, 10) > 1 && (
                      <div className="mt-2 p-3 bg-black/60 rounded-xl border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold border-b border-white/10 pb-1.5">
                          <span className="uppercase tracking-wider font-black flex items-center gap-1.5">
                            <Calendar size={13} /> Datas de Vencimento ({payInstallments}x)
                          </span>
                          <span className="text-slate-400">
                            {formatCurrency((parseCurrency(payValue) || remainingVal) / parseInt(payInstallments, 10))} / parcela
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                          {Array.from({ length: parseInt(payInstallments, 10) }, (_, i) => {
                            const num = i + 1;
                            const baseD = payFirstDueDate ? new Date(payFirstDueDate + 'T12:00:00') : new Date();
                            baseD.setDate(baseD.getDate() + 30 * i);
                            const calculatedDate = baseD.toISOString().split('T')[0];
                            const currentDateVal = osCustomDueDates[num] || calculatedDate;
                            return (
                              <div key={num} className="bg-white/5 p-2 rounded-lg border border-white/5 flex items-center justify-between gap-2 text-xs">
                                <span className="font-bold text-slate-300">{num}ª Parcela:</span>
                                <input
                                  type="date"
                                  value={currentDateVal}
                                  onChange={e => setOsCustomDueDates(prev => ({ ...prev, [num]: e.target.value }))}
                                  className="bg-black/80 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lista Visual de Pagamentos Lançados */}
                  {payments.length > 0 && (
                    <div className="space-y-2 bg-black/40 p-3.5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Pagamentos Lançados nesta OS ({payments.length}):
                        </span>
                        <button
                          type="button"
                          onClick={handleClearPayments}
                          className="text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline transition-colors"
                        >
                          Limpar Todos
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {payments.map(p => (
                          <div key={p.id} className="p-2.5 bg-slate-900/90 rounded-lg border border-white/10 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-white text-xs flex items-center gap-1.5">
                                {p.texto}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePayment(p.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors shrink-0"
                              title="Remover pagamento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Campo Editável de Formas de Pagamento Selecionadas */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-500 font-bold">
                      Resumo das Formas de Pagamento (Sincronizado)
                    </label>
                    <textarea 
                      name="formasPagamento" 
                      value={formData.formasPagamento} 
                      onChange={handleChange} 
                      rows="2"
                      placeholder="Os pagamentos adicionados acima aparecerão aqui organizados..." 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 resize-none focus:outline-none focus:border-emerald-500/50" 
                    />
                  </div>
                </div>
              );
            })()}

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
              onClick={() => {
                const finalParcelas = payments.filter(p => p.method === 'Boleto').flatMap(p => p.parcelas || []);
                const finalFormas = payments.length > 0 ? payments.map(p => p.texto).join('\n') : formData.formasPagamento;
                onSaveAndPrint({ 
                  ...formData, 
                  formasPagamento: finalFormas,
                  parcelas: finalParcelas.length > 0 ? finalParcelas : (formData.parcelas || []),
                  PARCELAS_JSON: JSON.stringify(finalParcelas.length > 0 ? finalParcelas : (formData.parcelas || [])),
                  selectedCity: selectedCity || 'Cajati', 
                  unidade: selectedCity || 'Cajati' 
                });
              }}
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
