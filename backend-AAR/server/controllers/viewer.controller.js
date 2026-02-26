const ViewerService = require('../services/viewer.service');

const ViewerController = {
  async getOptions(req, res) {
    try {
      const options = await ViewerService.getOptions();
      res.json(options);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load viewer options.' });
    }
  },

  async search(req, res) {
    try {
      const rows = await ViewerService.search(req.body);
      res.json({ ok: true, rows });
    } catch (err) {
      res.status(400).json({ error: err.message ?? 'Search failed.' });
    }
  },

  async submit(req, res) {
    try {
      const result = await ViewerService.submit(req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message ?? 'Submit failed.' });
    }
  }
};

module.exports = ViewerController;
