// src/controllers/tables.controller.js
const service = require('../services/tables.service');

exports.getTankers = async (req, res, next) => {
  try {
    const data = await service.getTankers();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

exports.getReceivers = async (req, res, next) => {
  try {
    const data = await service.getReceivers();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

exports.getSpecifications = async (req, res, next) => {
  try {
    const data = await service.getSpecifications();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

exports.getCompatibility = async (req, res, next) => {
  try {
    const data = await service.getCompatibility();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};
