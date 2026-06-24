const User = require('../models/User');

// Chỉ cho phép thương nhân đã được xác thực thực hiện hành động đăng sản phẩm
async function requireVerifiedTrader(req, res, next) {
  try {
    const verified = await User.isVerified(req.user.id);
    if (!verified) {
      req.flash(
        'error',
        'Tài khoản của bạn chưa được xác thực thương nhân. Vui lòng cập nhật mã số thuế / giấy phép kinh doanh và chờ quản trị viên duyệt.'
      );
      return res.redirect('/nong-dan/ho-so');
    }
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { requireVerifiedTrader };
