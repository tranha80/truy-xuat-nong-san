# Tuân thủ Thông tư 31/2026/TT-BCT

> ⚠️ **Quan trọng**: Hệ thống này là **công cụ hỗ trợ tuân thủ**, KHÔNG thay thế
> Hệ thống TTNS quốc gia do Bộ Công Thương vận hành. Thương nhân bắt buộc vẫn phải
> đăng ký tài khoản và xác thực trên hệ thống chính thức của Bộ Công Thương.

## 1. Mô hình hoạt động

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Nông dân/HTX   │────▶│  Hệ thống này    │────▶│  Hệ thống TTNS      │
│  (thương nhân)  │     │  (quản lý nội bộ)│     │  quốc gia (BCT)     │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
   Cập nhật hồ sơ         Workflow:               Xuất JSON → nhập lên
   Tạo lô sản phẩm        draft → pending         hệ thống Bộ Công Thương
   Ghi công đoạn          → approved/rejected
                          Audit log đầy đủ
```

## 2. Các tính năng tuân thủ đã tích hợp

### 2.1. Hồ sơ thương nhân (đăng ký tài khoản)
- **Mã số thuế** (bắt buộc)
- **Số giấy phép kinh doanh**
- **Loại hình thương nhân**: `production` | `processing` | `trading` | `import`
- **Trạng thái xác thực**: `pending` → `verified` / `rejected` (do admin duyệt)
- Khi thay đổi MST/giấy phép → tự động quay về `pending` để duyệt lại

### 2.2. Mã định danh sản phẩm (theo chuẩn GS1 / TTNS)
- **GTIN** (Global Trade Item Number) — mã sản phẩm
- **GLN** (Global Location Number) — mã vị trí
- **Mã số vùng trồng** (theo Bộ NN&PTNT)
- **Mã cơ sở sản xuất/chế biến**

### 2.3. Workflow xuất bản (đảm bảo tính toàn vẹn dữ liệu)
```
draft ──submit──▶ pending ──approve──▶ approved ──register──▶ ttns_registered
   ▲                 │
   │              reject
   └─────────────────┘  (rejection_reason)
```
- Sản phẩm ở trạng thái `pending` / `approved` **không được sửa tự do**
- Chỉ `draft` / `rejected` mới sửa được
- Mỗi lần duyệt/từ chối đều lưu vào `product_verifications`

### 2.4. Audit log (nhật ký kiểm toán)
Bảng `audit_logs` ghi lại mọi thao tác:
- `create`, `update`, `soft_delete`, `hard_delete` (sản phẩm)
- `update_profile`, `verify_verified`, `verify_rejected` (người dùng)
- `submit_review`, `approve`, `reject`, `ttns_register` (workflow)
- Lưu cả `old_data` và `new_data` (JSON), IP, người thực hiện, thời gian

### 2.5. Soft delete (không xoá cứng)
- Nông dân "ẩn" sản phẩm → `status = 'hidden'` (giữ lịch sử)
- Chỉ admin mới xoá cứng, và chỉ khi sản phẩm đã `hidden`
- Mọi xoá đều có audit log

### 2.6. API xuất dữ liệu theo định dạng TTNS
`GET /api/export/:id` (cần đăng nhập, chủ sở hữu hoặc admin)

Trả JSON cấu trúc:
```json
{
  "trader": { "tax_code", "business_license", "business_type", ... },
  "product": { "gtin", "gln", "name", "batch_code", ... },
  "origin": { "planting_area_code", "facility_code", "province", ... },
  "supply_chain": [ { "stage", "performed_at", "location", ... } ],
  "verification": { "status", "approved_at", "ttns_registered_at" }
}
```
File này dùng để **nhập (import) lên Hệ thống TTNS quốc gia** của Bộ Công Thương.

### 2.7. Phân quyền pháp lý
- `farmer` (thương nhân): tạo/sửa sản phẩm của mình, gửi duyệt
- `admin` (quản trị): xác thực thương nhân, duyệt sản phẩm, xem audit log, xoá cứng
- Middleware `requireVerifiedTrader`: chỉ thương nhân đã xác thực mới tạo được sản phẩm

## 3. Quy trình vận hành khuyến nghị

1. **Nông dân** đăng ký tài khoản → điền MST + giấy phép → chờ admin xác thực
2. **Admin** kiểm tra MST với cơ quan thuế → duyệt `verified`
3. **Nông dân** tạo lô sản phẩm (điền GTIN, mã vùng trồng...) → `draft`
4. **Nông dân** gửi duyệt → `pending`
5. **Admin** kiểm tra thông tin → `approved` (hoặc `rejected` kèm lý do)
6. **Nông dân** tải JSON → nhập lên **Hệ thống TTNS quốc gia** của Bộ Công Thương
7. **Nông dân** đánh dấu `ttns_registered` + in QR dán lên bao bì
8. **Người tiêu dùng** quét QR → xem trang truy xuất công khai

## 4. Những gì hệ thống NÀY không làm được

- Không trực tiếp kết nối API 2 chiều với hệ thống TTNS quốc gia (cần đăng ký đối tác với BCT)
- Không thay thế việc đăng ký tài khoản chính thức trên hệ thống BCT
- Không cấp mã GTIN/GLN (phải đăng ký với GS1 Việt Nam)
- Không thay thế cơ quan kiểm định cho chứng nhận VietGAP/GlobalGAP

## 5. Nâng cấp trong tương lai (khi BCT công bố API)

- Tích hợp OAuth2 / API key với hệ thống TTNS quốc gia
- Đồng bộ tự động (webhook) thay vì xuất JSON thủ công
- Tra cứu ngược: kiểm tra sản phẩm đã đăng trên TTNS quốc gia chưa
- Hỗ trợ chữ ký số (USB Token) cho xác thực pháp lý
