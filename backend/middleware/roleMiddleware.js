const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated' });
    }
    return next();
  };
};

module.exports = roleMiddleware;
