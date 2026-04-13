// This service sends SRD holder change requests to the backend and loads review results for SRD holders and admins.
import { getErrorMessage, buildHeaders } from './viewerService'

export type SubmissionStatusKey =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'processed'
  | 'processing_failed'

export type SubmissionStatus =
  | 'Draft'
  | 'Pending Review'
  | 'Approved'
  | 'Rejected'
  | 'Processed'
  | 'Processing Failed'

export type SubmissionRequestTarget = 'tanker' | 'receiver' | 'both'
export type SubmissionRequestMode = 'existing' | 'new'
export type SubmissionRequestType = 'create' | 'update' | 'delete'
export type SubmissionValidationStatus = 'ok' | 'warning' | 'conflict' | null

export type SRD_holderFormValues = {
  requestTarget: SubmissionRequestTarget
  requestType: SubmissionRequestType
  requestMode: SubmissionRequestMode
  nationOrganisation: string
  tankerType: string
  tankerModel: string
  receiverNation: string
  receiverType: string
  receiverModel: string
  cTanker: string
  cReciever: string
  vSrdT: string
  vSrdR: string
  refuellingInterface: string
  minimumFlightLevel: string
  maximumFlightLevel: string
  minimumKcas: string
  maximumKcas: string
  maxAsM: string
  planningFuelTransferRate: string
  comment: string
}

export type SubmissionComparisonField = {
  field: string
  label: string
  baselineValue: string
  currentValue: string
  requestedValue: string
}

export type SubmissionValidationDetails = {
  fieldConflicts: SubmissionComparisonField[]
}

export type SubmissionBaselineSnapshot = Partial<
  Omit<SRD_holderFormValues, 'requestTarget' | 'requestType' | 'requestMode' | 'comment'>
> & {
  notes?: string
}

export type SRD_holderSubmission = SRD_holderFormValues & {
  id: string
  status: SubmissionStatus
  statusKey: SubmissionStatusKey
  createdAt: string
  updatedAt: string
  submittedAt: string
  reviewedAt: string
  processedAt: string
  requestComment: string
  reviewComment: string
  validationStatus: SubmissionValidationStatus
  validationSummary: string
  validationDetails: SubmissionValidationDetails
  baselineSnapshot: SubmissionBaselineSnapshot
  compatibilityId: number | null
  specificationId: number | null
  tankerId: number | null
  receiverId: number | null
  processedCompatibilityId: number | null
  processedSpecificationId: number | null
  processingError: string
  createdByName: string
  createdByEmail: string
  reviewedByName: string
}

type ChangeRequestApiRecord = {
  id: number
  requestTarget: SubmissionRequestTarget
  requestType: SubmissionRequestType
  requestMode: SubmissionRequestMode
  status: SubmissionStatusKey
  payload: Partial<SRD_holderFormValues>
  baselineSnapshot?: SubmissionBaselineSnapshot | null
  requestComment?: string | null
  reviewComment?: string | null
  validationStatus?: SubmissionValidationStatus
  validationSummary?: string | null
  validationDetails?: SubmissionValidationDetails | null
  compatibilityId?: number | null
  specificationId?: number | null
  tankerId?: number | null
  receiverId?: number | null
  processedCompatibilityId?: number | null
  processedSpecificationId?: number | null
  processingError?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  submittedAt?: string | null
  reviewedAt?: string | null
  processedAt?: string | null
  createdByName?: string | null
  createdByEmail?: string | null
  reviewedByName?: string | null
}

type ChangeRequestListResponse = {
  ok: boolean
  rows: ChangeRequestApiRecord[]
}

type ChangeRequestResponse = {
  ok: boolean
  request: ChangeRequestApiRecord
}

const STATUS_LABELS: Record<SubmissionStatusKey, SubmissionStatus> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  processed: 'Processed',
  processing_failed: 'Processing Failed',
}

function emptyString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeCCategory(value: unknown) {
  const text = emptyString(value).trim()
  const match = text.match(/^Cat-(\d+)$/i)
  return match ? match[1] : text
}

function normalizeRefuelInterface(value: unknown) {
  const text = emptyString(value).trim()
  const upper = text.toUpperCase()

  if (upper === 'BOOM') return 'B'
  if (upper === 'POD') return 'P'
  if (upper === 'CENTRE LINE (CL)' || upper === 'CENTRE LINE') return 'CL'

  return text
}

function normalizeValidationDetails(
  value: ChangeRequestApiRecord['validationDetails'],
): SubmissionValidationDetails {
  if (!value || !Array.isArray(value.fieldConflicts)) {
    return { fieldConflicts: [] }
  }

  return {
    fieldConflicts: value.fieldConflicts.map((field) => ({
      field: emptyString(field.field),
      label: emptyString(field.label),
      baselineValue: emptyString(field.baselineValue),
      currentValue: emptyString(field.currentValue),
      requestedValue: emptyString(field.requestedValue),
    })),
  }
}

function normalizeSubmission(record: ChangeRequestApiRecord): SRD_holderSubmission {
  const payload = record.payload ?? {}
  const statusKey = record.status ?? 'pending_review'

  return {
    requestTarget: payload.requestTarget ?? record.requestTarget,
    requestType:
      payload.requestType ??
      record.requestType ??
      (record.requestMode === 'new' ? 'create' : 'update'),
    requestMode: payload.requestMode ?? record.requestMode ?? 'existing',
    nationOrganisation: emptyString(payload.nationOrganisation),
    tankerType: emptyString(payload.tankerType),
    tankerModel: emptyString(payload.tankerModel),
    receiverNation: emptyString(payload.receiverNation),
    receiverType: emptyString(payload.receiverType),
    receiverModel: emptyString(payload.receiverModel),
    cTanker: normalizeCCategory(payload.cTanker),
    cReciever: normalizeCCategory(payload.cReciever),
    vSrdT: emptyString(payload.vSrdT),
    vSrdR: emptyString(payload.vSrdR),
    refuellingInterface: normalizeRefuelInterface(payload.refuellingInterface),
    minimumFlightLevel: emptyString(payload.minimumFlightLevel),
    maximumFlightLevel: emptyString(payload.maximumFlightLevel),
    minimumKcas: emptyString(payload.minimumKcas),
    maximumKcas: emptyString(payload.maximumKcas),
    maxAsM: emptyString(payload.maxAsM),
    planningFuelTransferRate: emptyString(payload.planningFuelTransferRate),
    comment: emptyString(payload.comment || record.requestComment),
    id: String(record.id),
    status: STATUS_LABELS[statusKey],
    statusKey,
    createdAt: record.createdAt ?? '',
    updatedAt: record.updatedAt ?? '',
    submittedAt: record.submittedAt ?? '',
    reviewedAt: record.reviewedAt ?? '',
    processedAt: record.processedAt ?? '',
    requestComment: emptyString(record.requestComment || payload.comment),
    reviewComment: emptyString(record.reviewComment),
    validationStatus: record.validationStatus ?? null,
    validationSummary: emptyString(record.validationSummary),
    validationDetails: normalizeValidationDetails(record.validationDetails),
    baselineSnapshot: {
      ...(record.baselineSnapshot ?? {}),
      cTanker: normalizeCCategory(record.baselineSnapshot?.cTanker),
      cReciever: normalizeCCategory(record.baselineSnapshot?.cReciever),
      refuellingInterface: normalizeRefuelInterface(record.baselineSnapshot?.refuellingInterface),
    },
    compatibilityId: record.compatibilityId ?? null,
    specificationId: record.specificationId ?? null,
    tankerId: record.tankerId ?? null,
    receiverId: record.receiverId ?? null,
    processedCompatibilityId: record.processedCompatibilityId ?? null,
    processedSpecificationId: record.processedSpecificationId ?? null,
    processingError: emptyString(record.processingError),
    createdByName: emptyString(record.createdByName),
    createdByEmail: emptyString(record.createdByEmail),
    reviewedByName: emptyString(record.reviewedByName),
  }
}

async function getRequestRows(path: string): Promise<SRD_holderSubmission[]> {
  const response = await fetch(path, {
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to load requests.'))
  }

  const data = (await response.json()) as ChangeRequestListResponse
  return data.rows.map(normalizeSubmission)
}

async function getRequestRecord(
  path: string,
  options: RequestInit,
  fallback: string,
): Promise<SRD_holderSubmission> {
  const response = await fetch(path, options)

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallback))
  }

  const data = (await response.json()) as ChangeRequestResponse
  return normalizeSubmission(data.request)
}

export async function fetchOwnSubmissions(): Promise<SRD_holderSubmission[]> {
  return getRequestRows('/api/change-requests/mine')
}

export async function fetchAdminSubmissions(): Promise<SRD_holderSubmission[]> {
  return getRequestRows('/api/change-requests')
}

export async function createSubmission(values: SRD_holderFormValues): Promise<SRD_holderSubmission> {
  return getRequestRecord(
    '/api/change-requests',
    {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify(values),
    },
    'Failed to submit request.',
  )
}

export async function updateRejectedSubmission(
  id: string,
  values: SRD_holderFormValues,
): Promise<SRD_holderSubmission> {
  return getRequestRecord(
    `/api/change-requests/${id}`,
    {
      method: 'PUT',
      headers: buildHeaders(true),
      body: JSON.stringify(values),
    },
    'Failed to resubmit request.',
  )
}

export async function deleteSubmission(id: string): Promise<void> {
  const response = await fetch(`/api/change-requests/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to delete request.'))
  }
}

export async function deleteAdminSubmission(id: string): Promise<void> {
  const response = await fetch(`/api/change-requests/${id}/admin`, {
    method: 'DELETE',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to delete request.'))
  }
}

export async function approveSubmission(id: string): Promise<SRD_holderSubmission> {
  return getRequestRecord(
    `/api/change-requests/${id}/approve`,
    {
      method: 'POST',
      headers: buildHeaders(),
    },
    'Failed to approve request.',
  )
}

export async function rejectSubmission(
  id: string,
  reviewComment: string,
): Promise<SRD_holderSubmission> {
  return getRequestRecord(
    `/api/change-requests/${id}/reject`,
    {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify({ reviewComment }),
    },
    'Failed to reject request.',
  )
}

export async function processSubmission(id: string): Promise<SRD_holderSubmission> {
  return getRequestRecord(
    `/api/change-requests/${id}/process`,
    {
      method: 'POST',
      headers: buildHeaders(),
    },
    'Failed to process request.',
  )
}
