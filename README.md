# Sistema de Visualização de Senhas

Sistema web completo para gerenciamento e visualização de senhas com autenticação Firebase, controle de grupos e permissões, desenvolvido em Node.js com PostgreSQL.

## 🚀 Características

- **Autenticação Firebase**: Login seguro com email/senha e Google
- **Controle de Acesso**: Sistema de grupos e permissões granulares
- **Interface Moderna**: Design responsivo com cores branco, preto e amarelo
- **Logs de Auditoria**: Rastreamento completo de todas as ações
- **Dashboard Interativo**: Estatísticas e visão geral do sistema
- **API RESTful**: Endpoints completos para todas as funcionalidades

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express.js
- **Banco de Dados**: PostgreSQL
- **Autenticação**: Firebase Admin SDK
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Segurança**: Helmet, CORS, Rate Limiting
- **Deploy**: Render (configurado)

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- Conta Firebase com projeto configurado
- Conta Render (para deploy)

## 🔧 Instalação Local

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
```bash
# Execute o script SQL para criar as tabelas
psql -h <host> -U <usuario> -d <database> -f sql/database_setup.sql
```

### 4. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas configurações
nano .env
```

### 5. Configure o Firebase
1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Crie um novo projeto ou use o existente
3. Ative a autenticação por email/senha e Google
4. Gere uma chave privada para o Admin SDK
5. Configure as variáveis do Firebase no arquivo `.env`

### 6. Execute o projeto
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🗄️ Configuração do Banco de Dados

### Estrutura das Tabelas

O sistema utiliza as seguintes tabelas principais:

- **users**: Usuários do sistema
- **password_groups**: Grupos de organização das senhas
- **passwords**: Senhas armazenadas
- **user_group_permissions**: Permissões de usuários por grupo
- **password_logs**: Logs de auditoria

### Dados Iniciais

O script SQL inclui dados fictícios para teste:

**Grupos Padrão:**
- Prefeituras
- B2F/Convênios  
- Órgãos de Governo
- Fornecedores

**Usuários de Teste:**
- admin@campneus.com.br (Administrador)
- usuario@campneus.com.br (Usuário)
- operador@campneus.com.br (Usuário)

## 🔐 Configuração do Firebase

### 1. Configuração Web (Frontend)
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC9b7BXNm8HijR-k-GZUJeCJn5gT0rKBbk",
  authDomain: "campneus-dashboard.firebaseapp.com",
  projectId: "campneus-dashboard",
  storageBucket: "campneus-dashboard.firebasestorage.app",
  messagingSenderId: "172203992376",
  appId: "1:172203992376:web:91d4ddf048071f110d8dcd",
  measurementId: "G-E6MZYD2YXG"
};
```

### 2. Configuração Admin SDK (Backend)
Configure as seguintes variáveis no `.env`:
```env
FIREBASE_PROJECT_ID=campneus-dashboard
FIREBASE_PRIVATE_KEY_ID=sua_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@campneus-dashboard.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=sua_client_id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
```

## 🚀 Deploy no Render

### 1. Configuração Automática
O projeto está configurado para deploy automático no Render com:
- Build automático do Node.js
- Variáveis de ambiente configuradas
- Health checks habilitados
- SSL automático

### 2. Variáveis de Ambiente no Render
Configure as seguintes variáveis no painel do Render:
```
NODE_ENV=production
DATABASE_URL=postgresql://...
FIREBASE_PROJECT_ID=campneus-dashboard
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
FIREBASE_CLIENT_CERT_URL=...
```

### 3. Comandos de Build
```bash
# Build
npm install

# Start
npm start
```

## 📱 Funcionalidades

### Dashboard
- Estatísticas gerais do sistema
- Senhas recentes
- Overview dos grupos
- Métricas de acesso

### Gerenciamento de Senhas
- Criar, editar e excluir senhas
- Organização por grupos
- Busca e filtros
- Logs de acesso

### Gerenciamento de Grupos
- Criar e editar grupos
- Definir cores personalizadas
- Gerenciar usuários do grupo
- Controle de permissões

### Gerenciamento de Usuários (Admin)
- Listar todos os usuários
- Editar perfis e permissões
- Ativar/desativar usuários
- Vincular usuários a grupos

### Sistema de Permissões
- **Visualizar**: Ver senhas do grupo
- **Editar**: Criar e modificar senhas
- **Excluir**: Remover senhas do grupo

## 🔒 Segurança

### Medidas Implementadas
- Autenticação Firebase com tokens JWT
- Rate limiting para prevenir ataques
- Validação de entrada em todas as rotas
- Logs de auditoria completos
- Criptografia de senhas sensíveis
- Headers de segurança com Helmet
- CORS configurado adequadamente

### Boas Práticas
- Senhas nunca expostas em logs
- Tokens com expiração automática
- Validação de permissões em cada operação
- Soft delete para preservar histórico
- Backup automático (configurável)

## 📊 Monitoramento

### Health Checks
- Endpoint `/health` para verificação de status
- Verificação de conectividade com banco
- Verificação de serviços externos

### Logs
- Logs estruturados com níveis
- Rastreamento de operações críticas
- Logs de erro detalhados
- Rotação automática de logs

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Email: suporte@campneus.com.br
- Issues: Use o sistema de issues do GitHub

## 🔄 Atualizações

### Versão 1.0.0
- Sistema completo de gerenciamento de senhas
- Autenticação Firebase integrada
- Interface responsiva e moderna
- Sistema de grupos e permissões
- Logs de auditoria completos
- Deploy automatizado no Render

---

**Desenvolvido com ❤️ para Campneus**

