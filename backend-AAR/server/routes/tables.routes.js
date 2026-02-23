// src/routes/tables.routes.js
const express = require('express');
const controller = require('../controllers/table.controller');

const router = express.Router();

router.get('/tankers', controller.getTankers);
router.get('/receivers', controller.getReceivers);
router.get('/specifications', controller.getSpecifications);
router.get('/compatibility', controller.getCompatibility);

module.exports = router;
