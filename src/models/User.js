const { query, transaction } = require('../config/database');

class User {
  // Criar usuário
  static async create(userData) {
    const { email, password_hash, name, role = 'user' } = userData;
    const text = `
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role, is_active, created_at, updated_at
    `;
    const values = [email, password_hash, name, role];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Buscar usuário por email (incluindo senha para autenticação)
  static async findByEmail(email) {
    const text = 'SELECT * FROM users WHERE email = $1';
    const result = await query(text, [email]);
    return result.rows[0];
  }

  // Buscar usuário por ID
  static async findById(id) {
    const text = 'SELECT id, email, name, role, is_active, created_at, updated_at, last_login FROM users WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Buscar usuário por ID (incluindo senha para verificações)
  static async findByIdWithPassword(id) {
    const text = 'SELECT * FROM users WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Listar todos os usuários
  static async findAll() {
    const text = `
      SELECT id, email, name, role, is_active, created_at, updated_at, last_login
      FROM users 
      ORDER BY name
    `;
    const result = await query(text);
    return result.rows;
  }

  // Listar usuários ativos
  static async findAllActive() {
    const text = `
      SELECT id, email, name, role, is_active, created_at, updated_at, last_login
      FROM users 
      WHERE is_active = true
      ORDER BY name
    `;
    const result = await query(text);
    return result.rows;
  }

  // Atualizar usuário
  static async update(id, userData) {
    const { name, role, is_active } = userData;
    const text = `
      UPDATE users 
      SET name = $2, role = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, role, is_active, created_at, updated_at
    `;
    const values = [id, name, role, is_active];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Atualizar senha
  static async updatePassword(id, passwordHash) {
    const text = `
      UPDATE users 
      SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, role, is_active, created_at, updated_at
    `;
    const result = await query(text, [id, passwordHash]);
    return result.rows[0];
  }

  // Atualizar último login
  static async updateLastLogin(id) {
    const text = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING last_login
    `;
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Desativar usuário (soft delete)
  static async deactivate(id) {
    const text = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, role, is_active, created_at, updated_at
    `;
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Reativar usuário
  static async activate(id) {
    const text = `
      UPDATE users 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, role, is_active, created_at, updated_at
    `;
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Buscar grupos do usuário com permissões
  static async getUserGroups(userId) {
    const text = `
      SELECT 
        pg.id,
        pg.name,
        pg.description,
        pg.color,
        ugp.can_view,
        ugp.can_edit,
        ugp.can_delete
      FROM password_groups pg
      INNER JOIN user_group_permissions ugp ON pg.id = ugp.group_id
      WHERE ugp.user_id = $1 AND pg.is_active = true
      ORDER BY pg.name
    `;
    const result = await query(text, [userId]);
    return result.rows;
  }

  // Verificar se usuário tem permissão em um grupo
  static async hasGroupPermission(userId, groupId, permission) {
    const text = `
      SELECT ugp.${permission}
      FROM user_group_permissions ugp
      INNER JOIN password_groups pg ON ugp.group_id = pg.id
      WHERE ugp.user_id = $1 AND ugp.group_id = $2 AND pg.is_active = true
    `;
    const result = await query(text, [userId, groupId]);
    return result.rows[0] ? result.rows[0][permission] : false;
  }

  // Contar usuários por role
  static async countByRole() {
    const text = `
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM users
      GROUP BY role
      ORDER BY role
    `;
    const result = await query(text);
    return result.rows;
  }

  // Buscar usuários recentes
  static async findRecent(limit = 10) {
    const text = `
      SELECT id, email, name, role, is_active, created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT $1
    `;
    const result = await query(text, [limit]);
    return result.rows;
  }

  // Buscar usuários por termo de pesquisa
  static async search(searchTerm) {
    const text = `
      SELECT id, email, name, role, is_active, created_at, updated_at
      FROM users 
      WHERE 
        name ILIKE $1 OR 
        email ILIKE $1
      ORDER BY name
    `;
    const result = await query(text, [`%${searchTerm}%`]);
    return result.rows;
  }

  // Verificar se email já existe (para validação)
  static async emailExists(email, excludeId = null) {
    let text = 'SELECT id FROM users WHERE email = $1';
    let values = [email];
    
    if (excludeId) {
      text += ' AND id != $2';
      values.push(excludeId);
    }
    
    const result = await query(text, values);
    return result.rows.length > 0;
  }

  // Estatísticas de usuários
  static async getStats() {
    const text = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
        COUNT(CASE WHEN last_login >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_last_30_days
      FROM users
    `;
    const result = await query(text);
    return result.rows[0];
  }
}

module.exports = User;

