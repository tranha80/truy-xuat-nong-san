const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { generateDataUrl } = require("../utils/qr");

// Trang chủ
router.get("/", async (req, res) => {
  const stats = await Product.stats();
  const recent = (await Product.listAll())
    .filter((p) => p.status === "approved")
    .slice(0, 6);
  res.render("public/home", { title: "Trang chủ", stats, recent });
});

// Tra cứu theo mã lô
router.get("/tra-cuu", async (req, res) => {
  const code = (req.query.ma || "").trim();
  if (!code) {
    return res.render("public/search", {
      title: "Tra cứu nguồn gốc",
      product: null,
      code: "",
    });
  }
  const product = await Product.findByBatchCode(code);
  if (!product || !["approved"].includes(product.status)) {
    req.flash("error", `Không tìm thấy lô sản phẩm với mã: ${code}`);
    return res.render("public/search", {
      title: "Tra cứu nguồn gốc",
      product: null,
      code,
    });
  }
  const full = await Product.findById(product.id);
  res.render("public/search", {
    title: "Kết quả tra cứu",
    product: full,
    code,
  });
});

// Trang chi tiết công khai (link từ QR)
router.get("/san-pham/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || product.status !== "approved") {
    req.flash("error", "Sản phẩm không tồn tại hoặc chưa được xuất bản.");
    return res.redirect("/tra-cuu");
  }
  const traceUrl = `${res.locals.baseUrl}/san-pham/${product.id}`;
  const qrDataUrl = await generateDataUrl(traceUrl);
  res.render("public/product-detail", {
    title: product.name,
    product,
    qrDataUrl,
    traceUrl,
  });
});

// Tải QR code (data URL) cho sản phẩm
router.get("/san-pham/:id/qr", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).send("Không tìm thấy");
  const traceUrl = `${res.locals.baseUrl}/san-pham/${product.id}`;
  const dataUrl = await generateDataUrl(traceUrl);
  res.json({ qr: dataUrl, url: traceUrl });
});

module.exports = router;
