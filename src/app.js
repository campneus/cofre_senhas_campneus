const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar para desenvolvimento
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Muitas tentativas, tente novamente em 15 minutos.'
});
app.use(limiter);

// CORS - permitir todas as origens para desenvolvimento
app.use(cors({
  origin: true,
  credentials: true
}));

// Middleware básico
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Configurar EJS como template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware de autenticação Firebase
const authMiddleware = require('./middleware/auth');
const GroupController = require('./controllers/GroupController');

// Rotas
app.get('/', (req, res) => {
  res.render('login', { title: 'Sistema de Senhas - Login' });
});

app.get('/dashboard', authMiddleware.authMiddleware, (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard - Sistema de Senhas',
    user: req.user 
  });
});

app.get('/groups', authMiddleware.authMiddleware, GroupController.renderGroupsPage);
app.get('/users', authMiddleware.authMiddleware, GroupController.renderUsersPage);
app.get('/passwords', authMiddleware.authMiddleware, GroupController.renderPasswordsPage);

// Rotas da API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', authMiddleware.authMiddleware, require('./routes/users'));
app.use('/api/groups', authMiddleware.authMiddleware, require('./routes/groups'));
app.use('/api/passwords', authMiddleware.authMiddleware, require('./routes/passwords'));

// Rota para estatísticas do dashboard
app.get('/api/dashboard/stats', authMiddleware.authMiddleware, GroupController.getDashboardStats);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Verificar conexão com banco de dados
    const { testConnection } = require('./config/database');
    const dbStatus = await testConnection();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: require('../package.json').version,
      services: {
        database: dbStatus ? 'connected' : 'disconnected',
        firebase: process.env.FIREBASE_PROJECT_ID ? 'configured' : 'not configured'
      }
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo deu errado!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

