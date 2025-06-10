const { verifyFirebaseToken } = require('../config/firebase');
const User = require('../models/User');

// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de acesso não fornecido',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Verificar token Firebase
    const firebaseResult = await verifyFirebaseToken(token);
    if (!firebaseResult.success) {
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN',
        details: firebaseResult.error
      });
    }

    const firebaseUser = firebaseResult.user;

    // Buscar usuário no banco de dados
    let dbUser = await User.findByFirebaseUid(firebaseUser.uid);

    // Se usuário não existe no banco, criar automaticamente
    if (!dbUser) {
      try {
        dbUser = await User.create({
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.name,
          role: 'user' // Usuários novos começam como 'user'
        });
        console.log('Novo usuário criado automaticamente:', dbUser.email);
      } catch (createError) {
        console.error('Erro ao criar usuário automaticamente:', createError.message);
        return res.status(500).json({ 
          error: 'Erro ao criar usuário no sistema',
          code: 'USER_CREATION_ERROR'
        });
      }
    }

    // Verificar se usuário está ativo
    if (!dbUser.is_active) {
      return res.status(403).json({ 
        error: 'Usuário desativado',
        code: 'USER_DISABLED'
      });
    }

    // Adicionar informações do usuário ao request
    req.user = {
      id: dbUser.id,
      firebase_uid: dbUser.firebase_uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      is_active: dbUser.is_active,
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at
    };

    // Adicionar informações do Firebase
    req.firebaseUser = firebaseUser;

    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ 
      error: 'Erro interno de autenticação',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware para verificar se usuário é admin
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Usuário não autenticado',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas administradores podem acessar este recurso.',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// Middleware opcional de autenticação (não falha se não houver token)
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continua sem autenticação
    }

    const token = authHeader.substring(7);
    const firebaseResult = await verifyFirebaseToken(token);
    
    if (firebaseResult.success) {
      const dbUser = await User.findByFirebaseUid(firebaseResult.user.uid);
      if (dbUser && dbUser.is_active) {
        req.user = {
          id: dbUser.id,
          firebase_uid: dbUser.firebase_uid,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          is_active: dbUser.is_active
        };
        req.firebaseUser = firebaseResult.user;
      }
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação opcional:', error);
    next(); // Continua mesmo com erro
  }
};

// Middleware para verificar permissão em grupo específico
const groupPermissionMiddleware = (permission = 'can_view') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Usuário não autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Admin tem acesso total
      if (req.user.role === 'admin') {
        return next();
      }

      const groupId = req.params.groupId || req.body.group_id;
      if (!groupId) {
        return res.status(400).json({ 
          error: 'ID do grupo não fornecido',
          code: 'GROUP_ID_REQUIRED'
        });
      }

      const PasswordGroup = require('../models/PasswordGroup');
      const hasPermission = await PasswordGroup.checkUserPermission(groupId, req.user.id, permission);

      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Permissão negada. Você não tem permissão de ${permission} neste grupo.`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    } catch (error) {
      console.error('Erro no middleware de permissão de grupo:', error);
      return res.status(500).json({ 
        error: 'Erro ao verificar permissões',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
  groupPermissionMiddleware
};

