import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (token == null) {
    // For web pages, redirect to signin
    if (req.accepts('html')) {
      return res.redirect('/signin?error=You+must+be+logged+in');
    }
    // For API requests, send 401
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (req.accepts('html')) {
        return res.redirect('/signin?error=Invalid+session');
      }
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

export default authenticateToken;