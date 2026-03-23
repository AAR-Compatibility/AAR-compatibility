// RBAC middleware for JWT users and role-based permissions.
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'AAR_Compatibility_Project_SuperSecret_2026';

const ROLE_PERMISSIONS = {
  viewer: ['compatibility.read', 'operational.search'],
  srd_holder: [
    'compatibility.read',
    'operational.search',
    'change_request.create',
    'change_request.edit_own_draft',
    'change_request.submit',
    'change_request.comment',
    'request.new_aircraft',
    'request.update_existing',
    'request.delete_existing',
    'request.view_own'
  ],
  admin: [
    'compatibility.read',
    'operational.search',
    'change_request.comment',
    'request.view_own',
    'request.view_all',
    'request.review',
    'request.edit_during_review',
    'request.review_comment',
    'request.approve',
    'request.reject',
    'request.process_approved',
    'user.create'
  ]
};

// Normalizes any role value from token or database.
function normalizeRole(role) {
  if (!role || typeof role !== 'string') {
    return '';
  }
  return role.trim().toLowerCase();
}

// Checks if one role has a required permission.
function hasPermission(role, permission) {
  const normalizedRole = normalizeRole(role);
  const permissionList = ROLE_PERMISSIONS[normalizedRole] ?? [];
  return permissionList.includes(permission);
}

// Validates the Bearer token and sets the user on req.user.
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// Guards one route with a required RBAC permission.
function requirePermission(permission) {
  return function permissionMiddleware(req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Missing user role in token.' });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions.' });
    }

    return next();
  };
}

module.exports = { requireAuth, requirePermission };
