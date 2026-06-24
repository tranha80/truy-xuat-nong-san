const path = require("path");
const fs = require("fs");
const { db } = require("../config/database");

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'farmer',
  -- Tuân thủ Thông tư 31: thông tin thương nhân
  tax_code TEXT,
  business_license TEXT,
  business_type TEXT NOT NULL DEFAULT 'production',
  -- production | processing | trading | import
  verification_status TEXT NOT NULL DEFAULT 'pending',
  -- pending | verified | rejected
  verified_at TEXT,
  verified_by INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  variety TEXT,
  batch_code TEXT UNIQUE NOT NULL,
  harvest_date TEXT,
  quantity REAL,
  unit TEXT,
  farm_name TEXT,
  farm_address TEXT,
  province TEXT,
  district TEXT,
  latitude REAL,
  longitude REAL,
  certifications TEXT,
  description TEXT,
  image TEXT,
  -- Tuân thủ Thông tư 31: mã định danh TTNS quốc gia
  gtin_code TEXT,
  gln_code TEXT,
  planting_area_code TEXT,
  facility_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  -- draft | pending | approved | rejected | hidden
  rejection_reason TEXT,
  approved_by INTEGER,
  approved_at TEXT,
  ttns_registered_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER DEFAULT 0,
  performed_at TEXT,
  description TEXT,
  image TEXT,
  location TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_batch ON products(batch_code);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_stages_product ON product_stages(product_id);

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

function init() {
  const dataDir = path.join(__dirname, "..", "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db.serialize(() => {
    db.exec(schema, (err) => {
      if (err) {
        console.error("❌ Lỗi tạo schema:", err.message);
        process.exit(1);
      }
      console.log(
        "✅ Đã khởi tạo cơ sở dữ liệu (đã bao gồm trường Thông tư 31).",
      );
      console.log("   Để cập nhật DB cũ, chạy: npm run migrate");
      process.exit(0);
    });
  });
}

init();
