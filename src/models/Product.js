const { dbAsync } = require("../config/database");
const AuditLog = require("./AuditLog");

const Product = {
  async create({
    userId,
    name,
    category,
    variety,
    batchCode,
    harvestDate,
    quantity,
    unit,
    farmName,
    farmAddress,
    province,
    district,
    latitude,
    longitude,
    certifications,
    description,
    image,
    // Trường Thông tư 31
    gtinCode,
    glnCode,
    plantingAreaCode,
    facilityCode,
  }) {
    const result = await dbAsync.run(
      `INSERT INTO products
        (user_id, name, category, variety, batch_code, harvest_date,
         quantity, unit, farm_name, farm_address, province, district,
         latitude, longitude, certifications, description, image,
         gtin_code, gln_code, planting_area_code, facility_code,
         status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'))`,
      [
        userId,
        name,
        category,
        variety,
        batchCode,
        harvestDate,
        quantity,
        unit,
        farmName,
        farmAddress,
        province,
        district,
        latitude,
        longitude,
        certifications,
        description,
        image,
        gtinCode,
        glnCode,
        plantingAreaCode,
        facilityCode,
      ],
    );
    await AuditLog.log({
      entityType: "product",
      entityId: result.lastID,
      action: "create",
      userId,
      newData: { name, batchCode, gtinCode },
    });
    return result.lastID;
  },

  async findById(id) {
    const product = await dbAsync.get(
      `SELECT p.*, u.full_name AS farmer_name, u.phone AS farmer_phone,
              u.tax_code AS farmer_tax_code, u.business_license AS farmer_license,
              u.verification_status AS farmer_verification
       FROM products p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [id],
    );
    if (product) {
      product.stages = await dbAsync.all(
        "SELECT * FROM product_stages WHERE product_id = ? ORDER BY stage_order ASC",
        [id],
      );
    }
    return product;
  },

  async findByBatchCode(code) {
    return dbAsync.get("SELECT * FROM products WHERE batch_code = ?", [code]);
  },

  async listByUser(userId) {
    return dbAsync.all(
      "SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
    );
  },

  async listAll() {
    return dbAsync.all(
      `SELECT p.*, u.full_name AS farmer_name, u.verification_status AS farmer_verification
       FROM products p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`,
    );
  },

  // Chỉ cập nhật khi sản phẩm đang ở trạng thái draft/rejected
  // (sản phẩm đã approved/pending không sửa tự do — tuân thủ tính toàn vẹn dữ liệu TTNS)
  async update(id, fields, actorId = null) {
    const allowed = [
      "name",
      "category",
      "variety",
      "harvest_date",
      "quantity",
      "unit",
      "farm_name",
      "farm_address",
      "province",
      "district",
      "latitude",
      "longitude",
      "certifications",
      "description",
      "image",
      "gtin_code",
      "gln_code",
      "planting_area_code",
      "facility_code",
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
    await dbAsync.run(
      `UPDATE products SET ${sets.join(", ")} WHERE id = ?`,
      vals,
    );

    await AuditLog.log({
      entityType: "product",
      entityId: id,
      action: "update",
      userId: actorId,
      oldData: old,
      newData: fields,
    });
  },

  // KHÔNG xoá cứng — chỉ ẩn (soft delete) để giữ lịch sử kiểm toán
  async softDelete(id, actorId = null) {
    const old = await this.findById(id);
    await dbAsync.run(`UPDATE products SET status = 'hidden' WHERE id = ?`, [
      id,
    ]);
    await AuditLog.log({
      entityType: "product",
      entityId: id,
      action: "soft_delete",
      userId: actorId,
      oldData: { status: old?.status },
    });
  },

  // Admin mới được xoá cứng (chỉ khi đã hidden)
  async hardDelete(id, actorId = null) {
    await dbAsync.run("DELETE FROM product_stages WHERE product_id = ?", [id]);
    await dbAsync.run(
      "DELETE FROM product_verifications WHERE product_id = ?",
      [id],
    );
    await dbAsync.run("DELETE FROM products WHERE id = ?", [id]);
    await AuditLog.log({
      entityType: "product",
      entityId: id,
      action: "hard_delete",
      userId: actorId,
    });
  },

  async addStage({
    productId,
    stageName,
    stageOrder,
    performedAt,
    description,
    image,
    location,
  }) {
    const result = await dbAsync.run(
      `INSERT INTO product_stages
        (product_id, stage_name, stage_order, performed_at, description, image, location, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        productId,
        stageName,
        stageOrder,
        performedAt,
        description,
        image,
        location,
      ],
    );
    return result.lastID;
  },

  // Workflow TTNS: draft -> pending -> approved/rejected
  async submitForReview(id, actorId) {
    await dbAsync.run(
      `UPDATE products SET status = 'pending', rejection_reason = NULL WHERE id = ? AND status IN ('draft','rejected')`,
      [id],
    );
    await AuditLog.log({
      entityType: "product",
      entityId: id,
      action: "submit_review",
      userId: actorId,
    });
  },

  async approve(id, reviewerId) {
    await dbAsync.run(
      `UPDATE products SET status = 'approved', approved_by = ?, approved_at = datetime('now'), rejection_reason = NULL WHERE id = ?`,
      [reviewerId, id],
    );
    await dbAsync.run(
      `INSERT INTO product_verifications (product_id, reviewer_id, decision, created_at) VALUES (?, ?, 'approved', datetime('now'))`,
      [id, reviewerId],
    );
    await AuditLog.log({
      entityType: "product",
      entityId: id,
      action: "approve",
      userId: reviewerId,
    });
  },

  async reject(id, reviewerId, reason) {
    await dbAsync.run(
      `UPDATE products SET status = 'rejected', rejection_reason = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?`,
      [reason, reviewerId, id],
    );
    await dbAsync.run(
      `INSERT INTO product_verifications (product_id, reviewer_id, decision, reason, created_at) VALUES (?, ?, 'rejected', ?, datetime('now'))`,
      [id, reviewerId, reason],
    );
    await AuditLog.log({
      entityType: "product",
      entityId: id,
      action: "reject",
      userId: reviewerId,
      newData: { reason },
    });
  },

  // Đánh dấu đã đăng ký lên hệ thống TTNS quốc gia
  async markTtnsRegistered(id, actorId) {
    await dbAsync.run(
      `UPDATE products SET ttns_registered_at = datetime('now') WHERE id = ? AND status = 'approved'`,
      [id],
    );
    await AuditLog.log({
      entityType: "product",
      entityId: id,
      action: "ttns_register",
      userId: actorId,
    });
  },

  async stats() {
    const totalProducts = await dbAsync.get(
      "SELECT COUNT(*) AS c FROM products WHERE status != ?",
      ["hidden"],
    );
    const totalFarmers = await dbAsync.get(
      `SELECT COUNT(DISTINCT user_id) AS c FROM products WHERE status != 'hidden'`,
    );
    const totalStages = await dbAsync.get(
      "SELECT COUNT(*) AS c FROM product_stages",
    );
    const approved = await dbAsync.get(
      `SELECT COUNT(*) AS c FROM products WHERE status = 'approved'`,
    );
    const pending = await dbAsync.get(
      `SELECT COUNT(*) AS c FROM products WHERE status = 'pending'`,
    );
    return {
      products: totalProducts.c,
      farmers: totalFarmers.c,
      stages: totalStages.c,
      approved: approved.c,
      pending: pending.c,
    };
  },
};

module.exports = Product;
