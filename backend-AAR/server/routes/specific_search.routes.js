const express = require('express');
const router = express.Router();
const TankerController = require('../controllers/specific_search.controller');

// Step 1 → 3 same as before
router.get('/nations', TankerController.listNations);
router.get('/types', TankerController.listTypes);
router.get('/models', TankerController.listModels);

// Step 4 → compatible receivers
router.get('/receivers', TankerController.listCompatibleReceivers);

module.exports = router;
