import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function getUserFromRequest(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}

export function requireAuth(handler) {
  return async (req, res) => {
    const user = getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }
    
    req.user = user;
    return handler(req, res);
  };
}

export function requireAdmin(handler) {
  return async (req, res) => {
    const user = getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso negato. Solo admin.' });
    }
    
    req.user = user;
    return handler(req, res);
  };
}
