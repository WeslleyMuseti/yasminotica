import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  ClipboardList, 
  Eye, 
  Calendar, 
  DollarSign, 
  PackageCheck, 
  AlertCircle,
  Building2,
  User,
  Stethoscope,
  Glasses
} from 'lucide-react';

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

const EditOSModal = ({
  isOpen,
  onClose,
  osData,
  clientData,
  onSave
}) => {
  const [formData, setFormData] = useState({
    numeroOS: '',
    status: 'No Laboratório',
    armacao: '',
    lente: '',
    laboratorio: '',
    medico: '',
    dataVenda: '',
    dataEntrega: '',
    dataEntregaReal: '',
    quemRetirou: '',
    valorTotal: '',
    valorEntrada: '',
    restante: '',
    formasPagamento: '',
    observacoes: '',
    odEsf: '',
    odCil: '',
    odEixo: '',
    odDnp: '',
    odAlt: '',
    oeEsf: '',
    oeCil: '',
    oeEixo: '',
    oeDnp: '',
    oeAlt: '',
    adicao: ''
  });

  const [activeTab, setActiveTab] = useState('geral'); // 'geral', 'receita', 'financeiro'

  useEffect(() => {
    if (osData) {
      let st = osData['STATUS_OS'] || osData['SITUAÇÃO'] || 'No Laboratório';
      if (st === 'Pago' || st === 'PAGO' || st === 'Concluído' || st === 'Entregue') {
        st = 'Entregue';
      } else if (st === 'Pendente' || st === 'PENDENTE' || st === 'Aberto') {
        st = 'No Laboratório';
      }

      setFormData({
        numeroOS: String(osData['OS DA VENDA'] || osData['OS'] || osData['VENDA_OS'] || osData['OS da COMPRA'] || '').trim(),
        status: st,
        armacao: osData['ARMAÇÃO'] || osData['Armação'] || osData['PRODUTO'] || '',
        lente: osData['LENTE'] || osData['Lente'] || '',
        laboratorio: osData['LABORATORIO'] || osData['Laboratório'] || osData['LAB'] || '',
        medico: osData['MEDICO'] || osData['Médico'] || '',
        dataVenda: osData['DATA  DA VENDA'] || osData['DATA'] || osData['Data da Venda'] || '',
        dataEntrega: osData['DATA ENTREGA ÓCULOS'] || osData['DATA_ENTREGA'] || osData['Previsão Entrega'] || osData['DATA VENCIMENTO'] || '',
        dataEntregaReal: osData['DATA_ENTREGA_REAL'] || osData['DATA_BAIXA_ENTREGA'] || (st === 'Entregue' ? new Date().toISOString().split('T')[0] : ''),
        quemRetirou: osData['QUEM_RETIROU'] || (st === 'Entregue' ? 'Próprio Cliente' : ''),
        valorTotal: osData['VALOR TOTAL'] || osData['VALOR DO ORÇAMENTO'] || osData['VALOR DA VENDA'] || osData['VALOR'] || '',
        valorEntrada: osData['VALOR ENTRADA'] || osData['SINAL'] || '',
        restante: osData['RESTANTE'] || '',
        formasPagamento: osData['FORMAS_PAGAMENTO'] || osData['FORMA_PAGTO'] || osData['FORMA DE PAGAMENTO'] || osData['MEIO_PAGAMENTO'] || '',
        observacoes: osData['OBSERVACOES'] || osData['OBS'] || osData['Observações'] || '',
        // Prescrição OD
        odEsf: osData['OD_ESF'] || osData['odEsf'] || osData['OD ESF'] || '',
        odCil: osData['OD_CIL'] || osData['odCil'] || osData['OD CIL'] || '',
        odEixo: osData['OD_EIXO'] || osData['odEixo'] || osData['OD EIXO'] || '',
        odDnp: osData['OD_DNP'] || osData['odDnp'] || osData['OD DNP'] || '',
        odAlt: osData['OD_ALT'] || osData['odAlt'] || osData['OD ALT'] || '',
        // Prescrição OE
        oeEsf: osData['OE_ESF'] || osData['oeEsf'] || osData['OE ESF'] || '',
        oeCil: osData['OE_CIL'] || osData['oeCil'] || osData['OE CIL'] || '',
        oeEixo: osData['OE_EIXO'] || osData['oeEixo'] || osData['OE EIXO'] || '',
        oeDnp: osData['OE_DNP'] || osData['oeDnp'] || osData['OE DNP'] || '',
        oeAlt: osData['OE_ALT'] || osData['oeAlt'] || osData['OE ALT'] || '',
        // Adição
        adicao: osData['ADICAO'] || osData['adicao'] || osData['ADIÇÃO'] || ''
      });
    }
  }, [osData]);

  if (!isOpen || !osData) return null;

  const handleChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-recalcula restante se alterar valor total ou entrada
      if (field === 'valorTotal' || field === 'valorEntrada') {
        const vt = parseCurrency(field === 'valorTotal' ? value : next.valorTotal);
        const ve = parseCurrency(field === 'valorEntrada' ? value : next.valorEntrada);
        const diff = Math.max(0, vt - ve);
        next.restante = diff.toFixed(2).replace('.', ',');
      }

      // Se status mudar para Entregue e não tiver data real, preenche hoje
      if (field === 'status' && value === 'Entregue' && !next.dataEntregaReal) {
        next.dataEntregaReal = new Date().toISOString().split('T')[0];
        if (!next.quemRetirou) next.quemRetirou = 'Próprio Cliente';
      }

      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const updatedRow = {
      ...osData,
      'OS DA VENDA': formData.numeroOS,
      'OS': formData.numeroOS,
      'VENDA_OS': formData.numeroOS,
      'STATUS_OS': formData.status,
      'SITUAÇÃO': formData.status,
      'ARMAÇÃO': formData.armacao,
      'LENTE': formData.lente,
      'PRODUTO': formData.lente ? `${formData.armacao || 'Armação'} + ${formData.lente}` : (formData.armacao || osData['PRODUTO'] || 'Óculos Completo'),
      'LABORATORIO': formData.laboratorio,
      'MEDICO': formData.medico,
      'DATA  DA VENDA': formData.dataVenda,
      'DATA': formData.dataVenda,
      'DATA ENTREGA ÓCULOS': formData.dataEntrega,
      'DATA_ENTREGA': formData.dataEntrega,
      'DATA_ENTREGA_REAL': formData.status === 'Entregue' ? formData.dataEntregaReal : '',
      'QUEM_RETIROU': formData.status === 'Entregue' ? formData.quemRetirou : '',
      'VALOR TOTAL': formData.valorTotal,
      'VALOR': formData.valorTotal,
      'VALOR ENTRADA': formData.valorEntrada,
      'SINAL': formData.valorEntrada,
      'RESTANTE': formData.restante,
      'FORMAS_PAGAMENTO': formData.formasPagamento,
      'OD_ESF': formData.odEsf,
      'OD_CIL': formData.odCil,
      'OD_EIXO': formData.odEixo,
      'OD_DNP': formData.odDnp,
      'OD_ALT': formData.odAlt,
      'OE_ESF': formData.oeEsf,
      'OE_CIL': formData.oeCil,
      'OE_EIXO': formData.oeEixo,
      'OE_DNP': formData.oeDnp,
      'OE_ALT': formData.oeAlt,
      'ADICAO': formData.adicao,
      'OBSERVACOES': formData.observacoes
    };

    if (onSave) {
      onSave(updatedRow);
    }
  };

  const clientName = clientData?.['Nome Completo'] || clientData?.['NOME'] || osData?.['NOME CLIENTE'] || osData?.['CLIENTE'] || 'Cliente';
  const clientCPF = clientData?.['CPF / CNPJ'] || clientData?.['CPF'] || osData?.['CPF'] || '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99990] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        >
          {/* Cabeçalho do Modal */}
          <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
                <ClipboardList size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2.5 py-0.5 rounded-full">
                    Edição de OS
                  </span>
                  <span className="text-xs font-mono font-black text-pink-300">
                    {formData.numeroOS ? `#${formData.numeroOS}` : 'Sem número'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
                  <span>{clientName}</span>
                  {clientCPF && (
                    <span className="text-xs font-normal text-slate-400">({clientCPF})</span>
                  )}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              title="Fechar (ESC)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Abas de Navegação Interna */}
          <div className="px-6 pt-3 pb-0 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('geral')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 ${
                activeTab === 'geral'
                  ? 'text-pink-400 border-pink-500 bg-slate-900'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Glasses size={15} />
              <span>Produto, Laboratório & Prazos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('receita')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 ${
                activeTab === 'receita'
                  ? 'text-sky-400 border-sky-500 bg-slate-900'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Eye size={15} />
              <span>Prescrição Óptica (OD / OE)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('financeiro')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 ${
                activeTab === 'financeiro'
                  ? 'text-emerald-400 border-emerald-500 bg-slate-900'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <DollarSign size={15} />
              <span>Financeiro & Condições</span>
            </button>
          </div>

          {/* Conteúdo do Formulário */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            
            {/* ─── ABA 1: GERAL (PRODUTOS, STATUS & PRAZOS) ─── */}
            {activeTab === 'geral' && (
              <div className="space-y-6">
                
                {/* Linha 1: Status Semáforo & Número da OS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Número da OS
                    </label>
                    <input
                      type="text"
                      value={formData.numeroOS}
                      onChange={e => handleChange('numeroOS', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-pink-300 font-mono font-bold focus:outline-none focus:border-pink-500"
                      placeholder="Ex: CAJ-12"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Status da Produção (Semáforo do Laboratório)
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => handleChange('status', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-pink-500 cursor-pointer"
                    >
                      <option value="No Laboratório">🟡 No Laboratório (Aguardando Produção)</option>
                      <option value="Aguardando Lente">🔴 Aguardando Lente (Falta de Bloco/Lente)</option>
                      <option value="Em Produção">🟡 Em Produção / Montagem</option>
                      <option value="Pronto para Retirada">🟡 Pronto para Retirada na Loja</option>
                      <option value="Entregue">🟢 Entregue ao Cliente (Finalizada)</option>
                      <option value="Cancelada">⚫ Cancelada</option>
                    </select>
                  </div>
                </div>

                {/* Linha 2: Datas & Entrega */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Calendar size={13} className="text-sky-400" /> Data da Venda
                    </label>
                    <input
                      type="text"
                      value={formData.dataVenda}
                      onChange={e => handleChange('dataVenda', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      placeholder="DD/MM/AAAA ou AAAA-MM-DD"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Calendar size={13} className="text-amber-400" /> Previsão de Entrega dos Óculos
                    </label>
                    <input
                      type="text"
                      value={formData.dataEntrega}
                      onChange={e => handleChange('dataEntrega', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      placeholder="DD/MM/AAAA ou AAAA-MM-DD"
                    />
                  </div>
                </div>

                {/* Se estiver Entregue: Detalhes da Baixa */}
                {formData.status === 'Entregue' && (
                  <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                        <PackageCheck size={13} /> Data Real da Retirada / Entrega
                      </label>
                      <input
                        type="date"
                        value={formData.dataEntregaReal}
                        onChange={e => handleChange('dataEntregaReal', e.target.value)}
                        className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                        <User size={13} /> Quem Retirou os Óculos
                      </label>
                      <input
                        type="text"
                        value={formData.quemRetirou}
                        onChange={e => handleChange('quemRetirou', e.target.value)}
                        className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                        placeholder="Ex: Próprio Cliente / Mãe / Esposo"
                      />
                    </div>
                  </div>
                )}

                {/* Linha 3: Armação & Lente */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Glasses size={13} className="text-amber-400" /> Armação / Modelo
                    </label>
                    <input
                      type="text"
                      value={formData.armacao}
                      onChange={e => handleChange('armacao', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      placeholder="Marca e Modelo da Armação"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Eye size={13} className="text-sky-400" /> Lente Oftálmica
                    </label>
                    <input
                      type="text"
                      value={formData.lente}
                      onChange={e => handleChange('lente', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      placeholder="Marca, Tipo e Tratamentos da Lente"
                    />
                  </div>
                </div>

                {/* Linha 4: Laboratório & Médico */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Building2 size={13} className="text-purple-400" /> Laboratório Óptico
                    </label>
                    <input
                      type="text"
                      value={formData.laboratorio}
                      onChange={e => handleChange('laboratorio', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      placeholder="Ex: Haytek, Braslab, Essilor, Central"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Stethoscope size={13} className="text-teal-400" /> Médico Oftalmo / Optometrista
                    </label>
                    <input
                      type="text"
                      value={formData.medico}
                      onChange={e => handleChange('medico', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      placeholder="Nome do Doutor ou Clínica"
                    />
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Observações Gerais da OS
                  </label>
                  <textarea
                    rows={2}
                    value={formData.observacoes}
                    onChange={e => handleChange('observacoes', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none"
                    placeholder="Anotações técnicas, especificações de montagem ou observações do cliente..."
                  />
                </div>

              </div>
            )}

            {/* ─── ABA 2: PRESCRIÇÃO ÓPTICA (OD / OE / ADIÇÃO) ─── */}
            {activeTab === 'receita' && (
              <div className="space-y-6">
                <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-sky-300">
                  <Eye size={16} className="shrink-0 text-sky-400" />
                  <span>Dioptrias vinculadas exclusivamente a esta Ordem de Serviço. Os dados impressos e enviados ao laboratório usarão esses valores.</span>
                </div>

                {/* Tabela Olho Direito (OD) */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-sky-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    Olho Direito (OD)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Esférico</label>
                      <input
                        type="text"
                        value={formData.odEsf}
                        onChange={e => handleChange('odEsf', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-sky-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Cilíndrico</label>
                      <input
                        type="text"
                        value={formData.odCil}
                        onChange={e => handleChange('odCil', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-sky-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Eixo (°)</label>
                      <input
                        type="text"
                        value={formData.odEixo}
                        onChange={e => handleChange('odEixo', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-sky-500"
                        placeholder="180"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">DNP (mm)</label>
                      <input
                        type="text"
                        value={formData.odDnp}
                        onChange={e => handleChange('odDnp', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-sky-500"
                        placeholder="31"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Altura (mm)</label>
                      <input
                        type="text"
                        value={formData.odAlt}
                        onChange={e => handleChange('odAlt', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-sky-500"
                        placeholder="18"
                      />
                    </div>
                  </div>
                </div>

                {/* Tabela Olho Esquerdo (OE) */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    Olho Esquerdo (OE)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Esférico</label>
                      <input
                        type="text"
                        value={formData.oeEsf}
                        onChange={e => handleChange('oeEsf', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Cilíndrico</label>
                      <input
                        type="text"
                        value={formData.oeCil}
                        onChange={e => handleChange('oeCil', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Eixo (°)</label>
                      <input
                        type="text"
                        value={formData.oeEixo}
                        onChange={e => handleChange('oeEixo', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                        placeholder="180"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">DNP (mm)</label>
                      <input
                        type="text"
                        value={formData.oeDnp}
                        onChange={e => handleChange('oeDnp', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                        placeholder="31"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Altura (mm)</label>
                      <input
                        type="text"
                        value={formData.oeAlt}
                        onChange={e => handleChange('oeAlt', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                        placeholder="18"
                      />
                    </div>
                  </div>
                </div>

                {/* Adição */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 max-w-xs">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                    Adição (Perto)
                  </label>
                  <input
                    type="text"
                    value={formData.adicao}
                    onChange={e => handleChange('adicao', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-pink-500"
                    placeholder="+2.00"
                  />
                </div>

              </div>
            )}

            {/* ─── ABA 3: FINANCEIRO & PAGAMENTO ─── */}
            {activeTab === 'financeiro' && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <DollarSign size={13} className="text-emerald-400" /> Valor Total (R$)
                    </label>
                    <input
                      type="text"
                      value={formData.valorTotal}
                      onChange={e => handleChange('valorTotal', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <DollarSign size={13} className="text-teal-400" /> Valor Entrada / Sinal (R$)
                    </label>
                    <input
                      type="text"
                      value={formData.valorEntrada}
                      onChange={e => handleChange('valorEntrada', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-teal-300 font-bold focus:outline-none focus:border-teal-500"
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <DollarSign size={13} className="text-amber-400" /> Saldo Restante (R$)
                    </label>
                    <input
                      type="text"
                      value={formData.restante}
                      onChange={e => handleChange('restante', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Formas de Pagamento & Parcelamento Registradas
                  </label>
                  <textarea
                    rows={3}
                    value={formData.formasPagamento}
                    onChange={e => handleChange('formasPagamento', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="Ex: R$ 350,00 no Cartão de Crédito 3x / Entrada de R$ 100,00 no PIX..."
                  />
                </div>

              </div>
            )}

            {/* Rodapé de Ações */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-pink-500/25 flex items-center gap-2 active:scale-95"
              >
                <Save size={16} />
                <span>Salvar Alterações da OS</span>
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditOSModal;
