// src/services/compatibility.service.js
const CompatibilityModel = require('../models/compatibility.model');

exports.submit = async (data) => {
  const { tankerNation, tankerType, tankerModel, receiverNation, receiverType, receiverModel } = data;

  // Business logic could go here
  // For now, just call the model
  const result = await CompatibilityModel.find(
    tankerNation, tankerType, tankerModel,
    receiverNation, receiverType, receiverModel
  );

  // You could do additional processing here
  return result;
};

