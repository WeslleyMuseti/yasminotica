export const parseCurrency = (val) => {
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

export const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const getStockHealthStatus = (val) => {
  const num = parseInt(val, 10);
  if (isNaN(num) || num <= 0) return 'esgotado';
  if (num <= 2) return 'critico';
  return 'normal';
};

/**
 * Sanitiza valores de texto para prevenir Formula / CSV Injection (CWE-1236)
 * Se o valor começar com '=', '+', '-', '@', '\t', '\r', prefixa com apóstrofo
 */
export const sanitizeFormula = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  const str = String(val);
  const trimmed = str.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return "'" + str;
  }
  return str;
};

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Filtra e ordena produtos de estoque (armações ou lentes) conforme presets e filtros inteligentes.
 * Suporta cruzamento automático com histórico de vendas (Registro_Vendas / BD MARKETING).
 * Define propriedades internas como NÃO-ENUMERÁVEIS para não poluir tabelas, formulários ou banco de dados.
 */
export function filterAndSortStock(items = [], salesData = [], filterConfig = {}) {
  if (!items || !Array.isArray(items) || items.length === 0) return [];
  const {
    preset = 'todos',
    store = '',
    brand = '',
    material = '',
    searchQuery = ''
  } = filterConfig || {};

  // 1. Processar dados de vendas pré-indexando em HashMaps O(1) para alta performance instantânea
  const salesBySku = new Map();
  const salesByModelo = new Map();
  const salesByMarcaModelo = new Map();
  const salesByToken = new Map();

  if (Array.isArray(salesData) && salesData.length > 0) {
    for (let i = 0; i < salesData.length; i++) {
      const sale = salesData[i];
      if (!sale) continue;

      const qtd = parseInt(sale.QUANTIDADE || sale.quantidade || sale.QTD || sale.qtd || 1, 10) || 1;
      const valor = parseCurrency(sale.VALOR || sale['VALOR TOTAL'] || sale['VALOR DA VENDA'] || 0);

      const directSku = String(
        sale.SKU || sale.sku || sale.REFERENCIA_SKU || sale.referencia_sku || sale.REFERENCIA || sale.referencia || ''
      ).trim().toLowerCase();

      const directModelo = String(sale.MODELO || sale.modelo || '').trim().toLowerCase();
      const directMarca = String(sale.MARCA || sale.marca || '').trim().toLowerCase();

      if (directSku && directSku.length >= 2) {
        const cur = salesBySku.get(directSku) || { count: 0, revenue: 0 };
        cur.count += qtd;
        cur.revenue += valor;
        salesBySku.set(directSku, cur);
      }

      if (directModelo && directModelo.length >= 2) {
        const cur = salesByModelo.get(directModelo) || { count: 0, revenue: 0 };
        cur.count += qtd;
        cur.revenue += valor;
        salesByModelo.set(directModelo, cur);
      }

      if (directMarca && directModelo) {
        const comboKey = `${directMarca}|||${directModelo}`;
        const cur = salesByMarcaModelo.get(comboKey) || { count: 0, revenue: 0 };
        cur.count += qtd;
        cur.revenue += valor;
        salesByMarcaModelo.set(comboKey, cur);
      }

      // Indexar tokens da descrição da venda (ex: 'rb3025', 'aviador', etc)
      const text = [
        sale.PRODUTO, sale.Produto, sale.produto,
        sale.ARMAÇÃO, sale.armacao, sale['ARMAÇÃO'],
        sale.LENTE, sale.lente,
        sale.DESCRICAO, sale.descricao
      ].filter(Boolean).join(' ').toLowerCase();

      if (text) {
        const words = text.match(/[a-z0-9_]+/g) || [];
        const wordSet = new Set(words);
        for (const w of wordSet) {
          if (w.length >= 2) {
            const cur = salesByToken.get(w) || { count: 0, revenue: 0 };
            cur.count += qtd;
            cur.revenue += valor;
            salesByToken.set(w, cur);
          }
        }
      }
    }
  }

  // 2. Enriquecer itens com métricas financeiras e vendas cruzadas em O(N) com buscas O(1)
  let list = items.map(item => {
    const sku = String(item.REFERENCIA_SKU || item.referencia_sku || item.SKU || item.sku || '').trim().toLowerCase();
    const modelo = String(item.MODELO || item.modelo || '').trim().toLowerCase();
    const marca = String(item.MARCA || item.marca || '').trim().toLowerCase();

    let salesCount = 0;
    let salesRevenue = 0;

    // Busca O(1) imediata por SKU exato ou token de SKU no texto da venda
    if (sku && salesBySku.has(sku)) {
      const match = salesBySku.get(sku);
      salesCount += match.count;
      salesRevenue += match.revenue;
    } else if (sku && salesByToken.has(sku)) {
      const match = salesByToken.get(sku);
      salesCount += match.count;
      salesRevenue += match.revenue;
    }
    // Busca O(1) por Marca + Modelo
    else if (marca && modelo && salesByMarcaModelo.has(`${marca}|||${modelo}`)) {
      const match = salesByMarcaModelo.get(`${marca}|||${modelo}`);
      salesCount += match.count;
      salesRevenue += match.revenue;
    }
    // Busca O(1) por Modelo
    else if (modelo && salesByModelo.has(modelo)) {
      const match = salesByModelo.get(modelo);
      salesCount += match.count;
      salesRevenue += match.revenue;
    } else if (modelo && salesByToken.has(modelo)) {
      const match = salesByToken.get(modelo);
      salesCount += match.count;
      salesRevenue += match.revenue;
    }

    const qtdEstoque = parseInt(item.ESTOQUE || item.estoque || 0, 10) || 0;
    const precoVenda = parseCurrency(item.PRECO_VENDA || item.preco_venda || item.VALOR_VENDA || item.valor_venda || item['Preço de Venda'] || item.VALOR || 0);
    const precoCusto = parseCurrency(item.PRECO_COMPRA || item.preco_compra || item.PRECO_CUSTO || item.preco_custo || item.CUSTO || item.custo || item['Preço de Custo'] || item['VALOR_COMPRA'] || 0);
    const lucroUnitario = precoVenda - precoCusto;
    const margemPercent = precoCusto > 0 ? ((precoVenda - precoCusto) / precoCusto) * 100 : (precoVenda > 0 ? 100 : 0);
    const valorImobilizado = qtdEstoque * precoCusto;
    const statusEstoque = getStockHealthStatus(qtdEstoque);

    const nonEnumerableProps = {
      _salesCount: { value: salesCount, writable: true, configurable: true, enumerable: false },
      _salesRevenue: { value: salesRevenue, writable: true, configurable: true, enumerable: false },
      _qtdEstoque: { value: qtdEstoque, writable: true, configurable: true, enumerable: false },
      _precoVenda: { value: precoVenda, writable: true, configurable: true, enumerable: false },
      _precoCusto: { value: precoCusto, writable: true, configurable: true, enumerable: false },
      _lucroUnitario: { value: lucroUnitario, writable: true, configurable: true, enumerable: false },
      _margemPercent: { value: margemPercent, writable: true, configurable: true, enumerable: false },
      _valorImobilizado: { value: valorImobilizado, writable: true, configurable: true, enumerable: false },
      _statusEstoque: { value: statusEstoque, writable: true, configurable: true, enumerable: false }
    };

    try {
      Object.defineProperties(item, nonEnumerableProps);
      return item;
    } catch {
      const copy = { ...item };
      Object.defineProperties(copy, nonEnumerableProps);
      return copy;
    }
  });

  // 3. Filtro por Loja / Unidade
  if (store && store !== 'todas') {
    const sLower = store.toLowerCase().trim();
    list = list.filter(item => {
      const u = String(item.UNIDADE || item.CIDADE || item.LOJA || item.unidade || 'Central').toLowerCase().trim();
      return u === sLower || (sLower === 'central' && !u);
    });
  }

  // 4. Filtro por Marca
  if (brand && brand !== 'todas') {
    const bLower = brand.toLowerCase().trim();
    list = list.filter(item => {
      const m = String(item.MARCA || item.marca || '').toLowerCase().trim();
      return m === bLower;
    });
  }

  // 5. Filtro por Material
  if (material && material !== 'todas') {
    const mLower = material.toLowerCase().trim();
    list = list.filter(item => {
      const mat = String(item.MATERIAL || item.material || '').toLowerCase().trim();
      return mat === mLower;
    });
  }

  // 6. Filtro por Busca de Texto Livre
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(item => {
      const fields = [
        item.MARCA, item.marca,
        item.MODELO, item.modelo,
        item.REFERENCIA_SKU, item.referencia_sku, item.SKU,
        item.MATERIAL, item.material,
        item.COR, item.cor,
        item.TRATAMENTO, item.tratamento
      ].filter(Boolean).map(v => String(v).toLowerCase());
      return fields.some(f => f.includes(q));
    });
  }

  // 7. Presets Inteligentes
  switch (preset) {
    case 'mais_vendidos':
      // Ordena decrescente por quantidade vendida, depois por faturamento de venda
      list.sort((a, b) => (b._salesCount - a._salesCount) || (b._salesRevenue - a._salesRevenue));
      break;

    case 'mais_lucrativos':
      // Ordena decrescente pelo maior lucro unitário (Venda - Custo), depois margem %
      list.sort((a, b) => (b._lucroUnitario - a._lucroUnitario) || (b._margemPercent - a._margemPercent));
      break;

    case 'critico':
      // Filtra somente itens em situação de ponto de pedido crítico (<= 2 unidades)
      list = list.filter(item => item._qtdEstoque <= 2);
      // Esgotados (0 e negativos) primeiro, depois 1 e 2 unidades
      list.sort((a, b) => (a._qtdEstoque - b._qtdEstoque) || (b._salesCount - a._salesCount));
      break;

    case 'imobilizado':
      // Ordena decrescente pelo maior capital parado em estoque (Estoque * Preço de Custo)
      list.sort((a, b) => b._valorImobilizado - a._valorImobilizado);
      break;

    case 'loja':
      // Agrupa/ordena ordenadamente por Unidade/Loja, depois Marca e Modelo
      list.sort((a, b) => {
        const uA = String(a.UNIDADE || a.CIDADE || a.LOJA || a.unidade || 'Central').trim().toLowerCase();
        const uB = String(b.UNIDADE || b.CIDADE || b.LOJA || b.unidade || 'Central').trim().toLowerCase();
        const compU = uA.localeCompare(uB, 'pt-BR');
        if (compU !== 0) return compU;
        const mA = String(a.MARCA || a.marca || '').trim().toLowerCase();
        const mB = String(b.MARCA || b.marca || '').trim().toLowerCase();
        const compM = mA.localeCompare(mB, 'pt-BR');
        if (compM !== 0) return compM;
        const modA = String(a.MODELO || a.modelo || '').trim().toLowerCase();
        const modB = String(b.MODELO || b.modelo || '').trim().toLowerCase();
        return modA.localeCompare(modB, 'pt-BR');
      });
      break;

    case 'marca_material':
      // Agrupa/ordena alfabeticamente por Marca, depois Material, depois Modelo
      list.sort((a, b) => {
        const mA = String(a.MARCA || a.marca || '').trim().toLowerCase();
        const mB = String(b.MARCA || b.marca || '').trim().toLowerCase();
        const compM = mA.localeCompare(mB, 'pt-BR');
        if (compM !== 0) return compM;
        const matA = String(a.MATERIAL || a.material || '').trim().toLowerCase();
        const matB = String(b.MATERIAL || b.material || '').trim().toLowerCase();
        const compMat = matA.localeCompare(matB, 'pt-BR');
        if (compMat !== 0) return compMat;
        const modA = String(a.MODELO || a.modelo || '').trim().toLowerCase();
        const modB = String(b.MODELO || b.modelo || '').trim().toLowerCase();
        return modA.localeCompare(modB, 'pt-BR');
      });
      break;

    case 'todos':
    default:
      // Mantém a lista completa
      break;
  }

  return list;
}

export function extractStockFacets(items = []) {
  const stores = new Set();
  const brands = new Set();
  const materials = new Set();

  (items || []).forEach(item => {
    const s = (item.UNIDADE || item.CIDADE || item.LOJA || item.unidade || 'Central').trim();
    if (s) stores.add(s);

    const b = (item.MARCA || item.marca || item.CATEGORIA || item.categoria || '').trim();
    if (b) brands.add(b);

    const m = (item.MATERIAL || item.material || '').trim();
    if (m) materials.add(m);
  });

  return {
    stores: Array.from(stores).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    brands: Array.from(brands).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    materials: Array.from(materials).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  };
}
