const pool = require('../config/db');

const ViewerModel = {
  async getTankers() {
    const result = await pool.query(
      'SELECT nation, type, model FROM tankers ORDER BY nation, type, model;'
    );
    return result.rows;
  },

  async getReceivers() {
    const result = await pool.query(
      'SELECT nation, type, model FROM receivers ORDER BY nation, type, model;'
    );
    return result.rows;
  },

  async searchSpecifications(selection) {
    const {
      tankerNation,
      tankerType,
      tankerModel,
      receiverNation,
      receiverType,
      receiverModel
    } = selection;

    const result = await pool.query(
      `
      SELECT
        s.c_tanker,
        s.c_receiver,
        s.v_srd_tanker,
        s.v_srd_receiver,
        s.boom_pod_bda,
        s.min_alt,
        s.max_alt,
        s.min_as,
        s.max_as_kcas,
        s.max_as_m,
        s.fuel_flow_rate,
        s.notes
      FROM compatibility c
      JOIN tankers t ON c.tanker_id = t.id
      JOIN receivers r ON c.receiver_id = r.id
      JOIN specifications s ON s.compatibility_id = c.id
      WHERE t.nation = $1
        AND t.type = $2
        AND t.model = $3
        AND r.nation = $4
        AND r.type = $5
        AND r.model = $6
      `,
      [
        tankerNation,
        tankerType,
        tankerModel,
        receiverNation,
        receiverType,
        receiverModel
      ]
    );

    return result.rows;
  }
};

module.exports = ViewerModel;
