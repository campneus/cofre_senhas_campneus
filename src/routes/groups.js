const express = require('express');
const router = express.Router();
const PasswordGroup = require('../models/PasswordGroup');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Middleware para todas as rotas de grupos
router.use(authMiddleware);

// Listar grupos (usuário vê apenas seus grupos, admin vê todos)
router.get('/', async (req, res) => {
  try {
    let groups;
    
    if (req.user.role === 'admin') {
      // Admin vê todos os grupos
      groups = await PasswordGroup.findAll();
    } else {
      // Usuário comum vê apenas grupos que tem acesso
      groups = await PasswordGroup.findByUserId(req.user.id);
    }

    res.json({
      success: true,
      groups: groups
    });

  } catch (error) {
    console.error('Erro ao listar grupos:', error);
    res.status(500).json({ 
      error: 'Erro ao listar grupos',
      code: 'LIST_GROUPS_ERROR'
    });
  }
});

// Buscar grupo por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const group = await PasswordGroup.findById(id);
    if (!group) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Verificar se usuário tem acesso ao grupo (admin sempre tem)
    if (req.user.role !== 'admin') {
      const hasAccess = await PasswordGroup.checkUserPermission(id, req.user.id, 'can_view');
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Acesso negado a este grupo',
          code: 'GROUP_ACCESS_DENIED'
        });
      }
    }

    // Buscar usuários do grupo (apenas para admin)
    let groupUsers = [];
    if (req.user.role === 'admin') {
      groupUsers = await PasswordGroup.getUsers(id);
    }

    res.json({
      success: true,
      group: {
        ...group,
        users: groupUsers
      }
    });

  } catch (error) {
    console.error('Erro ao buscar grupo:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar grupo',
      code: 'GET_GROUP_ERROR'
    });
  }
});

// Criar novo grupo (apenas admin)
router.post('/', [
  adminMiddleware,
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('description').optional().isString(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Cor deve estar no formato hexadecimal (#RRGGBB)')
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

    const { name, description, color } = req.body;

    // Verificar se já existe grupo com este nome
    const existingGroup = await PasswordGroup.findByName(name.trim());
    if (existingGroup) {
      return res.status(400).json({ 
        error: 'Já existe um grupo com este nome',
        code: 'GROUP_NAME_EXISTS'
      });
    }

    // Criar grupo
    const newGroup = await PasswordGroup.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      color: color || '#FFD700'
    });

    res.status(201).json({
      success: true,
      message: 'Grupo criado com sucesso',
      group: newGroup
    });

  } catch (error) {
    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ 
      error: 'Erro ao criar grupo',
      code: 'CREATE_GROUP_ERROR'
    });
  }
});

// Atualizar grupo (apenas admin)
router.put('/:id', [
  adminMiddleware,
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('description').optional().isString(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Cor deve estar no formato hexadecimal (#RRGGBB)'),
  body('is_active').optional().isBoolean()
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
    const { name, description, color, is_active } = req.body;

    // Verificar se grupo existe
    const existingGroup = await PasswordGroup.findById(id);
    if (!existingGroup) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Verificar se já existe outro grupo com este nome
    const groupWithSameName = await PasswordGroup.findByName(name.trim());
    if (groupWithSameName && groupWithSameName.id !== id) {
      return res.status(400).json({ 
        error: 'Já existe outro grupo com este nome',
        code: 'GROUP_NAME_EXISTS'
      });
    }

    // Atualizar grupo
    const updatedGroup = await PasswordGroup.update(id, {
      name: name.trim(),
      description: description ? description.trim() : null,
      color: color || existingGroup.color,
      is_active: is_active !== undefined ? is_active : existingGroup.is_active
    });

    res.json({
      success: true,
      message: 'Grupo atualizado com sucesso',
      group: updatedGroup
    });

  } catch (error) {
    console.error('Erro ao atualizar grupo:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar grupo',
      code: 'UPDATE_GROUP_ERROR'
    });
  }
});

// Desativar grupo (apenas admin)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se grupo existe
    const existingGroup = await PasswordGroup.findById(id);
    if (!existingGroup) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Desativar grupo
    const deactivatedGroup = await PasswordGroup.deactivate(id);

    res.json({
      success: true,
      message: 'Grupo desativado com sucesso',
      group: deactivatedGroup
    });

  } catch (error) {
    console.error('Erro ao desativar grupo:', error);
    res.status(500).json({ 
      error: 'Erro ao desativar grupo',
      code: 'DEACTIVATE_GROUP_ERROR'
    });
  }
});

// Listar usuários do grupo (apenas admin)
router.get('/:id/users', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se grupo existe
    const group = await PasswordGroup.findById(id);
    if (!group) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Buscar usuários do grupo
    const groupUsers = await PasswordGroup.getUsers(id);

    res.json({
      success: true,
      users: groupUsers
    });

  } catch (error) {
    console.error('Erro ao listar usuários do grupo:', error);
    res.status(500).json({ 
      error: 'Erro ao listar usuários do grupo',
      code: 'LIST_GROUP_USERS_ERROR'
    });
  }
});

// Adicionar usuário ao grupo (apenas admin)
router.post('/:id/users/:userId', [
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

    const { id: groupId, userId } = req.params;
    const { can_view = true, can_edit = false, can_delete = false } = req.body;

    // Verificar se grupo existe
    const group = await PasswordGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
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
      code: 'ADD_USER_TO_GROUP_ERROR'
    });
  }
});

// Remover usuário do grupo (apenas admin)
router.delete('/:id/users/:userId', adminMiddleware, async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;

    // Verificar se grupo existe
    const group = await PasswordGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
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
      code: 'REMOVE_USER_FROM_GROUP_ERROR'
    });
  }
});

// Obter estatísticas dos grupos (apenas admin)
router.get('/stats/overview', adminMiddleware, async (req, res) => {
  try {
    const stats = await PasswordGroup.getStats();

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas dos grupos:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar estatísticas',
      code: 'GET_STATS_ERROR'
    });
  }
});

module.exports = router;

