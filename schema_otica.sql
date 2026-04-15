-- ==========================================================
-- Banco de Dados: Yasmin Ótica
-- Descrição: Modelo relacional normalizado (3FN) gerado a partir da planilha real
-- Dialeto: PostgreSQL 15+
-- Autor: Antigravity AI
-- Gerado com base na planilha: YASMIN ÓTICA.Sheets.xlsx
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- 1. TABELAS DE DOMÍNIO (lookup tables)
-- ==========================================================

-- Lojas da rede
CREATE TABLE IF NOT EXISTS lojas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    cidade VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Médicos / Oftalmologistas / Optometristas
CREATE TABLE IF NOT EXISTS profissionais_saude (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    especialidade VARCHAR(100) DEFAULT 'Oftalmologista',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status de entrega
CREATE TABLE IF NOT EXISTS status_entrega (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO status_entrega (descricao) VALUES
('Pendente'), ('Em Processamento'), ('Aguardando Retirada'),
('Enviado'), ('Entregue'), ('Cancelado')
ON CONFLICT (descricao) DO NOTHING;

-- Status de parcelamento
CREATE TABLE IF NOT EXISTS status_parcela (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO status_parcela (descricao) VALUES
('Pendente'), ('Pago'), ('Em Acordo'), ('Inadimplente'), ('Cancelado')
ON CONFLICT (descricao) DO NOTHING;

-- ==========================================================
-- 2. CLIENTES
-- ==========================================================

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(30),
    data_nascimento DATE,
    facebook VARCHAR(255),
    instagram VARCHAR(255),
    profissao VARCHAR(150),
    cidade VARCHAR(100),
    qtd_compras_historico INTEGER DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 3. PRODUTOS
-- ==========================================================

CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100), -- Armação, Lente de Grau, Óculos de Sol, Lente de Contato
    sku VARCHAR(100) UNIQUE,
    preco_base DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estoque de lentes por dioptria
CREATE TABLE IF NOT EXISTS estoque_dioptria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_cadastramento DATE,
    quantidade_par VARCHAR(50), -- "MEIO PAR", "PAR INTEIRO"
    dioptria VARCHAR(20),
    tipo_lente VARCHAR(50), -- AR (anti-reflexo), etc.
    os_compra INTEGER, -- Número da Ordem de Serviço de compra
    loja_id UUID REFERENCES lojas(id),
    data_venda DATE,
    data_baixa DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 4. ORÇAMENTOS
-- ==========================================================

CREATE TABLE IF NOT EXISTS orcamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_orcamento INTEGER,
    loja_id UUID REFERENCES lojas(id),
    data_orcamento DATE,
    reservado_ate DATE,
    cliente_nome VARCHAR(255),
    telefone VARCHAR(30),
    valor_orcamento DECIMAL(10,2),
    armacao VARCHAR(255),
    lente VARCHAR(255),
    profissao VARCHAR(150),
    facebook VARCHAR(255),
    instagram VARCHAR(255),
    data_ligacao DATE,
    motivo_cancelamento TEXT,
    resultado TEXT,
    os_venda INTEGER,
    data_venda DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 5. VENDAS (OS - Ordem de Serviço)
-- ==========================================================

CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_os INTEGER UNIQUE,   -- campo OS da planilha
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    loja_id UUID REFERENCES lojas(id),
    profissional_id UUID REFERENCES profissionais_saude(id),
    status_entrega_id UUID REFERENCES status_entrega(id),
    data_venda DATE NOT NULL,
    mes VARCHAR(10),
    ano INTEGER NOT NULL,
    valor_total DECIMAL(10,2) DEFAULT 0.00,
    data_chegada_laboratorio DATE,
    data_entrega DATE,
    meio_pagamento VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 6. ITENS DA VENDA (N:N entre vendas e produtos)
-- ==========================================================

CREATE TABLE IF NOT EXISTS venda_produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id) ON DELETE RESTRICT,
    produto_descricao TEXT, -- campo livre caso o produto ainda não esteja cadastrado
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    valor_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED
);

-- ==========================================================
-- 7. PARCELAMENTOS (Controle_Parcelas)
-- ==========================================================

CREATE TABLE IF NOT EXISTS parcelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID REFERENCES vendas(id) ON DELETE CASCADE,
    numero_os INTEGER,
    loja_id UUID REFERENCES lojas(id),
    cliente_nome VARCHAR(255),
    data_vencimento DATE,
    mes VARCHAR(10),
    ano INTEGER,
    valor_compra_desconto DECIMAL(10,2),
    valor_parcela DECIMAL(10,2) NOT NULL,
    numero_parcela VARCHAR(30), -- "1 DE 5", "2 DE 5" etc.
    telefone_contato VARCHAR(30),
    status_id UUID REFERENCES status_parcela(id),
    data_acordo DATE,
    observacoes TEXT,
    movimentacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 8. FOLLOW-UP DE MARKETING (BD MARKETING)
-- ==========================================================

CREATE TABLE IF NOT EXISTS followup_marketing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID REFERENCES vendas(id) ON DELETE CASCADE,
    numero_os INTEGER,

    -- Follow-up 30 dias
    data_contato_30d DATE,
    canal_contato_30d VARCHAR(100),
    resultado_30d TEXT,
    satisfacao VARCHAR(50),
    conferencia_30d BOOLEAN DEFAULT FALSE,

    -- Follow-up 6 meses
    data_contato_6m DATE,
    canal_contato_6m VARCHAR(100),
    resultado_6m TEXT,
    retornou_6m BOOLEAN DEFAULT FALSE,
    conferencia_6m BOOLEAN DEFAULT FALSE,

    -- Follow-up 1 ano
    agendamento_exame_1a DATE,
    canal_contato_1a VARCHAR(100),
    resultado_1a TEXT,
    retornou_1a BOOLEAN DEFAULT FALSE,
    conferencia_1a BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 9. ANÁLISE DE INFLUENCIADORES
-- ==========================================================

CREATE TABLE IF NOT EXISTS influenciadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    instagram VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campanhas_influencer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_os INTEGER,
    venda_id UUID REFERENCES vendas(id),
    influenciador_id UUID REFERENCES influenciadores(id),
    data DATE,
    mes VARCHAR(10),
    ano INTEGER,
    produto_descricao TEXT,
    custo_produto DECIMAL(10,2),
    valor_venda DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_vendas_os ON vendas(numero_os);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_ano ON vendas(ano);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (UPPER(nome));
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes (telefone);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_os ON parcelas(numero_os);
CREATE INDEX IF NOT EXISTS idx_followup_os ON followup_marketing(numero_os);
CREATE INDEX IF NOT EXISTS idx_orcamentos_data ON orcamentos(data_orcamento);

-- ==========================================================
-- TRIGGERS PARA UPDATED_AT
-- ==========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_vendas_updated BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_parcelas_updated BEFORE UPDATE ON parcelas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_followup_updated BEFORE UPDATE ON followup_marketing FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================================
-- EXTRAS E AUTOMAÇÕES SUGERIDAS (n8n / API)
-- ==========================================================
/*
1. WORKFLOW "ANIVERSARIANTE DO MÊS":
   Query: SELECT nome, telefone, data_nascimento FROM clientes WHERE EXTRACT(MONTH FROM data_nascimento) = EXTRACT(MONTH FROM NOW())
   → n8n dispara mensagem de WhatsApp personalizada.

2. WORKFLOW "FOLLOW-UP 30 DIAS":
   Query: SELECT v.numero_os, c.nome, c.telefone FROM vendas v JOIN clientes c ON v.cliente_id = c.id
          WHERE v.data_entrega = NOW() - INTERVAL '30 days' AND f.conferencia_30d = FALSE
   → n8n agenda ligação automática.

3. WORKFLOW "PARCELAS VENCENDO":
   Query: SELECT * FROM parcelas WHERE data_vencimento BETWEEN NOW() AND NOW() + INTERVAL '3 days' AND status_id != 'Pago'
   → n8n envia lembrete de cobrança.

4. CAMPOS EXTRAS ÚTEIS:
   - Adicionar campo `cpf` na tabela clientes (para NF-e)
   - Adicionar campo `receita_medica` JSONB em vendas (graus OD/OE/ADD/DP)
   - Adicionar campo `foto_assinatura_entrega` TEXT em vendas (URL S3/Cloudinary)
*/
