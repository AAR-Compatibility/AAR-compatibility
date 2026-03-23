// server/routes/specific_search.pages.routes.js
const express = require('express');
const router = express.Router();
const TankerPageController = require('../controllers/specific_search_page.controller');

// Browser-rendered pages (EJS)
router.get('/nations', TankerPageController.showNations);
router.get('/nations/:nation/types', TankerPageController.showTypes);
router.get('/nations/:nation/types/:type/models', TankerPageController.showModels);
router.get('/nations/:nation/types/:type/models/:model/receivers', TankerPageController.showReceivers);

module.exports = router;
