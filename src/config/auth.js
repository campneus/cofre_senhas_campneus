const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Configuração JWT
const JWT_SECRET = process.env.JWT_SECRET || 'sua_jwt_secret_key_super_segura_aqui_com_pelo_menos_32_caracteres';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Função para gerar hash da senha
const hashPassword = async (password) => {
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.error('Erro ao gerar hash da senha:', error);
    throw new Error('Erro ao processar senha');
  }
};

// Função para verificar senha
const verifyPassword = async (password, hashedPassword) => {
  try {
    const isValid = await bcrypt.compare(password, hashedPassword);
    return isValid;
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    throw new Error('Erro ao verificar senha');
  }
};

// Função para gerar token JWT
const generateToken = (user) => {
  try {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'sistema-senhas',
      audience: 'sistema-senhas-users'
    });

    return token;
  } catch (error) {
    console.error('Erro ao gerar token JWT:', error);
    throw new Error('Erro ao gerar token de autenticação');
  }
};

// Função para verificar token JWT
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'sistema-senhas',
      audience: 'sistema-senhas-users'
    });

    return {
      success: true,
      user: decoded
    };
  } catch (error) {
    console.error('Erro ao verificar token JWT:', error);
    
    let errorMessage = 'Token inválido';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expirado';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Token malformado';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

// Função para decodificar token sem verificar (para obter informações)
const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return null;
  }
};

// Função para gerar token de recuperação de senha
const generatePasswordResetToken = (userId) => {
  try {
    const payload = {
      userId: userId,
      type: 'password_reset'
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1h', // Token de recuperação expira em 1 hora
      issuer: 'sistema-senhas',
      audience: 'sistema-senhas-password-reset'
    });

    return token;
  } catch (error) {
    console.error('Erro ao gerar token de recuperação:', error);
    throw new Error('Erro ao gerar token de recuperação');
  }
};

// Função para verificar token de recuperação de senha
const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'sistema-senhas',
      audience: 'sistema-senhas-password-reset'
    });

    if (decoded.type !== 'password_reset') {
      throw new Error('Tipo de token inválido');
    }

    return {
      success: true,
      userId: decoded.userId
    };
  } catch (error) {
    console.error('Erro ao verificar token de recuperação:', error);
    
    let errorMessage = 'Token de recuperação inválido';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token de recuperação expirado';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

// Função para validar força da senha
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`A senha deve ter pelo menos ${minLength} caracteres`);
  }

  if (!hasUpperCase) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  }

  if (!hasLowerCase) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  }

  if (!hasNumbers) {
    errors.push('A senha deve conter pelo menos um número');
  }

  if (!hasSpecialChar) {
    errors.push('A senha deve conter pelo menos um caractere especial');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    strength: calculatePasswordStrength(password)
  };
};

// Função para calcular força da senha
const calculatePasswordStrength = (password) => {
  let score = 0;

  // Comprimento
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Complexidade
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  // Variedade
  if (password.length >= 16) score += 1;

  if (score <= 2) return 'fraca';
  if (score <= 4) return 'média';
  if (score <= 6) return 'forte';
  return 'muito forte';
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  decodeToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  validatePasswordStrength,
  calculatePasswordStrength
};

