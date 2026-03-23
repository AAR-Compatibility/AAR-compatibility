// Specific search routes protected by auth and search permissions.
const express = require('express');
const router = express.Router();
const TankerController = require('../controllers/specific_search.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

// Step 1 -> 3 uses the same search permission.
router.get('/nations', requireAuth, requirePermission('operational.search'), TankerController.listNations);
router.get('/types', requireAuth, requirePermission('operational.search'), TankerController.listTypes);
router.get('/models', requireAuth, requirePermission('operational.search'), TankerController.listModels);

// Step 4 returns compatible receivers.
router.get('/receivers', requireAuth, requirePermission('operational.search'), TankerController.listCompatibleReceivers);

module.exports = router;
