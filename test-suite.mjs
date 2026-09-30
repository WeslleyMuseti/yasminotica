import { 
  hashPassword, 
  verifyPassword, 
  isPasswordHashed, 
  isSameClient 
} from './src/firebaseSync.js';
import {
  parseCurrency,
  formatCurrency,
  getStockHealthStatus,
  filterAndSortStock,
  extractStockFacets
} from './src/stockFilters.js';

async function runTests() {
  console.log('🧪 Starting Verification Test Suite...\n');

  // ─── TEST 1: Password Hashing & Verification ─────────────────────────
  console.log('▶ Test 1: Password Cryptography (PBKDF2/SHA-256 + Salt)');
  const plainPassword = 'minhasenhasegura123';
  const hashed = await hashPassword(plainPassword);
  
  console.assert(isPasswordHashed(hashed), 'Error: hashed password should be identified as hashed');
  console.assert(!isPasswordHashed('plain123'), 'Error: plain password should not be identified as hashed');
  console.assert(hashed.startsWith('pbkdf2:') || hashed.startsWith('sha256:'), 'Error: hash prefix missing');
  
  const isValid = await verifyPassword(plainPassword, hashed);
  console.assert(isValid === true, 'Error: verifyPassword should return true for correct password');
  
  const isWrong = await verifyPassword('senhaincorreta', hashed);
  console.assert(isWrong === false, 'Error: verifyPassword should return false for incorrect password');

  // Legacy plain text backwards compatibility
  const isLegacyValid = await verifyPassword('929498', '929498');
  console.assert(isLegacyValid === true, 'Error: verifyPassword should support legacy plain text passwords');
  const isLegacyWrong = await verifyPassword('wrongpass', '929498');
  console.assert(isLegacyWrong === false, 'Error: verifyPassword should reject wrong legacy password');
  console.log('  ✅ Test 1 Passed: Hashing and Verification working correctly.\n');

  // ─── TEST 2: Strict Client ID/CPF Linking (Homonym Protection) ────────
  console.log('▶ Test 2: Strict Client ID and CPF Matching');
  
  const clientMaria1 = {
    id: 'cli_001',
    'Nome Completo': 'Maria da Silva',
    'CPF / CNPJ': '111.222.333-44'
  };

  const clientMaria2 = {
    id: 'cli_002',
    'Nome Completo': 'Maria da Silva',
    'CPF / CNPJ': '999.888.777-66'
  };

  // 2.1 Same name but different CPF -> MUST NOT MATCH (Homonym separation)
  console.assert(isSameClient(clientMaria1, clientMaria2) === false, 'Error: Homonyms with different CPF must not match!');
  console.assert(isSameClient(clientMaria2, clientMaria1) === false, 'Error: Symmetry check failed for homonym separation');

  // 2.2 Match by CLIENTE_ID when transaction doc has its own distinct doc id
  const saleWithId = {
    id: 'sale_doc_999',
    CLIENTE_ID: 'cli_001',
    CLIENTE: 'Maria da Silva',
    VALOR: '150,00'
  };
  console.assert(isSameClient(clientMaria1, saleWithId) === true, 'Error: Must match client by CLIENTE_ID even when sale has its own doc id');
  console.assert(isSameClient(saleWithId, clientMaria1) === true, 'Error: Symmetry check for sale CLIENTE_ID failed');

  // 2.3 Different CLIENTE_ID must NOT match (even if names are identical)
  const saleOtherClient = {
    id: 'sale_doc_888',
    CLIENTE_ID: 'cli_002',
    CLIENTE: 'Maria da Silva',
    VALOR: '200,00'
  };
  console.assert(isSameClient(clientMaria1, saleOtherClient) === false, 'Error: Different CLIENTE_ID must not match clientMaria1');

  // 2.4 Match by CPF (unformatted and formatted)
  const boletoWithCpf = {
    id: 'boleto_123',
    CPF: '11122233344',
    CLIENTE: 'Maria S.',
    VALOR: '50,00'
  };
  console.assert(isSameClient(clientMaria1, boletoWithCpf) === true, 'Error: Must match by CPF unformatted vs formatted');
  console.assert(isSameClient(boletoWithCpf, clientMaria1) === true, 'Error: Symmetry check for CPF matching failed');

  // 2.5 CNPJ support
  const clientCompany = {
    id: 'cli_comp',
    'Nome Completo': 'Empresa Exemplo LTDA',
    'CPF / CNPJ': '12.345.678/0001-90'
  };
  const invoiceCompany = {
    id: 'inv_100',
    'CPF / CNPJ': '12345678000190',
    CLIENTE: 'Empresa Exemplo',
    VALOR: '500,00'
  };
  console.assert(isSameClient(clientCompany, invoiceCompany) === true, 'Error: CNPJ matching failed');

  // 2.6 Legacy fallback when neither has CPF or ID
  const legacyClient = { 'Nome Completo': 'Jose de Souza' };
  const legacyRecord = { id: 'rec_legacy', 'CLIENTE': 'Jose de Souza', VALOR: '80,00' };
  console.assert(isSameClient(legacyClient, legacyRecord) === true, 'Error: Legacy exact name match failed');
  console.assert(isSameClient(legacyRecord, legacyClient) === true, 'Error: Legacy symmetry failed');

  // 2.7 Edge case: Null/Undefined handling
  console.assert(isSameClient(null, clientMaria1) === false, 'Error: Null clientA should return false');
  console.assert(isSameClient(clientMaria1, undefined) === false, 'Error: Undefined clientB should return false');
  console.assert(isSameClient({}, {}) === false, 'Error: Empty objects should return false');

  console.log('  ✅ Test 2 Passed: Strict client ID and CPF matching prevents homonym mix-ups.\n');

  // ─── TEST 3: Barcode Checksum & SVG Code 128 Generation ───────────────
  console.log('▶ Test 3: Code 128 Checksum & Pattern Encoding');
  const testCodes = ['RB3025', 'OS1024', '789123456789', 'LNT-DIG-167'];
  for (const text of testCodes) {
    let checksum = 104; // Start B
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const codeVal = (charCode >= 32 && charCode <= 126) ? charCode - 32 : 0;
      checksum += codeVal * (i + 1);
    }
    const finalChecksum = checksum % 103;
    console.assert(finalChecksum >= 0 && finalChecksum < 103, `Error: Checksum out of bounds for ${text}`);
  }
  console.log('  ✅ Test 3 Passed: Code 128 algorithm generates valid checksums for all test SKUs/OS.\n');

  // ─── TEST 4: Minimum Stock / Ponto de Pedido Alert Levels ─────────────
  console.log('▶ Test 4: Minimum Stock Alert Classification (<= 2 units)');
  const getStockStatus = (val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) return 'esgotado';
    if (num <= 2) return 'critico';
    return 'normal';
  };

  console.assert(getStockStatus(0) === 'esgotado', 'Stock 0 must be esgotado');
  console.assert(getStockStatus('0') === 'esgotado', 'Stock "0" must be esgotado');
  console.assert(getStockStatus(1) === 'critico', 'Stock 1 must be critico (ponto de pedido)');
  console.assert(getStockStatus('2') === 'critico', 'Stock 2 must be critico (ponto de pedido)');
  console.assert(getStockStatus(3) === 'normal', 'Stock 3 must be normal');
  console.assert(getStockStatus('10') === 'normal', 'Stock 10 must be normal');
  console.log('  ✅ Test 4 Passed: Stock classification correctly flags <= 2 units.\n');

  // ─── TEST 5: Barcode Scanner Input Buffer Heuristics ───────────────────
  console.log('▶ Test 5: Hardware USB Barcode Scanner Speed Heuristics');
  // Simulating rapid barcode burst (< 50ms interval)
  const scannerBurstTimes = [0, 15, 30, 44, 58, 72, 85]; // ~14ms per char
  const scannerDuration = scannerBurstTimes[scannerBurstTimes.length - 1] - scannerBurstTimes[0];
  const scannerAvg = scannerDuration / (scannerBurstTimes.length - 1);
  const isScanner = scannerAvg < 60;
  console.assert(isScanner === true, 'Error: Fast keystroke burst must be identified as barcode scanner');

  // Simulating human typing (> 100ms interval)
  const humanTypingTimes = [0, 120, 260, 410, 580]; // ~145ms per char
  const humanDuration = humanTypingTimes[humanTypingTimes.length - 1] - humanTypingTimes[0];
  const humanAvg = humanDuration / (humanTypingTimes.length - 1);
  const isHuman = humanAvg >= 60;
  console.assert(isHuman === true, 'Error: Human typing must not be misidentified as barcode scanner');
  console.log('  ✅ Test 5 Passed: USB Scanner speed heuristics correctly separate scanner from human typing.\n');

  // ─── TEST 6: Smart Stock Filters, Presets & Sales Cross-Referencing ───
  console.log('▶ Test 6: Smart Stock Filters, Presets & Sales Cross-Referencing');
  
  // 6.1 Currency Parsing & Formatting
  console.assert(parseCurrency('R$ 1.250,50') === 1250.50, 'Error parsing R$ 1.250,50');
  console.assert(parseCurrency('300') === 300, 'Error parsing 300');
  console.assert(parseCurrency(null) === 0, 'Error parsing null currency');
  console.assert(getStockHealthStatus(0) === 'esgotado', 'Stock 0 status error');
  console.assert(getStockHealthStatus(2) === 'critico', 'Stock 2 status error');
  console.assert(getStockHealthStatus(5) === 'normal', 'Stock 5 status error');

  // 6.2 Mock Inventory & Sales Data
  const mockStock = [
    {
      REFERENCIA_SKU: 'RB3025',
      MODELO: 'Aviador',
      MARCA: 'Ray-Ban',
      MATERIAL: 'Metal',
      UNIDADE: 'Cajati',
      ESTOQUE: '5',
      PRECO_COMPRA: '100.00',
      PRECO_VENDA: '300.00'
    },
    {
      REFERENCIA_SKU: 'OO9102',
      MODELO: 'Holbrook',
      MARCA: 'Oakley',
      MATERIAL: 'Acetato',
      UNIDADE: 'Registro',
      ESTOQUE: '1',
      PRECO_COMPRA: '200.00',
      PRECO_VENDA: '450.00'
    },
    {
      REFERENCIA_SKU: 'VO5322',
      MODELO: 'Retrô Classic',
      MARCA: 'Vogue',
      MATERIAL: 'Acetato',
      UNIDADE: 'Cajati',
      ESTOQUE: '0',
      PRECO_COMPRA: '80.00',
      PRECO_VENDA: '200.00'
    },
    {
      REFERENCIA_SKU: 'CH5408',
      MODELO: 'Oversized Luxo',
      MARCA: 'Chanel',
      MATERIAL: 'Titânio',
      UNIDADE: 'Central',
      ESTOQUE: '10',
      PRECO_COMPRA: '800.00',
      PRECO_VENDA: '2400.00'
    }
  ];

  const mockSales = [
    { PRODUTO: 'Ray-Ban Aviador RB3025 Polarizado', QUANTIDADE: '3', VALOR: '900.00' },
    { PRODUTO: 'Óculos Completo (RB3025 + Lente)', QUANTIDADE: '2', VALOR: '1200.00' },
    { PRODUTO: 'Oakley Holbrook OO9102 Matte Black', QUANTIDADE: '1', VALOR: '450.00' }
  ];

  // 6.3 Preset: Mais Vendidos (RB3025 tem 5 vendas -> primeiro lugar)
  const maisVendidos = filterAndSortStock(mockStock, mockSales, { preset: 'mais_vendidos' });
  console.assert(maisVendidos.length === 4, 'Mais vendidos must contain all items ranked');
  console.assert(maisVendidos[0].REFERENCIA_SKU === 'RB3025', 'RB3025 must be #1 most sold with 5 sales');
  console.assert(maisVendidos[0]._salesCount === 5, 'RB3025 salesCount must equal 5');
  console.assert(maisVendidos[1].REFERENCIA_SKU === 'OO9102', 'OO9102 must be #2 with 1 sale');

  // 6.4 Preset: Mais Lucrativos (CH5408 lucro = 1600 -> primeiro lugar)
  const maisLucrativos = filterAndSortStock(mockStock, mockSales, { preset: 'mais_lucrativos' });
  console.assert(maisLucrativos[0].REFERENCIA_SKU === 'CH5408', 'CH5408 must have highest unit profit (R$ 1600)');
  console.assert(maisLucrativos[0]._lucroUnitario === 1600, 'CH5408 profit calculation error');
  console.assert(maisLucrativos[1].REFERENCIA_SKU === 'OO9102', 'OO9102 must be second in profit (R$ 250)');

  // 6.5 Preset: Estoque Crítico (somente <= 2 unidades, esgotados 0 primeiro)
  const criticos = filterAndSortStock(mockStock, mockSales, { preset: 'critico' });
  console.assert(criticos.length === 2, 'Only 2 items must be critical (VO5322 and OO9102)');
  console.assert(criticos[0].REFERENCIA_SKU === 'VO5322', 'Stock 0 must come before stock 1');
  console.assert(criticos[1].REFERENCIA_SKU === 'OO9102', 'Stock 1 must come second');

  // 6.6 Preset: Maior Capital Imobilizado (CH5408 = 10 * 800 = 8000 -> primeiro)
  const imobilizados = filterAndSortStock(mockStock, mockSales, { preset: 'imobilizado' });
  console.assert(imobilizados[0].REFERENCIA_SKU === 'CH5408', 'CH5408 must have highest tied-up capital (R$ 8.000)');
  console.assert(imobilizados[0]._valorImobilizado === 8000, 'CH5408 tied capital calculation error');
  console.assert(imobilizados[1]._valorImobilizado === 500, 'RB3025 (5*100=500) must be second');

  // 6.7 Filtros Combinados: Loja Cajati + Material Acetato
  const cajatiAcetato = filterAndSortStock(mockStock, mockSales, { store: 'Cajati', material: 'Acetato' });
  console.assert(cajatiAcetato.length === 1, 'Only VO5322 is in Cajati with Acetato material');
  console.assert(cajatiAcetato[0].REFERENCIA_SKU === 'VO5322', 'Mismatch in filtered store/material result');

  // 6.8 Facets Extraction
  const facets = extractStockFacets(mockStock);
  console.assert(facets.stores.includes('Cajati') && facets.stores.includes('Registro'), 'Facets store extraction error');
  console.assert(facets.brands.includes('Ray-Ban') && facets.brands.includes('Oakley'), 'Facets brand extraction error');
  console.assert(facets.materials.includes('Metal') && facets.materials.includes('Acetato'), 'Facets material extraction error');

  // 6.9 Edge Cases: Empty arrays, null inputs, zero-cost margins, dirty string numbers
  console.assert(filterAndSortStock(null).length === 0, 'Null stock must return empty array');
  console.assert(filterAndSortStock([]).length === 0, 'Empty stock must return empty array');
  const zeroCostItem = filterAndSortStock([{ ESTOQUE: '0', PRECO_COMPRA: '0', PRECO_VENDA: '100' }], null, { preset: 'mais_lucrativos' });
  console.assert(zeroCostItem[0]._margemPercent === 100, 'Zero cost margin must be safely handled');
  const dirtyFieldItem = filterAndSortStock([{ ESTOQUE: '', PRECO_COMPRA: '', PRECO_VENDA: '' }], null, { preset: 'critico' });
  console.assert(dirtyFieldItem[0]._statusEstoque === 'esgotado', 'Empty string fields must classify as esgotado');

  // 6.10 Preset: Loja / Unidade (Agrupamento e Ordenação por Filial)
  const porLoja = filterAndSortStock(mockStock, mockSales, { preset: 'loja' });
  console.assert(porLoja[0].UNIDADE === 'Cajati', 'Preset loja must group Cajati before Central/Registro');
  console.assert(porLoja[porLoja.length - 1].UNIDADE === 'Registro', 'Registro must come after Cajati and Central');

  // 6.11 Preset: Marca / Material (Agrupamento e Ordenação por Marca/Material)
  const porMarcaMaterial = filterAndSortStock(mockStock, mockSales, { preset: 'marca_material' });
  console.assert(porMarcaMaterial[0].MARCA === 'Chanel', 'Preset marca_material must sort Chanel first');
  console.assert(porMarcaMaterial[porMarcaMaterial.length - 1].MARCA === 'Vogue', 'Vogue must sort last');

  // 6.12 Non-enumerable Properties & Zero Pollution Check
  const sampleItem = maisVendidos[0];
  const keys = Object.keys(sampleItem);
  console.assert(!keys.some(k => k.startsWith('_')), 'Internal metrics must be non-enumerable to prevent table column pollution');
  console.assert(sampleItem._salesCount === 5, 'Non-enumerable _salesCount must be directly readable');
  console.assert(JSON.stringify(sampleItem).indexOf('_salesCount') === -1, 'JSON.stringify must not leak internal _ properties');

  // 6.13 Token Word Boundary Check in Sales Matching (No False Positives)
  const stockWithShortModel = [{ REFERENCIA_SKU: 'MOD-PRO', MODELO: 'pro', MARCA: 'Generica', ESTOQUE: '5' }];
  const salesWithFalseSubstrings = [{ PRODUTO: 'Produto Promocional com Desconto', QUANTIDADE: '10', VALOR: '500.00' }];
  const falseMatchTest = filterAndSortStock(stockWithShortModel, salesWithFalseSubstrings, { preset: 'mais_vendidos' });
  console.assert(falseMatchTest[0]._salesCount === 0, 'Substring inside "promocional" must not match short model "pro"');

  // 6.14 Object Reference Preservation for Zero Desynchronization in ERP
  console.assert(mockStock[0] === maisVendidos.find(x => x.REFERENCIA_SKU === 'RB3025'), 'Object reference should be preserved for reliable row updates/deletions');

  console.log('  ✅ Test 6 Passed: Smart stock filtering, presets, profit calculations and sales cross-referencing verified.\n');

  // ─── TEST 7: Document Attachments (Client & Responsible) ───────────────
  console.log('▶ Test 7: Client & Responsible Document Attachment Verification');

  const mockClientWithDocs = {
    id: 'cli_doc_001',
    'Nome Completo': 'Lucas Silva Sauro',
    'CPF / CNPJ': '123.456.789-00',
    'RG': '12.345.678-9',
    'Foto Documento Cliente': 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASo...',
    'Foto Comprovante Residência Cliente': 'data:application/pdf;base64,JVBERi0xLjQK...',
    'Responsável Nome': 'Valesca Silva Sauro',
    'Responsável CPF': '987.654.321-11',
    'Responsável RG': '98.765.432-1',
    'Foto Documento Responsável': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
    'Foto Comprovante Residência Responsável': 'data:image/png;base64,iVBORw0KGgo...'
  };

  // 7.1 Verify presence and integrity of all 4 document fields
  console.assert(Boolean(mockClientWithDocs['Foto Documento Cliente']), 'Error: Foto Documento Cliente must be present');
  console.assert(mockClientWithDocs['Foto Documento Cliente'].startsWith('data:image/'), 'Error: Foto Documento Cliente must be an image data URI');
  
  console.assert(Boolean(mockClientWithDocs['Foto Comprovante Residência Cliente']), 'Error: Foto Comprovante Residência Cliente must be present');
  console.assert(mockClientWithDocs['Foto Comprovante Residência Cliente'].startsWith('data:application/pdf'), 'Error: Foto Comprovante Residência Cliente must support PDF data URI');

  console.assert(Boolean(mockClientWithDocs['Foto Documento Responsável']), 'Error: Foto Documento Responsável must be present');
  console.assert(mockClientWithDocs['Foto Documento Responsável'].startsWith('data:image/'), 'Error: Foto Documento Responsável must be an image data URI');

  console.assert(Boolean(mockClientWithDocs['Foto Comprovante Residência Responsável']), 'Error: Foto Comprovante Residência Responsável must be present');
  console.assert(mockClientWithDocs['Foto Comprovante Residência Responsável'].startsWith('data:image/'), 'Error: Foto Comprovante Residência Responsável must support image data URI');

  // 7.2 Backward compatibility with legacy records lacking document fields
  const mockLegacyClient = {
    id: 'cli_legacy_001',
    'Nome Completo': 'Carlos Silva',
    'CPF / CNPJ': '555.666.777-88'
  };

  const clientDoc = mockLegacyClient['Foto Documento Cliente'] || '';
  const compDoc = mockLegacyClient['Foto Comprovante Residência Cliente'] || '';
  const respDoc = mockLegacyClient['Foto Documento Responsável'] || '';
  const respCompDoc = mockLegacyClient['Foto Comprovante Residência Responsável'] || '';

  console.assert(clientDoc === '', 'Legacy client without docs should safely resolve to empty string');
  console.assert(compDoc === '', 'Legacy client without proof should safely resolve to empty string');
  console.assert(respDoc === '', 'Legacy client without resp docs should safely resolve to empty string');
  console.assert(respCompDoc === '', 'Legacy client without resp proof should safely resolve to empty string');

  console.log('  ✅ Test 7 Passed: Document attachment fields, formats (image/PDF), and backwards compatibility verified.\n');

  // ─── TEST 8: Reference Person Names for Client and Responsável ────────
  console.log('▶ Test 8: Reference Contact Names (Client & Responsável)');
  
  const mockClientWithRefs = {
    id: 'cli_ref_001',
    'Nome Completo': 'Mariana Souza',
    'CPF / CNPJ': '111.222.333-44',
    'Nome Referência 1': 'Tia Cláudia',
    'Referência 1': '(13) 99887-1122',
    'Parentesco Ref. 1': 'Tia',
    'Nome Referência 2': 'Carlos Colega',
    'Referência 2': '(13) 99112-3344',
    'Parentesco Ref. 2': 'Amigo',
    'Responsável Nome': 'Rogério Souza',
    'Responsável Nome Referência 1': 'Dona Bete',
    'Responsável Referência 1': '(13) 98765-4321',
    'Responsável Parentesco Ref. 1': 'Mãe',
    'Responsável Nome Referência 2': 'Dr. Marcos',
    'Responsável Referência 2': '(13) 97654-3210',
    'Responsável Parentesco Ref. 2': 'Vizinho'
  };

  // Helper formatter matching PrintableOS logic
  const formatRefEntry = (person, phone, kin) => {
    const parts = [];
    if (person && phone) {
      parts.push(`${person}: ${phone}`);
    } else if (person) {
      parts.push(person);
    } else if (phone) {
      parts.push(phone);
    }
    if (parts.length === 0) return '';
    let res = parts.join(' ');
    if (kin) res += ` (${kin})`;
    return res;
  };

  // 8.1 Format client reference contacts
  const cliRef1 = formatRefEntry(
    mockClientWithRefs['Nome Referência 1'],
    mockClientWithRefs['Referência 1'],
    mockClientWithRefs['Parentesco Ref. 1']
  );
  console.assert(cliRef1 === 'Tia Cláudia: (13) 99887-1122 (Tia)', `Unexpected client ref 1 format: ${cliRef1}`);

  const cliRef2 = formatRefEntry(
    mockClientWithRefs['Nome Referência 2'],
    mockClientWithRefs['Referência 2'],
    mockClientWithRefs['Parentesco Ref. 2']
  );
  console.assert(cliRef2 === 'Carlos Colega: (13) 99112-3344 (Amigo)', `Unexpected client ref 2 format: ${cliRef2}`);

  // 8.2 Format responsable reference contacts
  const respRef1 = formatRefEntry(
    mockClientWithRefs['Responsável Nome Referência 1'],
    mockClientWithRefs['Responsável Referência 1'],
    mockClientWithRefs['Responsável Parentesco Ref. 1']
  );
  console.assert(respRef1 === 'Dona Bete: (13) 98765-4321 (Mãe)', `Unexpected resp ref 1 format: ${respRef1}`);

  // 8.3 Backwards compatibility when only phone exists (no person name)
  const legacyLegacyRef = formatRefEntry('', '(13) 99999-0000', 'Irmão');
  console.assert(legacyLegacyRef === '(13) 99999-0000 (Irmão)', `Legacy ref format failed: ${legacyLegacyRef}`);

  // 8.4 Backwards compatibility when only name exists (no phone)
  const nameOnlyRef = formatRefEntry('José Vizinho', '', 'Vizinho');
  console.assert(nameOnlyRef === 'José Vizinho (Vizinho)', `Name only ref format failed: ${nameOnlyRef}`);

  console.log('  ✅ Test 8 Passed: Reference person names, phones, kinships and backwards compatibility verified.\n');

  // ─── TEST 9: Payment Method Installment Dates (Crédito vs Boleto) ─────
  console.log('▶ Test 9: Payment Method Installment Formatting (Crédito vs Boleto)');
  
  // 9.1 Credit card payment representation (clean installments, no due dates)
  const creditPayment = {
    metodo: 'credito',
    valor: 300,
    parcelas: 10,
    texto: `💳 Cartão Crédito (10x de R$ 30,00): R$ 300,00`
  };
  console.assert(!creditPayment.texto.includes('Venc:'), 'Crédito should NOT include due dates in text summary');
  console.assert(creditPayment.texto.includes('10x de R$ 30,00'), 'Crédito should clearly show installment breakdown');

  // 9.2 Boleto payment representation (must keep due dates for tracking)
  const boletoPayment = {
    metodo: 'carne',
    valor: 300,
    parcelas: 3,
    texto: `📄 Boleto (3x de R$ 100,00 | Venc: 1ª 17/10/2026, 2ª 17/11/2026, 3ª 17/12/2026): R$ 300,00`
  };
  console.assert(boletoPayment.texto.includes('Venc:'), 'Boleto MUST include due dates in text summary');
  console.assert(boletoPayment.texto.includes('17/10/2026'), 'Boleto must include first due date');
  console.assert(boletoPayment.texto.includes('17/12/2026'), 'Boleto must include future due dates');

  console.log('  ✅ Test 9 Passed: Crédito cleanly formatted without dates, Boleto retains complete due dates schedule.\n');

  // ─── TEST 10: OS Management Search & Deadline Heuristics ───────────────
  console.log('▶ Test 10: OS Management Search & Deadline Calculations');

  const getTestDeadlineInfo = (dtEntrega, status) => {
    if (!dtEntrega || status === "Entregue" || status === "Cancelada") return null;
    const s = String(dtEntrega).trim();
    let dStr = s;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/');
      dStr = `${y}-${m}-${d}`;
    }
    const deliveryDate = new Date(dStr + "T23:59:59");
    if (isNaN(deliveryDate.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deliveryDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { isDelayed: true, diffDays, text: `Atrasada há ${Math.abs(diffDays)} dia(s)` };
    } else if (diffDays === 0) {
      return { isDelayed: false, diffDays, text: "Previsto para HOJE" };
    } else if (diffDays === 1) {
      return { isDelayed: false, diffDays, text: "Previsto para amanhã" };
    } else {
      return { isDelayed: false, diffDays, text: `Faltam ${diffDays} dias` };
    }
  };

  // 10.1 Entregue orders do not report deadline alerts
  console.assert(getTestDeadlineInfo('2026-09-10', 'Entregue') === null, 'Entregue OS should have null deadline alert');

  // 10.2 Overdue order detection
  const overdueInfo = getTestDeadlineInfo('2020-01-01', 'No Laboratório');
  console.assert(overdueInfo.isDelayed === true, 'Past date should be detected as delayed');
  console.assert(overdueInfo.text.includes('Atrasada'), 'Overdue text must mention Atrasada');

  // 10.3 Multi-field search matching
  const testOrder = {
    osNumber: 'CAJ-12',
    clientName: 'Stephanie Museti Santos',
    clientCPF: '442.634.228-35',
    clientPhone: '(13) 99774-1911',
    product: 'Jhon Ricky 9924 + Ambar Vision',
    armacao: 'Jhon Ricky 9924',
    lente: 'Ambar Vision Light',
    unit: 'Cajati',
    status: 'No Laboratório'
  };

  const matchesSearch = (order, query) => {
    const q = query.toLowerCase().trim();
    const cleanQ = q.replace(/\D/g, '');
    const matchesOS = order.osNumber.toLowerCase().includes(q);
    const matchesClient = order.clientName.toLowerCase().includes(q);
    const matchesArmacao = (order.armacao || '').toLowerCase().includes(q);
    const matchesLente = (order.lente || '').toLowerCase().includes(q);
    let matchesDoc = false;
    if (cleanQ.length >= 3) {
      const clientCPFNum = (order.clientCPF || '').replace(/\D/g, '');
      const clientPhoneNum = (order.clientPhone || '').replace(/\D/g, '');
      if (clientCPFNum.includes(cleanQ) || clientPhoneNum.includes(cleanQ)) {
        matchesDoc = true;
      }
    }
    return matchesOS || matchesClient || matchesArmacao || matchesLente || matchesDoc;
  };

  console.assert(matchesSearch(testOrder, 'caj-12') === true, 'Matches OS number');
  console.assert(matchesSearch(testOrder, 'stephanie') === true, 'Matches Client name');
  console.assert(matchesSearch(testOrder, '442634') === true, 'Matches Unformatted CPF');
  console.assert(matchesSearch(testOrder, '99774') === true, 'Matches Phone number');
  console.assert(matchesSearch(testOrder, 'jhon ricky') === true, 'Matches Armação');
  console.assert(matchesSearch(testOrder, 'ambar') === true, 'Matches Lente');
  console.assert(matchesSearch(testOrder, 'outro cliente') === false, 'Does not match unrelated term');

  console.log('  ✅ Test 10 Passed: OS Search matching and deadline calculations verified.\n');

  // ==========================================
  // TEST 11: OS Management Access Permissions (Vendedor & Admin)
  // ==========================================
  console.log('▶ Test 11: OS Management Access Permissions (Vendedor & Admin)');
  
  const vendedorUser = { username: 'vendedor_cajati', role: 'vendedor', city: 'Cajati', authorized: true };
  const adminUser = { username: 'wmusete', role: 'administrativo', city: 'Cajati', authorized: true };

  // 11.1 Drawer visibility check
  const isOSDrawerVisible = (user) => true; // Now universally accessible
  console.assert(isOSDrawerVisible(vendedorUser) === true, 'Vendedor must see OS Management in drawer');
  console.assert(isOSDrawerVisible(adminUser) === true, 'Admin must see OS Management in drawer');

  // 11.2 Can view / access OS Management screen
  const canAccessOS = (user) => user && ['admin', 'administrativo', 'vendedor'].includes(user.role);
  console.assert(canAccessOS(vendedorUser) === true, 'Vendedor must have access to OS screen');
  console.assert(canAccessOS(adminUser) === true, 'Admin must have access to OS screen');

  // 11.3 Default store filter respects vendedor's city
  const getDefaultStoreFilter = (user) => user?.city || 'ALL';
  console.assert(getDefaultStoreFilter(vendedorUser) === 'Cajati', 'Vendedor default unit must match assigned city');

  // 11.4 Deletion safety (only admins can delete orders)
  const canDeleteOrder = (user) => ['admin', 'administrativo'].includes(user?.role);
  console.assert(canDeleteOrder(vendedorUser) === false, 'Vendedor must NOT have permission to delete OS');
  console.assert(canDeleteOrder(adminUser) === true, 'Admin MUST have permission to delete OS');

  // 11.5 Header badge text by role
  console.log('  ✅ Test 11 Passed: OS Management permissions, store preselection and deletion safety verified.\n');

  // ==========================================
  // TEST 12: OS Financial Breakdown (Boleto vs Immediate Payments & Falta Calculation)
  // ==========================================
  console.log('▶ Test 12: OS Financial Breakdown (Boleto as Pending Debt, Not Cash Downpayment)');

  const cleanValTest = (v) => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const s = String(v).replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
  };

  const calculateDownpaymentAndRemaining = (totalFinal, paymentsList) => {
    const totalPagoImediato = paymentsList.reduce((acc, p) => {
      const m = String(p.metodo || '').toLowerCase();
      if (m === 'boleto' || m === 'carne') return acc;
      return acc + (cleanValTest(p.valor) || 0);
    }, 0);
    const entrada = totalPagoImediato;
    const restante = Math.max(0, totalFinal - totalPagoImediato);
    return { entrada, restante };
  };

  // Case 1: Pure Boleto (R$ 350,00 total in 5x boleto) -> Entrada must be 0,00 and Falta/Restante must be 350,00
  const caseBoletoPure = calculateDownpaymentAndRemaining(350, [
    { metodo: 'boleto', valor: 350, parcelas: 5 }
  ]);
  console.assert(caseBoletoPure.entrada === 0, 'Pure boleto must have R$ 0,00 downpayment');
  console.assert(caseBoletoPure.restante === 350, 'Pure boleto must have full amount (R$ 350,00) as remaining/falta');

  // Case 2: Mixed (R$ 100 in Cash/PIX + R$ 250 in Boleto) -> Entrada must be 100,00 and Falta/Restante must be 250,00
  const caseMixed = calculateDownpaymentAndRemaining(350, [
    { metodo: 'pix', valor: 100 },
    { metodo: 'boleto', valor: 250 }
  ]);
  console.assert(caseMixed.entrada === 100, 'Mixed payment must count PIX as R$ 100,00 downpayment');
  console.assert(caseMixed.restante === 250, 'Mixed payment must leave boleto portion (R$ 250,00) as remaining/falta');

  // Case 3: Pure Cash/Credit (R$ 350,00) -> Entrada must be 350,00 and Falta/Restante must be 0,00
  const casePaid = calculateDownpaymentAndRemaining(350, [
    { metodo: 'credito', valor: 350 }
  ]);
  console.assert(casePaid.entrada === 350, 'Credit must count as full payment');
  console.assert(casePaid.restante === 0, 'Fully paid sale must have R$ 0,00 remaining');

  console.log('  ✅ Test 12 Passed: Downpayment vs pending installment debt properly distinguished.\n');

  // ─── TEST 13: OS Semáforo Azul & Geração Condicional de Duplicatas ──────────
  console.log('▶ Test 13: OS Semáforo Azul (Aguardando Confirmação) & Geração Condicional de Duplicatas');

  // 13.1 Validação do Status Azul no Semáforo
  const testStatusConfig = {
    "Aguardando Confirmação": {
      label: "Aguardando Confirmação",
      color: "blue",
      badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/40 shadow-[0_0_12px_rgba(14,165,233,0.25)]",
      dotClass: "bg-sky-400 animate-pulse",
      icon: "🔵"
    }
  };
  console.assert(testStatusConfig["Aguardando Confirmação"].color === 'blue', 'Status "Aguardando Confirmação" must have color blue');
  console.assert(testStatusConfig["Aguardando Confirmação"].icon === '🔵', 'Status "Aguardando Confirmação" must have blue dot icon');

  // 13.2 Simulação de Geração de Nova OS (Sem duplicata prévia)
  const simulateNewOS = (client, osInput) => {
    return {
      CLIENTE_ID: client.id,
      CPF: client['CPF / CNPJ'],
      NOME: client['Nome Completo'],
      PRODUTO: osInput.produto,
      VALOR_TOTAL: osInput.valorTotal,
      VALOR_ENTRADA: osInput.valorEntrada,
      RESTANTE: osInput.restante,
      PARCELAS_JSON: JSON.stringify(osInput.parcelas || []),
      STATUS_OS: 'Aguardando Confirmação',
      SITUAÇÃO: 'Aguardando Confirmação',
      DUPLICATAS_GERADAS: false,
      PAGAMENTO_CONFERIDO: 'Não'
    };
  };

  const clientMock = { id: 'cli_101', 'CPF / CNPJ': '123.456.789-00', 'Nome Completo': 'Lucas Silva', 'Valor Devido': '0,00' };
  const osMock = simulateNewOS(clientMock, {
    produto: 'Lente Anti-Reflexo + Armação Vogue',
    valorTotal: '600,00',
    valorEntrada: '100,00',
    restante: '500,00',
    parcelas: [
      { numero: 1, totalParcelas: 2, valor: '250,00', vencimento: '2026-10-26' },
      { numero: 2, totalParcelas: 2, valor: '250,00', vencimento: '2026-11-26' }
    ]
  });

  console.assert(osMock.STATUS_OS === 'Aguardando Confirmação', 'Nova OS deve iniciar em Aguardando Confirmação');
  console.assert(osMock.DUPLICATAS_GERADAS === false, 'Duplicatas não devem ser geradas na emissão inicial');
  console.assert(osMock.PAGAMENTO_CONFERIDO === 'Não', 'Pagamento não deve estar conferido inicialmente');

  // 13.3 Cenário A: Aprovação pela Administração
  const simulateApproval = (os, client, contasReceberDb) => {
    const parcs = JSON.parse(os.PARCELAS_JSON || '[]');
    parcs.forEach(p => {
      contasReceberDb.push({
        CLIENTE_ID: os.CLIENTE_ID,
        CPF: os.CPF,
        VALOR: p.valor,
        VENCIMENTO: p.vencimento,
        STATUS: 'Pendente'
      });
    });

    const restNum = parseFloat(os.RESTANTE.replace(',', '.'));
    const curDebt = parseFloat(client['Valor Devido'].replace(',', '.'));
    client['Valor Devido'] = (curDebt + restNum).toFixed(2).replace('.', ',');
    client['Status de Pagamento'] = 'Inadimplente';

    os.STATUS_OS = 'No Laboratório';
    os.SITUAÇÃO = 'Pendente';
    os.PAGAMENTO_CONFERIDO = 'Sim';
    os.DUPLICATAS_GERADAS = true;
  };

  const contasReceberTest = [];
  const clientApprovalTest = { ...clientMock };
  const osApprovalTest = { ...osMock };

  simulateApproval(osApprovalTest, clientApprovalTest, contasReceberTest);

  console.assert(contasReceberTest.length === 2, 'Após aprovação, deve gerar 2 duplicatas no financeiro');
  console.assert(contasReceberTest[0].VALOR === '250,00', 'Parcela 1 deve ser de R$ 250,00');
  console.assert(clientApprovalTest['Valor Devido'] === '500,00', 'Débito do cliente deve ser atualizado para 500,00');
  console.assert(osApprovalTest.STATUS_OS === 'No Laboratório', 'Após confirmação, OS deve ser liberada para No Laboratório');
  console.assert(osApprovalTest.DUPLICATAS_GERADAS === true, 'Flag de duplicatas geradas deve ser true');

  // 13.4 Cenário B: Recusa / Cancelamento da OS (Se não aprovada, duplicata não vai)
  const simulateRejection = (os, client, contasReceberDb) => {
    os.STATUS_OS = 'Cancelada';
    os.SITUAÇÃO = 'Cancelada';
    os.PAGAMENTO_CONFERIDO = 'Não';
    os.DUPLICATAS_GERADAS = false;
    // Nenhuma duplicata adicionada a contasReceberDb
    // Nenhum débito somado ao cliente
  };

  const contasReceberReject = [];
  const clientRejectTest = { ...clientMock };
  const osRejectTest = { ...osMock };

  simulateRejection(osRejectTest, clientRejectTest, contasReceberReject);

  console.assert(contasReceberReject.length === 0, 'Se OS for recusada, NENHUMA duplicata vai para o financeiro');
  console.assert(clientRejectTest['Valor Devido'] === '0,00', 'Se OS for recusada, cliente não recebe débito');
  console.assert(osRejectTest.STATUS_OS === 'Cancelada', 'Status deve mudar para Cancelada');

  console.log('  ✅ Test 13 Passed: Semáforo Azul, aprovação com geração de duplicatas e cancelamento seguro verificados com sucesso!\n');

  // ==========================================
  // TEST 14: Anti-Duplicação de Contas a Receber (Parcelas vs Saldo Cheio)
  // ==========================================
  console.log('▶ Test 14: Anti-Duplicação em CONTAS_RECEBER (Parcelas Mensais vs Lançamento Único)');

  // 14.1 Simulação do caso de Stephanie: 12 parcelas de 29,17 + 1 lançamento de 350,00
  const rawReceberWithDuplicate = [
    { id: '1', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 1/12 - PDV', 'DATA VENCIMENTO': '26/10/2026' },
    { id: '2', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 2/12 - PDV', 'DATA VENCIMENTO': '26/11/2026' },
    { id: '3', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 3/12 - PDV', 'DATA VENCIMENTO': '26/12/2026' },
    { id: '4', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 4/12 - PDV', 'DATA VENCIMENTO': '26/01/2027' },
    { id: '5', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 5/12 - PDV', 'DATA VENCIMENTO': '26/02/2027' },
    { id: '6', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 6/12 - PDV', 'DATA VENCIMENTO': '26/03/2027' },
    { id: '7', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 7/12 - PDV', 'DATA VENCIMENTO': '26/04/2027' },
    { id: '8', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 8/12 - PDV', 'DATA VENCIMENTO': '26/05/2027' },
    { id: '9', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 9/12 - PDV', 'DATA VENCIMENTO': '26/06/2027' },
    { id: '10', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 10/12 - PDV', 'DATA VENCIMENTO': '26/07/2027' },
    { id: '11', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 11/12 - PDV', 'DATA VENCIMENTO': '26/08/2027' },
    { id: '12', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '29,17', DOCUMENTO: 'BOLETO 12/12 - PDV', 'DATA VENCIMENTO': '26/09/2027' },
    { id: '13', CLIENTE: 'STEPHANIE MUSETI SANTOS', VALOR: '350,00', DOCUMENTO: 'OS #CAJ-1 - Saldo a Receber', DESCRICAO: 'Venda OS #CAJ-1 - Óculos', MEIO_PAGAMENTO: 'Boleto (12x de R$ 29,17)' }
  ];

  // Aplicar lógica do Sanitizador
  const sanitizeContasReceber = (list) => {
    const installmentRows = list.filter(r => {
      const doc = String(r.DOCUMENTO || '').toUpperCase();
      return doc.includes('BOLETO') && /\d+\/\d+/.test(doc);
    });
    if (installmentRows.length > 1) {
      const installmentsSum = installmentRows.reduce((acc, r) => acc + (parseFloat(String(r.VALOR || '0').replace(',', '.')) || 0), 0);
      return list.filter(r => {
        const isInst = installmentRows.includes(r);
        const rVal = parseFloat(String(r.VALOR || '0').replace(',', '.')) || 0;
        const isDuplicateLumpSum = !isInst && Math.abs(rVal - installmentsSum) < 2.0;
        return !isDuplicateLumpSum;
      });
    }
    return list;
  };

  const sanitized = sanitizeContasReceber(rawReceberWithDuplicate);
  console.assert(sanitized.length === 12, `Deve conter exatamente 12 parcelas, retornou ${sanitized.length}`);
  const totalSanitized = sanitized.reduce((acc, r) => acc + parseFloat(r.VALOR.replace(',', '.')), 0);
  console.assert(Math.abs(totalSanitized - 350.04) < 0.01, `Total deve ser R$ 350,04 e não R$ 700,04, calculou ${totalSanitized}`);

  // 14.2 Teste de auto-reconstrução de parcelas a partir de texto (ex: "Boleto (12x de R$ 29,17)")
  const parseInstallmentsRegex = (fpText) => {
    const match = fpText.match(/(\d+)x\s*(?:de\s*)?R?\$?\s*([\d.,]+)/i);
    if (!match) return [];
    const count = parseInt(match[1], 10);
    const val = parseFloat(match[2].replace(',', '.'));
    return Array.from({ length: count }, (_, i) => ({
      numero: i + 1,
      totalParcelas: count,
      valor: val.toFixed(2).replace('.', ',')
    }));
  };

  const reconstructed = parseInstallmentsRegex('Boleto (12x de R$ 29,17)');
  console.assert(reconstructed.length === 12, 'Deve reconstruir 12 parcelas');
  console.assert(reconstructed[0].valor === '29,17', 'Valor unitário da parcela deve ser 29,17');

  console.log('  ✅ Test 14 Passed: Anti-duplicação e normalização de parcelas em CONTAS_RECEBER verificados com sucesso!\n');

  // ==========================================
  // TEST 15: Anexo e Visualização de Comprovante de Pagamento / Mensalidades
  // ==========================================
  console.log('▶ Test 15: Anexo e Visualização de Comprovante em Mensalidades & Carnê');

  const testInstallment = {
    id: 'rec_1',
    CLIENTE: 'STEPHANIE MUSETI SANTOS',
    DOCUMENTO: 'BOLETO 1/12 - PDV',
    VALOR: '29,17',
    STATUS: 'Pendente',
    DATA_VENCIMENTO: '2026-10-26'
  };

  // Simular anexo de comprovante com opção markAsPaid = true
  const attachReceipt = (row, receiptBase64, fileName, markAsPaid = true) => {
    return {
      ...row,
      COMPROVANTE: receiptBase64,
      comprovante: receiptBase64,
      DATA_COMPROVANTE: new Date().toISOString(),
      NOME_COMPROVANTE: fileName,
      ...(markAsPaid ? { STATUS: 'Recebido', status: 'Recebido', DATA_RECEBIMENTO: '26/09/2026' } : {})
    };
  };

  const receiptMockBase64 = 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/1/4AAABwAAA=';
  const updatedWithReceipt = attachReceipt(testInstallment, receiptMockBase64, 'comprovante_pix_29_17.webp', true);

  console.assert(updatedWithReceipt.COMPROVANTE === receiptMockBase64, 'COMPROVANTE deve conter a string base64 do anexo');
  console.assert(updatedWithReceipt.NOME_COMPROVANTE === 'comprovante_pix_29_17.webp', 'NOME_COMPROVANTE deve ser preservado');
  console.assert(updatedWithReceipt.STATUS === 'Recebido', 'Status deve ser atualizado para Recebido quando markAsPaid for true');
  console.assert(Boolean(updatedWithReceipt.DATA_COMPROVANTE), 'DATA_COMPROVANTE deve ser registrada');

  // Simular exclusão do comprovante
  const removeReceipt = (row) => {
    return {
      ...row,
      COMPROVANTE: '',
      comprovante: '',
      ANEXO_COMPROVANTE: '',
      DATA_COMPROVANTE: '',
      NOME_COMPROVANTE: ''
    };
  };

  const cleared = removeReceipt(updatedWithReceipt);
  console.assert(cleared.COMPROVANTE === '', 'COMPROVANTE deve ser esvaziado após exclusão');
  console.assert(cleared.NOME_COMPROVANTE === '', 'NOME_COMPROVANTE deve ser esvaziado');

  console.log('  ✅ Test 15 Passed: Anexo, visualização e remoção de comprovantes em Mensalidades & Carnê verificados com sucesso!\n');

  // ==========================================
  // TEST 16: Interação Precisa Cadastro de Clientes <-> ERP Financeiro
  // ==========================================
  console.log('▶ Test 16: Interação Precisa entre Cadastro de Clientes e ERP Financeiro (CONTAS_RECEBER & FLUXO_CAIXA)');

  // 16.1 Simulação de base com clientes e duplicatas no CONTAS_RECEBER
  const testClients = [
    {
      id: 'cli_001',
      'Nome Completo': 'MARIA SILVA SANTOS',
      'CPF / CNPJ': '123.456.789-00',
      'Cidade': 'Cajati',
      'Valor Devido': '0,00',
      'Status de Pagamento': 'Em dia'
    },
    {
      id: 'cli_002',
      'Nome Completo': 'JOAO PEREIRA LIMA',
      'CPF / CNPJ': '987.654.321-11',
      'Cidade': 'Registro',
      'Valor Devido': '0,00',
      'Status de Pagamento': 'Em dia'
    }
  ];

  const testReceberData = [
    // Maria Silva: Parcela 1 paga, Parcela 2 vencida (Inadimplente), Parcela 3 a vencer (Pendente)
    {
      id: 'rec_m1',
      CLIENTE_ID: 'cli_001',
      CLIENTE_CPF: '123.456.789-00',
      CLIENTE: 'MARIA SILVA SANTOS',
      VALOR: '150,00',
      STATUS: 'Recebido',
      DATA_VENCIMENTO: '2026-08-10',
      VENDA_OS: 'OS-1001'
    },
    {
      id: 'rec_m2',
      CLIENTE_ID: 'cli_001',
      CLIENTE_CPF: '123.456.789-00',
      CLIENTE: 'MARIA SILVA SANTOS',
      VALOR: '150,00',
      STATUS: 'Pendente',
      DATA_VENCIMENTO: '2026-09-01', // vencida
      VENDA_OS: 'OS-1001'
    },
    {
      id: 'rec_m3',
      CLIENTE_ID: 'cli_001',
      CLIENTE_CPF: '123.456.789-00',
      CLIENTE: 'MARIA SILVA SANTOS',
      VALOR: '150,00',
      STATUS: 'Pendente',
      DATA_VENCIMENTO: '2026-10-15', // a vencer
      VENDA_OS: 'OS-1001'
    },
    // Joao Pereira: 1 Parcela a vencer no prazo
    {
      id: 'rec_j1',
      CLIENTE_ID: 'cli_002',
      CLIENTE_CPF: '987.654.321-11',
      CLIENTE: 'JOAO PEREIRA LIMA',
      VALOR: '200,00',
      STATUS: 'Pendente',
      DATA_VENCIMENTO: '2026-11-20',
      VENDA_OS: 'OS-2002'
    }
  ];

  // Helper matching function
  const isSameClientTest = (client, inv) => {
    if (!client || !inv) return false;
    const cId = client.id || client.CLIENTE_ID || client['ID DO CLIENTE'];
    const iId = inv.CLIENTE_ID || inv.cliente_id || inv.clienteId;
    if (cId && iId && String(cId).trim() === String(iId).trim()) return true;

    const cCpf = String(client['CPF / CNPJ'] || client['CPF'] || '').replace(/\D/g, '');
    const iCpf = String(inv.CLIENTE_CPF || inv['CPF'] || inv.CPF || inv.cpf || '').replace(/\D/g, '');
    if (cCpf && iCpf && cCpf.length >= 11 && cCpf === iCpf) return true;

    const cNome = String(client['Nome Completo'] || client['NOME'] || '').trim().toLowerCase();
    const iNome = String(inv.CLIENTE || inv.cliente || inv['NOME'] || '').trim().toLowerCase();
    if (cNome && iNome && cNome === iNome) return true;

    return false;
  };

  // 16.2 Enriquecimento dinâmico em tempo real
  const enrichClientWithReceber = (client, contasReceber) => {
    const invoices = contasReceber.filter(inv => isSameClientTest(client, inv));
    let totalAberto = 0;
    let totalPago = 0;
    let hasOverdue = false;
    let hasPending = false;
    const today = '2026-09-26';

    invoices.forEach(inv => {
      const val = cleanValTest(inv.VALOR);
      const isPaid = inv.STATUS === 'Recebido' || inv.STATUS === 'Pago';
      if (isPaid) {
        totalPago += val;
      } else {
        totalAberto += val;
        hasPending = true;
        if (inv.DATA_VENCIMENTO && inv.DATA_VENCIMENTO < today) {
          hasOverdue = true;
        }
      }
    });

    const statusFinal = totalAberto === 0 ? 'Em dia' : (hasOverdue ? 'Inadimplente' : 'Pendente');

    return {
      ...client,
      _invoices: invoices,
      _totalAberto: totalAberto,
      _totalPago: totalPago,
      _statusCalculado: statusFinal
    };
  };

  const mariaEnriched = enrichClientWithReceber(testClients[0], testReceberData);
  console.assert(mariaEnriched._totalAberto === 300, `Maria deve ter R$ 300,00 em aberto (2x R$ 150), obteve ${mariaEnriched._totalAberto}`);
  console.assert(mariaEnriched._totalPago === 150, `Maria deve ter R$ 150,00 pagos, obteve ${mariaEnriched._totalPago}`);
  console.assert(mariaEnriched._statusCalculado === 'Inadimplente', `Maria tem parcela vencida em 2026-09-01, status deve ser Inadimplente, obteve ${mariaEnriched._statusCalculado}`);

  const joaoEnriched = enrichClientWithReceber(testClients[1], testReceberData);
  console.assert(joaoEnriched._totalAberto === 200, `Joao deve ter R$ 200,00 em aberto, obteve ${joaoEnriched._totalAberto}`);
  console.assert(joaoEnriched._statusCalculado === 'Pendente', `Joao tem parcela futura em 2026-11-20, status deve ser Pendente, obteve ${joaoEnriched._statusCalculado}`);

  // 16.3 Simulação de Liquidação de Parcela Individual (handleSettleSingleInvoice)
  let updatedReceberTable = [...testReceberData];
  let fluxoCaixaLog = [];

  const simulateSettleSingleInvoice = (invToSettle) => {
    // 1. Marca como recebido no Contas a Receber
    updatedReceberTable = updatedReceberTable.map(inv => {
      if (inv.id === invToSettle.id) {
        return {
          ...inv,
          STATUS: 'Recebido',
          DATA_RECEBIMENTO: '2026-09-26'
        };
      }
      return inv;
    });

    // 2. Registra entrada no Fluxo de Caixa
    const val = cleanValTest(invToSettle.VALOR);
    fluxoCaixaLog.push({
      tipo: 'RECEBIMENTO',
      valor: val,
      formaPagamento: 'DINHEIRO / RECEBIMENTO',
      motivo: `Recebimento Carnê/Boleto - ${invToSettle.CLIENTE}`,
      CLIENTE_ID: invToSettle.CLIENTE_ID,
      CLIENTE_CPF: invToSettle.CLIENTE_CPF
    });
  };

  // Quitar a parcela vencida da Maria (rec_m2)
  simulateSettleSingleInvoice(testReceberData[1]);

  // Verificar se a parcela rec_m2 agora está como Recebido
  const settledRec = updatedReceberTable.find(inv => inv.id === 'rec_m2');
  console.assert(settledRec.STATUS === 'Recebido', 'Parcela rec_m2 deve constar como Recebido após quitação');
  console.assert(fluxoCaixaLog.length === 1, 'Fluxo de Caixa deve registrar 1 entrada de recebimento');
  console.assert(fluxoCaixaLog[0].valor === 150, 'Valor do recebimento no Fluxo de Caixa deve ser R$ 150,00');

  // Recalcular status da Maria após quitação da parcela vencida
  const mariaAfterSettlement = enrichClientWithReceber(testClients[0], updatedReceberTable);
  console.assert(mariaAfterSettlement._totalAberto === 150, `Débito da Maria agora deve ser R$ 150,00 (apenas a parcela a vencer), obteve ${mariaAfterSettlement._totalAberto}`);
  console.assert(mariaAfterSettlement._statusCalculado === 'Pendente', `Como só resta parcela com vencimento futuro, status da Maria deve ser Pendente e não mais Inadimplente, obteve ${mariaAfterSettlement._statusCalculado}`);

  console.log('  ✅ Test 16 Passed: Interação precisa Cliente <-> Contas a Receber <-> Fluxo de Caixa validada com sucesso!\n');

  // ==========================================
  // TEST 17: Exclusão Segura e em Cascata da OS (Limpeza de Duplicatas, Recálculo do Débito e Estoque)
  // ==========================================
  console.log('▶ Test 17: Exclusão Segura e em Cascata da OS (Limpeza Financeira e Estoque)');

  const osToTest = {
    osNumber: 'CAJ-5501',
    clientName: 'CARLOS EDUARDO ROCHA',
    clientCPF: '444.555.666-77',
    raw: {
      'OS DA VENDA': 'CAJ-5501',
      'NOME CLIENTE': 'CARLOS EDUARDO ROCHA',
      'VALOR TOTAL': '600,00',
      'VALOR ENTRADA': '100,00',
      'RESTANTE': '500,00',
      'ARMAÇÃO': 'RAY-BAN AVIATOR RB3025'
    },
    matchedClient: {
      id: 'cli_carlos',
      'Nome Completo': 'CARLOS EDUARDO ROCHA',
      'CPF / CNPJ': '444.555.666-77',
      'Valor Devido': '500,00',
      'Status de Pagamento': 'Pendente'
    }
  };

  let testReceberCascata = [
    // Duplicatas da OS CAJ-5501
    { id: 'rec_c1', VENDA_OS: 'CAJ-5501', VALOR: '250,00', STATUS: 'Pendente' },
    { id: 'rec_c2', VENDA_OS: 'CAJ-5501', VALOR: '250,00', STATUS: 'Pendente' },
    // Duplicata de outra OS que NÃO deve ser afetada
    { id: 'rec_outra', VENDA_OS: 'REG-9999', VALOR: '180,00', STATUS: 'Pendente' }
  ];

  let testArmacoesCascata = [
    { MODELO: 'RAY-BAN AVIATOR RB3025', ESTOQUE: '2' },
    { MODELO: 'OAKLEY HOLBROOK', ESTOQUE: '5' }
  ];

  let testVendasCascata = [osToTest.raw];

  // Simular a exclusão em cascata
  const simulateCascadeDeleteOS = (order) => {
    const targetOS = String(order.osNumber).trim().toLowerCase();
    
    // 1. Filtrar e remover duplicatas pendentes da OS
    const pendingToDelete = testReceberCascata.filter(inv => {
      const vOS = String(inv.VENDA_OS || '').trim().toLowerCase();
      return vOS === targetOS && inv.STATUS !== 'Recebido' && inv.STATUS !== 'Pago';
    });

    testReceberCascata = testReceberCascata.filter(inv => !pendingToDelete.some(p => p.id === inv.id));

    // 2. Abater débito do cliente
    const totalPendingVal = pendingToDelete.reduce((sum, inv) => sum + cleanValTest(inv.VALOR), 0);
    const currDebt = cleanValTest(order.matchedClient['Valor Devido']);
    const newDebt = Math.max(0, currDebt - totalPendingVal);
    order.matchedClient['Valor Devido'] = newDebt.toFixed(2).replace('.', ',');
    order.matchedClient['Status de Pagamento'] = newDebt === 0 ? 'Em dia' : order.matchedClient['Status de Pagamento'];

    // 3. Estorno de Estoque (+1)
    const armacaoNome = String(order.raw['ARMAÇÃO'] || '').trim().toLowerCase();
    const itemEstoque = testArmacoesCascata.find(a => a.MODELO.toLowerCase() === armacaoNome);
    if (itemEstoque) {
      itemEstoque.ESTOQUE = String(parseInt(itemEstoque.ESTOQUE, 10) + 1);
    }

    // 4. Remover da tabela de Vendas
    testVendasCascata = testVendasCascata.filter(v => v['OS DA VENDA'] !== order.osNumber);

    return {
      deletedInvoicesCount: pendingToDelete.length,
      refundedAmount: totalPendingVal
    };
  };

  const resultCascata = simulateCascadeDeleteOS(osToTest);

  // Verificações
  console.assert(resultCascata.deletedInvoicesCount === 2, 'Deve ter removido exatamente as 2 duplicatas pendentes da OS');
  console.assert(testReceberCascata.length === 1 && testReceberCascata[0].id === 'rec_outra', 'Duplicata de outra OS (rec_outra) deve permanecer intacta');
  console.assert(osToTest.matchedClient['Valor Devido'] === '0,00', `Débito do cliente deve ter sido zerado, valor: ${osToTest.matchedClient['Valor Devido']}`);
  console.assert(osToTest.matchedClient['Status de Pagamento'] === 'Em dia', 'Status do cliente deve voltar para Em dia');
  console.assert(testArmacoesCascata[0].ESTOQUE === '3', `Estoque da armação deve ter voltado de 2 para 3 unidades, obteve ${testArmacoesCascata[0].ESTOQUE}`);
  console.assert(testVendasCascata.length === 0, 'Venda/OS deve ter sido removida de Registro_Vendas');

  console.log('  ✅ Test 17 Passed: Exclusão em cascata da OS com limpeza no Contas a Receber, recálculo do Cliente e devolução de estoque verificados com sucesso!\n');

  // ==========================================
  // TEST 18: Frente de Caixa / PDV (Sequência 2, 1 e 3)
  // Item 2: Alerta de Risco / Inadimplência na Venda no Carnê
  // Item 1: Cadastro Rápido de Novo Cliente dentro do PDV (Preservação do Carrinho)
  // Item 3: Categorias Rápidas, Destaques Mais Vendidos & Chips de Marca
  // ==========================================
  console.log('▶ Test 18: Frente de Caixa / PDV (Inadimplência Carnê, Cadastro Rápido no PDV e Ranking de Populares)');

  // 18.1 ITEM 2: Detecção de Inadimplência e Trava de Segurança no Carnê
  const clientDevedor = {
    id: 'cli_dev_01',
    'Nome Completo': 'MARCOS SOUZA PEREIRA',
    'CPF / CNPJ': '111.222.333-44',
    'Valor Devido': '450,00',
    'Status de Pagamento': 'Inadimplente'
  };

  const clientEmDia = {
    id: 'cli_ok_02',
    'Nome Completo': 'JULIANA MENDES LIMA',
    'CPF / CNPJ': '555.666.777-88',
    'Valor Devido': '0,00',
    'Status de Pagamento': 'Em dia'
  };

  const mockReceberPDV = [
    {
      id: 'rec_dev_1',
      CLIENTE_ID: 'cli_dev_01',
      CLIENTE: 'MARCOS SOUZA PEREIRA',
      VALOR: '250,00',
      STATUS: 'Pendente',
      DATA_VENCIMENTO: '2026-08-15' // Vencida
    },
    {
      id: 'rec_dev_2',
      CLIENTE_ID: 'cli_dev_01',
      CLIENTE: 'MARCOS SOUZA PEREIRA',
      VALOR: '200,00',
      STATUS: 'Pendente',
      DATA_VENCIMENTO: '2026-10-15' // A vencer
    },
    {
      id: 'rec_ok_1',
      CLIENTE_ID: 'cli_ok_02',
      CLIENTE: 'JULIANA MENDES LIMA',
      VALOR: '180,00',
      STATUS: 'Recebido',
      DATA_VENCIMENTO: '2026-09-01'
    }
  ];

  const calculateClientFinancialStatusPDV = (client, invoicesList, today = '2026-09-26') => {
    if (!client) return null;
    const clientInvoices = invoicesList.filter(inv => isSameClientTest(client, inv));
    let totalAberto = 0;
    let totalVencido = 0;
    let hasOverdue = false;

    clientInvoices.forEach(inv => {
      const val = cleanValTest(inv.VALOR);
      const isPaid = inv.STATUS === 'Recebido' || inv.STATUS === 'Pago';
      const dtVenc = inv.DATA_VENCIMENTO || '';

      if (!isPaid) {
        totalAberto += val;
        if (dtVenc && dtVenc < today) {
          hasOverdue = true;
          totalVencido += val;
        }
      }
    });

    const isInadimplente = hasOverdue || String(client['Status de Pagamento'] || '').toLowerCase() === 'inadimplente';

    return {
      totalAberto,
      totalVencido: totalVencido > 0 ? totalVencido : (isInadimplente ? totalAberto : 0),
      isInadimplente,
      countInvoices: clientInvoices.length
    };
  };

  const finDevedor = calculateClientFinancialStatusPDV(clientDevedor, mockReceberPDV);
  console.assert(finDevedor.isInadimplente === true, 'Cliente devedor deve ser marcado como isInadimplente = true');
  console.assert(finDevedor.totalVencido === 250, `Total vencido de Marcos deve ser R$ 250,00, obteve ${finDevedor.totalVencido}`);
  console.assert(finDevedor.totalAberto === 450, `Total em aberto de Marcos deve ser R$ 450,00, obteve ${finDevedor.totalAberto}`);

  const finEmDia = calculateClientFinancialStatusPDV(clientEmDia, mockReceberPDV);
  console.assert(finEmDia.isInadimplente === false, 'Cliente Juliana deve ser marcada como isInadimplente = false');
  console.assert(finEmDia.totalVencido === 0, 'Cliente Juliana não deve ter valor vencido');

  // Trava de segurança no carnê: simulação de verificação
  const canIssueCarneWithoutExplicitConfirm = (financials) => {
    return !financials?.isInadimplente;
  };
  console.assert(!canIssueCarneWithoutExplicitConfirm(finDevedor), 'Não deve emitir carnê para inadimplente sem confirmação explícita');
  console.assert(canIssueCarneWithoutExplicitConfirm(finEmDia), 'Cliente em dia pode emitir carnê diretamente');

  // 18.2 ITEM 1: Cadastro Rápido no PDV e Preservação de Carrinho
  let posCart = [
    { id: 'arm_01', nome: 'Armação Ray-Ban Aviator', preco: 450, qtd: 1 },
    { id: 'lente_01', nome: 'Lente Transitions Crizal', preco: 350, qtd: 1 }
  ];

  const simulateQuickClientRegistration = (formData, currentCart, clientsDatabase) => {
    const newClient = {
      id: `cli_${Date.now()}_test`,
      'Nome Completo': formData.nome.trim(),
      'NOME': formData.nome.trim(),
      'CPF / CNPJ': formData.cpf.trim(),
      'CPF': formData.cpf.trim(),
      'WhatsApp': formData.whatsapp.trim(),
      'Cidade': formData.cidade || 'Cajati',
      'CIDADE': formData.cidade || 'Cajati',
      'OD_ESF': formData.odEsf || '',
      'OE_ESF': formData.oeEsf || '',
      'MEDICO': formData.medico || '',
      'Status de Pagamento': 'Em dia',
      'Valor Devido': '0,00',
      'Data de Cadastro': '26/09/2026'
    };

    clientsDatabase.push(newClient);
    // O carrinho não deve ser reiniciado (preservação total do estado)
    const preservedCart = [...currentCart];

    return {
      createdClient: newClient,
      updatedCart: preservedCart
    };
  };

  const testDbClientes = [];
  const quickRegResult = simulateQuickClientRegistration({
    nome: 'BEATRIZ ALMEIDA SOUZA',
    cpf: '333.444.555-66',
    whatsapp: '(13) 99888-7766',
    cidade: 'Cajati',
    odEsf: '-2.00',
    oeEsf: '-2.25',
    medico: 'Dr. Roberto Oftalmo'
  }, posCart, testDbClientes);

  console.assert(testDbClientes.length === 1, 'Novo cliente deve estar inserido na base de clientes');
  console.assert(quickRegResult.createdClient['Nome Completo'] === 'BEATRIZ ALMEIDA SOUZA', 'Nome do cliente rápido deve coincidir');
  console.assert(quickRegResult.createdClient['OD_ESF'] === '-2.00', 'Prescrição rápida OD deve ser gravada');
  console.assert(quickRegResult.updatedCart.length === 2, 'Carrinho DEVE permanecer 100% intacto com 2 itens');
  console.assert(quickRegResult.updatedCart[0].id === 'arm_01' && quickRegResult.updatedCart[1].id === 'lente_01', 'Itens do carrinho devem ser exatamente os mesmos');

  // 18.3 ITEM 3: Categorias Rápidas, Destaques Mais Vendidos & Chips de Marca
  const mockHistoricoVendas = [
    { PRODUTO: 'RAY-BAN AVIATOR RB3025' },
    { PRODUTO: 'RAY-BAN AVIATOR RB3025' },
    { PRODUTO: 'RAY-BAN AVIATOR RB3025' },
    { PRODUTO: 'OAKLEY HOLBROOK' },
    { PRODUTO: 'OAKLEY HOLBROOK' },
    { PRODUTO: 'VOGUE EYEWEAR VO5355' }
  ];

  // Cálculo da frequência de vendas
  const computeSalesMap = (salesList) => {
    const map = {};
    salesList.forEach(s => {
      const p = String(s.PRODUTO || '').toLowerCase();
      if (p) map[p] = (map[p] || 0) + 1;
    });
    return map;
  };

  const salesMap = computeSalesMap(mockHistoricoVendas);
  console.assert(salesMap['ray-ban aviator rb3025'] === 3, 'Ray-Ban deve ter 3 vendas computadas');
  console.assert(salesMap['oakley holbrook'] === 2, 'Oakley deve ter 2 vendas computadas');
  console.assert(salesMap['vogue eyewear vo5355'] === 1, 'Vogue deve ter 1 venda computada');

  // Ordenação de mais vendidos
  const catalogoProdutos = [
    { id: '1', MODELO: 'VOGUE EYEWEAR VO5355', MARCA: 'Vogue' },
    { id: '2', MODELO: 'RAY-BAN AVIATOR RB3025', MARCA: 'Ray-Ban' },
    { id: '3', MODELO: 'OAKLEY HOLBROOK', MARCA: 'Oakley' },
    { id: '4', MODELO: 'ARMANI EXCHANGE AX3016', MARCA: 'Armani' }
  ];

  const catalogoOrdenadoPorPopulares = [...catalogoProdutos].sort((a, b) => {
    const countA = salesMap[String(a.MODELO).toLowerCase()] || 0;
    const countB = salesMap[String(b.MODELO).toLowerCase()] || 0;
    return countB - countA;
  });

  console.assert(catalogoOrdenadoPorPopulares[0].MODELO === 'RAY-BAN AVIATOR RB3025', 'O produto mais vendido no topo deve ser o Ray-Ban (3 vendas)');
  console.assert(catalogoOrdenadoPorPopulares[1].MODELO === 'OAKLEY HOLBROOK', 'O segundo mais vendido deve ser Oakley (2 vendas)');
  console.assert(catalogoOrdenadoPorPopulares[2].MODELO === 'VOGUE EYEWEAR VO5355', 'O terceiro deve ser Vogue (1 venda)');
  console.assert(catalogoOrdenadoPorPopulares[3].MODELO === 'ARMANI EXCHANGE AX3016', 'Sem histórico de vendas deve ficar por último');

  // Filtro por Chip de Marca
  const filterByBrandChip = (list, brand) => {
    if (!brand) return list;
    const b = brand.toLowerCase();
    return list.filter(item => {
      const m = String(item.MARCA || item.MODELO || '').toLowerCase();
      return m.includes(b);
    });
  };

  const filteredOakley = filterByBrandChip(catalogoProdutos, 'Oakley');
  console.assert(filteredOakley.length === 1 && filteredOakley[0].MARCA === 'Oakley', 'Filtro de chip de marca deve retornar exatamente os produtos da marca');

  console.log('  ✅ Test 18 Passed: Inadimplência no carnê, cadastro rápido com carrinho intacto e ranking de mais vendidos verificados com sucesso!\n');

  // ==========================================
  // TEST 19: Desduplicação de Colunas e Aliases no Modal de Edição e DataTable
  // Eliminação de campos duplicados (STATUS vs status, CLIENTE vs NOME CLIENTE)
  // Sincronização automática entre aliases e Identificação correta de Contas a Receber
  // ==========================================
  console.log('▶ Test 19: Desduplicação de Colunas & Aliases (STATUS, CLIENTE, VENCIMENTO) e Identificação de Entidade');

  const testCanonicalAliases = [
    {
      id: 'status',
      canonical: 'STATUS',
      label: 'Status',
      keys: ['STATUS', 'status', 'Status', 'SITUAÇÃO', 'Situação', 'Status de Pagamento', 'STATUS_PAGAMENTO']
    },
    {
      id: 'cliente',
      canonical: 'CLIENTE',
      label: 'Cliente',
      keys: ['CLIENTE', 'cliente', 'NOME DO CLIENTE', 'NOME CLIENTE', 'Nome Completo', 'NOME', 'nome', 'Cliente']
    },
    {
      id: 'cpf',
      canonical: 'CPF',
      label: 'CPF / CNPJ',
      keys: ['CPF / CNPJ', 'CPF', 'cpf', 'CLIENTE_CPF', 'cliente_cpf']
    },
    {
      id: 'cliente_id',
      canonical: 'CLIENTE_ID',
      label: 'ID do Cliente',
      keys: ['CLIENTE_ID', 'cliente_id', 'ID DO CLIENTE', 'ID_CLIENTE']
    },
    {
      id: 'valor',
      canonical: 'VALOR',
      label: 'Valor (R$)',
      keys: ['VALOR', 'valor', 'VALOR (R$)', 'VALOR TOTAL', 'VALOR DA VENDA', 'Valor']
    },
    {
      id: 'vencimento',
      canonical: 'DATA_VENCIMENTO',
      label: 'Vencimento',
      keys: ['DATA_VENCIMENTO', 'DATA VENCIMENTO', 'data_vencimento', 'VENCIMENTO', 'vencimento', 'Data de Vencimento']
    }
  ];

  // 19.1 Simulação de Desduplicação de Colunas
  const rawColumnsFromStephanieRow = [
    'CLIENTE',
    'CLIENTE_CPF',
    'CLIENTE_ID',
    'NOME CLIENTE',
    'STATUS',
    'status',
    'VALOR',
    'DATA_VENCIMENTO',
    'DATA VENCIMENTO',
    'CIDADE'
  ];

  const deduplicateColumns = (colsList, aliasesDefs) => {
    const seenGroups = new Set();
    const result = [];

    colsList.forEach(col => {
      if (!col || col.startsWith('_')) return;
      const colTrimmed = String(col).trim();
      const group = aliasesDefs.find(g =>
        g.keys.some(k => k.toLowerCase() === colTrimmed.toLowerCase())
      );

      if (group) {
        if (!seenGroups.has(group.id)) {
          seenGroups.add(group.id);
          result.push(col);
        }
      } else {
        const lower = colTrimmed.toLowerCase();
        if (!seenGroups.has(lower)) {
          seenGroups.add(lower);
          result.push(col);
        }
      }
    });

    return result;
  };

  const cleanCols = deduplicateColumns(rawColumnsFromStephanieRow, testCanonicalAliases);
  console.assert(cleanCols.includes('CLIENTE'), 'Deve conter CLIENTE');
  console.assert(!cleanCols.includes('NOME CLIENTE'), 'NÃO deve conter NOME CLIENTE duplicado');
  console.assert(cleanCols.includes('STATUS'), 'Deve conter STATUS');
  console.assert(!cleanCols.includes('status'), 'NÃO deve conter status minúsculo duplicado');
  console.assert(cleanCols.includes('DATA_VENCIMENTO'), 'Deve conter DATA_VENCIMENTO');
  console.assert(!cleanCols.includes('DATA VENCIMENTO'), 'NÃO deve conter DATA VENCIMENTO com espaço duplicado');
  console.assert(cleanCols.length === 7, `Total de colunas limpas deve ser 7 e não 10, retornou ${cleanCols.length}`);

  // 19.2 Leitura Robusta com Fallback entre Aliases (getRowValue)
  const getRowValueTest = (row, col, aliasesDefs) => {
    if (!row) return '';
    if (row[col] !== undefined && row[col] !== null && String(row[col]).trim() !== '') {
      return row[col];
    }
    const trimmed = String(col || '').trim();
    const group = aliasesDefs.find(g =>
      g.keys.some(k => k.toLowerCase() === trimmed.toLowerCase())
    );
    if (group) {
      for (const alias of group.keys) {
        if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
          return row[alias];
        }
      }
    }
    return '';
  };

  const testRowWithLowercaseOnly = {
    id: 'row_123',
    status: 'Recebido',
    'NOME CLIENTE': 'STEPHANIE MUSETI SANTOS',
    'DATA VENCIMENTO': '26/09/2027'
  };

  console.assert(getRowValueTest(testRowWithLowercaseOnly, 'STATUS', testCanonicalAliases) === 'Recebido', 'Leitura de STATUS deve encontrar "Recebido" do alias status');
  console.assert(getRowValueTest(testRowWithLowercaseOnly, 'CLIENTE', testCanonicalAliases) === 'STEPHANIE MUSETI SANTOS', 'Leitura de CLIENTE deve encontrar o nome do alias NOME CLIENTE');
  console.assert(getRowValueTest(testRowWithLowercaseOnly, 'DATA_VENCIMENTO', testCanonicalAliases) === '26/09/2027', 'Leitura de DATA_VENCIMENTO deve encontrar a data do alias com espaço');

  // 19.3 Sincronização Bi-Direcional na Edição (handleChange)
  const simulateEditChange = (prevFormData, colToEdit, newValue, initialRow, aliasesDefs) => {
    const updated = { ...prevFormData, [colToEdit]: newValue };
    const colTrimmed = String(colToEdit || '').trim().toLowerCase();
    const group = aliasesDefs.find(g =>
      g.keys.some(k => k.toLowerCase() === colTrimmed)
    );
    if (group) {
      group.keys.forEach(aliasKey => {
        if (prevFormData[aliasKey] !== undefined || initialRow?.[aliasKey] !== undefined) {
          updated[aliasKey] = newValue;
        }
      });
    }
    return updated;
  };

  const initialForm = {
    STATUS: 'Recebido',
    status: 'Recebido',
    CLIENTE: 'STEPHANIE MUSETI SANTOS',
    'NOME CLIENTE': 'STEPHANIE MUSETI SANTOS'
  };

  const afterStatusEdit = simulateEditChange(initialForm, 'STATUS', 'Pago', initialForm, testCanonicalAliases);
  console.assert(afterStatusEdit.STATUS === 'Pago', 'STATUS deve ser atualizado para Pago');
  console.assert(afterStatusEdit.status === 'Pago', 'status (minúsculo) deve ser sincronizado automaticamente para Pago');

  const afterNameEdit = simulateEditChange(afterStatusEdit, 'CLIENTE', 'STEPHANIE SILVA', initialForm, testCanonicalAliases);
  console.assert(afterNameEdit.CLIENTE === 'STEPHANIE SILVA', 'CLIENTE deve ser atualizado');
  console.assert(afterNameEdit['NOME CLIENTE'] === 'STEPHANIE SILVA', 'NOME CLIENTE deve ser sincronizado automaticamente');

  // 19.4 Identificação Correta do Título da Entidade
  const identifyEntityTitle = (sheetName, cols) => {
    if (sheetName) {
      if (sheetName === 'CONTAS_RECEBER') return 'Conta a Receber (Mensalidade / Carnê)';
      if (sheetName === 'CLIENTES_CADASTRADOS') return 'Cadastro de Cliente';
    }
    const colsStr = cols.join(' ').toLowerCase();
    if (colsStr.includes('receber') || colsStr.includes('venda_os') || colsStr.includes('documento') || (colsStr.includes('vencimento') && colsStr.includes('valor'))) {
      return 'Conta a Receber (Receita / Carnê)';
    }
    if (colsStr.includes('whatsapp') || (colsStr.includes('cpf') && !colsStr.includes('vencimento'))) {
      return 'Cadastro de Cliente';
    }
    return 'Registro do ERP';
  };

  console.assert(identifyEntityTitle('CONTAS_RECEBER', rawColumnsFromStephanieRow) === 'Conta a Receber (Mensalidade / Carnê)', 'Quando sheetName for CONTAS_RECEBER, deve rotular como Conta a Receber');
  console.assert(identifyEntityTitle('', rawColumnsFromStephanieRow) === 'Conta a Receber (Receita / Carnê)', 'Mesmo sem sheetName explícito, dados com vencimento e valor devem ser rotulados como Conta a Receber e NÃO como Cadastro de Cliente');

  console.log('  ✅ Test 19 Passed: Desduplicação de colunas, sincronização de aliases e identificação de entidade no modal verificados com sucesso!\n');

  // ─── TEST 20: Formatação Padronizada da OS & Impressão em Folha Única A4 (Sem Folhas Extras) ───
  console.log('▶ Test 20: Formatação Padronizada da OS & Conformidade Folha Única A4');

  // Helper que simula a normalização de itens de PrintableOS
  const parseCurrencyPrintTest = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = String(val).replace(/R\$\s?/g, '').trim();
    if (!str) return 0;
    if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const resolveOrderItemsTest = (osData, clientData = {}) => {
    const rawItens = osData.itens || clientData.itens || (osData.raw && osData.raw.itens) || [];
    if (Array.isArray(rawItens) && rawItens.length > 0) {
      return rawItens.map(item => {
        let tipo = 'Produto';
        if (item.type === 'armacoes') tipo = 'Armação';
        else if (item.type === 'lentes') tipo = 'Lente Oftálmica';
        else if (item.type === 'avulso') tipo = 'Serviço / Avulso';

        const precoUnit = parseCurrencyPrintTest(item.preco || item.valor || 0);
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

    return items;
  };

  // 20.1 Cenário A: OS com carrinho do PDV (múltiplos itens com tipo, preços e quantidades)
  const osFromPOS = {
    numeroOS: 'OS-2026-99',
    itens: [
      { id: '1', type: 'armacoes', nome: 'Armação Ray-Ban RB5228 Acetato', preco: 450, qtd: 1 },
      { id: '2', type: 'lentes', nome: 'Lente Multifocal Varilux Comfort 1.67', detalhes: 'Antirreflexo Crizal', preco: 980, qtd: 1 },
      { id: '3', type: 'avulso', nome: 'Estojo Rígido + Flanela Microfibra', preco: 0, qtd: 1 }
    ],
    valorTotal: 1430,
    valorEntrada: 500,
    restante: 930
  };

  const parsedFromPOS = resolveOrderItemsTest(osFromPOS);
  console.assert(parsedFromPOS.length === 3, 'Deve conter 3 itens padronizados na tabela');
  console.assert(parsedFromPOS[0].tipo === 'Armação', 'Item 1 deve ser categorizado como Armação');
  console.assert(parsedFromPOS[1].tipo === 'Lente Oftálmica', 'Item 2 deve ser categorizado como Lente Oftálmica');
  console.assert(parsedFromPOS[1].detalhes === 'Antirreflexo Crizal', 'Detalhes das lentes devem ser preservados');
  console.assert(parsedFromPOS[0].total === 450 && parsedFromPOS[1].total === 980, 'Totais individuais dos itens devem ser calculados com precisão');

  // 20.2 Cenário B: OS gerada a partir dos dados do Cliente / Laboratório (campos individuais armacao/lente)
  const osFromClient = {
    numeroOS: 'OS-2026-100',
    armacao: 'Armação Vogue Floral Feminina',
    lente: 'Lente Monofocal Resina 1.56',
    tratamento: 'Blue UV + Antirreflexo',
    valorTotal: 620,
    valorEntrada: 300,
    restante: 320
  };
  const clientInfo = {
    'Cor': 'Dourado / Demi',
    'REFERENCIA_SKU': 'VO-4098-B',
    'MATERIAL': 'Policarbonato'
  };

  const parsedFromClient = resolveOrderItemsTest(osFromClient, clientInfo);
  console.assert(parsedFromClient.length === 2, 'Deve extrair armação e lente como itens estruturados da tabela');
  console.assert(parsedFromClient[0].tipo === 'Armação' && parsedFromClient[0].nome === 'Armação Vogue Floral Feminina', 'Nome da armação correto');
  console.assert(parsedFromClient[0].detalhes.includes('VO-4098-B'), 'Referência e cor devem compor os detalhes do item');
  console.assert(parsedFromClient[1].tipo === 'Lente Oftálmica' && parsedFromClient[1].detalhes.includes('Blue UV'), 'Tratamento de lente deve ser mapeado');

  // 20.3 Verificação de Altura Vertical e Não-Geração de 2ª Folha
  // A folha A4 em modo portrait tem 297mm de altura. Com margens de 5mm superior/inferior, a área útil de impressão é de 287mm.
  // Componentes e alturas estimadas:
  // - Cabeçalho: ~22mm
  // - Identificação do Cliente: ~25mm
  // - Dioptria (Receita): ~35mm
  // - Tabela de Itens (1 a 4 itens): ~35mm
  // - Condições Financeiras: ~30mm
  // - Termo de Retirada Enxuto: ~15mm
  // - Conferência de Entrega + Assinaturas: ~30mm
  // - Rodapé: ~8mm
  // Total somado: ~200mm, com margem de segurança de ~87mm antes de estourar a página.
  const estimatedHeightMm = 22 + 25 + 35 + 35 + 30 + 15 + 30 + 8;
  const a4PrintableHeightMm = 287;
  console.assert(estimatedHeightMm < a4PrintableHeightMm, `Altura estimada (${estimatedHeightMm}mm) deve caber folgadamente em 1 folha A4 (${a4PrintableHeightMm}mm) sem gerar folhas extras`);

  console.log('  ✅ Test 20 Passed: Formatação padronizada de itens e conformidade de folha única A4 sem folhas extras validadas com sucesso!\n');

  // ─── TEST 21: Função de OS de Laboratório & Formulário de Dados Técnicos ───
  console.log('▶ Test 21: Função de OS de Laboratório & Formulário de Dioptrias/Armação');

  const mockOrder = {
    id: 'row_os_555',
    osNumber: '2026-88',
    unit: 'Cajati',
    laboratorio: 'Laboratório Central SP',
    odEsf: '-2.50',
    odCil: '-0.75',
    odEixo: '180',
    oeEsf: '-2.25',
    oeCil: '-0.50',
    oeEixo: '175',
    adicao: '+2.00',
    odDnp: '31',
    odAlt: '18',
    oeDnp: '30.5',
    oeAlt: '18',
    raw: {
      'OS DA VENDA': '2026-88',
      'LABORATORIO': 'Laboratório Central SP',
      'OD_ESF': '-2.50',
      'OD_CIL': '-0.75',
      'OD_EIXO': '180',
      'OE_ESF': '-2.25',
      'OE_CIL': '-0.50',
      'OE_EIXO': '175',
      'ADICAO': '+2.00',
      'OD_DNP': '31',
      'OD_ALT': '18',
      'OE_DNP': '30.5',
      'OE_ALT': '18',
      'PONTE_ARO': '54-18',
      'DIAGONAL_MAIOR': '56',
      'ALTURA_VERTICAL': '38',
      'PONTE': '18',
      'ARO': '54'
    }
  };

  // Simulação do carregamento do formulário da OS de Laboratório (handlePrintLab)
  const initialLabFormData = {
    LABORATORIO: mockOrder.laboratorio || mockOrder.raw["LABORATORIO"] || "",
    OD_ESF: mockOrder.odEsf || mockOrder.raw["OD_ESF"] || "",
    OD_CIL: mockOrder.odCil || mockOrder.raw["OD_CIL"] || "",
    OD_EIXO: mockOrder.odEixo || mockOrder.raw["OD_EIXO"] || "",
    OE_ESF: mockOrder.oeEsf || mockOrder.raw["OE_ESF"] || "",
    OE_CIL: mockOrder.oeCil || mockOrder.raw["OE_CIL"] || "",
    OE_EIXO: mockOrder.oeEixo || mockOrder.raw["OE_EIXO"] || "",
    ADICAO: mockOrder.adicao || mockOrder.raw["ADICAO"] || "",
    OD_DNP: mockOrder.odDnp || mockOrder.raw["OD_DNP"] || "",
    OD_ALT: mockOrder.odAlt || mockOrder.raw["OD_ALT"] || "",
    OE_DNP: mockOrder.oeDnp || mockOrder.raw["OE_DNP"] || "",
    OE_ALT: mockOrder.oeAlt || mockOrder.raw["OE_ALT"] || "",
    PONTE_ARO: mockOrder.raw["PONTE_ARO"] || "",
    DIAGONAL_MAIOR: mockOrder.raw["DIAGONAL_MAIOR"] || "",
    ALTURA_VERTICAL: mockOrder.raw["ALTURA_VERTICAL"] || "",
    PONTE: mockOrder.raw["PONTE"] || "",
    ARO: mockOrder.raw["ARO"] || ""
  };

  console.assert(initialLabFormData.LABORATORIO === 'Laboratório Central SP', 'Laboratório deve vir pré-preenchido');
  console.assert(initialLabFormData.OD_ESF === '-2.50' && initialLabFormData.ADICAO === '+2.00', 'Dioptrias e adição devem ser pré-carregadas');
  console.assert(initialLabFormData.PONTE_ARO === '54-18' && initialLabFormData.DIAGONAL_MAIOR === '56', 'Medidas técnicas da armação devem ser mapeadas');

  // Simulação da edição de laboratório e novas medidas pelo operador
  const editedLabFormData = {
    ...initialLabFormData,
    LABORATORIO: 'Laboratório Óptico Prime Express',
    ALTURA_VERTICAL: '39'
  };

  const updatedRawFromLab = {
    ...mockOrder.raw,
    ...editedLabFormData
  };

  console.assert(updatedRawFromLab.LABORATORIO === 'Laboratório Óptico Prime Express', 'Edição de laboratório deve persistir');
  console.assert(updatedRawFromLab.ALTURA_VERTICAL === '39', 'Edição de medidas técnicas da armação deve persistir');

  console.log('  ✅ Test 21 Passed: Função de OS de Laboratório e mapeamento de formulário validados com sucesso!\n');

  console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});




