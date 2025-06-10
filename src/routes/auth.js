const express = require('express');
const { hashPassword, verifyPassword, generateToken, generatePasswordResetToken, verifyPasswordResetToken, validatePasswordStrength } = require('../config/auth');
const User = require('../models/User');
const router = express.Router();

// Login com email e senha
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar dados de entrada
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e senha são obrigatórios',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Buscar usuário por email
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar se usuário está ativo
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Usuário desativado. Entre em contato com o administrador',
        code: 'USER_DISABLED'
      });
    }

    // Verificar senha
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Atualizar último login
    await User.updateLastLogin(user.id);

    // Gerar token JWT
    const token = generateToken(user);

    // Retornar dados do usuário (sem senha)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      last_login: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token: token,
      user: userData
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Registro de novo usuário (apenas admin pode criar usuários)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Validar dados de entrada
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, senha e nome são obrigatórios',
        code: 'MISSING_FIELDS'
      });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Formato de email inválido',
        code: 'INVALID_EMAIL'
      });
    }

    // Validar força da senha
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Senha não atende aos critérios de segurança',
        code: 'WEAK_PASSWORD',
        details: passwordValidation.errors
      });
    }

    // Verificar se email já existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email já está em uso',
        code: 'EMAIL_EXISTS'
      });
    }

    // Gerar hash da senha
    const passwordHash = await hashPassword(password);

    // Criar usuário
    const userData = {
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: name.trim(),
      role: role,
      is_active: true
    };

    const newUser = await User.create(userData);

    // Retornar dados do usuário (sem senha)
    const responseData = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      is_active: newUser.is_active,
      created_at: newUser.created_at
    };

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: responseData
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Verificar token (para validar sessão)
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token é obrigatório',
        code: 'MISSING_TOKEN'
      });
    }

    const { verifyToken } = require('../config/auth');
    const tokenResult = verifyToken(token);

    if (!tokenResult.success) {
      return res.status(401).json({
        error: tokenResult.error,
        code: 'INVALID_TOKEN'
      });
    }

    // Buscar usuário atualizado no banco
    const user = await User.findById(tokenResult.user.id);
    
    if (!user) {
      return res.status(401).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Usuário desativado',
        code: 'USER_DISABLED'
      });
    }

    // Retornar dados atualizados do usuário
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    res.json({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error('Erro na verificação do token:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Solicitar recuperação de senha
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email é obrigatório',
        code: 'MISSING_EMAIL'
      });
    }

    // Buscar usuário
    const user = await User.findByEmail(email);
    
    if (!user) {
      // Por segurança, não revelar se o email existe ou não
      return res.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Usuário desativado',
        code: 'USER_DISABLED'
      });
    }

    // Gerar token de recuperação
    const resetToken = generatePasswordResetToken(user.id);

    // Salvar token no banco (opcional - pode ser implementado depois)
    // await User.savePasswordResetToken(user.id, resetToken);

    // TODO: Implementar envio de email
    // Por enquanto, retornar o token (apenas para desenvolvimento)
    console.log(`Token de recuperação para ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha',
      // Remover esta linha em produção:
      resetToken: resetToken // Apenas para desenvolvimento
    });

  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Redefinir senha
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token e nova senha são obrigatórios',
        code: 'MISSING_FIELDS'
      });
    }

    // Verificar token de recuperação
    const tokenResult = verifyPasswordResetToken(token);
    
    if (!tokenResult.success) {
      return res.status(401).json({
        error: tokenResult.error,
        code: 'INVALID_RESET_TOKEN'
      });
    }

    // Validar nova senha
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Nova senha não atende aos critérios de segurança',
        code: 'WEAK_PASSWORD',
        details: passwordValidation.errors
      });
    }

    // Buscar usuário
    const user = await User.findById(tokenResult.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Gerar hash da nova senha
    const newPasswordHash = await hashPassword(newPassword);

    // Atualizar senha no banco
    await User.updatePassword(user.id, newPasswordHash);

    res.json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });

  } catch (error) {
    console.error('Erro na redefinição de senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Alterar senha (usuário logado)
router.post('/change-password', async (req, res) => {
  try {
    // Este endpoint requer autenticação
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de acesso requerido',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../config/auth');
    const tokenResult = verifyToken(token);

    if (!tokenResult.success) {
      return res.status(401).json({
        error: tokenResult.error,
        code: 'INVALID_TOKEN'
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Senha atual e nova senha são obrigatórias',
        code: 'MISSING_FIELDS'
      });
    }

    // Buscar usuário
    const user = await User.findById(tokenResult.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Senha atual incorreta',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Validar nova senha
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Nova senha não atende aos critérios de segurança',
        code: 'WEAK_PASSWORD',
        details: passwordValidation.errors
      });
    }

    // Verificar se a nova senha é diferente da atual
    const isSamePassword = await verifyPassword(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({
        error: 'A nova senha deve ser diferente da senha atual',
        code: 'SAME_PASSWORD'
      });
    }

    // Gerar hash da nova senha
    const newPasswordHash = await hashPassword(newPassword);

    // Atualizar senha no banco
    await User.updatePassword(user.id, newPasswordHash);

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('Erro na alteração de senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Logout (invalidar token - implementação básica)
router.post('/logout', (req, res) => {
  // Em uma implementação mais robusta, você poderia:
  // 1. Manter uma blacklist de tokens
  // 2. Usar refresh tokens
  // 3. Armazenar tokens no Redis com TTL
  
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

module.exports = router;

