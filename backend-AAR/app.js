// src/app.js
const express = require('express');
const path = require('path');
const routes = require('./server/routes/index.routes');
const requestlogger = require('./server/middlewares/requestlogger.middleware');
const errorMiddleware = require('./server/middlewares/error.middleware');
const authRoutes = require('./server/routes/auth.routes');
const app = express();

function getAllowedOrigins() {
  const rawOrigins = process.env.ALLOWED_ORIGINS || '';
  return rawOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function corsMiddleware(req, res, next) {
  const requestOrigin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (requestOrigin && (allowedOrigins.length === 0 || allowedOrigins.includes(requestOrigin))) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(corsMiddleware);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'server/views')); // where your EJS files live


app.use(requestlogger);
app.use('/api/auth', authRoutes);
app.use('/', routes);
app.use(errorMiddleware);

module.exports = app;
