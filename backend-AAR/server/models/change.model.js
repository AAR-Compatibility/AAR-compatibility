// This model stores change requests, loads the current specification snapshot,
// and applies approved changes to the live tanker, receiver, and specification tables.
const pool = require('../config/db');

const CHANGE_REQUEST_SELECT = `
  SELECT
    cr.change_request_id AS "id",
    cr.request_target AS "requestTarget",
    cr.request_type AS "requestType",
    cr.request_mode AS "requestMode",
    cr.status,
    cr.payload,
    cr.baseline_snapshot AS "baselineSnapshot",
    cr.created_by AS "createdBy",
    cr.reviewed_by AS "reviewedBy",
    cr.compatibility_id AS "compatibilityId",
    cr.specification_id AS "specificationId",
    cr.tanker_id AS "tankerId",
    cr.receiver_id AS "receiverId",
    cr.processed_tanker_id AS "processedTankerId",
    cr.processed_receiver_id AS "processedReceiverId",
    cr.processed_compatibility_id AS "processedCompatibilityId",
    cr.processed_specification_id AS "processedSpecificationId",
    cr.request_comment AS "requestComment",
    cr.review_comment AS "reviewComment",
    cr.validation_status AS "validationStatus",
    cr.validation_summary AS "validationSummary",
    cr.validation_details AS "validationDetails",
    cr.delete_scope AS "deleteScope",
    cr.submitted_at AS "submittedAt",
    cr.created_at AS "createdAt",
    cr.updated_at AS "updatedAt",
    cr.reviewed_at AS "reviewedAt",
    cr.validated_at AS "validatedAt",
    cr.processed_at AS "processedAt",
    cr.processing_error AS "processingError",
    u."name" AS "createdByName",
    u."email" AS "createdByEmail",
    reviewer."name" AS "reviewedByName",
    reviewer."email" AS "reviewedByEmail"
  FROM change_request cr
  JOIN "User" u ON u."UserID" = cr.created_by
  LEFT JOIN "User" reviewer ON reviewer."UserID" = cr.reviewed_by
`;

const SPECIFICATION_CONTEXT_SELECT = `
  SELECT
    s.id AS "specificationId",
    c.id AS "compatibilityId",
    t.id AS "tankerId",
    r.id AS "receiverId",
    t.nation AS "nationOrganisation",
    t.type AS "tankerType",
    t.model AS "tankerModel",
    r.nation AS "receiverNation",
    r.type AS "receiverType",
    r.model AS "receiverModel",
    s.c_tanker AS "cTanker",
    s.c_receiver AS "cReciever",
    s.v_srd_tanker AS "vSrdT",
    s.v_srd_receiver AS "vSrdR",
    s.boom_pod_bda AS "refuellingInterface",
    s.min_alt AS "minimumFlightLevel",
    s.max_alt AS "maximumFlightLevel",
    s.min_as AS "minimumKcas",
    s.max_as_kcas AS "maximumKcas",
    s.max_as_m AS "maxAsM",
    s.fuel_flow_rate AS "planningFuelTransferRate",
    s.notes
  FROM specifications s
  JOIN compatibility c ON c.id = s.compatibility_id
  JOIN tankers t ON t.id = c.tanker_id
  JOIN receivers r ON r.id = c.receiver_id
`;

function getDb(db) {
  return db ?? pool;
}

function toJson(value) {
  return JSON.stringify(value ?? {});
}

async function getChangeRequestById(db, id) {
  const result = await getDb(db).query(
    `${CHANGE_REQUEST_SELECT}
     WHERE cr.change_request_id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

const ChangeModel = {
  async listOwnRequests(userId, db) {
    const result = await getDb(db).query(
      `${CHANGE_REQUEST_SELECT}
       WHERE cr.created_by = $1
       ORDER BY cr.created_at DESC, cr.change_request_id DESC`,
      [userId],
    );
    return result.rows;
  },

  async listAllRequests(db) {
    const result = await getDb(db).query(
      `${CHANGE_REQUEST_SELECT}
       ORDER BY
         COALESCE(cr.submitted_at, cr.created_at) DESC,
         cr.change_request_id DESC`,
    );
    return result.rows;
  },

  getChangeRequestById,

  async insertRequest(data, db) {
    const result = await getDb(db).query(
      `
      INSERT INTO change_request (
        request_target,
        request_type,
        request_mode,
        status,
        payload,
        baseline_snapshot,
        created_by,
        compatibility_id,
        specification_id,
        tanker_id,
        receiver_id,
        request_comment,
        delete_scope,
        submitted_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7,
        $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP
      )
      RETURNING change_request_id
      `,
      [
        data.requestTarget,
        data.requestType,
        data.requestMode,
        data.status,
        toJson(data.payload),
        toJson(data.baselineSnapshot),
        data.createdBy,
        data.compatibilityId,
        data.specificationId,
        data.tankerId,
        data.receiverId,
        data.requestComment,
        data.deleteScope,
        data.submittedAt,
      ],
    );
    return getChangeRequestById(db, result.rows[0].change_request_id);
  },

  async updateOwnRejectedRequest(id, userId, data, db) {
    const result = await getDb(db).query(
      `
      UPDATE change_request
      SET
        request_target = $3,
        request_type = $4,
        request_mode = $5,
        status = $6,
        payload = $7::jsonb,
        baseline_snapshot = $8::jsonb,
        compatibility_id = $9,
        specification_id = $10,
        tanker_id = $11,
        receiver_id = $12,
        request_comment = $13,
        delete_scope = $14,
        submitted_at = $15,
        updated_at = CURRENT_TIMESTAMP,
        reviewed_by = NULL,
        reviewed_at = NULL,
        review_comment = NULL,
        validation_status = NULL,
        validation_summary = NULL,
        validation_details = NULL,
        validated_at = NULL,
        processed_at = NULL,
        processing_error = NULL,
        processed_tanker_id = NULL,
        processed_receiver_id = NULL,
        processed_compatibility_id = NULL,
        processed_specification_id = NULL
      WHERE change_request_id = $1
        AND created_by = $2
        AND status = 'rejected'
      RETURNING change_request_id
      `,
      [
        id,
        userId,
        data.requestTarget,
        data.requestType,
        data.requestMode,
        data.status,
        toJson(data.payload),
        toJson(data.baselineSnapshot),
        data.compatibilityId,
        data.specificationId,
        data.tankerId,
        data.receiverId,
        data.requestComment,
        data.deleteScope,
        data.submittedAt,
      ],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return getChangeRequestById(db, result.rows[0].change_request_id);
  },

  async deleteOwnRequest(id, userId, db) {
    const result = await getDb(db).query(
      `
      DELETE FROM change_request
      WHERE change_request_id = $1
        AND created_by = $2
        AND status IN ('pending_review', 'rejected')
      `,
      [id, userId],
    );
    return result.rowCount > 0;
  },

  async deleteRequestForAdmin(id, db) {
    const result = await getDb(db).query(
      `
      DELETE FROM change_request
      WHERE change_request_id = $1
        AND status <> 'processed'
      `,
      [id],
    );
    return result.rowCount > 0;
  },

  async updateReviewState(id, data, db) {
    const result = await getDb(db).query(
      `
      UPDATE change_request
      SET
        status = $2,
        reviewed_by = $3,
        reviewed_at = $4,
        review_comment = $5,
        validation_status = $6,
        validation_summary = $7,
        validation_details = $8::jsonb,
        validated_at = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE change_request_id = $1
      RETURNING change_request_id
      `,
      [
        id,
        data.status,
        data.reviewedBy,
        data.reviewedAt,
        data.reviewComment ?? null,
        data.validationStatus ?? null,
        data.validationSummary ?? null,
        data.validationDetails ? toJson(data.validationDetails) : null,
        data.validatedAt ?? null,
      ],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return getChangeRequestById(db, result.rows[0].change_request_id);
  },

  async markProcessed(id, data, db) {
    const result = await getDb(db).query(
      `
      UPDATE change_request
      SET
        status = 'processed',
        validation_status = $2,
        validation_summary = $3,
        validation_details = $4::jsonb,
        validated_at = $5,
        processed_at = $6,
        processing_error = NULL,
        processed_tanker_id = $7,
        processed_receiver_id = $8,
        processed_compatibility_id = $9,
        processed_specification_id = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE change_request_id = $1
      RETURNING change_request_id
      `,
      [
        id,
        data.validationStatus ?? null,
        data.validationSummary ?? null,
        data.validationDetails ? toJson(data.validationDetails) : null,
        data.validatedAt ?? null,
        data.processedAt,
        data.processedTankerId ?? null,
        data.processedReceiverId ?? null,
        data.processedCompatibilityId ?? null,
        data.processedSpecificationId ?? null,
      ],
    );
    return getChangeRequestById(db, result.rows[0].change_request_id);
  },

  async markProcessingFailed(id, data, db) {
    const result = await getDb(db).query(
      `
      UPDATE change_request
      SET
        status = 'processing_failed',
        validation_status = $2,
        validation_summary = $3,
        validation_details = $4::jsonb,
        validated_at = $5,
        processed_at = $6,
        processing_error = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE change_request_id = $1
      RETURNING change_request_id
      `,
      [
        id,
        data.validationStatus ?? null,
        data.validationSummary ?? null,
        data.validationDetails ? toJson(data.validationDetails) : null,
        data.validatedAt ?? null,
        data.processedAt,
        data.processingError,
      ],
    );
    return getChangeRequestById(db, result.rows[0].change_request_id);
  },

  async getSpecificationContextBySelection(selection, db) {
    const result = await getDb(db).query(
      `${SPECIFICATION_CONTEXT_SELECT}
       WHERE t.nation = $1
         AND t.type = $2
         AND t.model = $3
         AND r.nation = $4
         AND r.type = $5
         AND r.model = $6`,
      [
        selection.nationOrganisation,
        selection.tankerType,
        selection.tankerModel,
        selection.receiverNation,
        selection.receiverType,
        selection.receiverModel,
      ],
    );
    return result.rows[0] ?? null;
  },

  async getSpecificationContextById(specificationId, db) {
    const result = await getDb(db).query(
      `${SPECIFICATION_CONTEXT_SELECT}
       WHERE s.id = $1`,
      [specificationId],
    );
    return result.rows[0] ?? null;
  },

  async getTankerByIdentity(identity, db) {
    const result = await getDb(db).query(
      `
      SELECT
        id,
        nation AS "nationOrganisation",
        type AS "tankerType",
        model AS "tankerModel"
      FROM tankers
      WHERE nation = $1
        AND type = $2
        AND model = $3
      `,
      [identity.nationOrganisation, identity.tankerType, identity.tankerModel],
    );
    return result.rows[0] ?? null;
  },

  async getReceiverByIdentity(identity, db) {
    const result = await getDb(db).query(
      `
      SELECT
        id,
        nation AS "receiverNation",
        type AS "receiverType",
        model AS "receiverModel"
      FROM receivers
      WHERE nation = $1
        AND type = $2
        AND model = $3
      `,
      [identity.receiverNation, identity.receiverType, identity.receiverModel],
    );
    return result.rows[0] ?? null;
  },

  async upsertTanker(identity, db) {
    const result = await getDb(db).query(
      `
      INSERT INTO tankers (nation, type, model)
      VALUES ($1, $2, $3)
      ON CONFLICT (nation, type, model)
      DO UPDATE SET nation = EXCLUDED.nation
      RETURNING id
      `,
      [identity.nationOrganisation, identity.tankerType, identity.tankerModel],
    );
    return result.rows[0].id;
  },

  async upsertReceiver(identity, db) {
    const result = await getDb(db).query(
      `
      INSERT INTO receivers (nation, type, model)
      VALUES ($1, $2, $3)
      ON CONFLICT (nation, type, model)
      DO UPDATE SET nation = EXCLUDED.nation
      RETURNING id
      `,
      [identity.receiverNation, identity.receiverType, identity.receiverModel],
    );
    return result.rows[0].id;
  },

  async updateSpecification(specificationId, values, db) {
    const result = await getDb(db).query(
      `
      UPDATE specifications
      SET
        c_tanker = $2,
        c_receiver = $3,
        v_srd_tanker = $4,
        v_srd_receiver = $5,
        boom_pod_bda = $6,
        min_alt = $7,
        max_alt = $8,
        min_as = $9,
        max_as_kcas = $10,
        max_as_m = $11,
        fuel_flow_rate = $12
      WHERE id = $1
      RETURNING id
      `,
      [
        specificationId,
        values.cTanker,
        values.cReciever,
        values.vSrdT,
        values.vSrdR,
        values.refuellingInterface,
        values.minimumFlightLevel,
        values.maximumFlightLevel,
        values.minimumKcas,
        values.maximumKcas,
        values.maxAsM,
        values.planningFuelTransferRate,
      ],
    );
    return result.rows[0]?.id ?? null;
  },

  async deleteSpecification(specificationId, db) {
    const result = await getDb(db).query(
      `
      DELETE FROM specifications
      WHERE id = $1
      `,
      [specificationId],
    );
    return result.rowCount > 0;
  },
};

module.exports = ChangeModel;
