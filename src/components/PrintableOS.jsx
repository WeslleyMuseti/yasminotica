import React, { useMemo } from 'react';

const parseCurrencyPrint = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).replace(/R\$\s?/g, '').trim();
  if (!str) return 0;
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const formatCurrencyPrint = (val) => {
  if (val === null || val === undefined || val === '') return '0,00';
  if (typeof val === 'number') {
    return isNaN(val) ? '0,00' : val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  let str = String(val).replace(/R\$\s?/g, '').trim();
  if (!str) return '0,00';
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? '0,00' : num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDatePrint = (dStr) => {
  if (!dStr) return 'Não definida';
  if (dStr.includes('/')) return dStr;
  const parts = dStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dStr;
};

const PrintableOS = ({ osData, clientData = {} }) => {
  if (!osData) return null;

  // ─── DADOS DO CLIENTE TITULAR ───────────────────────────────────
  const clientName = clientData['Nome Completo'] || clientData['NOME'] || clientData['CLIENTE'] || clientData['Nome'] || osData['nomeCliente'] || osData['CLIENTE'] || 'Cliente';
  const clientZap = clientData['WhatsApp'] || clientData['TELEFONE'] || clientData['Telefone'] || clientData['Celular'] || clientData['FONE'] || 'Não informado';
  const clientCpf = clientData['CPF / CNPJ'] || clientData['CPF'] || clientData['CNPJ'] || clientData['CLIENTE_CPF'] || 'Não informado';
  const clientRg = clientData['RG'] || clientData['rg'] || osData.rg || '';
  const clientNasc = clientData['Data de Nascimento'] || clientData['DATA_NASCIMENTO'] || clientData['Nascimento'] ? formatDatePrint(clientData['Data de Nascimento'] || clientData['DATA_NASCIMENTO'] || clientData['Nascimento']) : '';
  const clientEmail = clientData['E-mail'] || clientData['Email'] || clientData['EMAIL'] || '';
  const clientCep = clientData['CEP'] || clientData['Cep'] || clientData['cep'] || '';
  
  const rua = clientData['Rua'] || clientData['ENDERECO'] || clientData['Endereço'] || clientData['LOGRADOURO'] || '';
  const num = clientData['Número'] || clientData['NUMERO'] || clientData['Numero'] || '';
  const bairro = clientData['Bairro'] || clientData['BAIRRO'] || '';
  const cidade = clientData['Cidade'] || clientData['CIDADE'] || osData.unidade || osData.selectedCity || 'Cajati';
  const estado = clientData['Estado'] || clientData['ESTADO'] || clientData['UF'] || 'SP';
  
  const addressParts = [
    rua && num ? `${rua}, nº ${num}` : (rua || (num ? `Nº ${num}` : '')),
    bairro ? `Bairro ${bairro}` : '',
    `${cidade}/${estado}`,
    clientCep ? `CEP ${clientCep}` : ''
  ].filter(Boolean);
  const clientAddress = addressParts.length > 0 ? addressParts.join(' - ') : 'Não informado';

  // Responsável Legal (apenas se existir)
  const respName = clientData['Responsável Nome'] || clientData['Responsável'] || clientData['RESPONSAVEL'] || osData.responsavel;
  const respZap = clientData['Responsável WhatsApp'] || clientData['RESPONSAVEL_WHATSAPP'] || '';
  const respCpf = clientData['Responsável CPF'] || clientData['RESPONSAVEL_CPF'] || '';

  // ─── PADRÃO DE ITENS DO PEDIDO (PRODUTOS & SERVIÇOS) ─────────────
  const orderItems = useMemo(() => {
    // 1. Se houver array de itens explícito vindo do PDV ou OS
    const rawItens = osData.itens || clientData.itens || (osData.raw && osData.raw.itens) || [];
    if (Array.isArray(rawItens) && rawItens.length > 0) {
      return rawItens.map(item => {
        let tipo = 'Produto';
        if (item.type === 'armacoes') tipo = 'Armação';
        else if (item.type === 'lentes') tipo = 'Lente Oftálmica';
        else if (item.type === 'avulso') tipo = 'Serviço / Avulso';

        const precoUnit = parseCurrencyPrint(item.preco || item.valor || 0);
        const qtd = Number(item.qtd) || 1;
        return {
          tipo,
          nome: item.nome || item.descricao || 'Produto do Pedido',
          detalhes: item.detalhes || '',
          qtd,
          precoUnit,
          total: qtd * precoUnit
        };
      });
    }

    // 2. Monta a partir dos campos estruturados de Armação e Lente
    const items = [];
    const armacaoNome = osData.armacao || clientData['Armação'] || clientData['Modelo de Armação'];
    if (armacaoNome && armacaoNome !== 'Não informada') {
      const extra = [];
      if (clientData['Cor']) extra.push(`Cor: ${clientData['Cor']}`);
      if (clientData['REFERENCIA_SKU']) extra.push(`Ref: ${clientData['REFERENCIA_SKU']}`);
      items.push({
        tipo: 'Armação',
        nome: armacaoNome,
        detalhes: extra.join(' | '),
        qtd: 1,
        precoUnit: null,
        total: null
      });
    }

    const lenteNome = osData.lente || clientData['Lente'] || clientData['Marca de Lente'];
    if (lenteNome && lenteNome !== 'Não informada') {
      const extra = [];
      if (osData.tratamento || clientData['Tratamento']) extra.push(`Tratamento: ${osData.tratamento || clientData['Tratamento']}`);
      if (clientData['MATERIAL']) extra.push(clientData['MATERIAL']);
      items.push({
        tipo: 'Lente Oftálmica',
        nome: lenteNome,
        detalhes: extra.join(' | '),
        qtd: 1,
        precoUnit: null,
        total: null
      });
    }

    if (items.length === 0 && (osData.produto || clientData['PRODUTO'])) {
      items.push({
        tipo: 'Óculos Completo',
        nome: osData.produto || clientData['PRODUTO'],
        detalhes: '',
        qtd: 1,
        precoUnit: null,
        total: null
      });
    }

    return items;
  }, [osData, clientData]);

  const hasItemPrices = orderItems.some(item => item.total && item.total > 0);

  return (
    <>
      {/* ─── ESTILOS EXCLUSIVOS DE IMPRESSÃO EM FOLHA ÚNICA (SEM FOLHAS EXTRAS) ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 7mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-section {
            display: block !important;
            width: 100% !important;
            max-width: 196mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
          }
        }
      `}} />

      <div 
        id="print-section" 
        className="hidden print:block bg-white text-slate-900 font-sans text-[9px] leading-tight select-none"
      >
        
        {/* ─── CABEÇALHO COMPACTO DA OS ────────────────────────────── */}
        <div className="border-b-2 border-slate-900 pb-1.5 mb-1.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo-yasmin.png" 
              alt="Yasmin Ótica" 
              className="h-8 max-w-[130px] object-contain" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/logo-yasmin-transparent.png";
              }}
            />
            <div className="border-l-2 border-slate-900 pl-2">
              <h1 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-none">YASMIN ÓTICA</h1>
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600 mt-0.5">Ordem de Serviço & Comprovante Óptico</p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block bg-slate-950 text-white px-2.5 py-0.5 rounded font-black text-xs uppercase tracking-wide">
              OS Nº {osData.numeroOS || '---'}
            </div>
            <p className="text-[8.5px] font-bold mt-0.5 text-slate-700">
              Emissão: {new Date().toLocaleDateString('pt-BR')} | Unidade: {osData.unidade || osData.selectedCity || cidade}
            </p>
          </div>
        </div>

        {/* ─── 1. IDENTIFICAÇÃO DO CLIENTE (TITULAR & CONTATO) ───────── */}
        <div className="mb-1.5 border border-slate-300 rounded p-1.5 bg-slate-50/50">
          <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 mb-1">
            <h3 className="text-[8.5px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1">
              1. Identificação do Cliente
            </h3>
            <span className="text-[7.5px] font-bold text-slate-500 uppercase">Cadastro Oficial</span>
          </div>
          
          <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 text-[8.5px]">
            <p className="col-span-2">
              <strong className="text-slate-600">Cliente:</strong> <span className="font-black uppercase text-slate-900">{clientName}</span>
            </p>
            <p>
              <strong className="text-slate-600">CPF/CNPJ:</strong> <span className="font-bold text-slate-900">{clientCpf}</span>
            </p>
            <p>
              <strong className="text-slate-600">WhatsApp:</strong> <span className="font-bold text-slate-900">{clientZap}</span>
            </p>
            
            <p className="col-span-3">
              <strong className="text-slate-600">Endereço:</strong> <span className="font-medium text-slate-900">{clientAddress}</span>
            </p>
            {clientNasc ? (
              <p>
                <strong className="text-slate-600">Dt. Nasc:</strong> <span className="font-medium text-slate-900">{clientNasc}</span>
              </p>
            ) : (
              <p>
                <strong className="text-slate-600">RG:</strong> <span className="font-medium text-slate-900">{clientRg || '—'}</span>
              </p>
            )}

            {respName && (
              <p className="col-span-4 text-[8px] bg-slate-100 p-0.5 rounded border border-slate-200 text-slate-800 mt-0.5">
                <strong>Responsável Legal:</strong> <span className="font-bold uppercase">{respName}</span>
                {respCpf && <span> | CPF: {respCpf}</span>}
                {respZap && <span> | Tel: {respZap}</span>}
              </p>
            )}
          </div>
        </div>

        {/* ─── 2. RECEITA OFTALMOLÓGICA (DIOPTRIA) ───────────────────── */}
        <div className="mb-1.5 border border-slate-300 rounded p-1.5">
          <div className="flex justify-between items-center border-b border-slate-200 pb-0.5 mb-1">
            <h3 className="text-[8.5px] font-black uppercase tracking-wider text-slate-900">
              2. Prescrição Oftalmológica (Dioptria)
            </h3>
            <div className="flex items-center gap-3 text-[8.5px]">
              <p><strong>Médico / Prescritor:</strong> <span className="font-bold text-slate-900">{osData.medico || 'Não informado'}</span></p>
              <p>
                <strong>Adição (Perto):</strong> <span className="font-black text-slate-950 bg-slate-100 px-1 py-0.5 rounded border border-slate-300">{osData.adicao || '---'}</span>
              </p>
            </div>
          </div>
          
          <table className="w-full text-center border-collapse border border-slate-400 text-[8.5px]">
            <thead>
              <tr className="bg-slate-100 font-black uppercase text-slate-800 text-[8px]">
                <th className="border border-slate-400 py-0.5 px-1 text-left w-24">Olho</th>
                <th className="border border-slate-400 py-0.5 px-1">Esférico</th>
                <th className="border border-slate-400 py-0.5 px-1">Cilíndrico</th>
                <th className="border border-slate-400 py-0.5 px-1">Eixo</th>
                <th className="border border-slate-400 py-0.5 px-1">DNP</th>
                <th className="border border-slate-400 py-0.5 px-1">Altura</th>
                <th className="border border-slate-400 py-0.5 px-1">DP</th>
                <th className="border border-slate-400 py-0.5 px-1">OPA</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border border-slate-400 py-0.5 px-1 font-black text-left text-slate-900">OD (Direito)</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.odEsf || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.odCil || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.odEixo || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.odDnp || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.odAlt || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.odDp || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.odOpa || '---'}</td>
              </tr>
              <tr className="bg-slate-50/70">
                <td className="border border-slate-400 py-0.5 px-1 font-black text-left text-slate-900">OE (Esquerdo)</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.oeEsf || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.oeCil || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.oeEixo || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.oeDnp || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.oeAlt || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.oeDp || '---'}</td>
                <td className="border border-slate-400 py-0.5 px-1 font-bold text-slate-900">{osData.oeOpa || '---'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ─── 3. PADRÃO DE ITENS DO PEDIDO (PRODUTOS & SERVIÇOS) ────── */}
        <div className="mb-1.5 border border-slate-300 rounded p-1.5">
          <div className="flex justify-between items-center border-b border-slate-200 pb-0.5 mb-1">
            <h3 className="text-[8.5px] font-black uppercase tracking-wider text-slate-900">
              3. Itens do Pedido & Produtos Ópticos
            </h3>
            <span className="text-[8px] font-bold text-slate-500 uppercase">
              Total de Itens: {orderItems.length}
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-[8.5px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 uppercase font-black text-[7.5px]">
                <th className="border border-slate-300 py-0.5 px-1.5 text-left">Item / Descrição do Produto</th>
                <th className="border border-slate-300 py-0.5 px-1 text-center w-28">Categoria</th>
                <th className="border border-slate-300 py-0.5 px-1 text-center w-12">Qtd</th>
                {hasItemPrices ? (
                  <>
                    <th className="border border-slate-300 py-0.5 px-1 text-right w-20">Unit. (R$)</th>
                    <th className="border border-slate-300 py-0.5 px-1.5 text-right w-20">Subtotal</th>
                  </>
                ) : (
                  <th className="border border-slate-300 py-0.5 px-1 text-center w-28">Previsão Entrega</th>
                )}
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="border border-slate-300 py-0.5 px-1.5">
                    <strong className="text-slate-900 font-bold">{item.nome}</strong>
                    {item.detalhes && (
                      <span className="text-slate-500 text-[7.5px] block font-medium">{item.detalhes}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 py-0.5 px-1 text-center text-[7.5px] font-bold text-slate-700 uppercase">
                    {item.tipo}
                  </td>
                  <td className="border border-slate-300 py-0.5 px-1 text-center font-bold text-slate-900">
                    {item.qtd}
                  </td>
                  {hasItemPrices ? (
                    <>
                      <td className="border border-slate-300 py-0.5 px-1 text-right text-slate-700">
                        {item.precoUnit ? formatCurrencyPrint(item.precoUnit) : '—'}
                      </td>
                      <td className="border border-slate-300 py-0.5 px-1.5 text-right font-black text-slate-900">
                        {item.total ? formatCurrencyPrint(item.total) : '—'}
                      </td>
                    </>
                  ) : (
                    <td className="border border-slate-300 py-0.5 px-1 text-center font-bold text-slate-800">
                      {formatDatePrint(osData.dataEntrega)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── 4. CONDIÇÕES FINANCEIRAS & PAGAMENTO ──────────────────── */}
        <div className="mb-1.5 border border-slate-300 rounded p-1.5">
          <div className="flex justify-between items-center border-b border-slate-200 pb-0.5 mb-1">
            <h3 className="text-[8.5px] font-black uppercase tracking-wider text-slate-900">
              4. Condições Financeiras & Pagamento
            </h3>
            <div className="text-[8.5px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Previsão de Entrega: <span className="font-black">{formatDatePrint(osData.dataEntrega)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-1.5 mb-1">
            <div className="border border-slate-800 p-1 text-center rounded bg-slate-50">
              <p className="uppercase text-[7.5px] font-black text-slate-600">Valor Total da OS</p>
              <p className="font-black text-xs text-slate-950">R$ {formatCurrencyPrint(osData.valorTotal)}</p>
            </div>
            <div className="border border-emerald-700 p-1 text-center rounded bg-emerald-50/50">
              <p className="uppercase text-[7.5px] font-black text-emerald-800">Sinal / Entrada Paga</p>
              <p className="font-black text-xs text-emerald-800">R$ {formatCurrencyPrint(osData.valorEntrada)}</p>
            </div>
            <div className={`p-1 text-center rounded border ${parseCurrencyPrint(osData.restante) > 0 ? 'border-rose-600 bg-rose-50/50' : 'border-slate-400 bg-slate-50'}`}>
              <p className={`uppercase text-[7.5px] font-black ${parseCurrencyPrint(osData.restante) > 0 ? 'text-rose-700' : 'text-slate-600'}`}>Falta / Restante</p>
              <p className={`font-black text-xs ${parseCurrencyPrint(osData.restante) > 0 ? 'text-rose-800' : 'text-slate-900'}`}>R$ {formatCurrencyPrint(osData.restante)}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-[8.5px] bg-slate-50 p-1 rounded border border-slate-200">
            <div className="col-span-3">
              <strong className="block text-[7.5px] uppercase text-slate-700 font-black">Forma(s) de Pagamento & Parcelamento:</strong>
              <p className="font-semibold text-slate-900 leading-tight">
                {osData.formasPagamento || 'À Vista / Conforme Lançamento'}
              </p>
            </div>
            <div>
              <strong className="block text-[7.5px] uppercase text-slate-700 font-black">Voucher / Cupom:</strong>
              <p className="font-semibold text-slate-900">
                {osData.voucher || 'Nenhum'}
              </p>
            </div>
          </div>
        </div>

        {/* ─── 5. OBSERVAÇÕES DE MONTAGEM / LABORATÓRIO ──────────────── */}
        {osData.observacoes && (
          <div className="mb-1 border border-slate-300 rounded p-1 bg-slate-50/40">
            <h3 className="text-[7.5px] font-black uppercase text-slate-700">Observações de Montagem / Laboratório:</h3>
            <p className="text-[8px] font-medium text-slate-800 leading-tight">{osData.observacoes}</p>
          </div>
        )}

        {/* ─── 6. TERMO DE RESPONSABILIDADE & RETIRADA (ENXUTO) ───────── */}
        <div className="mb-1 text-[7.5px] leading-tight text-justify border border-slate-300 p-1 rounded bg-slate-50/30">
          <p>
            <strong>Termo de Retirada & Encomenda:</strong> A parte solicitante reconhece a encomenda dos produtos ópticos sob medida e a exatidão da prescrição médica apresentada. Os produtos não retirados no prazo de 30 (trinta) dias após a notificação de prontidão estarão sujeitos a protesto legal.
          </p>
        </div>

        {/* ─── 7. CONFERÊNCIA DE ENTREGA ─────────────────────────────── */}
        <div className="mb-2 flex justify-between items-center text-[8px] bg-slate-50 p-1 rounded border border-slate-200">
          <div>
            <strong>Conferi e recebi os produtos em perfeito estado em:</strong>
            <span className="border-b border-slate-600 px-3 font-semibold ml-1">____ / ____ / ________</span>
          </div>
          <div>
            <strong>Visto do Cliente:</strong>
            <span className="border-b border-slate-600 px-6 ml-1"></span>
          </div>
        </div>

        {/* ─── 8. ASSINATURAS LADO A LADO ────────────────────────────── */}
        <div className={`pt-0.5 flex ${respName ? 'justify-between' : 'justify-around'} px-2 text-center`}>
          <div className="w-[30%]">
            <div className="border-t border-slate-900 pt-0.5 uppercase text-[8px] font-black text-slate-800">
              Assinatura do Solicitante
            </div>
            <p className="text-[7px] text-slate-500 truncate">{clientName}</p>
          </div>
          
          {respName && (
            <div className="w-[30%]">
              <div className="border-t border-slate-900 pt-0.5 uppercase text-[8px] font-black text-slate-800">
                Assinatura do Responsável
              </div>
              <p className="text-[7px] text-slate-500 truncate">{respName}</p>
            </div>
          )}

          <div className="w-[30%]">
            <div className="border-t border-slate-900 pt-0.5 uppercase text-[8px] font-black text-slate-800">
              Yasmin Ótica (Visto)
            </div>
            <p className="text-[7px] text-slate-500">Atendimento / Loja</p>
          </div>
        </div>

        {/* ─── 9. VERSÍCULO DE ENCERRAMENTO (RODAPÉ COMPACTO) ────────── */}
        <div className="mt-1 text-center text-[7px] italic text-slate-500 border-t border-slate-200 pt-0.5">
          "Sonda-me, ó Deus, e conhece o meu coração; prova-me, e conhece os meus pensamentos..." — Salmos 139:23-24
        </div>

      </div>
    </>
  );
};

export default PrintableOS;
