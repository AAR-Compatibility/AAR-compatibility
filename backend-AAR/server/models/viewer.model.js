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

  async getSpecificationOptions() {
    const [cTankerResult, cReceiverResult, refuelInterfaceResult] = await Promise.all([
      pool.query(
        `SELECT DISTINCT c_tanker AS value
         FROM specifications
         WHERE c_tanker IS NOT NULL AND trim(c_tanker) <> ''
         ORDER BY c_tanker;`
      ),
      pool.query(
        `SELECT DISTINCT c_receiver AS value
         FROM specifications
         WHERE c_receiver IS NOT NULL AND trim(c_receiver) <> ''
         ORDER BY c_receiver;`
      ),
      pool.query(
        `SELECT DISTINCT boom_pod_bda AS value
         FROM specifications
         WHERE boom_pod_bda IS NOT NULL AND trim(boom_pod_bda) <> ''
         ORDER BY boom_pod_bda;`
      )
    ]);

    return {
      cTanker: cTankerResult.rows.map((row) => row.value),
      cReceiver: cReceiverResult.rows.map((row) => row.value),
      refuellingInterface: refuelInterfaceResult.rows.map((row) => row.value)
    };
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
