import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, MapPin, CreditCard, CheckCircle, ArrowLeft, AtSign, PlusCircle, Users, Download, Eye, Tag, AlertTriangle, DollarSign, Calendar, Activity } from 'lucide-react';
import DataTable from './DataTable';
import OSGeneratorModal from './OSGeneratorModal';
import PrintableOS from './PrintableOS';
import ClientProfileModal from './ClientProfileModal';
import * as XLSX from 'xlsx';

const parseCurrency = (val) => {
  if (!val) return 0;
  const cleaned = String(val).replace(/R\$/g, '').trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const ClientRegistration = ({ clientsData, salesData = [], lentesData = [], armacoesData = [], receberData = [], onAddClient, onUpdateClient, onAddSale, onDeleteSale, onAddRow, onUpdateRow, onBack, initialTab = 'todos' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [osClientData, setOsClientData] = useState(null);
  const [osDataForPrint, setOsDataForPrint] = useState(null);
  const [profileClientData, setProfileClientData] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isGeneratingOS, setIsGeneratingOS] = useState(false);
  const [editingClientData, setEditingClientData] = useState(null);
  const [osFormData, setOsFormData] = useState({
    medico: '', dataEntrega: '', lente: '', armacao: '',
    odEsf: '', odCil: '', odEixo: '', odDnp: '', odAlt: '', odDp: '', odOpa: '',
    oeEsf: '', oeCil: '', oeEixo: '', oeDnp: '', oeAlt: '', oeDp: '', oeOpa: '',
    adicao: '', valorTotal: '', valorEntrada: '', restante: '', observacoes: '',
    numeroOS: '', formasPagamento: '', responsavel: '', voucher: '', rg: ''
  });
  const [formData, setFormData] = useState({
    'Nome Completo': '',
    'CPF / CNPJ': '',
    'RG': '',
    'Responsável': '',
    'WhatsApp': '',
        'Referência 1': '',
        'Referência 2': '',
        'Referência 1': '',
        'Referência 2': '',
    'Referência 1': '',
    'Referência 2': '',
    'E-mail': '',
    'Instagram': '',
    'Facebook': '',
    'TikTok': '',
    'Marca de Lente': '',
    'Modelo de Armação': '',
    'Status de Pagamento': 'Em dia',
    'Valor Devido': '',
    'Data de Vencimento': '',
    'Rua': '',
    'Número': '',
    'Bairro': '',
    'Cidade': '',
    'Estado': ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === 'CPF / CNPJ') {
      value = value.replace(/\D/g, '');
      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      } else {
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
      }
      value = value.slice(0, 18);
    } else if (name === 'WhatsApp' || name === 'Referência 1' || name === 'Referência 2') {
      value = value.replace(/\D/g, '');
      if (value.length > 0) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
      }
      value = value.slice(0, 15);
    } else if (name === 'E-mail') {
      value = value.toLowerCase().replace(/\s/g, '');
    } else if (name === 'Instagram' || name === 'TikTok') {
      if (value.length > 0 && !value.startsWith('@')) {
        value = '@' + value.replace(/@/g, '');
      }
      if (value === '@') value = '';
    }

    setFormData({ ...formData, [name]: value });
  };

  const downloadXML = async (dataToDownload) => {
    if (!dataToDownload || dataToDownload.length === 0) return;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Clientes>\n';
    
    dataToDownload.forEach((client, index) => {
      xml += `  <Cliente id="${index + 1}">\n`;
      Object.keys(client).forEach(key => {
        const safeKey = key.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        const safeValue = String(client[key] || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
          
        xml += `    <${safeKey}>${safeValue}</${safeKey}>\n`;
      });
      xml += `  </Cliente>\n`;
    });
    
    xml += '</Clientes>';

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'CLIENTES_CADASTRADOS.xml',
          types: [{
            description: 'Arquivo XML',
            accept: { 'application/xml': ['.xml'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(xml);
        await writable.close();
      } else {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'CLIENTES_CADASTRADOS.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Erro ao salvar o arquivo:', err);
      }
    }
  };

  const handleDownload = () => {
    downloadXML(clientsData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const valorDevidoNum = parseCurrency(formData['Valor Devido']);
    const isEmDia = formData['Status de Pagamento'] === 'Em dia' || valorDevidoNum <= 0;

    let dadosParaBaixar;
    if (editingClientData) {
      if (onUpdateClient) {
        onUpdateClient({ oldRow: editingClientData, newRow: formData });
      }
      dadosParaBaixar = clientsData.map(c => c === editingClientData ? formData : c);

      // Sincronização Bidirecional: se o cliente foi marcado como "Em dia" ou dívida zero, quita no ERP Contas a Receber
      if (isEmDia && receberData && receberData.length > 0 && onUpdateRow) {
        const cName = (formData['Nome Completo'] || formData['NOME'] || '').trim().toLowerCase();
        receberData.forEach(conta => {
          const contaCli = (conta.CLIENTE || conta.cliente || '').trim().toLowerCase();
          const st = (conta.STATUS || conta.status || '').trim();
          if (cName && (contaCli === cName || contaCli.includes(cName) || cName.includes(contaCli)) && (st === 'Pendente' || st === 'Atrasado' || st === 'Inadimplente')) {
            onUpdateRow('CONTAS_RECEBER', conta, {
              ...conta,
              STATUS: 'Recebido',
              DATA_RECEBIMENTO: new Date().toISOString().split('T')[0]
            });
          }
        });
      }
    } else {
      onAddClient(formData);
      dadosParaBaixar = [...clientsData, formData];

      // Sincronização Bidirecional: se o cliente é novo e já tem saldo devedor, cadastra em Contas a Receber no ERP
      if (!isEmDia && valorDevidoNum > 0 && onAddRow) {
        onAddRow('CONTAS_RECEBER', {
          DESCRICAO: `Saldo Inicial / Cadastro (${formData['Marca de Lente'] || 'Lente'} + ${formData['Modelo de Armação'] || 'Armação'})`.trim(),
          CLIENTE: formData['Nome Completo'] || 'Cliente',
          VENDA_OS: '',
          VALOR: valorDevidoNum.toFixed(2).replace('.', ','),
          DATA_VENCIMENTO: formData['Data de Vencimento'] || new Date().toISOString().split('T')[0],
          DATA_RECEBIMENTO: '',
          STATUS: 'Pendente',
          MEIO_PAGAMENTO: 'OS / A Definir',
          OBSERVACOES: 'Gerado automaticamente ao cadastrar o cliente'
        });
      }
    }
    
    setIsSubmitting(false);
    setSuccess(true);
    
    setTimeout(() => {
      setSuccess(false);
      setFormData({
        'Nome Completo': '',
        'CPF / CNPJ': '',
        'RG': '',
        'Responsável': '',
        'WhatsApp': '',
        'Referência 1': '',
        'Referência 2': '',
        'E-mail': '',
        'Instagram': '',
        'Facebook': '',
        'TikTok': '',
        'Marca de Lente': '',
        'Modelo de Armação': '',
        'Status de Pagamento': 'Em dia',
        'Valor Devido': '',
        'Data de Vencimento': '',
        'Rua': '',
        'Número': '',
        'Bairro': '',
        'Cidade': '',
        'Estado': ''
      });
      setIsAdding(false); 
      setEditingClientData(null);
    }, 2000);
  };

  const filteredData = clientsData.filter(client => {
    if (activeTab === 'todos') return true;
    const status = client['Status de Pagamento'] || 'Em dia'; // defaults to 'Em dia' if not set
    if (activeTab === 'inadimplentes') return status === 'Inadimplente';
    return status === 'Em dia';
  });

  const handleSaveAndPrintOS = (osData) => {
    setOsDataForPrint(osData);
    
    // Automatically fallback to subtracting valorTotal - valorEntrada if restante is somehow missing or malformed
    let osRestante = parseCurrency(osData.restante);
    if (osRestante === 0 && parseCurrency(osData.valorTotal) > 0) {
      osRestante = Math.max(0, parseCurrency(osData.valorTotal) - parseCurrency(osData.valorEntrada));
    }
    
    // 1. Baixa Automática no Estoque de Lentes
    if (lentesData && lentesData.length > 0 && onUpdateRow && osData.lente) {
      const matchedLente = lentesData.find(l => {
        const label = `${l.MARCA || l.marca || ''} - ${l.MODELO || l.modelo || ''}`.trim();
        return label === osData.lente || (l.MODELO && osData.lente.includes(l.MODELO)) || (l.modelo && osData.lente.includes(l.modelo));
      });
      if (matchedLente) {
        const currentStock = parseInt(matchedLente.ESTOQUE || matchedLente.estoque || 0, 10);
        if (currentStock > 0) {
          onUpdateRow('CAD_LENTES', matchedLente, {
            ...matchedLente,
            ESTOQUE: currentStock - 1
          });
        }
      }
    }

    // 2. Baixa Automática no Estoque de Armações
    if (armacoesData && armacoesData.length > 0 && onUpdateRow && osData.armacao) {
      const matchedArmacao = armacoesData.find(a => {
        const label = `${a.MARCA || a.marca || ''} - ${a.MODELO || a.modelo || ''}`.trim();
        return label === osData.armacao || (a.MODELO && osData.armacao.includes(a.MODELO)) || (a.modelo && osData.armacao.includes(a.modelo));
      });
      if (matchedArmacao) {
        const currentStock = parseInt(matchedArmacao.ESTOQUE || matchedArmacao.estoque || 0, 10);
        if (currentStock > 0) {
          onUpdateRow('CAD_ARMACOES', matchedArmacao, {
            ...matchedArmacao,
            ESTOQUE: currentStock - 1
          });
        }
      }
    }

    // 3. Lançamento Automático em Contas a Receber no Financeiro ERP
    if (onAddRow) {
      onAddRow('CONTAS_RECEBER', {
        DESCRICAO: `Venda OS #${osData.numeroOS || 'S/N'} - ${(osData.lente + (osData.armacao ? ` + ${osData.armacao}` : '')).trim()}`,
        CLIENTE: osClientData?.['Nome Completo'] || osClientData?.['NOME'] || 'Cliente',
        VENDA_OS: osData.numeroOS || '',
        VALOR: osData.valorTotal || '0,00',
        DATA_VENCIMENTO: osData.dataEntrega || new Date().toISOString().split('T')[0],
        DATA_RECEBIMENTO: osRestante <= 0 ? new Date().toISOString().split('T')[0] : '',
        STATUS: osRestante <= 0 ? 'Recebido' : 'Pendente',
        MEIO_PAGAMENTO: 'OS / A Definir',
        OBSERVACOES: `Sinal: R$ ${osData.valorEntrada || '0,00'}, Restante: R$ ${osRestante > 0 ? osRestante.toFixed(2).replace('.', ',') : '0,00'}`
      });
    }

    // Salvar automaticamente no histórico de compras
    if (onAddSale && osClientData) {
      onAddSale({
        'DATA  DA VENDA': new Date().toISOString().split('T')[0],
        'PRODUTO': (osData.lente + (osData.armacao ? ` + ${osData.armacao}` : '')).trim() || 'Óculos Completo',
        'VALOR TOTAL': osData.valorTotal,
        'SITUAÇÃO': osRestante > 0 ? 'Pendente' : 'Pago',
        'OS DA VENDA': osData.numeroOS,
        'NOME CLIENTE': osClientData['Nome Completo'] || osClientData['NOME'],
        'TELEFONE': osClientData['WhatsApp'] || ''
      });
      
      // Atualizar Saldo do Cliente
      if (osRestante > 0 && onUpdateClient) {
        const currentDebt = parseCurrency(osClientData['Valor Devido']);
        const newDebt = currentDebt + osRestante;
        
        const updatedClient = {
          ...osClientData,
          'Valor Devido': newDebt.toFixed(2).replace('.', ','),
          'Status de Pagamento': 'Inadimplente'
        };
        
        onUpdateClient({ oldRow: osClientData, newRow: updatedClient });
        
        if (profileClientData && profileClientData['Nome Completo'] === osClientData['Nome Completo']) {
          setProfileClientData(updatedClient);
        }
      }
    }
    
    // Pequeno delay para garantir que o componente PrintableOS renderize antes de chamar o print
    setTimeout(() => {
      window.print();
      setIsGeneratingOS(false);
      setOsClientData(null);
      setTimeout(() => setOsDataForPrint(null), 1000);
    }, 300);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-[1400px] mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 glass-card hover:bg-white/5 transition-all rounded-xl text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-black title-gradient uppercase">Gestão de Clientes</h2>
            <p className="text-slate-400 text-sm mt-1">Base de dados e cadastro da Yasmin Ótica.</p>
          </div>
        </div>

        {!isAdding && (
          <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
            {/* Tabs de Filtro */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
              <button onClick={() => setActiveTab('todos')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'todos' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Todos</button>
              <button onClick={() => setActiveTab('em-dia')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'em-dia' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Em Dia</button>
              <button onClick={() => setActiveTab('inadimplentes')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === 'inadimplentes' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><AlertTriangle size={13}/> Inadimplentes</button>
            </div>

            <div className="flex items-center gap-2">
              {clientsData.length > 0 && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2 glass-card text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/10 rounded-xl font-black transition-all text-sm"
                >
                  <Download size={16} /> Baixar
                </button>
              )}
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white rounded-xl font-black transition-all shadow-lg shadow-sky-500/25 text-sm"
              >
                <PlusCircle size={16} /> Novo
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isAdding ? (
          <motion.div 
            key="table"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-6"
          >
            {filteredData.length > 0 ? (
              <>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Users size={14} className="text-sky-400"/> Clientes Listados · {filteredData.length} registros
                </p>
                {/* Reutilizando a tabela do dashboard para listar os clientes */}
                <DataTable 
                  sheetName="CLIENTES_CADASTRADOS" 
                  rows={filteredData} 
                  onGenerateOS={setOsClientData} 
                  onViewProfile={setProfileClientData}
                />
              </>
            ) : (
              <div className="text-center py-20">
                <Users size={48} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nenhum cliente encontrado</h3>
                <p className="text-slate-400 mb-6">Não há clientes registrados na base com este filtro.</p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold transition-all"
                >
                  Cadastrar Novo Cliente
                </button>
              </div>
            )}
          </motion.div>
        ) : isGeneratingOS && osClientData ? (
          // ─── TELA DE GERAR OS (INLINE, IGUAL AO CADASTRO) ────────────
          <motion.div
            key="os-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8 relative overflow-hidden max-w-4xl mx-auto"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-fuchsia-500/20 rounded-2xl flex items-center justify-center">
                <Download className="text-fuchsia-400" size={22} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400">Gerar Ordem de Serviço</h3>
                <p className="text-slate-400 text-sm">Cliente: <span className="text-sky-400 font-bold">{osClientData['Nome Completo'] || osClientData['NOME']}</span></p>
              </div>
            </div>

            <div className="relative z-10 space-y-8">

              {/* Bloco 1: Receita */}
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Activity size={16} className="text-sky-400"/> Receita / Dioptria
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nº da OS</label>
                    <input type="text" value={osFormData.numeroOS} onChange={e => setOsFormData(p => ({...p, numeroOS: e.target.value}))} placeholder="Ex: OS-1234" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-fuchsia-400 font-bold focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Médico Oftalmologista</label>
                    <input type="text" value={osFormData.medico} onChange={e => setOsFormData(p => ({...p, medico: e.target.value}))} placeholder="Nome do Médico" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Data de Entrega Prevista</label>
                    <input type="date" value={osFormData.dataEntrega} onChange={e => setOsFormData(p => ({...p, dataEntrega: e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all" />
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
                    <tbody>
                      <tr>
                        <td className="font-bold text-sky-400 pr-2">OD</td>
                        {['odEsf','odCil','odEixo','odDnp','odAlt','odDp','odOpa'].map(k => (
                          <td key={k} className="pr-2"><input type="text" value={osFormData[k]} onChange={e => setOsFormData(p => ({...p, [k]: e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                        ))}
                      </tr>
                      <tr>
                        <td className="font-bold text-emerald-400 pr-2 pt-2">OE</td>
                        {['oeEsf','oeCil','oeEixo','oeDnp','oeAlt','oeDp','oeOpa'].map(k => (
                          <td key={k} className="pr-2 pt-2"><input type="text" value={osFormData[k]} onChange={e => setOsFormData(p => ({...p, [k]: e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white" /></td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="w-1/3 mt-2 space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Adição</label>
                  <input type="text" value={osFormData.adicao} onChange={e => setOsFormData(p => ({...p, adicao: e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-center text-white" />
                </div>
              </div>

              {/* Bloco 2: Produtos (Conectado ao Estoque do ERP) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                    <Eye size={16} className="text-fuchsia-400"/> Lente &amp; Armação
                  </h4>
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                    Sincronizado com Estoque
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Marca/Tipo da Lente (Estoque)</label>
                    <input 
                      list="datalist-lentes-os"
                      type="text" 
                      placeholder="Selecione ou digite a lente..." 
                      value={osFormData.lente} 
                      onChange={e => setOsFormData(p => ({...p, lente: e.target.value}))} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all" 
                    />
                    <datalist id="datalist-lentes-os">
                      {lentesData && lentesData.map((l, idx) => {
                        const label = `${l.MARCA || l.marca || ''} - ${l.MODELO || l.modelo || ''}`.trim();
                        const est = l.ESTOQUE || l.estoque || 0;
                        const pr = l.PRECO_VENDA || l.preco_venda || '0,00';
                        return <option key={idx} value={label}>{`Estoque: ${est} par(es) | Pr: R$ ${pr}`}</option>;
                      })}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Modelo da Armação (Estoque)</label>
                    <input 
                      list="datalist-armacoes-os"
                      type="text" 
                      placeholder="Selecione ou digite a armação..." 
                      value={osFormData.armacao} 
                      onChange={e => setOsFormData(p => ({...p, armacao: e.target.value}))} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all" 
                    />
                    <datalist id="datalist-armacoes-os">
                      {armacoesData && armacoesData.map((a, idx) => {
                        const label = `${a.MARCA || a.marca || ''} - ${a.MODELO || a.modelo || ''}`.trim();
                        const est = a.ESTOQUE || a.estoque || 0;
                        const pr = a.PRECO_VENDA || a.preco_venda || '0,00';
                        return <option key={idx} value={label}>{`Estoque: ${est} peça(s) | Pr: R$ ${pr}`}</option>;
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
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Valor Total (R$)</label>
                    <input type="text" value={osFormData.valorTotal} onChange={e => {
                      const val = e.target.value;
                      const total = parseCurrency(val);
                      const entrada = parseCurrency(osFormData.valorEntrada);
                      const rest = Math.max(0, total - entrada);
                      setOsFormData(p => ({...p, valorTotal: val, restante: rest > 0 ? rest.toFixed(2).replace('.',',') : '0,00'}));
                    }} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Sinal / Entrada (R$)</label>
                    <input type="text" value={osFormData.valorEntrada} onChange={e => {
                      const val = e.target.value;
                      const total = parseCurrency(osFormData.valorTotal);
                      const entrada = parseCurrency(val);
                      const rest = Math.max(0, total - entrada);
                      setOsFormData(p => ({...p, valorEntrada: val, restante: rest > 0 ? rest.toFixed(2).replace('.',',') : '0,00'}));
                    }} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Restante (R$)</label>
                    <input type="text" readOnly value={osFormData.restante} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-rose-400 font-bold cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Observações Adicionais</label>
                <textarea value={osFormData.observacoes} onChange={e => setOsFormData(p => ({...p, observacoes: e.target.value}))} rows="2" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all" />
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setIsGeneratingOS(false); setOsClientData(null); }}
                  className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAndPrintOS(osFormData)}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-white font-black rounded-xl shadow-lg shadow-fuchsia-500/20 transition-all"
                >
                  <Download size={18} /> Salvar e Imprimir OS
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8 relative overflow-hidden max-w-4xl mx-auto"
          >
            {/* Efeitos visuais de vidro / premium */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] pointer-events-none" />

            {success ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="flex flex-col items-center justify-center py-20 text-center z-10 relative"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6"
                >
                  <CheckCircle size={40} className="text-emerald-400" />
                </motion.div>
                <h3 className="text-2xl font-black text-white mb-2">{editingClientData ? 'Cadastro Atualizado!' : 'Cliente Cadastrado!'}</h3>
                <p className="text-slate-400 max-w-md mx-auto">{editingClientData ? 'As informações do cliente foram salvas com sucesso.' : 'O cliente foi adicionado com sucesso e já consta na sua tabela de registros.'}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Nome */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <User size={14} className="text-sky-400" /> Nome Completo
                    </label>
                    <input 
                      type="text" 
                      name="Nome Completo"
                      required
                      value={formData['Nome Completo']}
                      onChange={handleChange}
                      placeholder="Ex: Yasmin Oliveira"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                    />
                  </div>

                  {/* Documento */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <CreditCard size={14} className="text-fuchsia-400" /> CPF / CNPJ
                    </label>
                    <input 
                      type="text" 
                      name="CPF / CNPJ"
                      value={formData['CPF / CNPJ']}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all"
                    />
                  </div>

                  {/* RG */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <CreditCard size={14} className="text-fuchsia-400" /> RG
                    </label>
                    <input 
                      type="text" 
                      name="RG"
                      value={formData['RG']}
                      onChange={handleChange}
                      placeholder="00.000.000-0"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all"
                    />
                  </div>

                  {/* Responsável */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <User size={14} className="text-sky-400" /> Responsável
                    </label>
                    <input 
                      type="text" 
                      name="Responsável"
                      value={formData['Responsável']}
                      onChange={handleChange}
                      placeholder="Nome do Responsável (se houver)"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <Phone size={14} className="text-emerald-400" /> WhatsApp
                    </label>
                    <input 
                      type="text" 
                      name="WhatsApp"
                      required
                      value={formData['WhatsApp']}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>

                  {/* Ref 1 */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <Phone size={14} className="text-sky-400" /> Referência 1
                    </label>
                    <input 
                      type="text" 
                      name="Referência 1"
                      value={formData['Referência 1']}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                    />
                  </div>

                  {/* Ref 2 */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <Phone size={14} className="text-sky-400" /> Referência 2
                    </label>
                    <input 
                      type="text" 
                      name="Referência 2"
                      value={formData['Referência 2']}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <Mail size={14} className="text-amber-400" /> E-mail
                    </label>
                    <input 
                      type="email" 
                      name="E-mail"
                      value={formData['E-mail']}
                      onChange={handleChange}
                      placeholder="cliente@email.com"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                    />
                  </div>

                  {/* Instagram */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <AtSign size={14} className="text-pink-400" /> Instagram
                    </label>
                    <input 
                      type="text" 
                      name="Instagram"
                      value={formData['Instagram']}
                      onChange={handleChange}
                      placeholder="@usuario"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                    />
                  </div>

                  {/* Facebook */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <AtSign size={14} className="text-blue-500" /> Facebook
                    </label>
                    <input 
                      type="text" 
                      name="Facebook"
                      value={formData['Facebook']}
                      onChange={handleChange}
                      placeholder="Nome ou link"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  {/* TikTok */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <AtSign size={14} className="text-gray-300" /> TikTok
                    </label>
                    <input 
                      type="text" 
                      name="TikTok"
                      value={formData['TikTok']}
                      onChange={handleChange}
                      placeholder="@usuario"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-300/50 transition-all"
                    />
                  </div>

                  {/* Dados Ópticos */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2 mb-3 mt-2">
                      <Eye size={14} className="text-cyan-400" /> Dados Ópticos
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Marca de Lente */}
                      <div className="md:col-span-1">
                        <input 
                          list="datalist-reg-lente"
                          type="text" 
                          name="Marca de Lente"
                          value={formData['Marca de Lente']}
                          onChange={handleChange}
                          placeholder="Marca de Lente (Ex: Zeiss, Hoya)"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                        />
                        <datalist id="datalist-reg-lente">
                          {lentesData && lentesData.map((l, idx) => {
                            const lNome = `${l.MARCA || l.marca || ''} - ${l.MODELO || l.modelo || ''}`.trim();
                            return <option key={idx} value={lNome}>{`Estoque: ${l.ESTOQUE || 0} par(es)`}</option>;
                          })}
                        </datalist>
                      </div>
                      {/* Modelo de Armação */}
                      <div className="md:col-span-1">
                        <input 
                          list="datalist-reg-armacao"
                          type="text" 
                          name="Modelo de Armação"
                          value={formData['Modelo de Armação']}
                          onChange={handleChange}
                          placeholder="Modelo de Armação (Ex: Ray-Ban)"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                        />
                        <datalist id="datalist-reg-armacao">
                          {armacoesData && armacoesData.map((a, idx) => {
                            const aNome = `${a.MARCA || a.marca || ''} - ${a.MODELO || a.modelo || ''}`.trim();
                            return <option key={idx} value={aNome}>{`Estoque: ${a.ESTOQUE || 0} peça(s)`}</option>;
                          })}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  {/* Status Financeiro */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2 mb-3 mt-2">
                      <Activity size={14} className="text-rose-400" /> Situação Financeira
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                      {/* Status */}
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-[10px] uppercase text-slate-400 ml-1 font-bold tracking-widest">Status de Pagamento</label>
                        <select 
                          name="Status de Pagamento"
                          value={formData['Status de Pagamento']}
                          onChange={handleChange}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all appearance-none cursor-pointer"
                        >
                          <option value="Em dia">✅ Em dia</option>
                          <option value="Inadimplente">⚠️ Inadimplente</option>
                        </select>
                      </div>
                      
                      {/* Condicional p/ Inadimplentes */}
                      {formData['Status de Pagamento'] === 'Inadimplente' && (
                        <>
                          {/* Valor Devido */}
                          <div className="space-y-1 md:col-span-1">
                            <label className="text-[10px] uppercase text-rose-400 ml-1 font-bold tracking-widest flex items-center gap-1"><DollarSign size={10}/> Valor Devido</label>
                            <input 
                              type="text" 
                              name="Valor Devido"
                              value={formData['Valor Devido']}
                              onChange={handleChange}
                              placeholder="R$ 0,00"
                              className="w-full bg-black/40 border border-rose-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                            />
                          </div>
                          
                          {/* Data Vencimento */}
                          <div className="space-y-1 md:col-span-1">
                            <label className="text-[10px] uppercase text-rose-400 ml-1 font-bold tracking-widest flex items-center gap-1"><Calendar size={10}/> Vencimento</label>
                            <input 
                              type="date" 
                              name="Data de Vencimento"
                              value={formData['Data de Vencimento']}
                              onChange={handleChange}
                              className="w-full bg-black/40 border border-rose-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Endereço Detalhado */}
                  <div className="space-y-2 md:col-span-2">
                     <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2 mb-3 mt-2">
                      <MapPin size={14} className="text-violet-400" /> Endereço
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Rua */}
                      <div className="md:col-span-2">
                        <input 
                          type="text" 
                          name="Rua"
                          value={formData['Rua']}
                          onChange={handleChange}
                          placeholder="Rua / Avenida"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                        />
                      </div>
                      {/* Número */}
                      <div className="md:col-span-1">
                        <input 
                          type="text" 
                          name="Número"
                          value={formData['Número']}
                          onChange={handleChange}
                          placeholder="Número"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                        />
                      </div>
                      {/* Bairro */}
                      <div className="md:col-span-1">
                        <input 
                          type="text" 
                          name="Bairro"
                          value={formData['Bairro']}
                          onChange={handleChange}
                          placeholder="Bairro"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                        />
                      </div>
                      {/* Cidade */}
                      <div className="md:col-span-2">
                        <input 
                          type="text" 
                          name="Cidade"
                          value={formData['Cidade']}
                          onChange={handleChange}
                          placeholder="Cidade"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                        />
                      </div>
                      {/* Estado */}
                      <div className="md:col-span-2">
                        <input 
                          type="text" 
                          name="Estado"
                          value={formData['Estado']}
                          onChange={handleChange}
                          placeholder="Estado (UF)"
                          maxLength={2}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5 flex justify-end gap-4">
                  {clientsData.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingClientData(null);
                      }}
                      className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white rounded-xl font-black transition-all flex items-center gap-2 shadow-lg shadow-sky-500/25 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} /> {editingClientData ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal e Área de Impressão da OS */}
      <OSGeneratorModal 
        isOpen={!!osClientData} 
        clientData={osClientData} 
        lentesData={lentesData}
        armacoesData={armacoesData}
        onClose={() => setOsClientData(null)} 
        onSaveAndPrint={handleSaveAndPrintOS} 
      />
      
      {osDataForPrint && (
        <PrintableOS clientData={osClientData} osData={osDataForPrint} />
      )}

      {/* Modal de Perfil e Histórico */}
      <ClientProfileModal
        isOpen={!!profileClientData}
        onClose={() => setProfileClientData(null)}
        clientData={profileClientData}
        clientHistory={salesData.filter(sale => {
          if (!profileClientData) return false;
          const clientName = (profileClientData['Nome Completo'] || profileClientData['NOME'] || '').toLowerCase().trim();
          const saleClientName = (sale['NOME CLIENTE'] || sale['NOME'] || sale['Cliente'] || '').toLowerCase().trim();
          return clientName && saleClientName.includes(clientName);
        })}
        onUpdateStatus={(newStatus) => {
          if (onUpdateClient && profileClientData) {
            onUpdateClient({
              oldRow: profileClientData,
              newRow: { ...profileClientData, 'Status de Pagamento': newStatus }
            });
            setProfileClientData({ ...profileClientData, 'Status de Pagamento': newStatus });

            // Sincronização com Contas a Receber do ERP
            if (newStatus === 'Em dia' && receberData && receberData.length > 0 && onUpdateRow) {
              const cName = (profileClientData['Nome Completo'] || profileClientData['NOME'] || '').trim().toLowerCase();
              receberData.forEach(conta => {
                const contaCli = (conta.CLIENTE || conta.cliente || '').trim().toLowerCase();
                const st = (conta.STATUS || conta.status || '').trim();
                if (cName && (contaCli === cName || contaCli.includes(cName) || cName.includes(contaCli)) && (st === 'Pendente' || st === 'Atrasado' || st === 'Inadimplente')) {
                  onUpdateRow('CONTAS_RECEBER', conta, {
                    ...conta,
                    STATUS: 'Recebido',
                    DATA_RECEBIMENTO: new Date().toISOString().split('T')[0]
                  });
                }
              });
            }
          }
        }}
        onAddPurchase={(newPurchase) => {
          if (onAddSale) onAddSale(newPurchase);
        }}
        onEditClick={() => {
          setEditingClientData(profileClientData);
          setFormData({
            'Nome Completo': profileClientData['Nome Completo'] || profileClientData['NOME'] || '',
            'CPF / CNPJ': profileClientData['CPF / CNPJ'] || '',
            'RG': profileClientData['RG'] || '',
            'Responsável': profileClientData['Responsável'] || '',
            'WhatsApp': profileClientData['WhatsApp'] || profileClientData['TELEFONE CLIENTE'] || '',
            'Referência 1': profileClientData['Referência 1'] || '',
            'Referência 2': profileClientData['Referência 2'] || '',
            'E-mail': profileClientData['E-mail'] || '',
            'Instagram': profileClientData['Instagram'] || '',
            'Facebook': profileClientData['Facebook'] || '',
            'TikTok': profileClientData['TikTok'] || '',
            'Marca de Lente': profileClientData['Marca de Lente'] || '',
            'Modelo de Armação': profileClientData['Modelo de Armação'] || '',
            'Status de Pagamento': profileClientData['Status de Pagamento'] || 'Em dia',
            'Valor Devido': profileClientData['Valor Devido'] || '',
            'Data de Vencimento': profileClientData['Data de Vencimento'] || '',
            'Rua': profileClientData['Rua'] || '',
            'Número': profileClientData['Número'] || '',
            'Bairro': profileClientData['Bairro'] || '',
            'Cidade': profileClientData['Cidade'] || '',
            'Estado': profileClientData['Estado'] || ''
          });
          setIsAdding(true);
          setProfileClientData(null);
        }}
        onGenerateOS={(clientData) => {
          setOsClientData(clientData);
          setOsFormData({
            medico: '', dataEntrega: '',
            lente: clientData['Marca de Lente'] || '',
            armacao: clientData['Modelo de Armação'] || '',
            odEsf: '', odCil: '', odEixo: '', odDnp: '', odAlt: '',
            oeEsf: '', oeCil: '', oeEixo: '', oeDnp: '', oeAlt: '',
            adicao: '', valorTotal: clientData['Valor Devido'] || '',
            valorEntrada: '', restante: '', observacoes: '',
            numeroOS: `OS-${Math.floor(1000 + Math.random() * 9000)}`
          });
          setIsGeneratingOS(true);
          setProfileClientData(null);
        }}
        onDeleteSale={(historyIndex) => {
          const clientName = (profileClientData?.['Nome Completo'] || profileClientData?.['NOME'] || '').toLowerCase().trim();
          const clientSales = salesData.filter(sale => {
            const saleClientName = (sale['NOME CLIENTE'] || sale['NOME'] || sale['Cliente'] || '').toLowerCase().trim();
            return clientName && saleClientName.includes(clientName);
          });
          const saleToDelete = clientSales[historyIndex];
          if (saleToDelete && onDeleteSale) {
            onDeleteSale(saleToDelete);
          }
        }}
        onRegisterPayment={(paymentString, paymentOS) => {
          if (!profileClientData || !onUpdateClient) return;
          
          const amountPaid = parseCurrency(paymentString);
          if (amountPaid <= 0) return;

          const currentDebt = parseCurrency(profileClientData['Valor Devido']);
          const newDebt = Math.max(0, currentDebt - amountPaid);
          const newStatus = newDebt === 0 ? 'Em dia' : profileClientData['Status de Pagamento'];

          const updatedClient = {
            ...profileClientData,
            'Valor Devido': newDebt.toFixed(2).replace('.', ','),
            'Status de Pagamento': newStatus
          };

          onUpdateClient({ oldRow: profileClientData, newRow: updatedClient });
          setProfileClientData(updatedClient);

          if (onAddSale) {
            onAddSale({
              'DATA  DA VENDA': new Date().toISOString().split('T')[0],
              'PRODUTO': '💰 Pagamento Recebido',
              'VALOR TOTAL': amountPaid.toFixed(2).replace('.', ','),
              'SITUAÇÃO': 'Pago',
              'OS DA VENDA': paymentOS ? paymentOS.trim() : '—',
              'NOME CLIENTE': profileClientData['Nome Completo'] || profileClientData['NOME'],
              'TELEFONE': profileClientData['WhatsApp'] || ''
            });
          }

          // Sincronização com Contas a Receber do ERP (se quitou toda a dívida ou se abateu)
          if (newDebt === 0 && receberData && receberData.length > 0 && onUpdateRow) {
            const cName = (profileClientData['Nome Completo'] || profileClientData['NOME'] || '').trim().toLowerCase();
            receberData.forEach(conta => {
              const contaCli = (conta.CLIENTE || conta.cliente || '').trim().toLowerCase();
              const st = (conta.STATUS || conta.status || '').trim();
              if (cName && (contaCli === cName || contaCli.includes(cName) || cName.includes(contaCli)) && (st === 'Pendente' || st === 'Atrasado' || st === 'Inadimplente')) {
                onUpdateRow('CONTAS_RECEBER', conta, {
                  ...conta,
                  STATUS: 'Recebido',
                  DATA_RECEBIMENTO: new Date().toISOString().split('T')[0]
                });
              }
            });
          }
        }}
        receberData={receberData}
        onUpdateRow={onUpdateRow}
      />
    </motion.div>
  );
};

export default ClientRegistration;
