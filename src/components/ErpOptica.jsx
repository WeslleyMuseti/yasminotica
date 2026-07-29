import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Glasses, DollarSign, CreditCard, PlusCircle, ArrowLeft,
  CheckCircle, AlertTriangle, Package, Calendar, Tag, Layers,
  TrendingUp, TrendingDown, Clock, Search, Download, Trash2, Edit2
} from 'lucide-react';
import DataTable from './DataTable';

const parseCurrency = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/R\$/g, '').trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const ErpOptica = ({
  data,
  clientsData = [],
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  onBack,
  initialTab = 'lentes'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isAdding, setIsAdding] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Formulários de cadastro por módulo
  const [lentesForm, setLentesForm] = useState({
    MARCA: '', MODELO: '', MATERIAL: 'Resina', INDICE_REFRACAO: '1.56',
    TRATAMENTO: 'Anti-reflexo', ESFERICO_MIN: '-6.00', ESFERICO_MAX: '+6.00',
    CILINDRICO_MIN: '-4.00', CILINDRICO_MAX: '0.00',
    PRECO_COMPRA: '', PRECO_VENDA: '', ESTOQUE: '10'
  });

  const [armacoesForm, setArmacoesForm] = useState({
    MARCA: '', MODELO: '', REFERENCIA_SKU: '', COR: 'Preto',
    MATERIAL: 'Acetato', TAMANHO: '55-18-140',
    PRECO_COMPRA: '', PRECO_VENDA: '', ESTOQUE: '5'
  });

  const [pagarForm, setPagarForm] = useState({
    DESCRICAO: '', CATEGORIA: 'Fornecedores', VALOR: '',
    DATA_VENCIMENTO: new Date().toISOString().split('T')[0],
    DATA_PAGAMENTO: '', STATUS: 'Pendente', FORNECEDOR: '', OBSERVACOES: ''
  });

  const [receberForm, setReceberForm] = useState({
    DESCRICAO: '', CLIENTE: '', VENDA_OS: '', VALOR: '',
    DATA_VENCIMENTO: new Date().toISOString().split('T')[0],
    DATA_RECEBIMENTO: '', STATUS: 'Pendente', MEIO_PAGAMENTO: 'Cartão de Crédito', OBSERVACOES: ''
  });

  // Dados das abas (seguro contra nulos)
  const lentesData = useMemo(() => data?.['CAD_LENTES'] || [], [data]);
  const armacoesData = useMemo(() => data?.['CAD_ARMACOES'] || [], [data]);
  const pagarData = useMemo(() => data?.['CONTAS_PAGAR'] || [], [data]);
  const receberData = useMemo(() => data?.['CONTAS_RECEBER'] || [], [data]);

  // Estatísticas Rápidas
  const lentesStats = useMemo(() => {
    let totalPares = 0;
    let valorEstoque = 0;
    lentesData.forEach(item => {
      const qtd = parseInt(item.ESTOQUE || item.estoque || 0, 10) || 0;
      const preco = parseCurrency(item.PRECO_COMPRA || item.preco_compra || 0);
      totalPares += qtd;
      valorEstoque += qtd * preco;
    });
    return { total: lentesData.length, totalPares, valorEstoque };
  }, [lentesData]);

  const armacoesStats = useMemo(() => {
    let totalPecs = 0;
    let valorEstoque = 0;
    armacoesData.forEach(item => {
      const qtd = parseInt(item.ESTOQUE || item.estoque || 0, 10) || 0;
      const preco = parseCurrency(item.PRECO_COMPRA || item.preco_compra || 0);
      totalPecs += qtd;
      valorEstoque += qtd * preco;
    });
    return { total: armacoesData.length, totalPecs, valorEstoque };
  }, [armacoesData]);

  const pagarStats = useMemo(() => {
    let pendente = 0;
    let pago = 0;
    pagarData.forEach(item => {
      const val = parseCurrency(item.VALOR || item.valor);
      const st = (item.STATUS || item.status || 'Pendente').trim();
      if (st === 'Pago') pago += val;
      else pendente += val;
    });
    return { pendente, pago, total: pagarData.length };
  }, [pagarData]);

  const receberStats = useMemo(() => {
    let pendente = 0;
    let recebido = 0;
    receberData.forEach(item => {
      const val = parseCurrency(item.VALOR || item.valor);
      const st = (item.STATUS || item.status || 'Pendente').trim();
      if (st === 'Recebido' || st === 'Pago') recebido += val;
      else pendente += val;
    });
    return { pendente, recebido, total: receberData.length };
  }, [receberData]);

  const handleCreateRecord = (e) => {
    e.preventDefault();
    if (activeTab === 'lentes') {
      onAddRow('CAD_LENTES', {
        ...lentesForm,
        PRECO_COMPRA: parseCurrency(lentesForm.PRECO_COMPRA).toFixed(2).replace('.', ','),
        PRECO_VENDA: parseCurrency(lentesForm.PRECO_VENDA).toFixed(2).replace('.', ','),
        ESTOQUE: parseInt(lentesForm.ESTOQUE, 10) || 0,
        DATA_CADASTRO: new Date().toLocaleDateString('pt-BR')
      });
      setLentesForm({
        MARCA: '', MODELO: '', MATERIAL: 'Resina', INDICE_REFRACAO: '1.56',
        TRATAMENTO: 'Anti-reflexo', ESFERICO_MIN: '-6.00', ESFERICO_MAX: '+6.00',
        CILINDRICO_MIN: '-4.00', CILINDRICO_MAX: '0.00',
        PRECO_COMPRA: '', PRECO_VENDA: '', ESTOQUE: '10'
      });
      setSuccessMsg('Lente cadastrada com sucesso no estoque!');
    } else if (activeTab === 'armacoes') {
      onAddRow('CAD_ARMACOES', {
        ...armacoesForm,
        PRECO_COMPRA: parseCurrency(armacoesForm.PRECO_COMPRA).toFixed(2).replace('.', ','),
        PRECO_VENDA: parseCurrency(armacoesForm.PRECO_VENDA).toFixed(2).replace('.', ','),
        ESTOQUE: parseInt(armacoesForm.ESTOQUE, 10) || 0,
        DATA_CADASTRO: new Date().toLocaleDateString('pt-BR')
      });
      setArmacoesForm({
        MARCA: '', MODELO: '', REFERENCIA_SKU: '', COR: 'Preto',
        MATERIAL: 'Acetato', TAMANHO: '55-18-140',
        PRECO_COMPRA: '', PRECO_VENDA: '', ESTOQUE: '5'
      });
      setSuccessMsg('Armação cadastrada com sucesso no estoque!');
    } else if (activeTab === 'pagar') {
      onAddRow('CONTAS_PAGAR', {
        ...pagarForm,
        VALOR: parseCurrency(pagarForm.VALOR).toFixed(2).replace('.', ','),
        DATA_CADASTRO: new Date().toLocaleDateString('pt-BR')
      });
      setPagarForm({
        DESCRICAO: '', CATEGORIA: 'Fornecedores', VALOR: '',
        DATA_VENCIMENTO: new Date().toISOString().split('T')[0],
        DATA_PAGAMENTO: '', STATUS: 'Pendente', FORNECEDOR: '', OBSERVACOES: ''
      });
      setSuccessMsg('Conta a pagar registrada no financeiro!');
    } else if (activeTab === 'receber') {
      const valorNum = parseCurrency(receberForm.VALOR);
      onAddRow('CONTAS_RECEBER', {
        ...receberForm,
        VALOR: valorNum.toFixed(2).replace('.', ','),
        DATA_CADASTRO: new Date().toLocaleDateString('pt-BR')
      });

      // Sincronização Automática com a tabela de Clientes (CLIENTES_CADASTRADOS)
      if (clientsData && clientsData.length > 0 && onUpdateRow && receberForm.CLIENTE) {
        const receivingName = receberForm.CLIENTE.trim().toLowerCase();
        const matchedClient = clientsData.find(c => {
          const nome = (c['Nome Completo'] || c['NOME'] || '').trim().toLowerCase();
          return nome && (nome === receivingName || receivingName.includes(nome) || nome.includes(receivingName));
        });
        if (matchedClient) {
          const statusConta = (receberForm.STATUS || 'Pendente').trim();
          if (statusConta === 'Pendente' || statusConta === 'Inadimplente' || statusConta === 'Atrasado') {
            const currentDebt = parseCurrency(matchedClient['Valor Devido'] || 0);
            const newDebt = currentDebt + valorNum;
            onUpdateRow('CLIENTES_CADASTRADOS', matchedClient, {
              ...matchedClient,
              'Valor Devido': newDebt.toFixed(2).replace('.', ','),
              'Status de Pagamento': 'Inadimplente',
              'Data de Vencimento': receberForm.DATA_VENCIMENTO || matchedClient['Data de Vencimento'] || ''
            });
          }
        }
      }

      setReceberForm({
        DESCRICAO: '', CLIENTE: '', VENDA_OS: '', VALOR: '',
        DATA_VENCIMENTO: new Date().toISOString().split('T')[0],
        DATA_RECEBIMENTO: '', STATUS: 'Pendente', MEIO_PAGAMENTO: 'Cartão de Crédito', OBSERVACOES: ''
      });
      setSuccessMsg('Conta a receber registrada e sincronizada com o saldo do cliente!');
    }

    setIsAdding(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleRowUpdateWithSync = (sheetName, oldRow, newRow) => {
    onUpdateRow(sheetName, oldRow, newRow);

    // Se editarmos/baixarmos uma Conta a Receber no ERP, sincroniza o saldo com a tabela de Clientes!
    if (sheetName === 'CONTAS_RECEBER' && clientsData && clientsData.length > 0) {
      const clienteNome = (newRow.CLIENTE || newRow.cliente || oldRow.CLIENTE || oldRow.cliente || '').trim().toLowerCase();
      const matchedClient = clientsData.find(c => {
        const n = (c['Nome Completo'] || c['NOME'] || '').trim().toLowerCase();
        return n && (n === clienteNome || clienteNome.includes(n) || n.includes(clienteNome));
      });
      if (matchedClient) {
        const oldStatus = (oldRow.STATUS || oldRow.status || '').trim();
        const newStatus = (newRow.STATUS || newRow.status || '').trim();
        const valorRow = parseCurrency(newRow.VALOR || newRow.valor || oldRow.VALOR || oldRow.valor);

        // Se baixou/recebeu a conta agora (antes era pendente/atrasado e agora virou Recebido/Pago)
        if ((oldStatus === 'Pendente' || oldStatus === 'Atrasado' || oldStatus === 'Inadimplente') && (newStatus === 'Recebido' || newStatus === 'Pago' || newStatus === 'Liquidado')) {
          const currentDebt = parseCurrency(matchedClient['Valor Devido'] || 0);
          const newDebt = Math.max(0, currentDebt - valorRow);
          onUpdateRow('CLIENTES_CADASTRADOS', matchedClient, {
            ...matchedClient,
            'Valor Devido': newDebt > 0 ? newDebt.toFixed(2).replace('.', ',') : '0,00',
            'Status de Pagamento': newDebt > 0 ? 'Inadimplente' : 'Em dia'
          });
        }
        // Se reabriu a conta (antes era Recebido/Pago e agora virou Pendente/Atrasado)
        else if ((oldStatus === 'Recebido' || oldStatus === 'Pago' || oldStatus === 'Liquidado') && (newStatus === 'Pendente' || newStatus === 'Atrasado' || newStatus === 'Inadimplente')) {
          const currentDebt = parseCurrency(matchedClient['Valor Devido'] || 0);
          const newDebt = currentDebt + valorRow;
          onUpdateRow('CLIENTES_CADASTRADOS', matchedClient, {
            ...matchedClient,
            'Valor Devido': newDebt.toFixed(2).replace('.', ','),
            'Status de Pagamento': 'Inadimplente'
          });
        }
      }
    }
  };

  const getSheetName = () => {
    switch (activeTab) {
      case 'lentes': return 'CAD_LENTES';
      case 'armacoes': return 'CAD_ARMACOES';
      case 'pagar': return 'CONTAS_PAGAR';
      case 'receber': return 'CONTAS_RECEBER';
      default: return 'CAD_LENTES';
    }
  };

  const getCurrentRows = () => {
    switch (activeTab) {
      case 'lentes': return lentesData;
      case 'armacoes': return armacoesData;
      case 'pagar': return pagarData;
      case 'receber': return receberData;
      default: return [];
    }
  };

  // Alertas Inteligentes de Estoque Baixo e Contas Vencidas
  const criticalStock = useMemo(() => {
    const list = [];
    lentesData.forEach(item => {
      const qtd = parseInt(item.ESTOQUE || item.estoque || 0, 10);
      if (qtd <= 2) {
        list.push({
          type: 'Lente',
          name: `${item.MARCA || item.marca || ''} ${item.MODELO || item.modelo || ''}`.trim() || 'Lente sem nome',
          qtd
        });
      }
    });
    armacoesData.forEach(item => {
      const qtd = parseInt(item.ESTOQUE || item.estoque || 0, 10);
      if (qtd <= 2) {
        list.push({
          type: 'Armação',
          name: `${item.MARCA || item.marca || ''} ${item.MODELO || item.modelo || ''}`.trim() || 'Armação sem nome',
          qtd
        });
      }
    });
    return list;
  }, [lentesData, armacoesData]);

  const overdueBills = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const list = [];
    pagarData.forEach(item => {
      const st = (item.STATUS || item.status || 'Pendente').trim();
      const dt = (item.DATA_VENCIMENTO || item.data_vencimento || '').toString().trim();
      if (st !== 'Pago' && st !== 'Liquidado' && dt && dt <= todayStr) {
        list.push({
          type: 'Pagar',
          descricao: item.DESCRICAO || item.descricao || 'Despesa',
          valor: parseCurrency(item.VALOR || item.valor),
          vencimento: dt
        });
      }
    });
    receberData.forEach(item => {
      const st = (item.STATUS || item.status || 'Pendente').trim();
      const dt = (item.DATA_VENCIMENTO || item.data_vencimento || '').toString().trim();
      if (st !== 'Recebido' && st !== 'Pago' && st !== 'Liquidado' && dt && dt <= todayStr) {
        list.push({
          type: 'Receber',
          descricao: item.DESCRICAO || item.descricao || 'Recebimento',
          valor: parseCurrency(item.VALOR || item.valor),
          vencimento: dt
        });
      }
    });
    return list;
  }, [pagarData, receberData]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 glass-card hover:bg-white/10 transition-all rounded-xl text-slate-400 hover:text-white shadow-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-black uppercase tracking-widest border border-sky-500/20">Módulo ERP</span>
              <span className="text-xs text-slate-400 font-bold">Ótica e Financeiro</span>
            </div>
            <h2 className="text-3xl font-black title-gradient uppercase mt-1">Gestão de Ótica &amp; Financeiro</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black rounded-xl shadow-lg shadow-sky-500/25 transition-all text-sm"
            >
              <PlusCircle size={16} /> Novo Registro
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Sucesso */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 font-bold"
          >
            <CheckCircle size={20} className="text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Painel de Alertas Rápidos (Notificações) */}
      {(criticalStock.length > 0 || overdueBills.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criticalStock.length > 0 && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase tracking-wide">
                <AlertTriangle size={18} className="animate-pulse shrink-0" />
                <span>Estoque Crítico ou Esgotado ({criticalStock.length})</span>
              </div>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {criticalStock.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-black/30 px-3 py-2 rounded-xl border border-rose-500/20 text-xs font-bold text-slate-200">
                    <span className="truncate pr-2 text-slate-300">{item.type}: <span className="text-white font-black">{item.name}</span></span>
                    <span className="shrink-0 px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-lg font-black">Restam {item.qtd}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {overdueBills.length > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase tracking-wide">
                <AlertTriangle size={18} className="animate-pulse shrink-0" />
                <span>Contas Vencidas / Vencendo Hoje ({overdueBills.length})</span>
              </div>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {overdueBills.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-black/30 px-3 py-2 rounded-xl border border-amber-500/20 text-xs font-bold text-slate-200">
                    <span className="truncate pr-2 text-slate-300">{item.type === 'Pagar' ? '📉 A Pagar' : '📈 A Receber'}: <span className="text-white font-black">{item.descricao}</span></span>
                    <span className="shrink-0 font-black text-amber-300">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navegação Secundária em Abas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => { setActiveTab('lentes'); setIsAdding(false); }}
          className={`flex items-center gap-3 p-4 rounded-2xl transition-all border ${
            activeTab === 'lentes'
              ? 'bg-sky-500/20 border-sky-500 text-white shadow-lg shadow-sky-500/10'
              : 'glass-card border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <div className={`p-3 rounded-xl ${activeTab === 'lentes' ? 'bg-sky-500 text-white' : 'bg-white/5 text-sky-400'}`}>
            <Eye size={20} />
          </div>
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-widest opacity-60">Estoque</p>
            <p className="font-black text-sm">Cadastro de Lentes</p>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('armacoes'); setIsAdding(false); }}
          className={`flex items-center gap-3 p-4 rounded-2xl transition-all border ${
            activeTab === 'armacoes'
              ? 'bg-fuchsia-500/20 border-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/10'
              : 'glass-card border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <div className={`p-3 rounded-xl ${activeTab === 'armacoes' ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-fuchsia-400'}`}>
            <Glasses size={20} />
          </div>
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-widest opacity-60">Estoque</p>
            <p className="font-black text-sm">Cadastro de Armações</p>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('receber'); setIsAdding(false); }}
          className={`flex items-center gap-3 p-4 rounded-2xl transition-all border ${
            activeTab === 'receber'
              ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
              : 'glass-card border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <div className={`p-3 rounded-xl ${activeTab === 'receber' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-emerald-400'}`}>
            <TrendingUp size={20} />
          </div>
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-widest opacity-60">Financeiro</p>
            <p className="font-black text-sm">Contas a Receber</p>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('pagar'); setIsAdding(false); }}
          className={`flex items-center gap-3 p-4 rounded-2xl transition-all border ${
            activeTab === 'pagar'
              ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10'
              : 'glass-card border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <div className={`p-3 rounded-xl ${activeTab === 'pagar' ? 'bg-rose-500 text-white' : 'bg-white/5 text-rose-400'}`}>
            <TrendingDown size={20} />
          </div>
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-widest opacity-60">Financeiro</p>
            <p className="font-black text-sm">Contas a Pagar</p>
          </div>
        </button>
      </div>

      {/* Cartões Estatísticos da Aba Ativa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeTab === 'lentes' && (
          <>
            <div className="glass-card p-6 border-l-4 border-l-sky-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total de Linhas / Marcas</p>
              <p className="text-3xl font-black text-white mt-1">{lentesStats.total}</p>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-indigo-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Pares em Estoque</p>
              <p className="text-3xl font-black text-indigo-400 mt-1">{lentesStats.totalPares}</p>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-emerald-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Custo Total em Estoque</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">{formatCurrency(lentesStats.valorEstoque)}</p>
            </div>
          </>
        )}

        {activeTab === 'armacoes' && (
          <>
            <div className="glass-card p-6 border-l-4 border-l-fuchsia-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Modelos Cadastrados</p>
              <p className="text-3xl font-black text-white mt-1">{armacoesStats.total}</p>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-pink-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Peças em Estoque</p>
              <p className="text-3xl font-black text-pink-400 mt-1">{armacoesStats.totalPecs}</p>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-emerald-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Custo Total do Inventário</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">{formatCurrency(armacoesStats.valorEstoque)}</p>
            </div>
          </>
        )}

        {activeTab === 'receber' && (
          <>
            <div className="glass-card p-6 border-l-4 border-l-emerald-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Recebido / Liquidado</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">{formatCurrency(receberStats.recebido)}</p>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-amber-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Pendente de Recebimento</p>
              <p className="text-3xl font-black text-amber-400 mt-1">{formatCurrency(receberStats.pendente)}</p>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-sky-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total de Lançamentos</p>
              <p className="text-3xl font-black text-white mt-1">{receberStats.total}</p>
            </div>
          </>
        )}

        {activeTab === 'pagar' && (
          <>
            <div className="glass-card p-6 border-l-4 border-l-rose-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Pendente a Pagar</p>
              <p className="text-3xl font-black text-rose-400 mt-1">{formatCurrency(pagarStats.pendente)}</p>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-emerald-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Contas Pagas / Liq.</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">{formatCurrency(pagarStats.pago)}</p>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-indigo-500">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total de Despesas Registradas</p>
              <p className="text-3xl font-black text-white mt-1">{pagarStats.total}</p>
            </div>
          </>
        )}
      </div>

      {/* Seção Principal - Tabela ou Formulário */}
      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8 relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <PlusCircle className="text-sky-400" size={24} />
                <h3 className="text-xl font-black text-white uppercase">
                  {activeTab === 'lentes' && 'Novo Cadastro de Lente'}
                  {activeTab === 'armacoes' && 'Novo Cadastro de Armação'}
                  {activeTab === 'receber' && 'Nova Conta a Receber'}
                  {activeTab === 'pagar' && 'Nova Conta a Pagar'}
                </h3>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold text-xs transition-all"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-6">
              {/* FORMULÁRIO DE LENTES */}
              {activeTab === 'lentes' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Marca da Lente *</label>
                    <input required type="text" placeholder="Ex: Essilor, Hoya, Zeiss" value={lentesForm.MARCA} onChange={e => setLentesForm({...lentesForm, MARCA: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Modelo / Tipo *</label>
                    <input required type="text" placeholder="Ex: Varilux Comfort 3.0, Eyezen" value={lentesForm.MODELO} onChange={e => setLentesForm({...lentesForm, MODELO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Material</label>
                    <select value={lentesForm.MATERIAL} onChange={e => setLentesForm({...lentesForm, MATERIAL: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50">
                      <option className="bg-slate-900" value="Resina">Resina Orgânica</option>
                      <option className="bg-slate-900" value="Policarbonato">Policarbonato (Poly)</option>
                      <option className="bg-slate-900" value="Trivex">Trivex</option>
                      <option className="bg-slate-900" value="Cristal">Cristal / Mineral</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Índice de Refração</label>
                    <select value={lentesForm.INDICE_REFRACAO} onChange={e => setLentesForm({...lentesForm, INDICE_REFRACAO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50">
                      <option className="bg-slate-900" value="1.50">1.50 (Padrão)</option>
                      <option className="bg-slate-900" value="1.56">1.56 (Fino)</option>
                      <option className="bg-slate-900" value="1.59">1.59 (Poly)</option>
                      <option className="bg-slate-900" value="1.67">1.67 (Super Fino)</option>
                      <option className="bg-slate-900" value="1.74">1.74 (Ultra Fino)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tratamento</label>
                    <input type="text" placeholder="Ex: Crizal Sapphire, Transitions" value={lentesForm.TRATAMENTO} onChange={e => setLentesForm({...lentesForm, TRATAMENTO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Estoque (Pares)</label>
                    <input type="number" min="0" value={lentesForm.ESTOQUE} onChange={e => setLentesForm({...lentesForm, ESTOQUE: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Grau Esférico (Mín / Máx)</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="-6.00" value={lentesForm.ESFERICO_MIN} onChange={e => setLentesForm({...lentesForm, ESFERICO_MIN: e.target.value})} className="w-1/2 bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-center text-white" />
                      <input type="text" placeholder="+6.00" value={lentesForm.ESFERICO_MAX} onChange={e => setLentesForm({...lentesForm, ESFERICO_MAX: e.target.value})} className="w-1/2 bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-center text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Grau Cilíndrico (Mín / Máx)</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="-4.00" value={lentesForm.CILINDRICO_MIN} onChange={e => setLentesForm({...lentesForm, CILINDRICO_MIN: e.target.value})} className="w-1/2 bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-center text-white" />
                      <input type="text" placeholder="0.00" value={lentesForm.CILINDRICO_MAX} onChange={e => setLentesForm({...lentesForm, CILINDRICO_MAX: e.target.value})} className="w-1/2 bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-center text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Preço de Compra (R$)</label>
                    <input type="text" placeholder="80,00" value={lentesForm.PRECO_COMPRA} onChange={e => setLentesForm({...lentesForm, PRECO_COMPRA: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Preço de Venda (R$)</label>
                    <input type="text" placeholder="250,00" value={lentesForm.PRECO_VENDA} onChange={e => setLentesForm({...lentesForm, PRECO_VENDA: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-emerald-400 font-bold focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                </div>
              )}

              {/* FORMULÁRIO DE ARMAÇÕES */}
              {activeTab === 'armacoes' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Marca da Armação *</label>
                    <input required type="text" placeholder="Ex: Ray-Ban, Vogue, Própria" value={armacoesForm.MARCA} onChange={e => setArmacoesForm({...armacoesForm, MARCA: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Modelo *</label>
                    <input required type="text" placeholder="Ex: Aviator RB3025, Wayfarer" value={armacoesForm.MODELO} onChange={e => setArmacoesForm({...armacoesForm, MODELO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">SKU / Referência</label>
                    <input type="text" placeholder="Ex: ARM-998811" value={armacoesForm.REFERENCIA_SKU} onChange={e => setArmacoesForm({...armacoesForm, REFERENCIA_SKU: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Cor</label>
                    <input type="text" placeholder="Ex: Preto Fosco, Dourado" value={armacoesForm.COR} onChange={e => setArmacoesForm({...armacoesForm, COR: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Material</label>
                    <select value={armacoesForm.MATERIAL} onChange={e => setArmacoesForm({...armacoesForm, MATERIAL: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500/50">
                      <option className="bg-slate-900" value="Acetato">Acetato</option>
                      <option className="bg-slate-900" value="Metal">Metal</option>
                      <option className="bg-slate-900" value="Titânio">Titânio</option>
                      <option className="bg-slate-900" value="TR-90">TR-90 / Grilamid</option>
                      <option className="bg-slate-900" value="Misto">Misto</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tamanho (Aro-Ponte-Haste)</label>
                    <input type="text" placeholder="55-18-140" value={armacoesForm.TAMANHO} onChange={e => setArmacoesForm({...armacoesForm, TAMANHO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Estoque (Peças)</label>
                    <input type="number" min="0" value={armacoesForm.ESTOQUE} onChange={e => setArmacoesForm({...armacoesForm, ESTOQUE: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Preço de Compra (R$)</label>
                    <input type="text" placeholder="120,00" value={armacoesForm.PRECO_COMPRA} onChange={e => setArmacoesForm({...armacoesForm, PRECO_COMPRA: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Preço de Venda (R$)</label>
                    <input type="text" placeholder="380,00" value={armacoesForm.PRECO_VENDA} onChange={e => setArmacoesForm({...armacoesForm, PRECO_VENDA: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-emerald-400 font-bold focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                </div>
              )}

              {/* FORMULÁRIO DE CONTAS A RECEBER */}
              {activeTab === 'receber' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Descrição do Recebimento *</label>
                    <input required type="text" placeholder="Ex: Venda Óculos Completo OS #1042 - Parcela 1/2" value={receberForm.DESCRICAO} onChange={e => setReceberForm({...receberForm, DESCRICAO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Valor (R$) *</label>
                    <input required type="text" placeholder="450,00" value={receberForm.VALOR} onChange={e => setReceberForm({...receberForm, VALOR: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-emerald-400 font-bold focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nome do Cliente (Sincronizado)</label>
                    <input 
                      list="datalist-clientes-receber"
                      type="text" 
                      placeholder="Ex: Yasmin Oliveira ou selecione..." 
                      value={receberForm.CLIENTE} 
                      onChange={e => setReceberForm({...receberForm, CLIENTE: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50" 
                    />
                    <datalist id="datalist-clientes-receber">
                      {clientsData && clientsData.map((c, idx) => {
                        const nome = c['Nome Completo'] || c['NOME'] || '';
                        const st = c['Status de Pagamento'] || 'Em dia';
                        const dev = c['Valor Devido'] || '0,00';
                        return <option key={idx} value={nome}>{`Status: ${st} | Devido: R$ ${dev}`}</option>;
                      })}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">OS / Nº Venda Relacionada</label>
                    <input type="text" placeholder="Ex: 1042" value={receberForm.VENDA_OS} onChange={e => setReceberForm({...receberForm, VENDA_OS: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Data de Vencimento *</label>
                    <input required type="date" value={receberForm.DATA_VENCIMENTO} onChange={e => setReceberForm({...receberForm, DATA_VENCIMENTO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Status do Recebimento</label>
                    <select value={receberForm.STATUS} onChange={e => setReceberForm({...receberForm, STATUS: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50">
                      <option className="bg-slate-900" value="Pendente">Pendente (A Receber)</option>
                      <option className="bg-slate-900" value="Recebido">Recebido / Liquidado</option>
                      <option className="bg-slate-900" value="Atrasado">Inadimplente / Atrasado</option>
                      <option className="bg-slate-900" value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Meio de Pagamento</label>
                    <select value={receberForm.MEIO_PAGAMENTO} onChange={e => setReceberForm({...receberForm, MEIO_PAGAMENTO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50">
                      <option className="bg-slate-900" value="Cartão de Crédito">Cartão de Crédito</option>
                      <option className="bg-slate-900" value="Cartão de Débito">Cartão de Débito</option>
                      <option className="bg-slate-900" value="Pix / Transferência">Pix / Transferência</option>
                      <option className="bg-slate-900" value="Boleto Bancário">Boleto Bancário</option>
                      <option className="bg-slate-900" value="Dinheiro">Dinheiro (Espécie)</option>
                      <option className="bg-slate-900" value="OS / A Definir">OS / A Definir</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Data de Recebimento</label>
                    <input type="date" value={receberForm.DATA_RECEBIMENTO} onChange={e => setReceberForm({...receberForm, DATA_RECEBIMENTO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Observações</label>
                    <textarea rows="2" placeholder="Ex: Detalhes ou notas sobre a parcela" value={receberForm.OBSERVACOES} onChange={e => setReceberForm({...receberForm, OBSERVACOES: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                </div>
              )}

              {/* FORMULÁRIO DE CONTAS A PAGAR */}
              {activeTab === 'pagar' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Descrição da Despesa / Conta *</label>
                    <input required type="text" placeholder="Ex: Compra de Lentes Lote Essilor #887, Aluguel Mês 07" value={pagarForm.DESCRICAO} onChange={e => setPagarForm({...pagarForm, DESCRICAO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Valor (R$) *</label>
                    <input required type="text" placeholder="1.200,00" value={pagarForm.VALOR} onChange={e => setPagarForm({...pagarForm, VALOR: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-rose-400 font-bold focus:ring-2 focus:ring-rose-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Categoria</label>
                    <select value={pagarForm.CATEGORIA} onChange={e => setPagarForm({...pagarForm, CATEGORIA: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50">
                      <option className="bg-slate-900" value="Fornecedores de Lentes">Fornecedores de Lentes</option>
                      <option className="bg-slate-900" value="Fornecedores de Armações">Fornecedores de Armações</option>
                      <option className="bg-slate-900" value="Aluguel e Condomínio">Aluguel e Condomínio</option>
                      <option className="bg-slate-900" value="Salários e Comissões">Salários e Comissões</option>
                      <option className="bg-slate-900" value="Água, Luz e Internet">Água, Luz e Internet</option>
                      <option className="bg-slate-900" value="Marketing e Publicidade">Marketing e Publicidade</option>
                      <option className="bg-slate-900" value="Impostos e Taxas">Impostos e Taxas</option>
                      <option className="bg-slate-900" value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Fornecedor / Credor</label>
                    <input type="text" placeholder="Ex: Laboratório Óptico Central" value={pagarForm.FORNECEDOR} onChange={e => setPagarForm({...pagarForm, FORNECEDOR: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Data de Vencimento *</label>
                    <input required type="date" value={pagarForm.DATA_VENCIMENTO} onChange={e => setPagarForm({...pagarForm, DATA_VENCIMENTO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Status do Pagamento</label>
                    <select value={pagarForm.STATUS} onChange={e => setPagarForm({...pagarForm, STATUS: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50">
                      <option className="bg-slate-900" value="Pendente">Pendente (A Pagar)</option>
                      <option className="bg-slate-900" value="Pago">Pago / Liquidado</option>
                      <option className="bg-slate-900" value="Atrasado">Atrasado</option>
                      <option className="bg-slate-900" value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Data de Pagamento</label>
                    <input type="date" value={pagarForm.DATA_PAGAMENTO} onChange={e => setPagarForm({...pagarForm, DATA_PAGAMENTO: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Observações / NF</label>
                    <input type="text" placeholder="Ex: NF-e 4492" value={pagarForm.OBSERVACOES} onChange={e => setPagarForm({...pagarForm, OBSERVACOES: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black rounded-xl shadow-lg shadow-sky-500/25 transition-all text-sm"
                >
                  Confirmar &amp; Salvar
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                {activeTab === 'lentes' && <><Eye size={18} className="text-sky-400" /> Catálogo de Lentes em Estoque</>}
                {activeTab === 'armacoes' && <><Glasses size={18} className="text-fuchsia-400" /> Catálogo de Armações em Estoque</>}
                {activeTab === 'receber' && <><TrendingUp size={18} className="text-emerald-400" /> Tabela de Contas a Receber</>}
                {activeTab === 'pagar' && <><TrendingDown size={18} className="text-rose-400" /> Tabela de Contas a Pagar</>}
              </h3>
            </div>

            <DataTable
              sheetName={getSheetName()}
              rows={getCurrentRows()}
              onRowUpdate={handleRowUpdateWithSync}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ErpOptica;
