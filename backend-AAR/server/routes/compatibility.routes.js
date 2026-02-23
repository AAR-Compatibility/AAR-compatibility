const router = require('express').Router();
const controller = require('../controllers/compatibility.controller');

router.post('/submit', controller.submitCompatibility);
//router.post('/search', controller.searchCompatibility);

module.exports = router;
