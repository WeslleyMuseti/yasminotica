import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, MapPin, CreditCard, CheckCircle, ArrowLeft, AtSign, PlusCircle, Users, Download, Eye, Tag, AlertTriangle, DollarSign, Calendar, Activity } from 'lucide-react';
import DataTable from './DataTable';
import OSGeneratorModal from './OSGeneratorModal';
import PrintableOS from './PrintableOS';
import * as XLSX from 'xlsx';

const ClientRegistration = ({ clientsData, onAddClient, onBack, initialTab = 'todos' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [osClientData, setOsClientData] = useState(null);
  const [osDataForPrint, setOsDataForPrint] = useState(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    'Nome Completo': '',
    'CPF / CNPJ': '',
    'WhatsApp': '',
    'E-mail': '',
    'Instagram': '',
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    
    // Adiciona na estrutura de dados da interface (tabela)
    onAddClient(formData);

    // Salva o arquivo XML IMEDIATAMENTE acionando a janela "Salvar Como"
    // Incluímos a formData recém preenchida junto com os que já existem
    const dadosParaBaixar = [...clientsData, formData];
    await downloadXML(dadosParaBaixar);
    
    setIsSubmitting(false);
    setSuccess(true);
    
    setTimeout(() => {
      setSuccess(false);
      setFormData({
        'Nome Completo': '',
        'CPF / CNPJ': '',
        'WhatsApp': '',
        'E-mail': '',
        'Instagram': '',
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
      setIsAdding(false); // Voltar para a tabela após sucesso
    }, 2000);
  };

  const filteredData = clientsData.filter(client => {
    if (activeTab === 'todos') return true;
    const status = client['Status de Pagamento'] || 'Em dia'; // defaults to 'Em dia' if not set
    if (activeTab === 'inadimplentes') return status === 'Inadimplente';
    return status === 'Em dia';
  });

  const handleSaveAndPrintOS = (osData) => {
    // Aqui podemos no futuro chamar uma função onAddOS(osData) para salvar na planilha raiz.
    // Por enquanto, preparamos para impressão.
    setOsDataForPrint(osData);
    
    // Pequeno delay para garantir que o componente PrintableOS renderize antes de chamar o print
    setTimeout(() => {
      window.print();
      // Opcional: Fechar modal após imprimir
      setOsClientData(null);
      setTimeout(() => setOsDataForPrint(null), 1000); // Limpa depois de imprimir
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
                <DataTable sheetName="CLIENTES_CADASTRADOS" rows={filteredData} onGenerateOS={setOsClientData} />
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
                <h3 className="text-2xl font-black text-white mb-2">Cliente Cadastrado!</h3>
                <p className="text-slate-400 max-w-md mx-auto">O cliente foi adicionado com sucesso e já consta na sua tabela de registros.</p>
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

                  {/* Dados Ópticos */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2 mb-3 mt-2">
                      <Eye size={14} className="text-cyan-400" /> Dados Ópticos
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Marca de Lente */}
                      <div className="md:col-span-1">
                        <input 
                          type="text" 
                          name="Marca de Lente"
                          value={formData['Marca de Lente']}
                          onChange={handleChange}
                          placeholder="Marca de Lente (Ex: Zeiss, Hoya)"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                        />
                      </div>
                      {/* Modelo de Armação */}
                      <div className="md:col-span-1">
                        <input 
                          type="text" 
                          name="Modelo de Armação"
                          value={formData['Modelo de Armação']}
                          onChange={handleChange}
                          placeholder="Modelo de Armação (Ex: Ray-Ban)"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                        />
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
                      onClick={() => setIsAdding(false)}
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
                        <CheckCircle size={18} /> Cadastrar Cliente
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
        onClose={() => setOsClientData(null)} 
        onSaveAndPrint={handleSaveAndPrintOS} 
      />
      
      {osDataForPrint && (
        <PrintableOS clientData={osClientData} osData={osDataForPrint} />
      )}
    </motion.div>
  );
};

export default ClientRegistration;
