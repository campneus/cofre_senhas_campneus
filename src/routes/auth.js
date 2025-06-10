const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, getFirebaseUser } = require('../config/firebase');
const User = require('../models/User');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// Rota para verificar token e obter informações do usuário
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: 'Token não fornecido',
        code: 'TOKEN_REQUIRED'
      });
    }

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

    // Buscar ou criar usuário no banco
    let dbUser = await User.findByFirebaseUid(firebaseUser.uid);
    
    if (!dbUser) {
      // Criar usuário automaticamente
      dbUser = await User.create({
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.name,
        role: 'user'
      });
    }

    // Verificar se usuário está ativo
    if (!dbUser.is_active) {
      return res.status(403).json({ 
        error: 'Usuário desativado',
        code: 'USER_DISABLED'
      });
    }

    // Buscar grupos do usuário
    const userGroups = await User.getUserGroups(dbUser.id);

    res.json({
      success: true,
      user: {
        id: dbUser.id,
        firebase_uid: dbUser.firebase_uid,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        is_active: dbUser.is_active,
        created_at: dbUser.created_at,
        updated_at: dbUser.updated_at,
        groups: userGroups
      },
      firebase_user: firebaseUser
    });

  } catch (error) {
    console.error('Erro na verificação de token:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Rota para obter perfil do usuário autenticado
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // Buscar grupos do usuário
    const userGroups = await User.getUserGroups(req.user.id);

    res.json({
      success: true,
      user: {
        ...req.user,
        groups: userGroups
      }
    });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar perfil do usuário',
      code: 'PROFILE_ERROR'
    });
  }
});

// Rota para atualizar perfil do usuário
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Nome é obrigatório',
        code: 'NAME_REQUIRED'
      });
    }

    // Atualizar apenas o nome (outros campos são controlados pelo admin)
    const updatedUser = await User.update(req.user.id, {
      name: name.trim(),
      role: req.user.role, // Manter role atual
      is_active: req.user.is_active // Manter status atual
    });

    if (!updatedUser) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: {
        id: updatedUser.id,
        firebase_uid: updatedUser.firebase_uid,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        is_active: updatedUser.is_active,
        updated_at: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar perfil',
      code: 'UPDATE_ERROR'
    });
  }
});

// Rota para logout (apenas limpa informações do lado cliente)
router.post('/logout', optionalAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

// Rota para verificar status de autenticação
router.get('/status', optionalAuthMiddleware, (req, res) => {
  if (req.user) {
    res.json({
      authenticated: true,
      user: req.user
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

// Rota para refresh de informações do usuário
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    // Buscar informações atualizadas do usuário
    const dbUser = await User.findById(req.user.id);
    
    if (!dbUser) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!dbUser.is_active) {
      return res.status(403).json({ 
        error: 'Usuário desativado',
        code: 'USER_DISABLED'
      });
    }

    // Buscar grupos do usuário
    const userGroups = await User.getUserGroups(dbUser.id);

    res.json({
      success: true,
      user: {
        id: dbUser.id,
        firebase_uid: dbUser.firebase_uid,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        is_active: dbUser.is_active,
        created_at: dbUser.created_at,
        updated_at: dbUser.updated_at,
        groups: userGroups
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar informações do usuário:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar informações',
      code: 'REFRESH_ERROR'
    });
  }
});

module.exports = router;

