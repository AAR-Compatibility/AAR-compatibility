// src/services/tables.service.js
const pool = require('../config/db');

exports.getTankers = async () => {
  const result = await pool.query('SELECT * FROM tankers');
  return result.rows;
};

exports.getReceivers = async () => {
  const result = await pool.query('SELECT * FROM receivers');
  return result.rows;
};

exports.getSpecifications = async () => {
  const result = await pool.query('SELECT * FROM specifications');
  return result.rows;
};

exports.getCompatibility = async () => {
  const result = await pool.query('SELECT * FROM compatibility');
  return result.rows;
};
