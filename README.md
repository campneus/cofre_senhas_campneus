# Sistema de Visualização de Senhas

Sistema web para gerenciamento seguro de senhas com autenticação local, controle de grupos e permissões granulares.

## 🔐 Características Principais

- **Autenticação Local**: Sistema de login com usuário e senha armazenados no banco de dados
- **Controle de Grupos**: Organização de senhas em grupos (Prefeituras, B2F/Convênios, Órgãos de Governo, Fornecedores)
- **Permissões Granulares**: Controle de visualização, edição e exclusão por usuário e grupo
- **Interface Moderna**: Design responsivo com cores branco, preto e amarelo
- **Logs de Auditoria**: Registro completo de todas as ações realizadas
- **Criptografia**: Senhas de usuários protegidas com bcrypt

## 🚀 Tecnologias Utilizadas

### Backend
- **Node.js** + **Express.js**
- **PostgreSQL** (banco de dados)
- **JWT** (autenticação)
- **bcrypt** (criptografia de senhas)
- **Helmet** (segurança)
- **CORS** (controle de origem)
- **Rate Limiting** (proteção contra ataques)

### Frontend
- **HTML5** + **CSS3** + **JavaScript** (Vanilla)
- **EJS** (template engine)
- **Font Awesome** (ícones)
- **Design Responsivo**

## 📋 Pré-requisitos

- Node.js 18.0.0 ou superior
- PostgreSQL 12 ou superior
- npm ou yarn

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd sistema-senhas
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o banco de dados
Execute o script SQL no seu PostgreSQL:
```bash
psql -h seu_host -U seu_usuario -d seu_banco -f sql/database_setup.sql
```

### 4. Configure as variáveis de ambiente
Copie o arquivo `.env.example` para `.env` e configure:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Configurações do Servidor
NODE_ENV=production
PORT=3000

# Configurações do Banco de Dados PostgreSQL
DATABASE_URL=postgresql://usuario:senha@host:porta/banco?sslmode=require

# Configurações de Segurança (JWT)
JWT_SECRET=sua_jwt_secret_key_super_segura_aqui_com_pelo_menos_32_caracteres
BCRYPT_ROUNDS=12
```

### 5. Inicie o servidor
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 👥 Usuários Padrão

O sistema vem com usuários pré-configurados para teste:

### Administrador
- **Email**: admin@sistema.com
- **Senha**: Admin123!
- **Permissões**: Acesso total a todos os grupos

### Usuários de Teste
- **Email**: joao.silva@empresa.com
- **Senha**: User123!
- **Grupos**: Prefeituras (editar), B2F/Convênios (visualizar)

- **Email**: maria.santos@empresa.com
- **Senha**: User123!
- **Grupos**: Órgãos de Governo (editar), Fornecedores (visualizar)

- **Email**: pedro.oliveira@empresa.com
- **Senha**: User123!
- **Grupos**: Fornecedores (editar)

- **Email**: ana.costa@empresa.com
- **Senha**: User123!
- **Grupos**: Todos os grupos (apenas visualizar)

## 🏗️ Estrutura do Projeto

```
sistema-senhas/
├── src/
│   ├── config/
│   │   ├── auth.js          # Configurações de autenticação JWT
│   │   └── database.js      # Configuração do PostgreSQL
│   ├── controllers/
│   │   └── GroupController.js
│   ├── middleware/
│   │   └── auth.js          # Middleware de autenticação
│   ├── models/
│   │   ├── User.js          # Modelo de usuário
│   │   ├── PasswordGroup.js # Modelo de grupos
│   │   └── Password.js      # Modelo de senhas
│   ├── routes/
│   │   ├── auth.js          # Rotas de autenticação
│   │   ├── users.js         # Rotas de usuários
│   │   ├── groups.js        # Rotas de grupos
│   │   └── passwords.js     # Rotas de senhas
│   └── app.js               # Aplicação principal
├── public/
│   ├── css/                 # Estilos CSS
│   └── js/                  # Scripts JavaScript
├── views/                   # Templates EJS
├── sql/
│   └── database_setup.sql   # Script de criação do banco
└── package.json
```

## 🔒 Segurança

### Autenticação
- Senhas criptografadas com bcrypt (12 rounds)
- Tokens JWT com expiração configurável
- Validação de força de senha

### Proteções Implementadas
- Rate limiting para prevenir ataques de força bruta
- Helmet para headers de segurança
- CORS configurado
- Validação de entrada em todas as rotas
- Logs de auditoria para todas as ações

### Critérios de Senha
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial

## 📊 Funcionalidades

### Dashboard
- Estatísticas de usuários e grupos
- Gráficos de atividade
- Resumo de permissões

### Gerenciamento de Usuários (Admin)
- Criar, editar e desativar usuários
- Definir roles (admin/user)
- Gerenciar permissões por grupo

### Gerenciamento de Grupos
- Criar e editar grupos de senhas
- Definir cores para organização
- Controlar acesso por usuário

### Gerenciamento de Senhas
- Adicionar, editar e excluir senhas
- Organização por grupos
- Busca e filtros
- Logs de alterações

### Sistema de Permissões
- **Visualizar**: Ver senhas do grupo
- **Editar**: Modificar senhas existentes
- **Excluir**: Remover senhas do grupo

## 🚀 Deploy

### Render (Recomendado)
1. Conecte seu repositório ao Render
2. Configure as variáveis de ambiente
3. O deploy será automático

### Variáveis de Ambiente para Produção
```env
NODE_ENV=production
DATABASE_URL=sua_url_do_postgresql
JWT_SECRET=sua_chave_jwt_super_segura
PORT=3000
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com coverage
npm run test:coverage
```

## 📝 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro (admin only)
- `POST /api/auth/verify` - Verificar token
- `POST /api/auth/forgot-password` - Recuperar senha
- `POST /api/auth/reset-password` - Redefinir senha
- `POST /api/auth/change-password` - Alterar senha
- `POST /api/auth/logout` - Logout

### Usuários
- `GET /api/users` - Listar usuários (admin)
- `GET /api/users/:id` - Obter usuário
- `PUT /api/users/:id` - Atualizar usuário (admin)
- `DELETE /api/users/:id` - Desativar usuário (admin)

### Grupos
- `GET /api/groups` - Listar grupos
- `POST /api/groups` - Criar grupo (admin)
- `PUT /api/groups/:id` - Atualizar grupo (admin)
- `DELETE /api/groups/:id` - Excluir grupo (admin)

### Senhas
- `GET /api/passwords` - Listar senhas (por permissão)
- `POST /api/passwords` - Criar senha
- `PUT /api/passwords/:id` - Atualizar senha
- `DELETE /api/passwords/:id` - Excluir senha

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para suporte, entre em contato através do email: suporte@sistema.com

## 📋 Changelog

### v1.0.0
- ✅ Autenticação local implementada
- ✅ Sistema de grupos e permissões
- ✅ Interface responsiva
- ✅ Logs de auditoria
- ✅ Criptografia de senhas
- ✅ Deploy no Render configurado

