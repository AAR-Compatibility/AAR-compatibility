const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const JWT_SECRET = process.env.JWT_SECRET || 'AAR_Compatibility_Project_SuperSecret_2026';
const CREATABLE_ROLES = new Set(['viewer', 'srd_holder']);

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const result = await pool.query(
      `
      SELECT u."UserID", u."name", u."email", u."password_hash",
             r."name" AS role
      FROM "User" u
      JOIN "Rol" r ON r."RolID" = u."RolRolID"
      WHERE u."email" = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = {
      sub: user.UserID,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    return res.json({
      token,
      user: {
        id: user.UserID,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return next(err);
  }
}

function getMe(req, res) {
  return res.json({ user: req.user });
}

// Creates a new user account and stores the password as a bcrypt hash.
async function createUser(req, res, next) {
  try {
    const { email, password, role, name } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role).trim().toLowerCase();

    if (!CREATABLE_ROLES.has(normalizedRole)) {
      return res.status(400).json({ message: 'Role must be viewer or srd_holder.' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
    }

    const roleResult = await pool.query(
      'SELECT "RolID" FROM "Rol" WHERE "name" = $1',
      [normalizedRole]
    );

    if (roleResult.rowCount === 0) {
      return res.status(400).json({ message: 'Role not found in database.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const defaultName = normalizedEmail.split('@')[0] || normalizedRole;
    const normalizedName = name && String(name).trim().length > 0 ? String(name).trim() : defaultName;

    const insertResult = await pool.query(
      `
      INSERT INTO "User" ("name", "email", "RolRolID", "password_hash")
      VALUES ($1, $2, $3, $4)
      RETURNING "UserID", "name", "email"
      `,
      [normalizedName, normalizedEmail, roleResult.rows[0].RolID, passwordHash]
    );

    const user = insertResult.rows[0];
    return res.status(201).json({
      user: {
        id: user.UserID,
        name: user.name,
        email: user.email,
        role: normalizedRole,
      },
    });
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ message: 'Email already exists.' });
    }
    return next(err);
  }
}

module.exports = { login, getMe, createUser };
