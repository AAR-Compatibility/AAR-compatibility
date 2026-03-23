// Table routes protected by auth and read permissions.
// src/routes/tables.routes.js
const express = require('express');
const controller = require('../controllers/table.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

const router = express.Router();
const requireCompatibilityRead = [
  requireAuth,
  requirePermission('compatibility.read')
];

router.get('/tankers', requireCompatibilityRead, controller.getTankers);
router.get('/receivers', requireCompatibilityRead, controller.getReceivers);
router.get('/specifications', requireCompatibilityRead, controller.getSpecifications);
router.get('/compatibility', requireCompatibilityRead, controller.getCompatibility);

module.exports = router;
