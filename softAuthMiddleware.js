import jwt from 'jsonwebtoken';

const softAuthenticate = (req, res, next) => {
  const token = req.cookies.token;

  if (token == null) {
    return next(); // No token, just continue
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next(); // Token invalid or valid, continue anyway
  });
};

export { softAuthenticate };
