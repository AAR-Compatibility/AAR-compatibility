// services/srdService.js

const srdModel = require("../models/srd_model");

exports.getsrdByNation = async (nation) => {
  const srd = await srdModel.getsrdByNation(nation);
  return srd; // just return all rows directly
};

exports.deletesrd = async (id) => {
    await srdModel.deleteById(id);
};