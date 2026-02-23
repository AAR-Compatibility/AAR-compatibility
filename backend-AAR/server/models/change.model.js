const pool = require('../config/db');
const ChangeModel = {

  // Add compatibility with mandatory specifications
  async addLine({ tankerNation, tankerType, tankerModel, receiverNation, receiverType, receiverModel, specifications }) {

    // Step 1: Insert or get tanker
    const tankerResult = await pool.query(
      `INSERT INTO tankers (nation, type, model)
       VALUES ($1, $2, $3)
       ON CONFLICT (nation, type, model) DO NOTHING
       RETURNING id`,
      [tankerNation, tankerType, tankerModel]
    );

    const tankerId = tankerResult.rows[0]?.id || (await pool.query(
      `SELECT id FROM tankers WHERE nation=$1 AND type=$2 AND model=$3`,
      [tankerNation, tankerType, tankerModel]
    )).rows[0].id;

    // Step 2: Insert or get receiver
    const receiverResult = await pool.query(
      `INSERT INTO receivers (nation, type, model)
       VALUES ($1, $2, $3)
       ON CONFLICT (nation, type, model) DO NOTHING
       RETURNING id`,
      [receiverNation, receiverType, receiverModel]
    );

    const receiverId = receiverResult.rows[0]?.id || (await pool.query(
      `SELECT id FROM receivers WHERE nation=$1 AND type=$2 AND model=$3`,
      [receiverNation, receiverType, receiverModel]
    )).rows[0].id;

    // Step 3: Insert into compatibility
    const compResult = await pool.query(
      `INSERT INTO compatibility (tanker_id, receiver_id)
       VALUES ($1, $2)
       ON CONFLICT (tanker_id, receiver_id) DO NOTHING
       RETURNING id`,
      [tankerId, receiverId]
    );

    const compId = compResult.rows[0]?.id || (await pool.query(
      `SELECT id FROM compatibility WHERE tanker_id=$1 AND receiver_id=$2`,
      [tankerId, receiverId]
    )).rows[0].id;

    // Step 4: Insert mandatory specifications
    for (const result of specifications) {
      await pool.query(
        `INSERT INTO specifications
         (compatibility_id, c_tanker, c_receiver, v_srd_tanker, v_srd_receiver,
          boom_pod_bda, min_alt, max_alt, min_as, max_as_kcas, max_as_m, fuel_flow_rate, notes)
         VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          compId,
          result.c_tanker,
          result.c_receiver,
          result.v_srd_tanker,
          result.v_srd_receiver,
          result.boom_pod_bda,
          result.min_alt,
          result.max_alt,
          result.min_as,
          result.max_as_kcas,
          result.max_as_m,
          result.fuel_flow_rate,
          result.notes
        ]
      );
    }

    return { compId, tankerId, receiverId };
  }
}
module.exports = ChangeModel;
