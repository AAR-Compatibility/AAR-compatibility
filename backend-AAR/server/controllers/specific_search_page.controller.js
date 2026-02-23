const TankerService = require('../services/specific_search.service');

const TankerPageController = {
  async showNations(req, res) {
    const nations = await TankerService.getNations();
    res.render('nations', { nations });
  },

  async showTypes(req, res) {
    const nation = req.params.nation;
    const types = await TankerService.getTypes(nation);
    res.render('types', { nation, types });
  },

  async showModels(req, res) {
    const { nation, type } = req.params;
    const models = await TankerService.getModels(nation, type);
    res.render('models', { nation, type, models });
  },

  async showReceivers(req, res) {
    const { nation, type, model } = req.params;
    const receivers = await TankerService.getCompatibleReceivers(nation, type, model);
    res.render('receivers', { nation, type, model, receivers });
  },
};

module.exports = TankerPageController;
