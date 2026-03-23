// Compatibility routes protected by auth and request-submit permission.
const router = require('express').Router();
const controller = require('../controllers/compatibility.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

router.post('/submit', requireAuth, requirePermission('change_request.submit'), controller.submitCompatibility);
//router.post('/search', controller.searchCompatibility);

module.exports = router;
