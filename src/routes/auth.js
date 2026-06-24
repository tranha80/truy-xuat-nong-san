const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const { ensureAuth } = require('../middleware/auth');

// Đăng nhập
router.get('/dang-nhap', (req, res) => {
  res.render('auth/login', { title: 'Đăng nhập' });
});

router.post(
  '/dang-nhap',
  passport.authenticate('local', {
    failureRedirect: '/dang-nhap',
    failureFlash: true,
  }),
  (req, res) => {
    if (req.user.role === 'admin') return res.redirect('/quan-tri');
    return res.redirect('/nong-dan');
  }
);

// Đăng xuất
router.get('/dang-xuat', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success', 'Đã đăng xuất.');
    res.redirect('/');
  });
});

// Đăng ký (chỉ cho farmer)
router.get('/dang-ky', (req, res) => {
  res.render('auth/register', { title: 'Đăng ký tài khoản' });
});

router.post('/dang-ky', async (req, res) => {
  const { username, password, password2, fullName, phone } = req.body;
  if (!username || !password || !fullName) {
    req.flash('error', 'Vui lòng điền đầy đủ thông tin.');
    return res.redirect('/dang-ky');
  }
  if (password !== password2) {
    req.flash('error', 'Mật khẩu xác nhận không khớp.');
    return res.redirect('/dang-ky');
  }
  const existing = await User.findByUsername(username);
  if (existing) {
    req.flash('error', 'Tên đăng nhập đã tồn tại.');
    return res.redirect('/dang-ky');
  }
  await User.create({ username, password, fullName, phone, role: 'farmer' });
  req.flash('success', 'Đăng ký thành công. Mời bạn đăng nhập.');
  res.redirect('/dang-nhap');
});

module.exports = router;
