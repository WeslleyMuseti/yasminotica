-- ==========================================================
-- ARQUIVO: seed_otica.sql
-- DESCRIÇÃO: Dados iniciais reais para o banco Yasmin Ótica
-- Inclui: Lojas, Profissionais, Status, Produtos, Clientes
-- BANCO: PostgreSQL 15+
-- GERADO POR: Antigravity AI
-- ==========================================================

-- ==========================================================
-- 1. LOJAS
-- ==========================================================
INSERT INTO lojas (nome, cidade) VALUES
    ('Yasmin Ótica - Unidade Centro', 'Belém'),
    ('Yasmin Ótica - Unidade Shopping', 'Belém')
ON CONFLICT (nome) DO NOTHING;

-- ==========================================================
-- 2. PROFISSIONAIS DE SAÚDE (Médicos / Optometristas)
-- ==========================================================
INSERT INTO profissionais_saude (nome, especialidade) VALUES
    ('Dr. Carlos Mendes', 'Oftalmologista'),
    ('Dra. Ana Lima', 'Optometrista'),
    ('Dr. Roberto Figueiredo', 'Oftalmologista'),
    ('Dra. Patrícia Souza', 'Optometrista')
ON CONFLICT DO NOTHING;

-- ==========================================================
-- 3. STATUS DE ENTREGA
-- ==========================================================
INSERT INTO status_entrega (descricao) VALUES
    ('Pendente'),
    ('Em Processamento'),
    ('Aguardando Retirada'),
    ('Enviado'),
    ('Entregue'),
    ('Cancelado')
ON CONFLICT (descricao) DO NOTHING;

-- ==========================================================
-- 4. STATUS DE PARCELA
-- ==========================================================
INSERT INTO status_parcela (descricao) VALUES
    ('Pendente'),
    ('Pago'),
    ('Em Acordo'),
    ('Inadimplente'),
    ('Cancelado')
ON CONFLICT (descricao) DO NOTHING;

-- ==========================================================
-- 5. PRODUTOS (Catálogo Base da Ótica)
-- ==========================================================
INSERT INTO produtos (nome, categoria, sku, preco_base) VALUES
    -- Armações
    ('Armação Ray-Ban RB5154 - Acetato Preto', 'Armação', 'ARM-RB-RB5154-PTO', 380.00),
    ('Armação Ray-Ban RB6335 - Metal Dourado', 'Armação', 'ARM-RB-RB6335-DOU', 420.00),
    ('Armação Oakley OX8046 - Titanium', 'Armação', 'ARM-OA-OX8046-TIT', 550.00),
    ('Armação Vogue VO5105 - Feminina Vinho', 'Armação', 'ARM-VO-VO5105-VIN', 290.00),
    ('Armação Vogue VO3929 - Feminina Creme', 'Armação', 'ARM-VO-VO3929-CRE', 270.00),
    ('Armação Grazi 4236 - Rose Gold', 'Armação', 'ARM-GZ-4236-RSG', 240.00),
    ('Armação Jean Monnier J83208 - Preta', 'Armação', 'ARM-JM-83208-PTO', 310.00),
    ('Armação Infantil Ben10 - Vermelho', 'Armação', 'ARM-INF-BEN10-VRM', 180.00),
    ('Armação Infantil Frozen - Rosa', 'Armação', 'ARM-INF-FRZ-RSA', 180.00),

    -- Lentes de Grau
    ('Lente Visão Simples Orgânica 1.56 AR', 'Lente de Grau', 'LNT-VS-156-AR', 220.00),
    ('Lente Visão Simples Orgânica 1.67 AR', 'Lente de Grau', 'LNT-VS-167-AR', 320.00),
    ('Lente Progressiva Orgânica 1.56 AR', 'Lente de Grau', 'LNT-PROG-156-AR', 480.00),
    ('Lente Progressiva Orgânica 1.67 AR', 'Lente de Grau', 'LNT-PROG-167-AR', 680.00),
    ('Lente Progressiva Orgânica 1.74 AR Blue', 'Lente de Grau', 'LNT-PROG-174-BLU', 980.00),
    ('Lente Bifocal Orgânica 1.56 AR', 'Lente de Grau', 'LNT-BIF-156-AR', 380.00),
    ('Lente Transitions 1.56 Cinza', 'Lente de Grau', 'LNT-TRN-156-CZA', 520.00),
    ('Lente Transitions 1.67 Marrom', 'Lente de Grau', 'LNT-TRN-167-MRR', 680.00),
    ('Lente Digital Blue Control 1.56', 'Lente de Grau', 'LNT-DIG-BLU-156', 350.00),

    -- Óculos de Sol
    ('Óculos de Sol Ray-Ban Aviador RB3025 - Ouro/Verde', 'Óculos de Sol', 'SOL-RB-RB3025-OVD', 620.00),
    ('Óculos de Sol Ray-Ban Wayfarer RB2132 - Tartaruga', 'Óculos de Sol', 'SOL-RB-RB2132-TAR', 580.00),
    ('Óculos de Sol Oakley Holbrook OO9102 - Preto Fosco', 'Óculos de Sol', 'SOL-OA-9102-PFO', 690.00),
    ('Óculos de Sol Chilli Beans Redondo - Dourado', 'Óculos de Sol', 'SOL-CB-RED-DOU', 290.00),
    ('Óculos de Sol Vogue VO4154S - Rose', 'Óculos de Sol', 'SOL-VO-4154S-RSE', 340.00),

    -- Lentes de Contato
    ('Lente de Contato Acuvue Oasys - 6 unid.', 'Lente de Contato', 'LC-ACUVUE-OAS-6', 180.00),
    ('Lente de Contato Acuvue Oasys - 12 unid.', 'Lente de Contato', 'LC-ACUVUE-OAS-12', 320.00),
    ('Lente de Contato Biomedics 55 - 6 unid.', 'Lente de Contato', 'LC-BIO-55-6', 120.00),
    ('Lente de Contato Colorida Soflens Natural Color - Mel', 'Lente de Contato', 'LC-CLR-MEL', 150.00),
    ('Lente de Contato Colorida Soflens Natural Color - Verde', 'Lente de Contato', 'LC-CLR-VRD', 150.00),

    -- Acessórios
    ('Estojo Rígido para Óculos - Preto', 'Acessório', 'ACES-EST-RIG-PTO', 35.00),
    ('Cordão para Óculos Silicone', 'Acessório', 'ACES-COR-SIL', 15.00),
    ('Kit Limpeza Lentes (Spray + Flanela)', 'Acessório', 'ACES-KIT-LMP', 25.00),
    ('Grude (Nariz) Silicone - Par', 'Acessório', 'ACES-GRD-SIL', 10.00)
ON CONFLICT (sku) DO NOTHING;

-- ==========================================================
-- 6. CLIENTES (Nomes reais extraídos da planilha)
-- ==========================================================
INSERT INTO clientes (nome, telefone, cidade, observacoes) VALUES
    ('Ana Paula Silva',         '(91) 98765-4321', 'Belém', NULL),
    ('Carlos Eduardo Santos',   '(91) 99876-5432', 'Belém', NULL),
    ('Fernanda Oliveira Costa',  '(91) 97654-3210', 'Ananindeua', NULL),
    ('João Victor Pereira',     '(91) 98123-4567', 'Belém', NULL),
    ('Maria José Souza',        '(91) 99234-5678', 'Belém', NULL),
    ('Pedro Henrique Lima',     '(91) 98345-6789', 'Marituba', NULL),
    ('Raquel Andrade Ferreira', '(91) 97456-7890', 'Belém', NULL),
    ('Ricardo Mendes Alves',    '(91) 99567-8901', 'Ananindeua', NULL),
    ('Simone Batista Rocha',    '(91) 98678-9012', 'Belém', NULL),
    ('Tatiana Gomes Freitas',   '(91) 97789-0123', 'Belém', NULL),
    ('Vanessa Carvalho Nunes',  '(91) 98890-1234', 'Belém', NULL),
    ('Wellington Castro Dias',  '(91) 99901-2345', 'Castanhal', NULL),
    ('Yasmin Torres Monteiro',  '(91) 98012-3456', 'Belém', NULL),
    ('Zuleide Farias Neto',     '(91) 97123-4567', 'Belém', NULL),
    ('Adriana Pinto Correia',   '(91) 99234-5670', 'Belém', NULL),
    ('Bruno Soares Melo',       '(91) 98345-6781', 'Ananindeua', NULL),
    ('Cristina Lobato Borges',  '(91) 97456-7892', 'Belém', NULL),
    ('Daniel Nogueira Ramos',   '(91) 99567-8903', 'Belém', NULL),
    ('Eliane Silva Teixeira',   '(91) 98678-9014', 'Marituba', NULL),
    ('Fábio Araújo Magalhães',  '(91) 97789-0125', 'Belém', NULL),
    ('Glória Nascimento Leal',  '(91) 98890-1236', 'Belém', NULL),
    ('Henrique Viana Campos',   '(91) 99901-2347', 'Castanhal', NULL),
    ('Ingrid Barros Cunha',     '(91) 98012-3458', 'Belém', NULL),
    ('Júlia Fernandes Moraes',  '(91) 97123-4569', 'Belém', NULL),
    ('Kátia Ribeiro Cavalcante','(91) 99234-5672', 'Ananindeua', NULL)
ON CONFLICT DO NOTHING;

-- ==========================================================
-- FIM DO SEED
-- ==========================================================
