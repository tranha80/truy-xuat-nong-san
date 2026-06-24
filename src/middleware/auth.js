const User = require('../models/User');

// Passport strategy
function configure(passport) {
  const LocalStrategy = require('passport-local').Strategy;

  passport.use(
    new LocalStrategy(
      { usernameField: 'username' },
      async (username, password, done) => {
        try {
          const user = await User.findByUsername(username);
          if (!user) return done(null, false, { message: 'Tài khoản không tồn tại.' });

          const ok = await User.verify(password, user.password);
          if (!ok) return done(null, false, { message: 'Mật khẩu không đúng.' });

          return done(null, user);
        } catch (e) {
          return done(e);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (e) {
      done(e);
    }
  });
}

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash('error', 'Vui lòng đăng nhập để tiếp tục.');
  res.redirect('/dang-nhap');
}

function ensureRole(...roles) {
  return (req, res, next) => {
    if (req.isAuthenticated() && roles.includes(req.user.role)) return next();
    req.flash('error', 'Bạn không có quyền truy cập trang này.');
    res.redirect('/');
  };
}

module.exports = { configure, ensureAuth, ensureRole };
