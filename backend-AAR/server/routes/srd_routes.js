const express = require('express');
const router = express.Router();
const srdController = require('../controllers/srd_controller');

// We specifically want to search the SRD's per nation.
router.get('/', srdController.searchsrd);
router.get('/search', srdController.getsrdByNation);

// Delete a specific compatibility row by id
router.post("/delete/:id", srdController.deletesrd);

module.exports = router;
