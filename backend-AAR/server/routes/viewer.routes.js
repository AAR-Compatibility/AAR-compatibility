// Viewer routes with auth + RBAC guard per action.
const router = require('express').Router();
const controller = require('../controllers/viewer.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/options', requireAuth, requirePermission('operational.search'), controller.getOptions);
router.post('/search', requireAuth, requirePermission('operational.search'), controller.search);
router.post('/submit', requireAuth, requirePermission('change_request.submit'), controller.submit);

module.exports = router;
