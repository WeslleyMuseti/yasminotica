import React from 'react';

const PrintableOS = ({ osData, clientData }) => {
  if (!osData || !clientData) return null;

  return (
    <div id="print-section" className="hidden print:block p-8 bg-white text-black min-h-screen">
      
      {/* Header */}
      <div className="border-b-2 border-black pb-6 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest">YASMIN ÓTICA</h1>
          <p className="text-sm font-bold uppercase mt-1 tracking-widest text-gray-600">Comprovante de Serviço</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold uppercase">Ordem de Serviço <span className="text-gray-500">#{osData.numeroOS}</span></h2>
          <p className="text-sm mt-1">Data: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Dados do Cliente */}
      <div className="mb-6">
        <h3 className="text-lg font-bold border-b border-gray-300 mb-3 pb-1 uppercase">Dados do Cliente</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><strong>Nome:</strong> {clientData['Nome Completo']}</p>
          <p><strong>CPF/CNPJ:</strong> {clientData['CPF / CNPJ'] || 'Não informado'} {clientData['RG'] ? `| RG: ${clientData['RG']}` : ''}</p>
          <p><strong>WhatsApp:</strong> {clientData['WhatsApp'] || 'Não informado'}</p>
          <p>
            <strong>Redes Sociais:</strong>{' '}
            {[
              clientData['Instagram'] && `Insta: ${clientData['Instagram']}`,
              clientData['Facebook'] && `FB: ${clientData['Facebook']}`,
              clientData['TikTok'] && `TikTok: ${clientData['TikTok']}`
            ].filter(Boolean).join(' | ') || 'Não informado'}
          </p>
          <p className="col-span-2"><strong>Endereço:</strong> {clientData['Rua']} {clientData['Número']}, {clientData['Bairro']} - {clientData['Cidade']}/{clientData['Estado']}</p>
        </div>
      </div>

      {/* Dados do Responsável */}
      {(clientData['Responsável Nome'] || osData.responsavel) && (
        <div className="mb-6">
          <h3 className="text-lg font-bold border-b border-gray-300 mb-3 pb-1 uppercase">Dados do Responsável</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p><strong>Nome:</strong> {clientData['Responsável Nome'] || osData.responsavel}</p>
            <p><strong>CPF/CNPJ:</strong> {clientData['Responsável CPF'] || 'Não informado'} {clientData['Responsável RG'] ? `| RG: ${clientData['Responsável RG']}` : ''}</p>
            <p><strong>WhatsApp:</strong> {clientData['Responsável WhatsApp'] || 'Não informado'}</p>
            <p>
              <strong>Redes Sociais:</strong>{' '}
              {[
                clientData['Responsável Instagram'] && `Insta: ${clientData['Responsável Instagram']}`,
                clientData['Responsável Facebook'] && `FB: ${clientData['Responsável Facebook']}`,
                clientData['Responsável TikTok'] && `TikTok: ${clientData['Responsável TikTok']}`
              ].filter(Boolean).join(' | ') || 'Não informado'}
            </p>
            <p className="col-span-2"><strong>Endereço:</strong> {clientData['Responsável Rua']} {clientData['Responsável Número']}, {clientData['Responsável Bairro']} - {clientData['Responsável Cidade']}/{clientData['Responsável Estado']}</p>
          </div>
        </div>
      )}

      {/* Dados da Receita */}
      <div className="mb-6">
        <h3 className="text-lg font-bold border-b border-gray-300 mb-3 pb-1 uppercase">Receita (Dioptria)</h3>
        <div className="flex justify-between text-sm mb-3">
          <p><strong>Médico:</strong> {osData.medico || 'Não informado'}</p>
          <p><strong>Adição:</strong> {osData.adicao || '---'}</p>
        </div>
        
        <table className="w-full text-center border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-100 font-bold uppercase">
              <th className="border border-black p-2">Olho</th>
              <th className="border border-black p-2">Esférico</th>
              <th className="border border-black p-2">Cilíndrico</th>
              <th className="border border-black p-2">Eixo</th>
              <th className="border border-black p-2">DNP</th>
              <th className="border border-black p-2">Altura</th>
              <th className="border border-black p-2">DP</th>
              <th className="border border-black p-2">OPA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2 font-bold">OD</td>
              <td className="border border-black p-2">{osData.odEsf || '---'}</td>
              <td className="border border-black p-2">{osData.odCil || '---'}</td>
              <td className="border border-black p-2">{osData.odEixo || '---'}</td>
              <td className="border border-black p-2">{osData.odDnp || '---'}</td>
              <td className="border border-black p-2">{osData.odAlt || '---'}</td>
              <td className="border border-black p-2">{osData.odDp || '---'}</td>
              <td className="border border-black p-2">{osData.odOpa || '---'}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold">OE</td>
              <td className="border border-black p-2">{osData.oeEsf || '---'}</td>
              <td className="border border-black p-2">{osData.oeCil || '---'}</td>
              <td className="border border-black p-2">{osData.oeEixo || '---'}</td>
              <td className="border border-black p-2">{osData.oeDnp || '---'}</td>
              <td className="border border-black p-2">{osData.oeAlt || '---'}</td>
              <td className="border border-black p-2">{osData.oeDp || '---'}</td>
              <td className="border border-black p-2">{osData.oeOpa || '---'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Produtos */}
      <div className="mb-6">
        <h3 className="text-lg font-bold border-b border-gray-300 mb-3 pb-1 uppercase">Produtos</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><strong>Lente:</strong> {osData.lente || 'Não informado'}</p>
          <p><strong>Armação:</strong> {osData.armacao || 'Não informado'}</p>
          <p className="col-span-2 text-red-600 font-bold"><strong>Previsão de Entrega:</strong> {osData.dataEntrega ? new Date(osData.dataEntrega + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não definida'}</p>
        </div>
      </div>

      {/* Financeiro */}
      <div className="mb-6">
        <h3 className="text-lg font-bold border-b border-gray-300 mb-3 pb-1 uppercase">Financeiro</h3>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <p className="whitespace-pre-wrap"><strong>Formas de Pagamento:</strong><br/>{osData.formasPagamento || 'Não informada'}</p>
          <p><strong>Voucher:</strong> {osData.voucher || 'Nenhum'}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="border border-black p-3 text-center">
            <p className="uppercase text-xs font-bold text-gray-500 mb-1">Valor Total</p>
            <p className="font-black text-lg">R$ {osData.valorTotal || '0,00'}</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="uppercase text-xs font-bold text-gray-500 mb-1">Entrada / Sinal</p>
            <p className="font-black text-lg">R$ {osData.valorEntrada || '0,00'}</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="uppercase text-xs font-bold text-gray-500 mb-1">Restante a Pagar</p>
            <p className="font-black text-lg">R$ {osData.restante || '0,00'}</p>
          </div>
        </div>
      </div>

      {/* Observações */}
      {osData.observacoes && (
        <div className="mb-10">
          <h3 className="text-lg font-bold border-b border-gray-300 mb-3 pb-1 uppercase">Observações</h3>
          <p className="text-sm p-3 border border-dashed border-gray-400 min-h-[60px]">{osData.observacoes}</p>
        </div>
      )}

      {/* Termos do Contrato */}
      <div className="mb-6 text-[11px] leading-snug text-justify border border-black p-4 mt-6">
        <h3 className="text-center font-bold mb-2 uppercase text-xs">CONTRATO DE VENDA E COMPRA DE ARMAÇÕES DE ÓCULOS, LENTES E LENTES DE CONTATO</h3>
        <p className="mb-1">As partes acima nominadas, doravante determinadas ÓTICA e SOLICITANTE tem entre si justas e acertadas o presente contrato, pelas cláusulas abaixo:</p>
        <p className="mb-1">A SOLICITANTE adquire neste ato da ÓTICA a armação e lente, ou a lente de contato, pelo preço certo e ajustado nas condições acima descritas, cujo valor reconhece a SOLICITANTE como líquido, certo e devido.</p>
        <p className="mb-1">A compra é feita em caráter irrevogável e irretratável obrigando as partes, herdeiros e sucessores.</p>
        <p className="mb-1">A SOLICITANTE, caso não cumpra com o pagamento dos valores acima descritos, arcará com uma multa de 2% (dois por cento) sobre o valor devido, bem como com juros de mora e correção monetária dos valores, até a sua quitação.</p>
        <p className="mb-1">Em caso de não pagamento dos valores acima avançados o nome da SOLICITANTE será inscrito nos serviços de proteção ao crédito SPC e SERASA, o que autoriza de forma expressa.</p>
        <p className="mb-2">E por estarem justas e contratadas firmam o presente.</p>
        <p className="font-bold text-center mt-2 border-t border-dashed border-gray-400 pt-2">Os serviços não retirados no prazo de 30 dias será o nome protestado.</p>
      </div>

      {/* Recebimento */}
      <div className="mb-4 flex justify-between text-xs">
        <div className="border-b border-black w-2/3 mr-4 flex items-end pb-1">
          <span className="mr-2">Adquiri em perfeito estado na data:</span>
          <span className="flex-1 text-center">____/____/________</span>
        </div>
        <div className="border-b border-black w-1/3 flex items-end pb-1">
          <span className="mr-2">Ass:</span>
        </div>
      </div>

      {/* Assinaturas */}
      <div className={`mt-12 pt-4 flex ${clientData['Responsável Nome'] || osData.responsavel ? 'justify-between' : 'justify-around'} px-4 text-center`}>
        <div className="w-[28%]">
          <div className="border-t border-black pt-2 uppercase text-xs font-bold">
            SOLICITANTE
          </div>
        </div>
        
        {(clientData['Responsável Nome'] || osData.responsavel) && (
          <div className="w-[28%]">
            <div className="border-t border-black pt-2 uppercase text-xs font-bold">
              RESPONSÁVEL
            </div>
          </div>
        )}

        <div className="w-[28%]">
          <div className="border-t border-black pt-2 uppercase text-xs font-bold">
            ÓTICA
          </div>
        </div>
      </div>

      {/* Mensagem Bíblica */}
      <div className="mt-8 text-center text-[10px] italic text-gray-600">
        Sl 139:23:24 "Sonda-me ó Deus, e conhece o meu coração, prova-me, e conhece os meus pensamentos<br/>
        E vê se há em mim algum caminho mau e guia-me pelo caminho eterno"
      </div>

    </div>
  );
};

export default PrintableOS;
