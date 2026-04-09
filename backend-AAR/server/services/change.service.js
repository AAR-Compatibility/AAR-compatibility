// This service validates SRD holder change requests, records review decisions,
// and applies approved changes to the live data only after admin processing.
const pool = require('../config/db');
const ChangeModel = require('../models/change.model');

const TRACKED_VALIDATION_FIELDS = [
  'refuellingInterface',
  'minimumFlightLevel',
  'maximumFlightLevel',
  'minimumKcas',
  'maximumKcas',
  'maxAsM',
  'planningFuelTransferRate',
];

const FIELD_LABELS = {
  nationOrganisation: 'Tanker Nation',
  tankerType: 'Tanker Type',
  tankerModel: 'Tanker Model',
  receiverNation: 'Receiver Nation',
  receiverType: 'Receiver Type',
  receiverModel: 'Receiver Model',
  cTanker: 'C_tanker',
  cReciever: 'C_receiver',
  vSrdT: 'V_srd_tanker',
  vSrdR: 'V_srd_receiver',
  refuellingInterface: 'Boom_pod_bda',
  minimumFlightLevel: 'Min_Alt',
  maximumFlightLevel: 'Max_Alt',
  minimumKcas: 'Min_as_kcas',
  maximumKcas: 'Max_as_kcas',
  maxAsM: 'Max_as_m',
  planningFuelTransferRate: 'Fuel flow rate',
  comment: 'Request comment',
};

function toSafeString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function normalizeEnum(value, allowedValues, fieldName) {
  const normalized = toSafeString(value).toLowerCase();
  if (!allowedValues.includes(normalized)) {
    throw new Error(`${fieldName} is invalid.`);
  }
  return normalized;
}

function normalizeFormValues(input) {
  return {
    requestTarget: normalizeEnum(input.requestTarget, ['tanker', 'receiver', 'both'], 'requestTarget'),
    requestType: normalizeEnum(input.requestType, ['create', 'update', 'delete'], 'requestType'),
    requestMode: normalizeEnum(input.requestMode, ['new', 'existing'], 'requestMode'),
    nationOrganisation: toSafeString(input.nationOrganisation),
    tankerType: toSafeString(input.tankerType),
    tankerModel: toSafeString(input.tankerModel),
    receiverNation: toSafeString(input.receiverNation),
    receiverType: toSafeString(input.receiverType),
    receiverModel: toSafeString(input.receiverModel),
    cTanker: toSafeString(input.cTanker),
    cReciever: toSafeString(input.cReciever),
    vSrdT: toSafeString(input.vSrdT),
    vSrdR: toSafeString(input.vSrdR),
    refuellingInterface: toSafeString(input.refuellingInterface),
    minimumFlightLevel: toSafeString(input.minimumFlightLevel),
    maximumFlightLevel: toSafeString(input.maximumFlightLevel),
    minimumKcas: toSafeString(input.minimumKcas),
    maximumKcas: toSafeString(input.maximumKcas),
    maxAsM: toSafeString(input.maxAsM),
    planningFuelTransferRate: toSafeString(input.planningFuelTransferRate),
    comment: toSafeString(input.comment),
  };
}

function buildBaselineSnapshot(context) {
  if (!context) {
    return {};
  }
  return {
    nationOrganisation: toSafeString(context.nationOrganisation),
    tankerType: toSafeString(context.tankerType),
    tankerModel: toSafeString(context.tankerModel),
    receiverNation: toSafeString(context.receiverNation),
    receiverType: toSafeString(context.receiverType),
    receiverModel: toSafeString(context.receiverModel),
    cTanker: toSafeString(context.cTanker),
    cReciever: toSafeString(context.cReciever),
    vSrdT: toSafeString(context.vSrdT),
    vSrdR: toSafeString(context.vSrdR),
    refuellingInterface: toSafeString(context.refuellingInterface),
    minimumFlightLevel: toSafeString(context.minimumFlightLevel),
    maximumFlightLevel: toSafeString(context.maximumFlightLevel),
    minimumKcas: toSafeString(context.minimumKcas),
    maximumKcas: toSafeString(context.maximumKcas),
    maxAsM: toSafeString(context.maxAsM),
    planningFuelTransferRate: toSafeString(context.planningFuelTransferRate),
    notes: toSafeString(context.notes),
  };
}

function requireFields(values, fields) {
  for (const field of fields) {
    if (!toSafeString(values[field])) {
      throw new Error(`${FIELD_LABELS[field] ?? field} is required.`);
    }
  }
}

function validateRequestShape(values) {
  if (!values.comment) {
    throw new Error('A request comment is required.');
  }

  if (values.requestType === 'create' && values.requestMode !== 'new') {
    throw new Error('Create requests must use requestMode "new".');
  }

  if (values.requestType !== 'create' && values.requestMode !== 'existing') {
    throw new Error('Update and delete requests must use requestMode "existing".');
  }

  if (values.requestMode === 'new' && values.requestTarget === 'both') {
    throw new Error('New combination requests are not supported from this form.');
  }

  if (values.requestType === 'delete' && values.requestTarget !== 'both') {
    throw new Error('Only specification deletion is supported.');
  }

  if (values.requestTarget === 'tanker' && values.requestMode === 'new') {
    requireFields(values, ['nationOrganisation', 'tankerType', 'tankerModel']);
    return;
  }

  if (values.requestTarget === 'receiver' && values.requestMode === 'new') {
    requireFields(values, ['receiverNation', 'receiverType', 'receiverModel']);
    return;
  }

  if (values.requestTarget === 'tanker' && values.requestType === 'update') {
    requireFields(values, [
      'nationOrganisation',
      'tankerType',
      'tankerModel',
      'receiverNation',
      'receiverType',
      'receiverModel',
      'cTanker',
      'vSrdT',
      'refuellingInterface',
      'minimumFlightLevel',
      'maximumFlightLevel',
      'minimumKcas',
      'maximumKcas',
      'maxAsM',
      'planningFuelTransferRate',
    ]);
    return;
  }

  if (values.requestTarget === 'receiver' && values.requestType === 'update') {
    requireFields(values, [
      'nationOrganisation',
      'tankerType',
      'tankerModel',
      'receiverNation',
      'receiverType',
      'receiverModel',
      'cReciever',
      'vSrdR',
      'refuellingInterface',
      'minimumFlightLevel',
      'maximumFlightLevel',
      'minimumKcas',
      'maximumKcas',
      'maxAsM',
      'planningFuelTransferRate',
    ]);
    return;
  }

  if (values.requestTarget === 'both' && values.requestType === 'update') {
    requireFields(values, [
      'nationOrganisation',
      'tankerType',
      'tankerModel',
      'receiverNation',
      'receiverType',
      'receiverModel',
      'cTanker',
      'cReciever',
      'vSrdT',
      'vSrdR',
      'refuellingInterface',
      'minimumFlightLevel',
      'maximumFlightLevel',
      'minimumKcas',
      'maximumKcas',
      'maxAsM',
      'planningFuelTransferRate',
    ]);
    return;
  }

  if (values.requestTarget === 'both' && values.requestType === 'delete') {
    requireFields(values, [
      'nationOrganisation',
      'tankerType',
      'tankerModel',
      'receiverNation',
      'receiverType',
      'receiverModel',
    ]);
    return;
  }

  throw new Error('Unsupported request combination.');
}

async function resolveRequestContext(db, values) {
  validateRequestShape(values);

  if (values.requestMode === 'new') {
    if (values.requestTarget === 'tanker') {
      const existingTanker = await ChangeModel.getTankerByIdentity(values, db);
      if (existingTanker) {
        throw new Error('This tanker already exists in the database.');
      }
    }

    if (values.requestTarget === 'receiver') {
      const existingReceiver = await ChangeModel.getReceiverByIdentity(values, db);
      if (existingReceiver) {
        throw new Error('This receiver already exists in the database.');
      }
    }

    return {
      requestTarget: values.requestTarget,
      requestType: 'create',
      requestMode: 'new',
      payload: values,
      baselineSnapshot: {},
      compatibilityId: null,
      specificationId: null,
      tankerId: null,
      receiverId: null,
      deleteScope: null,
    };
  }

  const existingSpecification = await ChangeModel.getSpecificationContextBySelection(values, db);
  if (!existingSpecification) {
    throw new Error('No existing specification was found for the selected combination.');
  }

  return {
    requestTarget: values.requestTarget,
    requestType: values.requestType,
    requestMode: 'existing',
    payload: values,
    baselineSnapshot: buildBaselineSnapshot(existingSpecification),
    compatibilityId: existingSpecification.compatibilityId,
    specificationId: existingSpecification.specificationId,
    tankerId: existingSpecification.tankerId,
    receiverId: existingSpecification.receiverId,
    deleteScope: values.requestType === 'delete' ? 'specification' : null,
  };
}

function normalizeNumber(value, fieldName, allowDecimal = false) {
  const rawValue = toSafeString(value);
  if (!rawValue) {
    throw new Error(`${FIELD_LABELS[fieldName] ?? fieldName} is required.`);
  }

  const match = rawValue.match(allowDecimal ? /-?\d+(\.\d+)?/ : /-?\d+/);
  if (!match) {
    throw new Error(`${FIELD_LABELS[fieldName] ?? fieldName} must contain a valid number.`);
  }

  return allowDecimal ? Number.parseFloat(match[0]) : Number.parseInt(match[0], 10);
}

function buildSpecificationUpdateValues(currentSnapshot, request) {
  const payload = request.payload;
  const nextValues = {
    cTanker: request.requestTarget === 'receiver' ? currentSnapshot.cTanker : payload.cTanker,
    cReciever: request.requestTarget === 'tanker' ? currentSnapshot.cReciever : payload.cReciever,
    vSrdT: request.requestTarget === 'receiver' ? currentSnapshot.vSrdT : payload.vSrdT,
    vSrdR: request.requestTarget === 'tanker' ? currentSnapshot.vSrdR : payload.vSrdR,
    refuellingInterface: payload.refuellingInterface,
    minimumFlightLevel: normalizeNumber(payload.minimumFlightLevel, 'minimumFlightLevel'),
    maximumFlightLevel: normalizeNumber(payload.maximumFlightLevel, 'maximumFlightLevel'),
    minimumKcas: normalizeNumber(payload.minimumKcas, 'minimumKcas'),
    maximumKcas: normalizeNumber(payload.maximumKcas, 'maximumKcas'),
    maxAsM: normalizeNumber(payload.maxAsM, 'maxAsM', true),
    planningFuelTransferRate: normalizeNumber(
      payload.planningFuelTransferRate,
      'planningFuelTransferRate',
      true,
    ),
  };

  return nextValues;
}

// Assigns the processed record references that must exist once a request is marked as processed.
function applyProcessedTargetReferences(processedRecordIds, request) {
  if (request.requestTarget === 'tanker') {
    processedRecordIds.processedTankerId = request.tankerId;
    return;
  }

  if (request.requestTarget === 'receiver') {
    processedRecordIds.processedReceiverId = request.receiverId;
  }
}

function buildValidationDetailsFromConflict(baselineSnapshot, currentSnapshot, requestedSnapshot) {
  const fieldConflicts = TRACKED_VALIDATION_FIELDS.reduce((items, field) => {
    const baselineValue = toSafeString(baselineSnapshot[field]);
    const currentValue = toSafeString(currentSnapshot[field]);
    if (baselineValue === currentValue) {
      return items;
    }

    items.push({
      field,
      label: FIELD_LABELS[field] ?? field,
      baselineValue,
      currentValue,
      requestedValue: toSafeString(requestedSnapshot[field]),
    });
    return items;
  }, []);

  return { fieldConflicts };
}

async function validateRequestAgainstLiveData(db, request) {
  if (request.requestType === 'create') {
    if (request.requestTarget === 'tanker') {
      const existingTanker = await ChangeModel.getTankerByIdentity(request.payload, db);
      if (!existingTanker) {
        return {
          validationStatus: 'ok',
          validationSummary: 'No tanker conflict was found before processing.',
          validationDetails: { fieldConflicts: [] },
        };
      }

      return {
        validationStatus: 'warning',
        validationSummary: 'The tanker already exists. Processing will reuse the existing tanker record.',
        validationDetails: {
          fieldConflicts: [
            {
              field: 'nationOrganisation',
              label: 'Tanker record',
              baselineValue: '',
              currentValue: `${existingTanker.nationOrganisation} / ${existingTanker.tankerType} / ${existingTanker.tankerModel}`,
              requestedValue: `${request.payload.nationOrganisation} / ${request.payload.tankerType} / ${request.payload.tankerModel}`,
            },
          ],
        },
      };
    }

    const existingReceiver = await ChangeModel.getReceiverByIdentity(request.payload, db);
    if (!existingReceiver) {
      return {
        validationStatus: 'ok',
        validationSummary: 'No receiver conflict was found before processing.',
        validationDetails: { fieldConflicts: [] },
      };
    }

    return {
      validationStatus: 'warning',
      validationSummary: 'The receiver already exists. Processing will reuse the existing receiver record.',
      validationDetails: {
        fieldConflicts: [
          {
            field: 'receiverNation',
            label: 'Receiver record',
            baselineValue: '',
            currentValue: `${existingReceiver.receiverNation} / ${existingReceiver.receiverType} / ${existingReceiver.receiverModel}`,
            requestedValue: `${request.payload.receiverNation} / ${request.payload.receiverType} / ${request.payload.receiverModel}`,
          },
        ],
      },
    };
  }

  const currentSpecification = await ChangeModel.getSpecificationContextById(request.specificationId, db);
  if (!currentSpecification) {
    return {
      validationStatus: 'conflict',
      validationSummary: 'The live specification no longer exists for this request.',
      validationDetails: {
        fieldConflicts: [
          {
            field: 'specificationId',
            label: 'Specification',
            baselineValue: String(request.specificationId ?? ''),
            currentValue: '',
            requestedValue: String(request.specificationId ?? ''),
          },
        ],
      },
    };
  }

  const currentSnapshot = buildBaselineSnapshot(currentSpecification);
  const validationDetails = buildValidationDetailsFromConflict(
    request.baselineSnapshot,
    currentSnapshot,
    request.payload,
  );

  if (validationDetails.fieldConflicts.length === 0) {
    return {
      validationStatus: 'ok',
      validationSummary: 'No live-spec mismatches were detected before processing.',
      validationDetails,
    };
  }

  return {
    validationStatus: 'conflict',
    validationSummary:
      'The live specification changed after the SRD holder submitted this request. Review the differences before processing.',
    validationDetails,
  };
}

function mapRequestForClient(request) {
  return {
    ...request,
    payload: request.payload ?? {},
    baselineSnapshot: request.baselineSnapshot ?? {},
    validationDetails: request.validationDetails ?? { fieldConflicts: [] },
  };
}

async function createOrResubmit(values, userId, requestId = null) {
  const client = await pool.connect();

  try {
    const normalizedValues = normalizeFormValues(values);
    const requestContext = await resolveRequestContext(client, normalizedValues);

    const payload = {
      ...requestContext.payload,
      requestTarget: requestContext.requestTarget,
      requestType: requestContext.requestType,
      requestMode: requestContext.requestMode,
    };

    const baseRecord = {
      ...requestContext,
      payload,
      requestComment: payload.comment,
      status: 'pending_review',
      submittedAt: new Date(),
    };

    const request = requestId
      ? await ChangeModel.updateOwnRejectedRequest(requestId, userId, baseRecord, client)
      : await ChangeModel.insertRequest({ ...baseRecord, createdBy: userId }, client);

    if (!request) {
      throw new Error('The request could not be updated.');
    }

    return mapRequestForClient(request);
  } finally {
    client.release();
  }
}

const ChangeService = {
  async listOwnRequests(userId) {
    const rows = await ChangeModel.listOwnRequests(userId);
    return rows.map(mapRequestForClient);
  },

  async listAllRequests() {
    const rows = await ChangeModel.listAllRequests();
    return rows.map(mapRequestForClient);
  },

  async createRequest(values, userId) {
    return createOrResubmit(values, userId, null);
  },

  async updateRejectedRequest(id, values, userId) {
    return createOrResubmit(values, userId, id);
  },

  async deleteOwnRequest(id, userId) {
    const deleted = await ChangeModel.deleteOwnRequest(id, userId);
    if (!deleted) {
      throw new Error('The request could not be removed.');
    }
  },

  async deleteRequestForAdmin(id) {
    const deleted = await ChangeModel.deleteRequestForAdmin(id);
    if (!deleted) {
      throw new Error('Processed requests cannot be deleted, or the request was not found.');
    }
  },

  async approveRequest(id, reviewerId) {
    const request = await ChangeModel.getChangeRequestById(null, id);
    if (!request) {
      throw new Error('Change request not found.');
    }

    if (request.status !== 'pending_review') {
      throw new Error('Only pending requests can be approved.');
    }

    const validation = await validateRequestAgainstLiveData(null, mapRequestForClient(request));
    const approvedRequest = await ChangeModel.updateReviewState(
      id,
      {
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewComment: null,
        validationStatus: validation.validationStatus,
        validationSummary: validation.validationSummary,
        validationDetails: validation.validationDetails,
        validatedAt: new Date(),
      },
      null,
    );

    return mapRequestForClient(approvedRequest);
  },

  async rejectRequest(id, reviewComment, reviewerId) {
    const normalizedComment = toSafeString(reviewComment);
    if (!normalizedComment) {
      throw new Error('A rejection comment is required.');
    }

    const request = await ChangeModel.getChangeRequestById(null, id);
    if (!request) {
      throw new Error('Change request not found.');
    }

    if (!['pending_review', 'approved'].includes(request.status)) {
      throw new Error('Only pending or approved requests can be rejected.');
    }

    const rejectedRequest = await ChangeModel.updateReviewState(
      id,
      {
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewComment: normalizedComment,
        validationStatus: null,
        validationSummary: null,
        validationDetails: null,
        validatedAt: null,
      },
      null,
    );

    return mapRequestForClient(rejectedRequest);
  },

  async processApprovedRequest(id) {
    const client = await pool.connect();
    let request = null;
    let latestValidation = null;

    try {
      await client.query('BEGIN');

      request = await ChangeModel.getChangeRequestById(client, id);
      if (!request) {
        throw new Error('Change request not found.');
      }

      request = mapRequestForClient(request);

      if (request.status !== 'approved') {
        throw new Error('Only approved requests can be processed.');
      }

      latestValidation = await validateRequestAgainstLiveData(client, request);
      const processedAt = new Date();
      const processedRecordIds = {
        processedTankerId: null,
        processedReceiverId: null,
        processedCompatibilityId: null,
        processedSpecificationId: null,
      };

      if (request.requestType === 'create') {
        if (request.requestTarget === 'tanker') {
          processedRecordIds.processedTankerId = await ChangeModel.upsertTanker(request.payload, client);
        } else if (request.requestTarget === 'receiver') {
          processedRecordIds.processedReceiverId = await ChangeModel.upsertReceiver(
            request.payload,
            client,
          );
        } else {
          throw new Error('Unsupported create request target.');
        }
      } else if (request.requestType === 'update') {
        const liveSnapshot = await ChangeModel.getSpecificationContextById(request.specificationId, client);
        if (!liveSnapshot) {
          throw new Error('The live specification could not be found for processing.');
        }

        const nextSpecificationValues = buildSpecificationUpdateValues(liveSnapshot, request);
        const updatedSpecificationId = await ChangeModel.updateSpecification(
          request.specificationId,
          nextSpecificationValues,
          client,
        );

        processedRecordIds.processedSpecificationId = updatedSpecificationId;
        processedRecordIds.processedCompatibilityId = request.compatibilityId;
        applyProcessedTargetReferences(processedRecordIds, request);
      } else if (request.requestType === 'delete') {
        const deleted = await ChangeModel.deleteSpecification(request.specificationId, client);
        if (!deleted) {
          throw new Error('The live specification could not be deleted.');
        }

        processedRecordIds.processedCompatibilityId = request.compatibilityId;
      } else {
        throw new Error('Unsupported request type.');
      }

      const processedRequest = await ChangeModel.markProcessed(
        id,
        {
          ...processedRecordIds,
          processedAt,
          validatedAt: new Date(),
          validationStatus: latestValidation.validationStatus,
          validationSummary: latestValidation.validationSummary,
          validationDetails: latestValidation.validationDetails,
        },
        client,
      );

      await client.query('COMMIT');
      return mapRequestForClient(processedRequest);
    } catch (error) {
      await client.query('ROLLBACK');

      if (request) {
        const failedRequest = await ChangeModel.markProcessingFailed(id, {
          processedAt: new Date(),
          processingError: error.message ?? 'Processing failed.',
          validatedAt: new Date(),
          validationStatus: latestValidation?.validationStatus ?? null,
          validationSummary: latestValidation?.validationSummary ?? null,
          validationDetails: latestValidation?.validationDetails ?? null,
        });
        return mapRequestForClient(failedRequest);
      }

      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = ChangeService;
