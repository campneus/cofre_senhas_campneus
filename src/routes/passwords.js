const express = require('express');
const router = express.Router();
const Password = require('../models/Password');
const PasswordGroup = require('../models/PasswordGroup');
const { authMiddleware, groupPermissionMiddleware } = require('../middleware/auth');
const { body, validationResult, query } = require('express-validator');

// Middleware para todas as rotas de senhas
router.use(authMiddleware);

// Listar senhas (usuário vê apenas senhas dos grupos que tem acesso)
router.get('/', [
  query('search').optional().isString(),
  query('group_id').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Parâmetros inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { search, group_id } = req.query;
    const filters = {};
    
    if (search) filters.search = search;
    if (group_id) filters.group_id = group_id;

    let passwords;
    
    if (req.user.role === 'admin') {
      // Admin vê todas as senhas
      passwords = await Password.search(filters);
    } else {
      // Usuário comum vê apenas senhas dos grupos que tem acesso
      passwords = await Password.search(filters, req.user.id);
    }

    res.json({
      success: true,
      passwords: passwords
    });

  } catch (error) {
    console.error('Erro ao listar senhas:', error);
    res.status(500).json({ 
      error: 'Erro ao listar senhas',
      code: 'LIST_PASSWORDS_ERROR'
    });
  }
});

// Buscar senha por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let password;
    
    if (req.user.role === 'admin') {
      // Admin pode ver qualquer senha
      password = await Password.findById(id);
    } else {
      // Usuário comum só vê senhas dos grupos que tem acesso
      password = await Password.findById(id, req.user.id);
    }

    if (!password) {
      return res.status(404).json({ 
        error: 'Senha não encontrada ou acesso negado',
        code: 'PASSWORD_NOT_FOUND'
      });
    }

    // Registrar visualização da senha
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await Password.logView(id, req.user.id, clientIp, userAgent);

    res.json({
      success: true,
      password: password
    });

  } catch (error) {
    console.error('Erro ao buscar senha:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar senha',
      code: 'GET_PASSWORD_ERROR'
    });
  }
});

// Revelar valor da senha (com log de acesso)
router.get('/:id/reveal', async (req, res) => {
  try {
    const { id } = req.params;
    
    let password;
    
    if (req.user.role === 'admin') {
      // Admin pode ver qualquer senha
      password = await Password.findById(id);
    } else {
      // Usuário comum só vê senhas dos grupos que tem acesso
      password = await Password.findById(id, req.user.id);
    }

    if (!password) {
      return res.status(404).json({ 
        error: 'Senha não encontrada ou acesso negado',
        code: 'PASSWORD_NOT_FOUND'
      });
    }

    // Registrar acesso ao valor da senha
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await Password.logView(id, req.user.id, clientIp, userAgent);

    res.json({
      success: true,
      password_value: password.password_value
    });

  } catch (error) {
    console.error('Erro ao revelar senha:', error);
    res.status(500).json({ 
      error: 'Erro ao revelar senha',
      code: 'REVEAL_PASSWORD_ERROR'
    });
  }
});

// Criar nova senha
router.post('/', [
  body('title').notEmpty().withMessage('Título é obrigatório'),
  body('username').optional().isString(),
  body('password_value').notEmpty().withMessage('Senha é obrigatória'),
  body('url').optional().isURL().withMessage('URL deve ser válida'),
  body('notes').optional().isString(),
  body('group_id').isUUID().withMessage('ID do grupo deve ser um UUID válido')
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

    const { title, username, password_value, url, notes, group_id } = req.body;

    // Verificar se grupo existe
    const group = await PasswordGroup.findById(group_id);
    if (!group) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Verificar permissão de edição no grupo (admin sempre pode)
    if (req.user.role !== 'admin') {
      const canEdit = await PasswordGroup.checkUserPermission(group_id, req.user.id, 'can_edit');
      if (!canEdit) {
        return res.status(403).json({ 
          error: 'Você não tem permissão para criar senhas neste grupo',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    }

    // Criar senha
    const newPassword = await Password.create({
      title: title.trim(),
      username: username ? username.trim() : null,
      password_value,
      url: url ? url.trim() : null,
      notes: notes ? notes.trim() : null,
      group_id
    }, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Senha criada com sucesso',
      password: {
        id: newPassword.id,
        title: newPassword.title,
        username: newPassword.username,
        url: newPassword.url,
        notes: newPassword.notes,
        group_id: newPassword.group_id,
        created_at: newPassword.created_at
      }
    });

  } catch (error) {
    console.error('Erro ao criar senha:', error);
    res.status(500).json({ 
      error: 'Erro ao criar senha',
      code: 'CREATE_PASSWORD_ERROR'
    });
  }
});

// Atualizar senha
router.put('/:id', [
  body('title').notEmpty().withMessage('Título é obrigatório'),
  body('username').optional().isString(),
  body('password_value').notEmpty().withMessage('Senha é obrigatória'),
  body('url').optional().isURL().withMessage('URL deve ser válida'),
  body('notes').optional().isString(),
  body('group_id').isUUID().withMessage('ID do grupo deve ser um UUID válido')
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
    const { title, username, password_value, url, notes, group_id } = req.body;

    // Verificar se senha existe
    let existingPassword;
    if (req.user.role === 'admin') {
      existingPassword = await Password.findById(id);
    } else {
      existingPassword = await Password.findById(id, req.user.id);
    }

    if (!existingPassword) {
      return res.status(404).json({ 
        error: 'Senha não encontrada ou acesso negado',
        code: 'PASSWORD_NOT_FOUND'
      });
    }

    // Verificar se grupo existe
    const group = await PasswordGroup.findById(group_id);
    if (!group) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Verificar permissão de edição no grupo atual e no novo grupo (se diferente)
    if (req.user.role !== 'admin') {
      const canEditCurrent = await PasswordGroup.checkUserPermission(existingPassword.group_id, req.user.id, 'can_edit');
      if (!canEditCurrent) {
        return res.status(403).json({ 
          error: 'Você não tem permissão para editar esta senha',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      if (group_id !== existingPassword.group_id) {
        const canEditNew = await PasswordGroup.checkUserPermission(group_id, req.user.id, 'can_edit');
        if (!canEditNew) {
          return res.status(403).json({ 
            error: 'Você não tem permissão para mover esta senha para o grupo selecionado',
            code: 'INSUFFICIENT_PERMISSIONS'
          });
        }
      }
    }

    // Atualizar senha
    const updatedPassword = await Password.update(id, {
      title: title.trim(),
      username: username ? username.trim() : null,
      password_value,
      url: url ? url.trim() : null,
      notes: notes ? notes.trim() : null,
      group_id
    }, req.user.id);

    res.json({
      success: true,
      message: 'Senha atualizada com sucesso',
      password: {
        id: updatedPassword.id,
        title: updatedPassword.title,
        username: updatedPassword.username,
        url: updatedPassword.url,
        notes: updatedPassword.notes,
        group_id: updatedPassword.group_id,
        updated_at: updatedPassword.updated_at
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar senha',
      code: 'UPDATE_PASSWORD_ERROR'
    });
  }
});

// Excluir senha
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se senha existe
    let existingPassword;
    if (req.user.role === 'admin') {
      existingPassword = await Password.findById(id);
    } else {
      existingPassword = await Password.findById(id, req.user.id);
    }

    if (!existingPassword) {
      return res.status(404).json({ 
        error: 'Senha não encontrada ou acesso negado',
        code: 'PASSWORD_NOT_FOUND'
      });
    }

    // Verificar permissão de exclusão no grupo (admin sempre pode)
    if (req.user.role !== 'admin') {
      const canDelete = await PasswordGroup.checkUserPermission(existingPassword.group_id, req.user.id, 'can_delete');
      if (!canDelete) {
        return res.status(403).json({ 
          error: 'Você não tem permissão para excluir esta senha',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    }

    // Excluir senha (soft delete)
    await Password.deactivate(id, req.user.id);

    res.json({
      success: true,
      message: 'Senha excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir senha:', error);
    res.status(500).json({ 
      error: 'Erro ao excluir senha',
      code: 'DELETE_PASSWORD_ERROR'
    });
  }
});

// Buscar senhas por grupo
router.get('/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verificar se grupo existe
    const group = await PasswordGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        error: 'Grupo não encontrado',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Verificar permissão de visualização no grupo (admin sempre pode)
    if (req.user.role !== 'admin') {
      const canView = await PasswordGroup.checkUserPermission(groupId, req.user.id, 'can_view');
      if (!canView) {
        return res.status(403).json({ 
          error: 'Você não tem permissão para visualizar senhas deste grupo',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    }

    let passwords;
    if (req.user.role === 'admin') {
      passwords = await Password.findByGroupId(groupId);
    } else {
      passwords = await Password.findByGroupId(groupId, req.user.id);
    }

    res.json({
      success: true,
      group: group,
      passwords: passwords
    });

  } catch (error) {
    console.error('Erro ao buscar senhas do grupo:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar senhas do grupo',
      code: 'GET_GROUP_PASSWORDS_ERROR'
    });
  }
});

// Buscar logs de uma senha (apenas admin)
router.get('/:id/logs', async (req, res) => {
  try {
    // Apenas admin pode ver logs
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Apenas administradores podem visualizar logs',
        code: 'ADMIN_REQUIRED'
      });
    }

    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Verificar se senha existe
    const password = await Password.findById(id);
    if (!password) {
      return res.status(404).json({ 
        error: 'Senha não encontrada',
        code: 'PASSWORD_NOT_FOUND'
      });
    }

    // Buscar logs
    const logs = await Password.getLogs(id, limit);

    res.json({
      success: true,
      password: {
        id: password.id,
        title: password.title
      },
      logs: logs
    });

  } catch (error) {
    console.error('Erro ao buscar logs da senha:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar logs',
      code: 'GET_LOGS_ERROR'
    });
  }
});

// Obter estatísticas das senhas (apenas admin)
router.get('/stats/overview', async (req, res) => {
  try {
    // Apenas admin pode ver estatísticas
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Apenas administradores podem visualizar estatísticas',
        code: 'ADMIN_REQUIRED'
      });
    }

    const stats = await Password.getStats();

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas das senhas:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar estatísticas',
      code: 'GET_STATS_ERROR'
    });
  }
});

module.exports = router;

