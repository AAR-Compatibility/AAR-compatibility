// models/vehicleModel.js
const db = require("../config/db");

exports.getsrdByNation = async (nation) => {

  const query = `
    SELECT
      c.id AS id,
      t.nation AS tanker_nation,
      t.type AS tanker_type,
      t.model AS tanker_model,
      r.nation AS receiver_nation,
      r.type AS receiver_type,
      r.model AS receiver_model,
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
    LEFT JOIN specifications s ON s.compatibility_id = c.id
    WHERE t.nation = $1
      OR r.nation = $1
  `;

  const result = await db.query(query, [nation]);

  return result.rows;
};


exports.deleteById = async (id) => {
    const query = `DELETE FROM compatibility WHERE id = $1`;
    await db.query(query, [id]);
};