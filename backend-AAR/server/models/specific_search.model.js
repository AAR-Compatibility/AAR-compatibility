const pool = require('../config/db'); // PostgreSQL pool connection

const TankerModel = {
  // Get distinct nations
  async getNations() {
    const res = await pool.query('SELECT DISTINCT nation FROM tankers ORDER BY nation;');
    return res.rows;
  },

  // Get distinct tanker types for a nation
  async getTypesByNation(nation) {
    const res = await pool.query(
      'SELECT DISTINCT type FROM tankers WHERE nation = $1 ORDER BY type;',
      [nation]
    );
    return res.rows;
  },

  // Get distinct tanker models for a nation + type
  async getModelsByNationAndType(nation, type) {
    const res = await pool.query(
      'SELECT DISTINCT model FROM tankers WHERE nation = $1 AND type = $2 ORDER BY model;',
      [nation, type]
    );
    return res.rows;
  },

  async getCompatibleReceivers(nation, type, model) {
    const res = await pool.query(
      `
      SELECT r.id, r.nation, r.type, r.model
      FROM compatibility c
      JOIN tankers t ON t.id = c.tanker_id
      JOIN tankers r ON r.id = c.receiver_id
      WHERE t.nation = $1 AND t.type = $2 AND t.model = $3
      ORDER BY r.nation, r.type, r.model;
      `,
      [nation, type, model]
    );
    return res.rows;
  }
};

module.exports = TankerModel;