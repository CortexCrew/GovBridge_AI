// Mock Auth Middleware until Member 1 completes Auth Module
function authMiddleware(req, res, next) {
  // In a real app, verify JWT here
  const token = req.headers.authorization;
  
  // Dummy user for testing
  req.user = {
    id: 1,
    role: 'citizen',
    email: 'test@example.com'
  };
  
  next();
}

module.exports = authMiddleware;
