const { dbAsync } = require('../config/database');

// Ghi log kiểm toán — không bao giờ ném lỗi ra ngoài route
async function log({ entityType, entityId, action, userId = null, oldData = null, newData = null, ipAddress = null }) {
  try {
    await dbAsync.run(
      `INSERT INTO audit_logs (entity_type, entity_id, action, user_id, old_data, new_data, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        entityType,
        entityId,
        action,
        userId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress,
      ]
    );
  } catch (e) {
    console.error('⚠️  Không ghi được audit log:', e.message);
  }
}

async function listByEntity(entityType, entityId) {
  return dbAsync.all(
    `SELECT a.*, u.full_name AS actor_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.entity_type = ? AND a.entity_id = ?
     ORDER BY a.created_at DESC`,
    [entityType, entityId]
  );
}

async function listAll(limit = 200) {
  return dbAsync.all(
    `SELECT a.*, u.full_name AS actor_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT ?`,
    [limit]
  );
}

module.exports = { log, listByEntity, listAll };
