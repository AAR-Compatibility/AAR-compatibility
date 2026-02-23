const router = require('express').Router();

router.use('/tables', require('./tables.routes'));
router.use('/compatibility', require('./compatibility.routes'));
router.use('/specific_search', require('./specific_search.routes'));
router.use('/search', require('./pageRoutes'));
router.use('/change', require('./change.routes'));
router.use('/', require('./home.routes'));


module.exports = router;
