# Hướng dẫn deploy

Hệ thống dùng **SQLite** (file-based) nên cần nền tảng có **persistent disk**. Dưới đây là các cách phổ biến.

## 1. VPS Linux (khuyến nghị cho production)

```bash
# Cài Node 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git

# Clone & chạy
git clone https://github.com/<ban>/truy-xuat-nong-san.git
cd truy-xuat-nong-san
npm install
cp .env.example .env
# sửa .env: SESSION_SECRET, BASE_URL=https://ten-mien-cua-ban.vn
npm run init-db
npm run seed   # chỉ lần đầu
npm start
```

Chạy ổn định với **PM2**:

```bash
npm install -g pm2
pm2 start src/app.js --name truyxuat
pm2 save
pm2 startup    # tự khởi động cùng server
```

Đặt nginx làm reverse proxy tới `localhost:3000` (xem `docs/nginx.conf`).

## 2. Render.com

1. Push code lên GitHub.
2. Tạo **Web Service** → chọn repo.
3. Build: `npm install`
4. Start: `npm run init-db && npm start`
5. Env vars:
   - `SESSION_SECRET=<chuỗi ngẫu nhiên dài>`
   - `BASE_URL=https://<tên>.onrender.com`
   - `NODE_ENV=production`
6. **Disk**: thêm Persistent Disk ≥ 1GB, mount path: `data`
   (để file SQLite không bị mất khi redeploy).

## 3. Railway.app

1. New Project → Deploy from GitHub repo.
2. Railway tự nhận Node.
3. Thêm biến môi trường như Render.
4. Thêm **Volume** mount tại `data`.

## 4. Fly.io

```bash
npm install -g flyctl
fly launch
fly volumes create nongsan_data --size 1
fly deploy
```
Trong `fly.toml`, mount volume vào `data`.

## ⚠️ Lưu ý bảo mật khi production

- Đổi `SESSION_SECRET` thành chuỗi ngẫu nhiên ≥ 64 ký tự.
- Đặt `NODE_ENV=production`.
- Đổi mật khẩu các tài khoản mẫu (`admin`, `nongdan`) hoặc xoá chúng sau khi tạo tài khoản thật.
- Bật HTTPS (Render/Railway tự có; VPS dùng Certbot + nginx).
- Sao lưu file `data/*.db` định kỳ.

## ❌ Không deploy được lên

- **GitHub Pages**: chỉ host tĩnh, không chạy Node.
- **Vercel/Netlify Functions (serverless)**: SQLite cần file persistent, không phù hợp.
