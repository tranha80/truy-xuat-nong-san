const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Đảm bảo thư mục data tồn tại
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = process.env.DB_FILE || 'nongsan.db';
const dbPath = path.join(dataDir, dbFile);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Lỗi kết nối SQLite:', err.message);
  } else {
    console.log(`✅ Đã kết nối SQLite: ${dbPath}`);
  }
});

// Bật foreign keys
db.run('PRAGMA foreign_keys = ON;');

// Promisify để dùng async/await dễ hơn
const dbAsync = {
  all: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) =>
        err ? reject(err) : resolve(rows)
      );
    }),
  get: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) =>
        err ? reject(err) : resolve(row)
      );
    }),
  run: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
      });
    }),
};

module.exports = { db, dbAsync };
