
const ChangeService = require('../services/change.service');

exports.addLine = async (req, res) => {
  try {
    const result = await ChangeService.addLine(req.body);
    res.render('search_results', { found: true, result: result, message: 'Compatibility and specifications added!' });
  } catch (err) {
    console.error(err);
    res.render('search_results', { found: false, message: 'Error adding compatibility.' });
  }
};