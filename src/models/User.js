const bcrypt = require("bcryptjs");
const { dbAsync } = require("../config/database");
const AuditLog = require("./AuditLog");

const User = {
  async findById(id) {
    return dbAsync.get("SELECT * FROM users WHERE id = ?", [id]);
  },

  async findByUsername(username) {
    return dbAsync.get("SELECT * FROM users WHERE username = ?", [username]);
  },

  async create({
    username,
    password,
    fullName,
    phone,
    role = "farmer",
    taxCode = null,
    businessLicense = null,
    businessType = "production",
  }) {
    const hash = await bcrypt.hash(password, 10);
    const result = await dbAsync.run(
      `INSERT INTO users
        (username, password, full_name, phone, role,
         tax_code, business_license, business_type, verification_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [
        username,
        hash,
        fullName,
        phone,
        role,
        taxCode,
        businessLicense,
        businessType,
      ],
    );
    return result.lastID;
  },

  async verify(password, hash) {
    return bcrypt.compare(password, hash);
  },

  async list() {
    return dbAsync.all(
      `SELECT id, username, full_name, phone, role,
              tax_code, business_license, business_type,
              verification_status, verified_at, created_at
       FROM users ORDER BY id DESC`,
    );
  },

  // Cập nhật hồ sơ thương nhân (MST, giấy phép, loại hình)
  async updateProfile(id, fields, actorId = null) {
    const allowed = [
      "full_name",
      "phone",
      "tax_code",
      "business_license",
      "business_type",
    ];
    const sets = [];
    const vals = [];
    for (const k of allowed) {
      if (fields[k] !== undefined) {
        sets.push(`${k} = ?`);
        vals.push(fields[k]);
      }
    }
    if (sets.length === 0) return;

    const old = await this.findById(id);
    vals.push(id);
    await dbAsync.run(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, vals);

    // Khi thông tin thương nhân thay đổi → quay về trạng thái chờ xác thực
    if (
      sets.some(
        (s) =>
          s.startsWith("tax_code") ||
          s.startsWith("business_license") ||
          s.startsWith("business_type"),
      )
    ) {
      await dbAsync.run(
        `UPDATE users SET verification_status = 'pending', verified_at = NULL, verified_by = NULL WHERE id = ?`,
        [id],
      );
    }

    await AuditLog.log({
      entityType: "user",
      entityId: id,
      action: "update_profile",
      userId: actorId,
      oldData: old,
      newData: fields,
    });
  },

  // Admin xác thực thương nhân
  async setVerification(id, status, reviewerId, reason = null) {
    const old = await this.findById(id);
    await dbAsync.run(
      `UPDATE users SET verification_status = ?, verified_at = datetime('now'), verified_by = ?
       WHERE id = ?`,
      [status, reviewerId, id],
    );
    await AuditLog.log({
      entityType: "user",
      entityId: id,
      action: `verify_${status}`,
      userId: reviewerId,
      oldData: { verification_status: old?.verification_status },
      newData: { verification_status: status, reason },
    });
  },

  // Chỉ thương nhân đã xác thực mới được đăng sản phẩm lên TTNS
  async isVerified(id) {
    const u = await this.findById(id);
    return u && u.verification_status === "verified";
  },
};

module.exports = User;
