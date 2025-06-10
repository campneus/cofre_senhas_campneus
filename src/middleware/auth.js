const { verifyToken } = require('../config/auth');
const User = require('../models/User');

// Middleware de autenticação local
const authMiddleware = async (req, res, next) => {
  try {
    // Obter token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de acesso requerido',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Verificar token JWT
    const tokenResult = verifyToken(token);
    
    if (!tokenResult.success) {
      return res.status(401).json({
        error: tokenResult.error,
        code: 'INVALID_TOKEN'
      });
    }

    // Buscar usuário no banco de dados
    const user = await User.findById(tokenResult.user.id);
    
    if (!user) {
      return res.status(401).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar se usuário está ativo
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Usuário desativado',
        code: 'USER_DISABLED'
      });
    }

    // Adicionar usuário ao request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    next();

  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Middleware para verificar se é administrador
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Usuário não autenticado',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado. Apenas administradores podem acessar este recurso',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// Middleware para verificar permissões específicas
const permissionMiddleware = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Administradores têm acesso total
      if (req.user.role === 'admin') {
        return next();
      }

      // Para usuários comuns, verificar permissões específicas
      // Esta lógica pode ser expandida conforme necessário
      if (requiredPermissions.length > 0) {
        // Implementar verificação de permissões específicas aqui
        // Por enquanto, permitir acesso para usuários autenticados
        return next();
      }

      next();

    } catch (error) {
      console.error('Erro no middleware de permissões:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

// Middleware opcional de autenticação (não falha se não houver token)
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continua sem usuário
    }

    const token = authHeader.substring(7);
    const tokenResult = verifyToken(token);
    
    if (tokenResult.success) {
      const user = await User.findById(tokenResult.user.id);
      
      if (user && user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at
        };
      }
    }

    next();

  } catch (error) {
    console.error('Erro no middleware de autenticação opcional:', error);
    next(); // Continua mesmo com erro
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  permissionMiddleware,
  optionalAuthMiddleware
};

