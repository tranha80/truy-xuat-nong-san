const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF'));
};

const limitMB = parseInt(process.env.UPLOAD_LIMIT_MB || '5', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: limitMB * 1024 * 1024 },
});

module.exports = upload;
