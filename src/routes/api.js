const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const { ensureAuth, ensureRole } = require('../middleware/auth');

// API xuất dữ liệu sản phẩm theo định dạng TTNS quốc gia
// Dùng để nhập (import) lên Hệ thống TTNS của Bộ Công Thương,
// hoặc trao đổi giữa các hệ thống thành viên.
//
// Tham khảo cấu trúc trường theo mô hình TTNS quốc gia (Bộ Công Thương):
// - Thương nhân: MST, giấy phép, loại hình
// - Sản phẩm: GTIN, GLN, mã vùng trồng, mã cơ sở
// - Quy trình: các công đoạn có thời gian & vị trí

router.get('/export/:id', ensureAuth, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

  // Chỉ chủ sở hữu hoặc admin mới được xuất
  if (product.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Không có quyền' });
  }

  const owner = await User.findById(product.user_id);

  const payload = {
    // ===== Thông tin thương nhân =====
    trader: {
      tax_code: owner.tax_code,
      business_license: owner.business_license,
      business_type: owner.business_type, // production | processing | trading | import
      full_name: owner.full_name,
      phone: owner.phone,
      verification_status: owner.verification_status,
    },
    // ===== Thông tin sản phẩm =====
    product: {
      gtin: product.gtin_code,
      gln: product.gln_code,
      name: product.name,
      category: product.category,
      variety: product.variety,
      batch_code: product.batch_code,
      harvest_date: product.harvest_date,
      quantity: product.quantity,
      unit: product.unit,
      certifications: product.certifications
        ? product.certifications.split(',').map((s) => s.trim())
        : [],
      description: product.description,
      image_url: product.image,
    },
    // ===== Thông tin vùng trồng / cơ sở =====
    origin: {
      planting_area_code: product.planting_area_code,
      facility_code: product.facility_code,
      farm_name: product.farm_name,
      farm_address: product.farm_address,
      province: product.province,
      district: product.district,
      latitude: product.latitude,
      longitude: product.longitude,
    },
    // ===== Quy trình truy xuất =====
    supply_chain: (product.stages || []).map((s) => ({
      stage: s.stage_name,
      order: s.stage_order,
      performed_at: s.performed_at,
      location: s.location,
      description: s.description,
      image_url: s.image,
    })),
    // ===== Trạng thái xác thực nội bộ =====
    verification: {
      status: product.status,
      approved_at: product.approved_at,
      ttns_registered_at: product.ttns_registered_at,
    },
    exported_at: new Date().toISOString(),
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="ttns-${product.batch_code}.json"`
  );
  res.json(payload);
});

module.exports = router;
