const TankerModel = require('../models/specific_search.model');

const TankerService = {
  async getNations() {
    return await TankerModel.getNations();
  },

  async getTypes(nation) {
    if (!nation) throw new Error('Nation is required');
    return await TankerModel.getTypesByNation(nation);
  },

  async getModels(nation, type) {
    if (!nation || !type) throw new Error('Nation and Type are required');
    return await TankerModel.getModelsByNationAndType(nation, type);
  },

  async getCompatibleReceivers(nation, type, model) {
    if (!nation || !type || !model)
      throw new Error('Nation, Type, and Model are required');
    return await TankerModel.getCompatibleReceivers(nation, type, model);
  }
};

module.exports = TankerService;
