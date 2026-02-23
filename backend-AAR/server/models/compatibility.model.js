// src/models/compatibility.model.js
const pool = require('../config/db');

const CompatibilityModel = {
  async find(tankerNation, tankerType, tankerModel, receiverNation, receiverType, receiverModel) {
    const compResult = await pool.query(
            `
            SELECT c.id as comp_id
            FROM compatibility c
            JOIN tankers t ON c.tanker_id = t.id
            JOIN receivers r ON c.receiver_id = r.id
            WHERE t.nation = $1
              AND t.type = $2
              AND t.model = $3
              AND r.nation = $4
              AND r.type = $5
              AND r.model = $6
            `,
      [tankerNation, tankerType, tankerModel, receiverNation, receiverType, receiverModel]
    );

    if (compResult.rows.length === 0) return null;

    const compId = compResult.rows[0].comp_id;
    const result = await pool.query(
      'SELECT * FROM specifications WHERE compatibility_id = $1',
      [compId]
    );

    return result.rows;
  }
};

module.exports = CompatibilityModel;
