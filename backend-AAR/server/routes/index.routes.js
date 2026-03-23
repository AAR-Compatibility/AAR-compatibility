const router = require('express').Router();

router.use('/tables', require('./tables_routes'));
router.use('/compatibility', require('./compatibility_routes'));
router.use('/api/viewer', require('./viewer_routes'));
router.use('/specific_search', require('./specific_search_routes'));
router.use('/search', require('./page_routes'));
router.use('/change', require('./change_routes'));
router.use('/', require('./home_routes'));
router.use('/api/srd', require('./srd_routes'));
router.use('/api/auth', require('./auth_routes'));

module.exports = router;
