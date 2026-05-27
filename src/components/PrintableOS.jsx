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
          <p><strong>CPF/CNPJ:</strong> {clientData['CPF / CNPJ'] || 'Não informado'}</p>
          <p><strong>WhatsApp:</strong> {clientData['WhatsApp'] || 'Não informado'}</p>
          <p><strong>Endereço:</strong> {clientData['Rua']} {clientData['Número']}, {clientData['Bairro']} - {clientData['Cidade']}/{clientData['Estado']}</p>
        </div>
      </div>

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
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold">OE</td>
              <td className="border border-black p-2">{osData.oeEsf || '---'}</td>
              <td className="border border-black p-2">{osData.oeCil || '---'}</td>
              <td className="border border-black p-2">{osData.oeEixo || '---'}</td>
              <td className="border border-black p-2">{osData.oeDnp || '---'}</td>
              <td className="border border-black p-2">{osData.oeAlt || '---'}</td>
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

      {/* Assinaturas */}
      <div className="mt-20 pt-10 flex justify-between px-10 text-center">
        <div className="w-1/3">
          <div className="border-t border-black pt-2 uppercase text-xs font-bold">
            Assinatura do Cliente
          </div>
        </div>
        <div className="w-1/3">
          <div className="border-t border-black pt-2 uppercase text-xs font-bold">
            Yasmin Ótica
          </div>
        </div>
      </div>

    </div>
  );
};

export default PrintableOS;
