// src/controllers/compatibility.controller.js
const service = require('../services/compatibility.service');

exports.submitCompatibility = async (req, res, next) => {
  try {
    const result = await service.submit(req.body);

    if (result && result.length > 0) {
      res.render('search_results', { found: true, result: result[0] }); // pass first spec or loop in EJS
    } else {
      res.render('search_results', { found: false, message: 'No specifications found' });
    }
  } catch (err) {
    console.error(err);
    res.render('search_results', { found: false, message: 'Error retrieving specifications' });
  }
};
