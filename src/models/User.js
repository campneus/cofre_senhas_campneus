const { query, transaction } = require('../config/database');

class User {
  // Criar usuário
  static async create(userData) {
    const { firebase_uid, email, name, role = 'user' } = userData;
    const text = `
      INSERT INTO users (firebase_uid, email, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [firebase_uid, email, name, role];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Buscar usuário por Firebase UID
  static async findByFirebaseUid(firebase_uid) {
    const text = 'SELECT * FROM users WHERE firebase_uid = $1 AND is_active = true';
    const result = await query(text, [firebase_uid]);
    return result.rows[0];
  }

  // Buscar usuário por email
  static async findByEmail(email) {
    const text = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const result = await query(text, [email]);
    return result.rows[0];
  }

  // Buscar usuário por ID
  static async findById(id) {
    const text = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Listar todos os usuários
  static async findAll() {
    const text = `
      SELECT id, email, name, role, is_active, created_at, updated_at
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
      RETURNING *
    `;
    const values = [id, name, role, is_active];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Desativar usuário (soft delete)
  static async deactivate(id) {
    const text = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
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
}

module.exports = User;

