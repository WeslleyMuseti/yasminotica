-- ==========================================================
-- Banco de Dados: Yasmin Ótica (Módulo ERP Ótica)
-- Descrição: Modelo relacional normalizado (3FN) para controle do ERP (Lentes, Armações, Financeiro)
-- Dialeto: PostgreSQL 15+
-- Autor: Antigravity AI
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- 1. CADASTRO DE LENTES (Estoque e Catálogo)
-- ==========================================================
CREATE TABLE IF NOT EXISTS cadastro_lentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marca VARCHAR(100) NOT NULL,              -- Ex: Essilor, Hoya, Zeiss, Kodak, Genérica
    modelo VARCHAR(150) NOT NULL,             -- Ex: Varilux Comfort, Eyezen, Visão Simples
    material VARCHAR(100),                    -- Ex: Resina, Policarbonato, Trivex, Cristal
    indice_refracao DECIMAL(3,2),             -- Ex: 1.50, 1.56, 1.67, 1.74
    tratamento VARCHAR(255),                  -- Ex: Anti-reflexo, Filtro Azul, Fotossensível
    esferico_min DECIMAL(4,2),                 -- Ex: -6.00
    esferico_max DECIMAL(4,2),                 -- Ex: +6.00
    cilindrico_min DECIMAL(4,2),               -- Ex: -4.00
    cilindrico_max DECIMAL(4,2),               -- Ex: 0.00
    preco_compra DECIMAL(10,2) DEFAULT 0.00,
    preco_venda DECIMAL(10,2) DEFAULT 0.00,
    estoque INTEGER DEFAULT 0 CHECK (estoque >= 0),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 2. CADASTRO DE ARMAÇÕES (Estoque e Catálogo)
-- ==========================================================
CREATE TABLE IF NOT EXISTS cadastro_armacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marca VARCHAR(100) NOT NULL,              -- Ex: Ray-Ban, Oakley, Vogue, Própria
    modelo VARCHAR(150) NOT NULL,             -- Ex: RB3025 Aviator, RX5228
    referencia_sku VARCHAR(100) UNIQUE,       -- Código de barras ou SKU interno
    cor VARCHAR(50),                          -- Ex: Dourado, Preto Fosco, Tartaruga
    material VARCHAR(100),                    -- Ex: Acetato, Metal, Titânio, TR-90
    tamanho VARCHAR(50),                      -- Ex: 55-18-140 (aro-ponte-haste)
    preco_compra DECIMAL(10,2) DEFAULT 0.00,
    preco_venda DECIMAL(10,2) DEFAULT 0.00,
    estoque INTEGER DEFAULT 0 CHECK (estoque >= 0),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 3. CONTAS A PAGAR (Saídas Financeiras)
-- ==========================================================
CREATE TABLE IF NOT EXISTS contas_pagar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao VARCHAR(255) NOT NULL,          -- Ex: Compra de Lentes Lote #45, Aluguel Loja
    categoria VARCHAR(100) NOT NULL,          -- Ex: Fornecedores, Aluguel, Salários, Impostos, Água/Luz
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(50) DEFAULT 'Pendente',    -- Pendente, Pago, Atrasado, Cancelado
    fornecedor VARCHAR(255),                  -- Nome da empresa/pessoa credora
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 4. CONTAS A RECEBER (Entradas Financeiras)
-- ==========================================================
CREATE TABLE IF NOT EXISTS contas_receber (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao VARCHAR(255) NOT NULL,          -- Ex: Venda OS #1042 - Parcela 2/3
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    status VARCHAR(50) DEFAULT 'Pendente',    -- Pendente, Recebido, Atrasado, Cancelado
    meio_pagamento VARCHAR(100),              -- Ex: Cartão de Crédito, Pix, Boleto, Dinheiro, Carnê
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_lentes_marca ON cadastro_lentes(marca);
CREATE INDEX IF NOT EXISTS idx_armacoes_sku ON cadastro_armacoes(referencia_sku);
CREATE INDEX IF NOT EXISTS idx_armacoes_marca ON cadastro_armacoes(marca);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente ON contas_receber(cliente_id);

-- ==========================================================
-- TRIGGERS DE ATUALIZAÇÃO AUTOMÁTICA (atualizado_em)
-- ==========================================================
CREATE OR REPLACE FUNCTION update_erp_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN 
    NEW.atualizado_em = NOW(); 
    RETURN NEW; 
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_lentes_updated BEFORE UPDATE ON cadastro_lentes FOR EACH ROW EXECUTE PROCEDURE update_erp_updated_at_column();
CREATE TRIGGER trg_armacoes_updated BEFORE UPDATE ON cadastro_armacoes FOR EACH ROW EXECUTE PROCEDURE update_erp_updated_at_column();
CREATE TRIGGER trg_contas_pagar_updated BEFORE UPDATE ON contas_pagar FOR EACH ROW EXECUTE PROCEDURE update_erp_updated_at_column();
CREATE TRIGGER trg_contas_receber_updated BEFORE UPDATE ON contas_receber FOR EACH ROW EXECUTE PROCEDURE update_erp_updated_at_column();
