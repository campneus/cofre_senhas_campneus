const { query, transaction } = require('../config/database');

class PasswordGroup {
  // Criar grupo
  static async create(groupData) {
    const { name, description, color = '#FFD700' } = groupData;
    const text = `
      INSERT INTO password_groups (name, description, color)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [name, description, color];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Buscar grupo por ID
  static async findById(id) {
    const text = 'SELECT * FROM password_groups WHERE id = $1 AND is_active = true';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Buscar grupo por nome
  static async findByName(name) {
    const text = 'SELECT * FROM password_groups WHERE name = $1 AND is_active = true';
    const result = await query(text, [name]);
    return result.rows[0];
  }

  // Listar todos os grupos
  static async findAll() {
    const text = `
      SELECT 
        pg.*,
        COUNT(p.id) as password_count
      FROM password_groups pg
      LEFT JOIN passwords p ON pg.id = p.group_id AND p.is_active = true
      WHERE pg.is_active = true
      GROUP BY pg.id
      ORDER BY pg.name
    `;
    const result = await query(text);
    return result.rows;
  }

  // Listar grupos que o usuário tem acesso
  static async findByUserId(userId) {
    const text = `
      SELECT 
        pg.*,
        ugp.can_view,
        ugp.can_edit,
        ugp.can_delete,
        COUNT(p.id) as password_count
      FROM password_groups pg
      INNER JOIN user_group_permissions ugp ON pg.id = ugp.group_id
      LEFT JOIN passwords p ON pg.id = p.group_id AND p.is_active = true
      WHERE ugp.user_id = $1 AND pg.is_active = true
      GROUP BY pg.id, ugp.can_view, ugp.can_edit, ugp.can_delete
      ORDER BY pg.name
    `;
    const result = await query(text, [userId]);
    return result.rows;
  }

  // Atualizar grupo
  static async update(id, groupData) {
    const { name, description, color, is_active } = groupData;
    const text = `
      UPDATE password_groups 
      SET name = $2, description = $3, color = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const values = [id, name, description, color, is_active];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Desativar grupo (soft delete)
  static async deactivate(id) {
    const text = `
      UPDATE password_groups 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Adicionar usuário ao grupo com permissões
  static async addUser(groupId, userId, permissions = {}) {
    const { can_view = true, can_edit = false, can_delete = false } = permissions;
    const text = `
      INSERT INTO user_group_permissions (group_id, user_id, can_view, can_edit, can_delete)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, group_id) 
      DO UPDATE SET 
        can_view = $3,
        can_edit = $4,
        can_delete = $5
      RETURNING *
    `;
    const values = [groupId, userId, can_view, can_edit, can_delete];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Remover usuário do grupo
  static async removeUser(groupId, userId) {
    const text = 'DELETE FROM user_group_permissions WHERE group_id = $1 AND user_id = $2';
    const result = await query(text, [groupId, userId]);
    return result.rowCount > 0;
  }

  // Listar usuários do grupo com permissões
  static async getUsers(groupId) {
    const text = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        ugp.can_view,
        ugp.can_edit,
        ugp.can_delete,
        ugp.created_at as permission_granted_at
      FROM users u
      INNER JOIN user_group_permissions ugp ON u.id = ugp.user_id
      WHERE ugp.group_id = $1 AND u.is_active = true
      ORDER BY u.name
    `;
    const result = await query(text, [groupId]);
    return result.rows;
  }

  // Verificar se usuário tem permissão no grupo
  static async checkUserPermission(groupId, userId, permission = 'can_view') {
    const text = `
      SELECT ${permission}
      FROM user_group_permissions 
      WHERE group_id = $1 AND user_id = $2
    `;
    const result = await query(text, [groupId, userId]);
    return result.rows[0] ? result.rows[0][permission] : false;
  }

  // Estatísticas do grupo
  static async getStats() {
    const text = `
      SELECT 
        COUNT(*) as total_groups,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_groups,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_groups
      FROM password_groups
    `;
    const result = await query(text);
    return result.rows[0];
  }
}

module.exports = PasswordGroup;

