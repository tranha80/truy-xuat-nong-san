const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const upload = require("../config/upload");
const { ensureAuth, ensureRole } = require("../middleware/auth");
const { requireVerifiedTrader } = require("../middleware/verified");
const { generateDataUrl } = require("../utils/qr");

router.use(ensureAuth, ensureRole("farmer", "admin"));

// Hồ sơ thương nhân (cập nhật MST, giấy phép, loại hình)
router.get("/ho-so", async (req, res) => {
  const user = await User.findById(req.user.id);
  res.render("farmer/profile", { title: "Hồ sơ thương nhân", profile: user });
});

router.post("/ho-so", async (req, res) => {
  const { fullName, phone, taxCode, businessLicense, businessType } = req.body;
  await User.updateProfile(
    req.user.id,
    {
      full_name: fullName,
      phone,
      tax_code: taxCode,
      business_license: businessLicense,
      business_type: businessType,
    },
    req.user.id,
  );
  req.flash(
    "success",
    "Đã cập nhật hồ sơ. Nếu bạn thay đổi MST/giấy phép, tài khoản sẽ cần được xác thực lại.",
  );
  res.redirect("/nong-dan/ho-so");
});

// Bảng điều khiển nông dân
router.get("/", async (req, res) => {
  const products = await Product.listByUser(req.user.id);
  const user = await User.findById(req.user.id);
  res.render("farmer/dashboard", { title: "Bảng điều khiển", products, user });
});

// Form tạo lô sản phẩm mới — chỉ thương nhân đã xác thực
router.get("/tao-moi", requireVerifiedTrader, (req, res) => {
  res.render("farmer/product-form", {
    title: "Tạo lô sản phẩm",
    product: null,
    action: "/nong-dan/tao-moi",
  });
});

router.post(
  "/tao-moi",
  requireVerifiedTrader,
  upload.single("image"),
  async (req, res) => {
    try {
      const b = req.body;
      const batchCode = (b.batchCode || "").trim() || `LO-${Date.now()}`;
      const existing = await Product.findByBatchCode(batchCode);
      if (existing) {
        req.flash("error", "Mã lô đã tồn tại, vui lòng chọn mã khác.");
        return res.redirect("/nong-dan/tao-moi");
      }
      const id = await Product.create({
        userId: req.user.id,
        name: b.name,
        category: b.category,
        variety: b.variety,
        batchCode,
        harvestDate: b.harvestDate,
        quantity: parseFloat(b.quantity) || 0,
        unit: b.unit,
        farmName: b.farmName,
        farmAddress: b.farmAddress,
        province: b.province,
        district: b.district,
        latitude: b.latitude ? parseFloat(b.latitude) : null,
        longitude: b.longitude ? parseFloat(b.longitude) : null,
        certifications: b.certifications,
        description: b.description,
        image: req.file ? `/uploads/${req.file.filename}` : null,
        gtinCode: b.gtinCode,
        glnCode: b.glnCode,
        plantingAreaCode: b.plantingAreaCode,
        facilityCode: b.facilityCode,
      });
      req.flash(
        "success",
        "Đã tạo lô sản phẩm (trạng thái: bản nháp). Gửi duyệt để xuất bản.",
      );
      res.redirect(`/nong-dan/san-pham/${id}`);
    } catch (e) {
      req.flash("error", e.message);
      res.redirect("/nong-dan/tao-moi");
    }
  },
);

// Chi tiết lô sản phẩm
router.get("/san-pham/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (
    !product ||
    (product.user_id !== req.user.id && req.user.role !== "admin")
  ) {
    req.flash("error", "Không có quyền truy cập.");
    return res.redirect("/nong-dan");
  }
  const traceUrl = `${res.locals.baseUrl}/san-pham/${product.id}`;
  const qrDataUrl = await generateDataUrl(traceUrl);
  res.render("farmer/product-detail", {
    title: product.name,
    product,
    qrDataUrl,
    traceUrl,
  });
});

// Sửa — chỉ cho phép khi đang draft/rejected
router.get("/san-pham/:id/sua", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (
    !product ||
    (product.user_id !== req.user.id && req.user.role !== "admin")
  ) {
    req.flash("error", "Không có quyền truy cập.");
    return res.redirect("/nong-dan");
  }
  if (!["draft", "rejected"].includes(product.status)) {
    req.flash(
      "error",
      "Sản phẩm đã gửi duyệt hoặc đã xuất bản — không thể sửa tự do (tuân thủ TTNS).",
    );
    return res.redirect(`/nong-dan/san-pham/${product.id}`);
  }
  res.render("farmer/product-form", {
    title: "Sửa sản phẩm",
    product,
    action: `/nong-dan/san-pham/${product.id}?_method=PUT`,
  });
});

router.put("/san-pham/:id", upload.single("image"), async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (
    !product ||
    (product.user_id !== req.user.id && req.user.role !== "admin")
  ) {
    req.flash("error", "Không có quyền truy cập.");
    return res.redirect("/nong-dan");
  }
  if (!["draft", "rejected"].includes(product.status)) {
    req.flash("error", "Không thể sửa sản phẩm đã gửi duyệt/xuất bản.");
    return res.redirect(`/nong-dan/san-pham/${product.id}`);
  }
  const b = req.body;
  await Product.update(
    product.id,
    {
      name: b.name,
      category: b.category,
      variety: b.variety,
      harvestDate: b.harvestDate,
      quantity: parseFloat(b.quantity) || 0,
      unit: b.unit,
      farmName: b.farmName,
      farmAddress: b.farmAddress,
      province: b.province,
      district: b.district,
      latitude: b.latitude ? parseFloat(b.latitude) : null,
      longitude: b.longitude ? parseFloat(b.longitude) : null,
      certifications: b.certifications,
      description: b.description,
      image: req.file ? `/uploads/${req.file.filename}` : product.image,
      gtin_code: b.gtinCode,
      gln_code: b.glnCode,
      planting_area_code: b.plantingAreaCode,
      facility_code: b.facilityCode,
    },
    req.user.id,
  );
  req.flash("success", "Đã cập nhật sản phẩm.");
  res.redirect(`/nong-dan/san-pham/${product.id}`);
});

// Gửi duyệt (draft/rejected -> pending)
router.post("/san-pham/:id/gui-duyet", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (
    !product ||
    (product.user_id !== req.user.id && req.user.role !== "admin")
  ) {
    req.flash("error", "Không có quyền.");
    return res.redirect("/nong-dan");
  }
  if (!["draft", "rejected"].includes(product.status)) {
    req.flash("error", "Chỉ sản phẩm bản nháp/bị từ chối mới được gửi duyệt.");
    return res.redirect(`/nong-dan/san-pham/${product.id}`);
  }
  await Product.submitForReview(product.id, req.user.id);
  req.flash("success", "Đã gửi sản phẩm cho quản trị viên duyệt.");
  res.redirect(`/nong-dan/san-pham/${product.id}`);
});

// Đánh dấu đã đăng ký lên hệ thống TTNS quốc gia (chỉ khi đã approved)
router.post("/san-pham/:id/dang-ky-ttns", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (
    !product ||
    (product.user_id !== req.user.id && req.user.role !== "admin")
  ) {
    req.flash("error", "Không có quyền.");
    return res.redirect("/nong-dan");
  }
  if (product.status !== "approved") {
    req.flash("error", "Chỉ sản phẩm đã được duyệt mới có thể đăng ký TTNS.");
    return res.redirect(`/nong-dan/san-pham/${product.id}`);
  }
  await Product.markTtnsRegistered(product.id, req.user.id);
  req.flash(
    "success",
    "Đã đánh dấu đăng ký TTNS quốc gia. Tải file JSON để nhập lên hệ thống Bộ Công Thương.",
  );
  res.redirect(`/nong-dan/san-pham/${product.id}`);
});

// Xoá (soft delete — ẩn, không xoá cứng)
router.delete("/san-pham/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (
    !product ||
    (product.user_id !== req.user.id && req.user.role !== "admin")
  ) {
    req.flash("error", "Không có quyền truy cập.");
    return res.redirect("/nong-dan");
  }
  await Product.softDelete(product.id, req.user.id);
  req.flash("success", "Đã ẩn sản phẩm (giữ lịch sử kiểm toán theo TTNS).");
  res.redirect("/nong-dan");
});

// Thêm công đoạn
router.post(
  "/san-pham/:id/cong-doan",
  upload.single("image"),
  async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (
      !product ||
      (product.user_id !== req.user.id && req.user.role !== "admin")
    ) {
      req.flash("error", "Không có quyền truy cập.");
      return res.redirect("/nong-dan");
    }
    const b = req.body;
    const order =
      parseInt(b.stageOrder, 10) || (product.stages?.length || 0) + 1;
    await Product.addStage({
      productId: product.id,
      stageName: b.stageName,
      stageOrder: order,
      performedAt: b.performedAt,
      description: b.description,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      location: b.location,
    });
    req.flash("success", "Đã thêm công đoạn.");
    res.redirect(`/nong-dan/san-pham/${product.id}`);
  },
);

module.exports = router;
