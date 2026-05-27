-- ==========================================================
-- SCRIPT: esquema_v2.sql
-- DESCRIÇÃO: Banco de dados normalizado (3FN) para Yasmin Ótica
-- BANCO: PostgreSQL
-- AUTOR: Antigravity (Expert Software Engineer)
-- ==========================================================

-- 1. Extensões Necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Função para Atualização Automática de timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Tabela: clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_completo VARCHAR(255) NOT NULL,
    documento VARCHAR(20) UNIQUE, -- CPF/CNPJ
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    instagram VARCHAR(100),
    rua VARCHAR(255),
    numero VARCHAR(20),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado CHAR(2),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_timestamp_clientes
BEFORE UPDATE ON clientes
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- 4. Tabela: categorias (Otimização para filtros)
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL UNIQUE, -- Ex: Armação, Lente, Acessórios
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela: produtos
CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco_base DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    estoque_atual INTEGER DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_timestamp_produtos
BEFORE UPDATE ON produtos
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- 6. Tabela: status_entrega (Tabela de Domínio)
CREATE TABLE status_entrega (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao VARCHAR(50) NOT NULL UNIQUE, -- Pendente, Em Transito, Entregue, Cancelado
    prioridade INTEGER DEFAULT 0
);

-- 7. Tabela: vendas
CREATE TABLE vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Campo solicitado: Normalizado via Generated Column para evitar divergência
    ano INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM data_venda)) STORED,
    valor_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_timestamp_vendas
BEFORE UPDATE ON vendas
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- 8. Tabela: venda_produtos (N:N)
-- Resolve N:N entre Vendas e Produtos
CREATE TABLE venda_produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    valor_unitario DECIMAL(12, 2) NOT NULL, -- Preço capturado no momento da venda (Snapshot)
    total_produto DECIMAL(12, 2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED
);

-- 9. Tabela: entregas
CREATE TABLE entregas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL UNIQUE REFERENCES vendas(id) ON DELETE CASCADE,
    status_entrega_id UUID NOT NULL REFERENCES status_entrega(id),
    data_entrega_realizada TIMESTAMP WITH TIME ZONE,
    assinatura_url TEXT, -- Link para arquivo/imagem da assinatura
    nome_recebedor VARCHAR(255),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_timestamp_entregas
BEFORE UPDATE ON entregas
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- 10. Índices para Performance e Escalabilidade
CREATE INDEX idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX idx_vendas_data_venda ON vendas(data_venda);
CREATE INDEX idx_venda_produtos_venda_id ON venda_produtos(venda_id);
CREATE INDEX idx_produtos_nome ON produtos(nome);
CREATE INDEX idx_clientes_nome ON clientes(nome);
CREATE INDEX idx_entregas_status ON entregas(status_entrega_id);
