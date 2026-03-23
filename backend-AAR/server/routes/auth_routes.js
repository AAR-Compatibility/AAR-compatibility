const router = require('express').Router();
const { login, getMe, createUser } = require('../controllers/auth.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.post('/users', requireAuth, requirePermission('user.create'), createUser);

module.exports = router;
