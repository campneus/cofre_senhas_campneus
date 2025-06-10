const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PasswordGroup = require('../models/PasswordGroup');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Middleware para todas as rotas de usuários
router.use(authMiddleware);

// Listar todos os usuários (apenas admin)
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const users = await User.findAll();
    
    res.json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ 
      error: 'Erro ao listar usuários',
      code: 'LIST_USERS_ERROR'
    });
  }
});

// Buscar usuário por ID (apenas admin)
router.get('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Buscar grupos do usuário
    const userGroups = await User.getUserGroups(id);

    res.json({
      success: true,
      user: {
        ...user,
        groups: userGroups
      }
    });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar usuário',
      code: 'GET_USER_ERROR'
    });
  }
});

// Atualizar usuário (apenas admin)
router.put('/:id', [
  adminMiddleware,
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('role').isIn(['admin', 'user']).withMessage('Role deve ser admin ou user'),
  body('is_active').isBoolean().withMessage('is_active deve ser boolean')
], async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { name, role, is_active } = req.body;

    // Verificar se usuário existe
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Não permitir que admin desative a si mesmo
    if (req.user.id === id && !is_active) {
      return res.status(400).json({ 
        error: 'Você não pode desativar sua própria conta',
        code: 'CANNOT_DEACTIVATE_SELF'
      });
    }

    // Atualizar usuário
    const updatedUser = await User.update(id, {
      name: name.trim(),
      role,
      is_active
    });

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar usuário',
      code: 'UPDATE_USER_ERROR'
    });
  }
});

// Desativar usuário (apenas admin)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se usuário existe
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Não permitir que admin desative a si mesmo
    if (req.user.id === id) {
      return res.status(400).json({ 
        error: 'Você não pode desativar sua própria conta',
        code: 'CANNOT_DEACTIVATE_SELF'
      });
    }

    // Desativar usuário
    const deactivatedUser = await User.deactivate(id);

    res.json({
      success: true,
      message: 'Usuário desativado com sucesso',
      user: deactivatedUser
    });

  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    res.status(500).json({ 
      error: 'Erro ao desativar usuário',
      code: 'DEACTIVATE_USER_ERROR'
    });
  }
});

// Adicionar usuário a um grupo (apenas admin)
router.post('/:id/groups/:groupId', [
  adminMiddleware,
  body('can_view').optional().isBoolean(),
  body('can_edit').optional().isBoolean(),
  body('can_delete').optional().isBoolean()
], async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { id: userId, groupId } = req.params;
    const { can_view = true, can_edit = false, can_delete = false } = req.body;

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar se grupo existe
    const group = await PasswordGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Adicionar usuário ao grupo
    const permission = await PasswordGroup.addUser(groupId, userId, {
      can_view,
      can_edit,
      can_delete
    });

    res.json({
      success: true,
      message: 'Usuário adicionado ao grupo com sucesso',
      permission: permission
    });

  } catch (error) {
    console.error('Erro ao adicionar usuário ao grupo:', error);
    res.status(500).json({ 
      error: 'Erro ao adicionar usuário ao grupo',
      code: 'ADD_USER_GROUP_ERROR'
    });
  }
});

// Remover usuário de um grupo (apenas admin)
router.delete('/:id/groups/:groupId', adminMiddleware, async (req, res) => {
  try {
    const { id: userId, groupId } = req.params;

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar se grupo existe
    const group = await PasswordGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Remover usuário do grupo
    const removed = await PasswordGroup.removeUser(groupId, userId);

    if (!removed) {
      return res.status(404).json({ 
        error: 'Usuário não está neste grupo',
        code: 'USER_NOT_IN_GROUP'
      });
    }

    res.json({
      success: true,
      message: 'Usuário removido do grupo com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover usuário do grupo:', error);
    res.status(500).json({ 
      error: 'Erro ao remover usuário do grupo',
      code: 'REMOVE_USER_GROUP_ERROR'
    });
  }
});

// Listar grupos do usuário
router.get('/:id/groups', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se é admin ou o próprio usuário
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }

    // Verificar se usuário existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Buscar grupos do usuário
    const userGroups = await User.getUserGroups(id);

    res.json({
      success: true,
      groups: userGroups
    });

  } catch (error) {
    console.error('Erro ao buscar grupos do usuário:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar grupos do usuário',
      code: 'GET_USER_GROUPS_ERROR'
    });
  }
});

module.exports = router;

