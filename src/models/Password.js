const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');

class Password {
  // Criptografar senha
  static async encryptPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Descriptografar senha (verificar)
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Criar senha
  static async create(passwordData, userId) {
    const { title, username, password_value, url, notes, group_id } = passwordData;
    
    return await transaction(async (client) => {
      // Inserir senha
      const passwordText = `
        INSERT INTO passwords (title, username, password_value, url, notes, group_id, created_by, last_modified_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING *
      `;
      const passwordValues = [title, username, password_value, url, notes, group_id, userId];
      const passwordResult = await client.query(passwordText, passwordValues);
      const newPassword = passwordResult.rows[0];

      // Registrar log
      const logText = `
        INSERT INTO password_logs (password_id, user_id, action, new_values)
        VALUES ($1, $2, 'create', $3)
      `;
      const logValues = [
        newPassword.id,
        userId,
        JSON.stringify({ title, username, url, notes, group_id })
      ];
      await client.query(logText, logValues);

      return newPassword;
    });
  }

  // Buscar senha por ID
  static async findById(id, userId = null) {
    let text = `
      SELECT 
        p.*,
        pg.name as group_name,
        pg.color as group_color,
        u1.name as created_by_name,
        u2.name as last_modified_by_name
      FROM passwords p
      LEFT JOIN password_groups pg ON p.group_id = pg.id
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.last_modified_by = u2.id
      WHERE p.id = $1 AND p.is_active = true
    `;
    
    const values = [id];
    
    // Se userId fornecido, verificar permissão
    if (userId) {
      text += `
        AND EXISTS (
          SELECT 1 FROM user_group_permissions ugp 
          WHERE ugp.group_id = p.group_id 
          AND ugp.user_id = $2 
          AND ugp.can_view = true
        )
      `;
      values.push(userId);
    }
    
    const result = await query(text, values);
    return result.rows[0];
  }

  // Listar senhas por grupo
  static async findByGroupId(groupId, userId = null) {
    let text = `
      SELECT 
        p.id,
        p.title,
        p.username,
        p.url,
        p.notes,
        p.created_at,
        p.updated_at,
        pg.name as group_name,
        pg.color as group_color,
        u1.name as created_by_name,
        u2.name as last_modified_by_name
      FROM passwords p
      LEFT JOIN password_groups pg ON p.group_id = pg.id
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.last_modified_by = u2.id
      WHERE p.group_id = $1 AND p.is_active = true
    `;
    
    const values = [groupId];
    
    // Se userId fornecido, verificar permissão
    if (userId) {
      text += `
        AND EXISTS (
          SELECT 1 FROM user_group_permissions ugp 
          WHERE ugp.group_id = p.group_id 
          AND ugp.user_id = $2 
          AND ugp.can_view = true
        )
      `;
      values.push(userId);
    }
    
    text += ' ORDER BY p.title';
    
    const result = await query(text, values);
    return result.rows;
  }

  // Listar todas as senhas que o usuário tem acesso
  static async findByUserId(userId) {
    const text = `
      SELECT 
        p.id,
        p.title,
        p.username,
        p.url,
        p.notes,
        p.created_at,
        p.updated_at,
        pg.name as group_name,
        pg.color as group_color,
        u1.name as created_by_name,
        u2.name as last_modified_by_name,
        ugp.can_view,
        ugp.can_edit,
        ugp.can_delete
      FROM passwords p
      INNER JOIN password_groups pg ON p.group_id = pg.id
      INNER JOIN user_group_permissions ugp ON pg.id = ugp.group_id
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.last_modified_by = u2.id
      WHERE ugp.user_id = $1 AND ugp.can_view = true AND p.is_active = true
      ORDER BY pg.name, p.title
    `;
    const result = await query(text, [userId]);
    return result.rows;
  }

  // Buscar senhas (com filtros)
  static async search(filters, userId = null) {
    let text = `
      SELECT 
        p.id,
        p.title,
        p.username,
        p.url,
        p.notes,
        p.created_at,
        p.updated_at,
        pg.name as group_name,
        pg.color as group_color,
        u1.name as created_by_name,
        u2.name as last_modified_by_name
      FROM passwords p
      LEFT JOIN password_groups pg ON p.group_id = pg.id
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.last_modified_by = u2.id
      WHERE p.is_active = true
    `;
    
    const values = [];
    let paramCount = 0;

    // Filtro por termo de busca
    if (filters.search) {
      paramCount++;
      text += ` AND (p.title ILIKE $${paramCount} OR p.username ILIKE $${paramCount} OR p.url ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }

    // Filtro por grupo
    if (filters.group_id) {
      paramCount++;
      text += ` AND p.group_id = $${paramCount}`;
      values.push(filters.group_id);
    }

    // Se userId fornecido, verificar permissão
    if (userId) {
      paramCount++;
      text += `
        AND EXISTS (
          SELECT 1 FROM user_group_permissions ugp 
          WHERE ugp.group_id = p.group_id 
          AND ugp.user_id = $${paramCount} 
          AND ugp.can_view = true
        )
      `;
      values.push(userId);
    }

    text += ' ORDER BY pg.name, p.title';

    const result = await query(text, values);
    return result.rows;
  }

  // Atualizar senha
  static async update(id, passwordData, userId) {
    const { title, username, password_value, url, notes, group_id } = passwordData;
    
    return await transaction(async (client) => {
      // Buscar dados antigos para log
      const oldDataResult = await client.query('SELECT * FROM passwords WHERE id = $1', [id]);
      const oldData = oldDataResult.rows[0];

      // Atualizar senha
      const updateText = `
        UPDATE passwords 
        SET title = $2, username = $3, password_value = $4, url = $5, notes = $6, 
            group_id = $7, last_modified_by = $8, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const updateValues = [id, title, username, password_value, url, notes, group_id, userId];
      const updateResult = await client.query(updateText, updateValues);
      const updatedPassword = updateResult.rows[0];

      // Registrar log
      const logText = `
        INSERT INTO password_logs (password_id, user_id, action, old_values, new_values)
        VALUES ($1, $2, 'update', $3, $4)
      `;
      const logValues = [
        id,
        userId,
        JSON.stringify({
          title: oldData.title,
          username: oldData.username,
          url: oldData.url,
          notes: oldData.notes,
          group_id: oldData.group_id
        }),
        JSON.stringify({ title, username, url, notes, group_id })
      ];
      await client.query(logText, logValues);

      return updatedPassword;
    });
  }

  // Desativar senha (soft delete)
  static async deactivate(id, userId) {
    return await transaction(async (client) => {
      // Buscar dados para log
      const oldDataResult = await client.query('SELECT * FROM passwords WHERE id = $1', [id]);
      const oldData = oldDataResult.rows[0];

      // Desativar senha
      const deleteText = `
        UPDATE passwords 
        SET is_active = false, last_modified_by = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const deleteResult = await client.query(deleteText, [id, userId]);

      // Registrar log
      const logText = `
        INSERT INTO password_logs (password_id, user_id, action, old_values)
        VALUES ($1, $2, 'delete', $3)
      `;
      const logValues = [
        id,
        userId,
        JSON.stringify({
          title: oldData.title,
          username: oldData.username,
          url: oldData.url,
          notes: oldData.notes,
          group_id: oldData.group_id
        })
      ];
      await client.query(logText, logValues);

      return deleteResult.rows[0];
    });
  }

  // Registrar visualização de senha
  static async logView(passwordId, userId, ipAddress = null, userAgent = null) {
    const text = `
      INSERT INTO password_logs (password_id, user_id, action, ip_address, user_agent)
      VALUES ($1, $2, 'view', $3, $4)
    `;
    const values = [passwordId, userId, ipAddress, userAgent];
    await query(text, values);
  }

  // Buscar logs de uma senha
  static async getLogs(passwordId, limit = 50) {
    const text = `
      SELECT 
        pl.*,
        u.name as user_name,
        u.email as user_email
      FROM password_logs pl
      LEFT JOIN users u ON pl.user_id = u.id
      WHERE pl.password_id = $1
      ORDER BY pl.created_at DESC
      LIMIT $2
    `;
    const result = await query(text, [passwordId, limit]);
    return result.rows;
  }

  // Estatísticas de senhas
  static async getStats() {
    const text = `
      SELECT 
        COUNT(*) as total_passwords,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_passwords,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_passwords,
        COUNT(DISTINCT group_id) as groups_with_passwords
      FROM passwords
    `;
    const result = await query(text);
    return result.rows[0];
  }
}

module.exports = Password;

