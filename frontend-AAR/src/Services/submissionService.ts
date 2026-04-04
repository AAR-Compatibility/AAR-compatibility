// This service stores, updates, and deletes SRD holder submissions in browser storage.
export type SubmissionStatus = 'Pending Review' | 'Approved' | 'Rejected'
export type SubmissionRequestTarget = 'tanker' | 'receiver' | 'both'
export type SubmissionRequestMode = 'existing' | 'new'

export type SRD_holderFormValues = {
  requestTarget: SubmissionRequestTarget
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

export type SRD_holderSubmission = SRD_holderFormValues & {
  id: string
  status: SubmissionStatus
  createdAt: string
}

const STORAGE_KEY = 'aar_srd_holder_submissions'

// Convert old stored status values to the current English labels.
function normalizeStatus(status: unknown): SubmissionStatus {
  if (status === 'Goedgekeurd' || status === 'Approved') return 'Approved'
  if (status === 'Afgewezen' || status === 'Rejected') return 'Rejected'
  return 'Pending Review'
}

function normalizeRequestTarget(
  submission: Partial<SRD_holderSubmission>,
): SubmissionRequestTarget {
  if (
    submission.requestTarget === 'tanker' ||
    submission.requestTarget === 'receiver' ||
    submission.requestTarget === 'both'
  ) {
    return submission.requestTarget
  }

  if ((submission.cTanker || submission.vSrdT) && (submission.cReciever || submission.vSrdR)) {
    return 'both'
  }

  if (submission.cReciever || submission.vSrdR) {
    return 'receiver'
  }

  return 'tanker'
}

function normalizeRequestMode(
  submission: Partial<SRD_holderSubmission>,
): SubmissionRequestMode {
  if (submission.requestMode === 'existing' || submission.requestMode === 'new') {
    return submission.requestMode
  }

  return 'existing'
}

// Load saved submissions from browser storage.
export function loadSubmissions(): SRD_holderSubmission[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => {
      const submission = item as Partial<SRD_holderSubmission>
      return {
        requestTarget: normalizeRequestTarget(submission),
        requestMode: normalizeRequestMode(submission),
        nationOrganisation: submission.nationOrganisation ?? '',
        tankerType: submission.tankerType ?? '',
        tankerModel: submission.tankerModel ?? '',
        receiverNation: submission.receiverNation ?? '',
        receiverType: submission.receiverType ?? '',
        receiverModel: submission.receiverModel ?? '',
        cTanker: submission.cTanker ?? '',
        cReciever: submission.cReciever ?? '',
        vSrdT: submission.vSrdT ?? '',
        vSrdR: submission.vSrdR ?? '',
        refuellingInterface: submission.refuellingInterface ?? '',
        minimumFlightLevel: submission.minimumFlightLevel ?? '',
        maximumFlightLevel: submission.maximumFlightLevel ?? '',
        minimumKcas: submission.minimumKcas ?? '',
        maximumKcas: submission.maximumKcas ?? '',
        maxAsM: submission.maxAsM ?? '',
        planningFuelTransferRate: submission.planningFuelTransferRate ?? '',
        comment: submission.comment ?? '',
        id: submission.id ?? createId(),
        createdAt: submission.createdAt ?? new Date().toISOString(),
        status: normalizeStatus(submission.status),
      }
    })
  } catch {
    return []
  }
}

// Save submissions to browser storage.
function saveSubmissions(submissions: SRD_holderSubmission[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions))
}

// Create a unique id for one submission.
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

// Add a new submission and persist it.
export function addSubmission(values: SRD_holderFormValues): SRD_holderSubmission[] {
  const next: SRD_holderSubmission = {
    ...values,
    id: createId(),
    status: 'Pending Review',
    createdAt: new Date().toISOString(),
  }
  const updated = [next, ...loadSubmissions()]
  saveSubmissions(updated)
  return updated
}

// Update the review status of one submission.
export function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): SRD_holderSubmission[] {
  const updated = loadSubmissions().map((submission) =>
    submission.id === id ? { ...submission, status } : submission,
  )
  saveSubmissions(updated)
  return updated
}

// Update all editable fields for one submission.
export function updateSubmission(
  id: string,
  values: SRD_holderFormValues,
): SRD_holderSubmission[] {
  const updated = loadSubmissions().map((submission) =>
    submission.id === id ? { ...submission, ...values } : submission,
  )
  saveSubmissions(updated)
  return updated
}

// Delete one submission and persist the remaining list.
export function deleteSubmission(id: string): SRD_holderSubmission[] {
  const updated = loadSubmissions().filter((submission) => submission.id !== id)
  saveSubmissions(updated)
  return updated
}
