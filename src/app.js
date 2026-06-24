require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const passport = require("passport");
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require("method-override");

const { configure: configureAuth } = require("./middleware/auth");
const { db } = require("./config/database");

const app = express();

// Cấu hình view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.set("layout", "layouts/main");
app.use(expressLayouts);

// Middleware cơ bản
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "..", "public")));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "bi-doi-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 giờ
      httpOnly: true,
    },
  }),
);

// Flash + passport
app.use(flash());
configureAuth(passport);
app.use(passport.initialize());
app.use(passport.session());

// Biến toàn cục cho view
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.baseUrl =
    process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  res.locals.success_msg = req.flash("success");
  res.locals.error_msg = req.flash("error");
  next();
});

// Routes
app.use("/", require("./routes/public"));
app.use("/", require("./routes/auth"));
app.use("/nong-dan", require("./routes/farmer"));
app.use("/quan-tri", require("./routes/admin"));
app.use("/api", require("./routes/api"));

// 404
app.use((req, res) => {
  res.status(404).render("public/404", { title: "Không tìm thấy trang" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Lỗi:", err.message);
  req.flash("error", err.message || "Đã có lỗi xảy ra.");
  res.redirect("back");
});

// Tự động khởi tạo DB nếu chưa có bảng users
db.get(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
  (err, row) => {
    if (err) {
      console.error("❌ Lỗi kiểm tra DB:", err.message);
      return;
    }
    if (!row) {
      console.log("⚠️  Cơ sở dữ liệu chưa khởi tạo. Chạy: npm run init-db");
    }
  },
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌾 Hệ thống truy xuất nguồn gốc nông sản`);
  console.log(`   Đang chạy tại: http://localhost:${PORT}\n`);
});

module.exports = app;
