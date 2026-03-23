// src/app.js
const express = require('express');
const path = require('path');
const routes = require('./server/routes/index.routes');
const requestlogger = require('./server/middlewares/requestlogger.middleware');
const errorMiddleware = require('./server/middlewares/error.middleware');
const authRoutes = require('./server/routes/auth_routes');
const app = express();
const cors = require('cors');


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'server/views')); // where your EJS files live


app.use(requestlogger);
app.use('/api/auth', authRoutes);
app.use('/', routes);
app.use(errorMiddleware);
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true, // optional if using auth cookies
}));

module.exports = app;
