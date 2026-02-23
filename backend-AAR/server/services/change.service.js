const ChangeModel = require('../models/change.model');

exports.addLine = async (data) => {
  // data must include tanker, receiver, and specifications
  return await ChangeModel.addLine(data);
};