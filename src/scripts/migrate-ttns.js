const { db, dbAsync } = require('../config/database');

// Migration: bổ sung trường tuân thủ Thông tư 31/2026/TT-BCT
// Chạy an toàn nhiều lần (idempotent) — dùng ALTER TABLE ADD COLUMN,
// bỏ qua nếu cột đã tồn tại.

const migrations = [
  // ---- users: thông tin thương nhân ----
  `ALTER TABLE users ADD COLUMN tax_code TEXT`,
  `ALTER TABLE users ADD COLUMN business_license TEXT`,
  `ALTER TABLE users ADD COLUMN business_type TEXT DEFAULT 'production'`,
  // production | processing | trading | import
  `ALTER TABLE users ADD COLUMN verification_status TEXT DEFAULT 'pending'`,
  // pending | verified | rejected
  `ALTER TABLE users ADD COLUMN verified_at TEXT`,
  `ALTER TABLE users ADD COLUMN verified_by INTEGER`,

  // ---- products: mã định danh TTNS quốc gia ----
  `ALTER TABLE products ADD COLUMN gtin_code TEXT`,
  // Mã GTIN-13/14 của sản phẩm
  `ALTER TABLE products ADD COLUMN gln_code TEXT`,
  // Global Location Number — mã định danh vị trí
  `ALTER TABLE products ADD COLUMN planting_area_code TEXT`,
  // Mã số vùng trồng (theo Bộ NN&PTNT)
  `ALTER TABLE products ADD COLUMN facility_code TEXT`,
  // Mã cơ sở sản xuất/chế biến
  `ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'draft'`,
  // draft | pending | approved | rejected | hidden
  `ALTER TABLE products ADD COLUMN rejection_reason TEXT`,
  `ALTER TABLE products ADD COLUMN approved_by INTEGER`,
  `ALTER TABLE products ADD COLUMN approved_at TEXT`,
  `ALTER TABLE products ADD COLUMN ttns_registered_at TEXT`,
  // Thời điểm đã đăng ký lên hệ thống TTNS quốc gia
];

const newTables = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  user_id INTEGER,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

CREATE TABLE IF NOT EXISTS product_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  reviewer_id INTEGER NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_verif_product ON product_verifications(product_id);
`;

function columnExists(table, column) {
  return new Promise((resolve) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) return resolve(false);
      resolve(rows.some((r) => r.name === column));
    });
  });
}

async function run() {
  // Tạo bảng mới
  await new Promise((resolve, reject) => {
    db.exec(newTables, (err) => (err ? reject(err) : resolve()));
  });
  console.log('✅ Đã tạo bảng audit_logs, product_verifications');

  // ALTER TABLE từng cột (bỏ qua nếu đã có)
  for (const sql of migrations) {
    const match = sql.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/);
    if (!match) continue;
    const [, table, column] = match;
    const exists = await columnExists(table, column);
    if (exists) {
      console.log(`   • ${table}.${column} đã tồn tại, bỏ qua.`);
      continue;
    }
    await new Promise((resolve, reject) => {
      db.run(sql, (err) => (err ? reject(err) : resolve()));
    });
    console.log(`   + ${table}.${column}`);
  }

  console.log('\n✅ Migration Thông tư 31 hoàn tất.');
  process.exit(0);
}

run().catch((e) => {
  console.error('❌ Lỗi migration:', e.message);
  process.exit(1);
});
