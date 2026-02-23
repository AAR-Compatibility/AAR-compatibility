// src/app.js
const express = require('express');
const path = require('path');
const routes = require('./server/routes/index.routes');
const requestlogger = require('./server/middlewares/requestlogger.middleware');
const errorMiddleware = require('./server/middlewares/error.middleware');
const app = express();


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'server/views')); // where your EJS files live


app.use(requestlogger);
app.use('/', routes);
app.use(errorMiddleware);

module.exports = app;
