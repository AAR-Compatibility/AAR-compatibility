const router = require('express').Router();
const controller = require('../controllers/viewer.controller');

router.get('/options', controller.getOptions);
router.post('/search', controller.search);
router.post('/submit', controller.submit);

module.exports = router;
