-- Sistema de Visualização de Senhas
-- Criação das tabelas e dados iniciais

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de grupos de senhas
CREATE TABLE password_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#FFD700', -- Cor amarela padrão
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de senhas
CREATE TABLE passwords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    password_value TEXT NOT NULL,
    url VARCHAR(500),
    notes TEXT,
    group_id UUID REFERENCES password_groups(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de permissões de usuários por grupo
CREATE TABLE user_group_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES password_groups(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, group_id)
);

-- Tabela de logs de alterações
CREATE TABLE password_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    password_id UUID REFERENCES passwords(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view')),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_passwords_group_id ON passwords(group_id);
CREATE INDEX idx_passwords_created_by ON passwords(created_by);
CREATE INDEX idx_user_group_permissions_user_id ON user_group_permissions(user_id);
CREATE INDEX idx_user_group_permissions_group_id ON user_group_permissions(group_id);
CREATE INDEX idx_password_logs_password_id ON password_logs(password_id);
CREATE INDEX idx_password_logs_created_at ON password_logs(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_password_groups_updated_at BEFORE UPDATE ON password_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_passwords_updated_at BEFORE UPDATE ON passwords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir grupos iniciais
INSERT INTO password_groups (name, description, color) VALUES
('Prefeituras', 'Senhas relacionadas a sistemas de prefeituras', '#FFD700'),
('B2F/Convênios', 'Senhas de sistemas B2F e convênios', '#FFA500'),
('Órgãos de Governo', 'Senhas de sistemas governamentais', '#FF6347'),
('Fornecedores', 'Senhas de sistemas de fornecedores', '#32CD32');

-- Inserir usuário administrador fictício
INSERT INTO users (firebase_uid, email, name, role) VALUES
('admin_firebase_uid_123', 'admin@campneus.com.br', 'Administrador Sistema', 'admin'),
('user_firebase_uid_456', 'usuario@campneus.com.br', 'Usuário Teste', 'user'),
('user_firebase_uid_789', 'operador@campneus.com.br', 'Operador Sistema', 'user');

-- Inserir senhas fictícias
INSERT INTO passwords (title, username, password_value, url, notes, group_id, created_by, last_modified_by) 
SELECT 
    'Sistema Tributário Municipal',
    'admin_tributario',
    'SenhaTributario@2024',
    'https://tributario.prefeitura.gov.br',
    'Acesso ao sistema de tributos municipais',
    pg.id,
    u.id,
    u.id
FROM password_groups pg, users u 
WHERE pg.name = 'Prefeituras' AND u.email = 'admin@campneus.com.br';

INSERT INTO passwords (title, username, password_value, url, notes, group_id, created_by, last_modified_by) 
SELECT 
    'Portal B2F Convênios',
    'gestor_convenios',
    'ConveniosB2F#2024',
    'https://portal.b2f.com.br',
    'Portal de gestão de convênios B2F',
    pg.id,
    u.id,
    u.id
FROM password_groups pg, users u 
WHERE pg.name = 'B2F/Convênios' AND u.email = 'admin@campneus.com.br';

INSERT INTO passwords (title, username, password_value, url, notes, group_id, created_by, last_modified_by) 
SELECT 
    'Sistema SIAFI',
    'operador_siafi',
    'SIAFI_Gov@2024',
    'https://siafi.gov.br',
    'Sistema Integrado de Administração Financeira',
    pg.id,
    u.id,
    u.id
FROM password_groups pg, users u 
WHERE pg.name = 'Órgãos de Governo' AND u.email = 'admin@campneus.com.br';

INSERT INTO passwords (title, username, password_value, url, notes, group_id, created_by, last_modified_by) 
SELECT 
    'Portal Fornecedor XYZ',
    'compras_xyz',
    'FornecedorXYZ*2024',
    'https://portal.fornecedorxyz.com.br',
    'Portal de compras do fornecedor XYZ',
    pg.id,
    u.id,
    u.id
FROM password_groups pg, users u 
WHERE pg.name = 'Fornecedores' AND u.email = 'admin@campneus.com.br';

-- Inserir mais senhas para demonstração
INSERT INTO passwords (title, username, password_value, url, notes, group_id, created_by, last_modified_by) 
SELECT 
    'Sistema de Licitações',
    'licitacoes_admin',
    'Licitacoes@Municipal2024',
    'https://licitacoes.prefeitura.gov.br',
    'Sistema municipal de licitações e pregões',
    pg.id,
    u.id,
    u.id
FROM password_groups pg, users u 
WHERE pg.name = 'Prefeituras' AND u.email = 'usuario@campneus.com.br';

INSERT INTO passwords (title, username, password_value, url, notes, group_id, created_by, last_modified_by) 
SELECT 
    'Convênio DETRAN',
    'convenio_detran',
    'DetranConv#2024',
    'https://convenios.detran.gov.br',
    'Convênio para serviços do DETRAN',
    pg.id,
    u.id,
    u.id
FROM password_groups pg, users u 
WHERE pg.name = 'B2F/Convênios' AND u.email = 'operador@campneus.com.br';

-- Inserir permissões de usuários por grupo
-- Admin tem acesso total a todos os grupos
INSERT INTO user_group_permissions (user_id, group_id, can_view, can_edit, can_delete)
SELECT u.id, pg.id, true, true, true
FROM users u, password_groups pg
WHERE u.email = 'admin@campneus.com.br';

-- Usuário comum tem acesso apenas de visualização a alguns grupos
INSERT INTO user_group_permissions (user_id, group_id, can_view, can_edit, can_delete)
SELECT u.id, pg.id, true, false, false
FROM users u, password_groups pg
WHERE u.email = 'usuario@campneus.com.br' AND pg.name IN ('Prefeituras', 'Fornecedores');

-- Operador tem acesso de edição a grupos específicos
INSERT INTO user_group_permissions (user_id, group_id, can_view, can_edit, can_delete)
SELECT u.id, pg.id, true, true, false
FROM users u, password_groups pg
WHERE u.email = 'operador@campneus.com.br' AND pg.name IN ('B2F/Convênios', 'Órgãos de Governo');

-- Inserir alguns logs de exemplo
INSERT INTO password_logs (password_id, user_id, action, new_values, ip_address, user_agent)
SELECT 
    p.id,
    u.id,
    'create',
    jsonb_build_object('title', p.title, 'username', p.username),
    '192.168.1.100'::inet,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM passwords p, users u
WHERE u.email = 'admin@campneus.com.br'
LIMIT 3;

-- Comentários finais
COMMENT ON TABLE users IS 'Tabela de usuários do sistema com autenticação Firebase';
COMMENT ON TABLE password_groups IS 'Grupos de organização das senhas';
COMMENT ON TABLE passwords IS 'Tabela principal de senhas do sistema';
COMMENT ON TABLE user_group_permissions IS 'Permissões de usuários por grupo de senhas';
COMMENT ON TABLE password_logs IS 'Log de todas as ações realizadas nas senhas';

