const TankerService = require('../services/specific_search.service');

const TankerController = {
  async listNations(req, res) {
    try {
      const nations = await TankerService.getNations();
      res.json(nations);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async listTypes(req, res) {
    try {
      const { nation } = req.query;
      const types = await TankerService.getTypes(nation);
      res.json(types);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async listModels(req, res) {
    try {
      const { nation, type } = req.query;
      const models = await TankerService.getModels(nation, type);
      res.json(models);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // NEW: list compatible receivers
  async listCompatibleReceivers(req, res) {
    try {
      const { nation, type, model } = req.query;
      const receivers = await TankerService.getCompatibleReceivers(nation, type, model);
      res.json(receivers);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

module.exports = TankerController;
