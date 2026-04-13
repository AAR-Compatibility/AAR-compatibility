const router = require('express').Router();

router.use('/tables', require('./tables.routes'));
router.use('/compatibility', require('./compatibility.routes'));
router.use('/api/change-requests', require('./change.routes'));
router.use('/api/viewer', require('./viewer.routes'));
router.use('/specific_search', require('./specific_search.routes'));
router.use('/search', require('./pageRoutes'));
router.use('/', require('./home.routes'));
router.use('/srd', require('./srd_routes'));


module.exports = router;
