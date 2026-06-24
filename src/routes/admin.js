const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { ensureAuth, ensureRole } = require("../middleware/auth");

router.use(ensureAuth, ensureRole("admin"));

router.get("/", async (req, res) => {
  const [products, users, stats] = await Promise.all([
    Product.listAll(),
    User.list(),
    Product.stats(),
  ]);
  res.render("admin/dashboard", { title: "Quản trị", products, users, stats });
});

// Quản lý người dùng
router.get("/nguoi-dung", async (req, res) => {
  const users = await User.list();
  res.render("admin/users", { title: "Người dùng", users });
});

router.post("/nguoi-dung", async (req, res) => {
  const {
    username,
    password,
    fullName,
    phone,
    role,
    taxCode,
    businessLicense,
    businessType,
  } = req.body;
  if (!username || !password || !fullName) {
    req.flash("error", "Thiếu thông tin.");
    return res.redirect("/quan-tri/nguoi-dung");
  }
  const existing = await User.findByUsername(username);
  if (existing) {
    req.flash("error", "Tên đăng nhập đã tồn tại.");
    return res.redirect("/quan-tri/nguoi-dung");
  }
  await User.create({
    username,
    password,
    fullName,
    phone,
    role: role || "farmer",
    taxCode,
    businessLicense,
    businessType: businessType || "production",
  });
  req.flash("success", "Đã tạo người dùng mới.");
  res.redirect("/quan-tri/nguoi-dung");
});

// Xác thực thương nhân
router.post("/nguoi-dung/:id/duyet", async (req, res) => {
  const { status, reason } = req.body;
  if (!["verified", "rejected"].includes(status)) {
    req.flash("error", "Trạng thái không hợp lệ.");
    return res.redirect("/quan-tri/nguoi-dung");
  }
  await User.setVerification(req.params.id, status, req.user.id, reason);
  req.flash(
    "success",
    `Đã ${status === "verified" ? "xác thực" : "từ chối"} thương nhân.`,
  );
  res.redirect("/quan-tri/nguoi-dung");
});

// Duyệt sản phẩm
router.post("/san-pham/:id/duyet", async (req, res) => {
  const { decision, reason } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) {
    req.flash("error", "Không tìm thấy sản phẩm.");
    return res.redirect("/quan-tri");
  }
  if (product.status !== "pending") {
    req.flash("error", "Chỉ duyệt sản phẩm đang chờ duyệt.");
    return res.redirect("/quan-tri");
  }
  if (decision === "approved") {
    await Product.approve(product.id, req.user.id);
    req.flash(
      "success",
      "Đã duyệt sản phẩm. Sản phẩm giờ có thể đăng ký TTNS.",
    );
  } else {
    await Product.reject(
      product.id,
      req.user.id,
      reason || "Không đạt yêu cầu.",
    );
    req.flash("success", "Đã từ chối sản phẩm.");
  }
  res.redirect("/quan-tri");
});

// Xoá cứng sản phẩm (chỉ admin, chỉ khi đã hidden)
router.delete("/san-pham/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    req.flash("error", "Không tìm thấy sản phẩm.");
    return res.redirect("/quan-tri");
  }
  if (product.status !== "hidden") {
    req.flash(
      "error",
      "Chỉ xoá cứng sản phẩm đã ẩn. Hãy yêu cầu nông dân ẩn trước.",
    );
    return res.redirect("/quan-tri");
  }
  await Product.hardDelete(product.id, req.user.id);
  req.flash("success", "Đã xoá cứng sản phẩm (có audit log).");
  res.redirect("/quan-tri");
});

// Nhật ký kiểm toán
router.get("/nhat-ky", async (req, res) => {
  const logs = await AuditLog.listAll(300);
  res.render("admin/audit", { title: "Nhật ký kiểm toán", logs });
});

module.exports = router;
