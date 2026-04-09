const ViewerModel = require('../models/viewer.model');

function buildHierarchy(rows) {
  const nationMap = new Map();

  rows.forEach((row) => {
    if (!row.nation || !row.type || !row.model) {
      return;
    }

    const existingNation = nationMap.get(row.nation) ?? {
      types: new Set(),
      modelsByType: new Map()
    };

    existingNation.types.add(row.type);

    const modelSet = existingNation.modelsByType.get(row.type) ?? new Set();
    modelSet.add(row.model);
    existingNation.modelsByType.set(row.type, modelSet);

    nationMap.set(row.nation, existingNation);
  });

  const nations = Array.from(nationMap.keys()).sort();
  const byNation = {};

  nations.forEach((nation) => {
    const nationData = nationMap.get(nation);
    const types = Array.from(nationData.types).sort();
    const modelsByType = {};

    types.forEach((type) => {
      modelsByType[type] = Array.from(nationData.modelsByType.get(type) ?? []).sort();
    });

    byNation[nation] = {
      types,
      modelsByType
    };
  });

  return { nations, byNation };
}

const ViewerService = {
  async getOptions() {
    const [tankers, receivers, specificationOptions] = await Promise.all([
      ViewerModel.getTankers(),
      ViewerModel.getReceivers(),
      ViewerModel.getSpecificationOptions()
    ]);

    return {
      tanker: buildHierarchy(tankers),
      receiver: buildHierarchy(receivers),
      specification: specificationOptions
    };
  },

  async search(selection) {
    if (!selection || typeof selection !== 'object') {
      throw new Error('Selection payload is required');
    }

    const requiredFields = [
      'tankerNation',
      'tankerType',
      'tankerModel',
      'receiverNation',
      'receiverType',
      'receiverModel'
    ];

    for (const field of requiredFields) {
      if (!selection[field]) {
        throw new Error(`${field} is required`);
      }
    }

    return ViewerModel.searchSpecifications(selection);
  },

  async submit(selection) {
    await ViewerService.search(selection);
    return { ok: true, message: 'Viewer request submitted.' };
  }
};

module.exports = ViewerService;
