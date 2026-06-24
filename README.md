# 🌾 Truy xuất nguồn gốc nông sản

Hệ thống **mã nguồn mở** giúp nông dân Việt Nam ghi nhận và chia sẻ thông tin nguồn gốc, quy trình sản xuất, chứng nhận của nông sản bằng **mã QR**. Người tiêu dùng chỉ cần quét QR trên bao bì là xem được toàn bộ "hành trình" của sản phẩm.

> Phù hợp với hợp tác xã, trang trại nhỏ, nhóm nông dân, cửa hàng nông sản sạch.

## ✨ Tính năng

### Tính năng cơ bản

- **Đăng ký / đăng nhập** với 2 vai trò: `nông dân` và `quản trị`.
- **Tạo lô sản phẩm**: tên, giống, ngày thu hoạch, sản lượng, vị trí trang trại, chứng nhận (VietGAP, GlobalGAP, hữu cơ...), ảnh.
- **Ghi nhận các công đoạn** (gieo trồng, chăm sóc, thu hoạch, đóng gói...) kèm ảnh và ngày tháng → tạo thành **timeline truy xuất**.
- **Sinh mã QR** tự động cho từng lô, tải về PNG để in lên bao bì/nhãn mác.
- **Trang truy xuất công khai** (không cần đăng nhập): người tiêu dùng quét QR hoặc nhập mã lô là xem được thông tin.
- **Giao diện mobile-first**, tiếng Việt, dùng Bootstrap 5 — dễ dùng trên điện thoại.
- **Cơ sở dữ liệu SQLite** file-based: không cần cài server DB, dễ sao lưu (chỉ copy 1 file).

### Tuân thủ Thông tư 31/2026/TT-BCT

Xem chi tiết: [`docs/THONG_TU_31.md`](docs/THONG_TU_31.md)

- **Hồ sơ thương nhân**: mã số thuế, giấy phép kinh doanh, loại hình (sản xuất/chế biến/kinh doanh/nhập khẩu)
- **Xác thực thương nhân**: admin duyệt trước khi được đăng sản phẩm
- **Mã định danh TTNS**: GTIN, GLN, mã vùng trồng, mã cơ sở
- **Workflow xuất bản**: `draft → pending → approved/rejected → ttns_registered`
- **Audit log**: ghi lại mọi thao tác tạo/sửa/xoá/duyệt (có old/new data)
- **Soft delete**: ẩn thay vì xoá cứng, giữ lịch sử kiểm toán
- **API xuất JSON** theo định dạng TTNS quốc gia để nhập lên hệ thống Bộ Công Thương

> ⚠️ Hệ thống này là **công cụ hỗ trợ tuân thủ**, không thay thế việc đăng ký trên Hệ thống TTNS quốc gia chính thức của Bộ Công Thương.

## 🧱 Công nghệ

| Thành phần | Lựa chọn |
|---|---|
| Backend | Node.js + Express |
| Database | SQLite (sqlite3) |
| View | EJS + Bootstrap 5 |
| Auth | Passport.js (local) + bcrypt |
| Upload | Multer |
| QR | qrcode |

Không cần bước build frontend, không cần Docker, không cần server DB.

## 🚀 Cài đặt & chạy (local)

Yêu cầu: **Node.js ≥ 18**.

```bash
# 1. Clone repo
git clone https://github.com/<ban>/truy-xuat-nong-san.git
cd truy-xuat-nong-san

# 2. Cài phụ thuộc
npm install

# 3. Tạo file cấu hình môi trường
cp .env.example .env
# (sửa SESSION_SECRET và BASE_URL cho phù hợp)

# 4. Khởi tạo cơ sở dữ liệu
npm run init-db

# 4b. (nếu nâng cấp từ phiên bản cũ) Migration Thông tư 31
npm run migrate

# 5. (tuỳ chọn) Nạp dữ liệu mẫu
npm run seed

# 6. Chạy
npm start
# hoặc: npm run dev (tự reload khi sửa code)
```

Mở http://localhost:3000.

### Tài khoản mẫu (sau khi `npm run seed`)

| Vai trò | Tài khoản | Mật khẩu |
|---|---|---|
| Quản trị | `admin` | `admin123` |
| Nông dân | `nongdan` | `nongdan123` |

> ⚠️ **Đổi mật khẩu ngay** khi deploy thật.

## 🌐 Deploy lên các nền tảng

Hệ thống dùng SQLite nên phù hợp với các nền tảng có **persistent disk**. Xem chi tiết trong [`docs/DEPLOY.md`](docs/DEPLOY.md):

- **VPS / máy chủ riêng** (khuyến nghị): Render, Railway, VPS Linux, Windows Server.
- **GitHub Pages**: KHÔNG dùng được (vì cần backend Node). Dùng cho landing page tĩnh nếu muốn.

### Quick deploy lên Render

1. Push code lên GitHub.
2. Tạo **Web Service** trên https://render.com, chọn repo.
3. Build command: `npm install`
4. Start command: `npm run init-db && npm start`
5. Thêm biến môi trường: `SESSION_SECRET`, `BASE_URL=https://<tên-app>.onrender.com`, `NODE_ENV=production`.
6. Thêm **Persistent Disk** (≥ 1GB) mount tại `/opt/render/project/src/data` để giữ DB khi redeploy.

## 📁 Cấu trúc thư mục

```
.
├── src/
│   ├── app.js              # Entry point Express
│   ├── config/             # Kết nối DB, cấu hình upload
│   ├── middleware/         # Auth (passport)
│   ├── models/             # User, Product
│   ├── routes/             # public, auth, farmer, admin
│   ├── scripts/            # init-db, seed
│   └── utils/              # qr generator
├── views/                  # EJS templates
│   ├── layouts/            # layout chính
│   ├── partials/           # navbar, flash
│   ├── auth/               # đăng nhập/đăng ký
│   ├── farmer/             # giao diện nông dân
│   ├── admin/              # giao diện quản trị
│   └── public/             # trang công khai
├── public/                 # CSS, ảnh tĩnh, uploads
├── data/                   # SQLite DB (không commit)
├── docs/                   # tài liệu
└── package.json
```

## 🤝 Đóng góp

PR và issue đều hoan nghênh. Đây là dự án cộng đồng vì nền nông nghiệp Việt Nam.

## 📜 Giấy phép

MIT — dùng tự do, kể cả thương mại. Xem [`LICENSE`](LICENSE).
