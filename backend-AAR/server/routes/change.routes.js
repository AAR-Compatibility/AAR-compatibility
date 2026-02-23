const router = require('express').Router();
const controller = require('../controllers/change.controller');

console.log('Change routes loaded')

router.get('/add', (req, res) => {
    res.render('add_line'); // the template we will create
});

router.post('/add', controller.addLine)
//router.post('/change', controller.changeLine)

module.exports = router;
