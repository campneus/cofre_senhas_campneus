-- Sistema de Visualização de Senhas
-- Criação das tabelas e dados iniciais

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (atualizada para autenticação local)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_passwords_group ON passwords(group_id);
CREATE INDEX idx_passwords_active ON passwords(is_active);
CREATE INDEX idx_user_group_permissions_user ON user_group_permissions(user_id);
CREATE INDEX idx_user_group_permissions_group ON user_group_permissions(group_id);
CREATE INDEX idx_password_logs_password ON password_logs(password_id);
CREATE INDEX idx_password_logs_user ON password_logs(user_id);
CREATE INDEX idx_password_logs_created ON password_logs(created_at);

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

CREATE TRIGGER update_user_group_permissions_updated_at BEFORE UPDATE ON user_group_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir grupos padrão
INSERT INTO password_groups (name, description, color) VALUES
('Prefeituras', 'Senhas relacionadas a sistemas de prefeituras', '#FF6B6B'),
('B2F/Convênios', 'Senhas de sistemas B2F e convênios', '#4ECDC4'),
('Órgãos de Governo', 'Senhas de sistemas governamentais', '#45B7D1'),
('Fornecedores', 'Senhas de sistemas de fornecedores', '#96CEB4');

-- Inserir usuário administrador padrão
-- Senha: Admin123!
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@sistema.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..G', 'Administrador', 'admin');

-- Inserir usuários de exemplo
-- Senha para todos: User123!
INSERT INTO users (email, password_hash, name, role) VALUES
('joao.silva@empresa.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..G', 'João Silva', 'user'),
('maria.santos@empresa.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..G', 'Maria Santos', 'user'),
('pedro.oliveira@empresa.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..G', 'Pedro Oliveira', 'user'),
('ana.costa@empresa.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..G', 'Ana Costa', 'user');

-- Obter IDs dos usuários e grupos para as próximas inserções
DO $$
DECLARE
    admin_id UUID;
    joao_id UUID;
    maria_id UUID;
    pedro_id UUID;
    ana_id UUID;
    prefeituras_id UUID;
    b2f_id UUID;
    governo_id UUID;
    fornecedores_id UUID;
BEGIN
    -- Obter IDs dos usuários
    SELECT id INTO admin_id FROM users WHERE email = 'admin@sistema.com';
    SELECT id INTO joao_id FROM users WHERE email = 'joao.silva@empresa.com';
    SELECT id INTO maria_id FROM users WHERE email = 'maria.santos@empresa.com';
    SELECT id INTO pedro_id FROM users WHERE email = 'pedro.oliveira@empresa.com';
    SELECT id INTO ana_id FROM users WHERE email = 'ana.costa@empresa.com';
    
    -- Obter IDs dos grupos
    SELECT id INTO prefeituras_id FROM password_groups WHERE name = 'Prefeituras';
    SELECT id INTO b2f_id FROM password_groups WHERE name = 'B2F/Convênios';
    SELECT id INTO governo_id FROM password_groups WHERE name = 'Órgãos de Governo';
    SELECT id INTO fornecedores_id FROM password_groups WHERE name = 'Fornecedores';
    
    -- Inserir permissões de usuários nos grupos
    -- Admin tem acesso total a todos os grupos
    INSERT INTO user_group_permissions (user_id, group_id, can_view, can_edit, can_delete) VALUES
    (admin_id, prefeituras_id, true, true, true),
    (admin_id, b2f_id, true, true, true),
    (admin_id, governo_id, true, true, true),
    (admin_id, fornecedores_id, true, true, true);
    
    -- João tem acesso a Prefeituras e B2F
    INSERT INTO user_group_permissions (user_id, group_id, can_view, can_edit, can_delete) VALUES
    (joao_id, prefeituras_id, true, true, false),
    (joao_id, b2f_id, true, false, false);
    
    -- Maria tem acesso a Órgãos de Governo e Fornecedores
    INSERT INTO user_group_permissions (user_id, group_id, can_view, can_edit, can_delete) VALUES
    (maria_id, governo_id, true, true, false),
    (maria_id, fornecedores_id, true, false, false);
    
    -- Pedro tem acesso apenas a Fornecedores
    INSERT INTO user_group_permissions (user_id, group_id, can_view, can_edit, can_delete) VALUES
    (pedro_id, fornecedores_id, true, true, false);
    
    -- Ana tem acesso a todos os grupos, mas apenas visualização
    INSERT INTO user_group_permissions (user_id, group_id, can_view, can_edit, can_delete) VALUES
    (ana_id, prefeituras_id, true, false, false),
    (ana_id, b2f_id, true, false, false),
    (ana_id, governo_id, true, false, false),
    (ana_id, fornecedores_id, true, false, false);
    
    -- Inserir senhas de exemplo
    INSERT INTO passwords (title, username, password_value, url, notes, group_id, created_by, last_modified_by) VALUES
    ('Sistema Tributário Municipal', 'admin.tributario', 'TribMun2024!@#', 'https://tributario.prefeitura.gov.br', 'Acesso ao sistema de tributos municipais', prefeituras_id, admin_id, admin_id),
    ('Portal do Cidadão', 'gestor.portal', 'Portal@2024', 'https://portal.prefeitura.gov.br', 'Sistema de atendimento ao cidadão', prefeituras_id, admin_id, admin_id),
    ('Sistema B2F Principal', 'admin.b2f', 'B2F_Secure123!', 'https://sistema.b2f.com.br', 'Acesso principal ao sistema B2F', b2f_id, admin_id, admin_id),
    ('Convênio INSS', 'convenio.inss', 'INSS@Conv2024', 'https://convenio.inss.gov.br', 'Sistema de convênio com INSS', b2f_id, admin_id, admin_id),
    ('Sistema SIAFI', 'operador.siafi', 'SIAFI_2024#Gov', 'https://siafi.tesouro.gov.br', 'Sistema Integrado de Administração Financeira', governo_id, admin_id, admin_id),
    ('Portal e-CAC', 'admin.ecac', 'eCac@Receita24', 'https://cav.receita.fazenda.gov.br', 'Centro de Atendimento Virtual da Receita Federal', governo_id, admin_id, admin_id),
    ('Fornecedor TI Solutions', 'compras.ti', 'TISol_2024!', 'https://portal.tisolutions.com.br', 'Portal de compras TI Solutions', fornecedores_id, admin_id, admin_id),
    ('Fornecedor Office Corp', 'admin.office', 'Office@Corp24', 'https://b2b.officecorp.com.br', 'Sistema B2B Office Corp', fornecedores_id, admin_id, admin_id);
    
END $$;

-- Inserir alguns logs de exemplo
INSERT INTO password_logs (password_id, user_id, action, new_values) 
SELECT 
    p.id,
    p.created_by,
    'create',
    jsonb_build_object(
        'title', p.title,
        'username', p.username,
        'group_id', p.group_id
    )
FROM passwords p;

-- Comentários nas tabelas
COMMENT ON TABLE users IS 'Tabela de usuários do sistema com autenticação local';
COMMENT ON TABLE password_groups IS 'Grupos de organização das senhas';
COMMENT ON TABLE passwords IS 'Senhas armazenadas no sistema';
COMMENT ON TABLE user_group_permissions IS 'Permissões de usuários por grupo';
COMMENT ON TABLE password_logs IS 'Log de todas as ações realizadas nas senhas';

-- Comentários nas colunas importantes
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt da senha do usuário';
COMMENT ON COLUMN users.last_login IS 'Data e hora do último login do usuário';
COMMENT ON COLUMN passwords.password_value IS 'Valor da senha (deve ser criptografado na aplicação)';
COMMENT ON COLUMN password_logs.action IS 'Ação realizada: create, update, delete, view';
COMMENT ON COLUMN password_logs.old_values IS 'Valores anteriores (para updates)';
COMMENT ON COLUMN password_logs.new_values IS 'Novos valores (para creates e updates)';

-- Criar view para relatórios de usuários
CREATE VIEW v_user_stats AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.is_active,
    u.last_login,
    u.created_at,
    COUNT(DISTINCT ugp.group_id) as groups_count,
    COUNT(DISTINCT p.id) as passwords_created,
    COUNT(DISTINCT pl.id) as total_actions
FROM users u
LEFT JOIN user_group_permissions ugp ON u.id = ugp.user_id
LEFT JOIN passwords p ON u.id = p.created_by
LEFT JOIN password_logs pl ON u.id = pl.user_id
GROUP BY u.id, u.email, u.name, u.role, u.is_active, u.last_login, u.created_at;

-- Criar view para relatórios de grupos
CREATE VIEW v_group_stats AS
SELECT 
    pg.id,
    pg.name,
    pg.description,
    pg.color,
    pg.is_active,
    pg.created_at,
    COUNT(DISTINCT ugp.user_id) as users_count,
    COUNT(DISTINCT p.id) as passwords_count
FROM password_groups pg
LEFT JOIN user_group_permissions ugp ON pg.id = ugp.group_id
LEFT JOIN passwords p ON pg.id = p.group_id AND p.is_active = true
GROUP BY pg.id, pg.name, pg.description, pg.color, pg.is_active, pg.created_at;

COMMIT;

