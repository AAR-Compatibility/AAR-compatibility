// This page lets an admin review submitted change requests, compare old and new values,
// reject them with comments, approve them, and process approved requests into live data.
import { useEffect, useMemo, useState } from 'react'
import '../Styles/role-pages.css'
import {
  approveSubmission,
  deleteAdminSubmission,
  fetchAdminSubmissions,
  processSubmission,
  rejectSubmission,
  type SubmissionBaselineSnapshot,
  type SRD_holderSubmission,
} from '../Services/submissionService'

type AdminPageProps = {
  currentUser: import('../Services/authService').AuthUser | null
  onLogout: () => void
  onOpenViewer: () => void
  onCreateAccount: () => void
}

type DiffFieldConfig = {
  key: keyof SubmissionBaselineSnapshot | keyof SRD_holderSubmission
  label: string
}

const TANKER_FIELDS: DiffFieldConfig[] = [
  { key: 'nationOrganisation', label: 'Tanker Nation' },
  { key: 'tankerType', label: 'Tanker Type' },
  { key: 'tankerModel', label: 'Tanker Model' },
]

const RECEIVER_FIELDS: DiffFieldConfig[] = [
  { key: 'receiverNation', label: 'Receiver Nation' },
  { key: 'receiverType', label: 'Receiver Type' },
  { key: 'receiverModel', label: 'Receiver Model' },
]

const SPECIFICATION_FIELDS: DiffFieldConfig[] = [
  { key: 'cTanker', label: 'C_tanker' },
  { key: 'cReciever', label: 'C_receiver' },
  { key: 'vSrdT', label: 'V_srd_tanker' },
  { key: 'vSrdR', label: 'V_srd_receiver' },
  { key: 'refuellingInterface', label: 'Boom_pod_bda' },
  { key: 'minimumFlightLevel', label: 'Min_Alt' },
  { key: 'maximumFlightLevel', label: 'Max_Alt' },
  { key: 'minimumKcas', label: 'Min_as_kcas' },
  { key: 'maximumKcas', label: 'Max_as_kcas' },
  { key: 'maxAsM', label: 'Max_as_m' },
  { key: 'planningFuelTransferRate', label: 'Fuel flow rate' },
]

function formatDate(value: string) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}

function getStatusClass(statusKey: SRD_holderSubmission['statusKey']) {
  if (statusKey === 'processed') {
    return 'status-tag--approved'
  }
  if (statusKey === 'approved') {
    return 'status-tag--reviewed'
  }
  if (statusKey === 'rejected' || statusKey === 'processing_failed') {
    return 'status-tag--rejected'
  }
  return 'status-tag--pending'
}

function formatRequestLabel(submission: SRD_holderSubmission) {
  if (submission.requestType === 'create') {
    return submission.requestTarget === 'tanker' ? 'New Tanker' : 'New Receiver'
  }
  if (submission.requestType === 'delete') {
    return 'Delete Pairing'
  }
  return submission.requestTarget === 'tanker'
    ? 'Update Tanker Side'
    : submission.requestTarget === 'receiver'
      ? 'Update Receiver Side'
      : 'Update Pairing'
}

function valueAsText(value: unknown) {
  if (value === null || value === undefined) {
    return '-'
  }
  const text = String(value).trim()
  return text.length > 0 ? text : '-'
}

const REFUEL_INTERFACE_LABELS: Record<string, string> = {
  B: 'Boom',
  P: 'Pod',
  HDU: 'HDU',
  CL: 'Centre Line',
}

function normalizeCCategory(value: string) {
  const match = value.match(/^Cat-(\d+)$/i)
  return match ? match[1] : value
}

function normalizeRefuelInterface(value: string) {
  const normalized = value.trim()
  const upper = normalized.toUpperCase()

  if (upper === 'BOOM') return 'B'
  if (upper === 'POD') return 'P'
  if (upper === 'CENTRE LINE (CL)' || upper === 'CENTRE LINE') return 'CL'

  return normalized
}

function formatDiffValue(key: DiffFieldConfig['key'], value: unknown) {
  const text = valueAsText(value)
  if (text === '-') {
    return text
  }

  if (key === 'cTanker' || key === 'cReciever') {
    return normalizeCCategory(text)
  }

  if (key === 'refuellingInterface') {
    const code = normalizeRefuelInterface(text)
    const label = REFUEL_INTERFACE_LABELS[code]
    return label ? `${code} (${label})` : code
  }

  return text
}

function getFieldConfigs(submission: SRD_holderSubmission) {
  if (submission.requestType === 'create') {
    return submission.requestTarget === 'tanker' ? TANKER_FIELDS : RECEIVER_FIELDS
  }

  if (submission.requestTarget === 'tanker') {
    return [...TANKER_FIELDS, ...RECEIVER_FIELDS, ...SPECIFICATION_FIELDS.filter((field) => field.key !== 'cReciever' && field.key !== 'vSrdR')]
  }

  if (submission.requestTarget === 'receiver') {
    return [...TANKER_FIELDS, ...RECEIVER_FIELDS, ...SPECIFICATION_FIELDS.filter((field) => field.key !== 'cTanker' && field.key !== 'vSrdT')]
  }

  return [...TANKER_FIELDS, ...RECEIVER_FIELDS, ...SPECIFICATION_FIELDS]
}

function getRequestedValue(submission: SRD_holderSubmission, key: DiffFieldConfig['key']) {
  if (submission.requestType === 'delete') {
    return 'Removed'
  }
  return formatDiffValue(key, submission[key as keyof SRD_holderSubmission])
}

function getBaselineValue(
  snapshot: SubmissionBaselineSnapshot,
  key: DiffFieldConfig['key'],
  requestType: SRD_holderSubmission['requestType'],
) {
  if (requestType === 'create') {
    return 'New'
  }
  return formatDiffValue(key, snapshot[key as keyof SubmissionBaselineSnapshot])
}

function isChangedField(
  submission: SRD_holderSubmission,
  key: DiffFieldConfig['key'],
) {
  return (
    getBaselineValue(submission.baselineSnapshot, key, submission.requestType) !==
    getRequestedValue(submission, key)
  )
}

// Hides review-only controls once a request has already been fully processed.
function shouldShowReviewControls(statusKey: SRD_holderSubmission['statusKey']) {
  return statusKey !== 'processed'
}

// Allows admin deletion for every request except fully processed requests.
function canDeleteSubmission(statusKey: SRD_holderSubmission['statusKey']) {
  return statusKey !== 'processed'
}

export default function AdminPage({
  currentUser,
  onLogout,
  onOpenViewer,
  onCreateAccount,
}: AdminPageProps) {
  const userDisplayName = currentUser?.name?.trim() || currentUser?.email || 'Unknown user'
  const [submissions, setSubmissions] = useState<SRD_holderSubmission[]>([])
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [isRunningAction, setIsRunningAction] = useState(false)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      try {
        const rows = await fetchAdminSubmissions()
        if (!isMounted) {
          return
        }
        setSubmissions(rows)
        setPageError('')
      } catch (error) {
        if (!isMounted) {
          return
        }
        setPageError(error instanceof Error ? error.message : 'Failed to load requests.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [])

  const activeSubmission =
    submissions.find((submission) => submission.id === activeSubmissionId) ?? null

  const diffFields = useMemo(
    () => (activeSubmission ? getFieldConfigs(activeSubmission) : []),
    [activeSubmission],
  )

  const handleOpenSubmission = (submission: SRD_holderSubmission) => {
    setActiveSubmissionId(submission.id)
    setReviewComment(submission.reviewComment || '')
    setPageError('')
  }

  const handleCloseSubmission = () => {
    setActiveSubmissionId(null)
    setReviewComment('')
  }

  const replaceSubmission = (nextSubmission: SRD_holderSubmission) => {
    setSubmissions((prevSubmissions) =>
      prevSubmissions.map((submission) =>
        submission.id === nextSubmission.id ? nextSubmission : submission,
      ),
    )
    setActiveSubmissionId(nextSubmission.id)
    setReviewComment(nextSubmission.reviewComment || '')
  }

  const handleApprove = async () => {
    if (!activeSubmission) {
      return
    }

    setIsRunningAction(true)
    setPageError('')
    try {
      const nextSubmission = await approveSubmission(activeSubmission.id)
      replaceSubmission(nextSubmission)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to approve request.')
    } finally {
      setIsRunningAction(false)
    }
  }

  const handleReject = async () => {
    if (!activeSubmission) {
      return
    }

    setIsRunningAction(true)
    setPageError('')
    try {
      const nextSubmission = await rejectSubmission(activeSubmission.id, reviewComment)
      replaceSubmission(nextSubmission)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to reject request.')
    } finally {
      setIsRunningAction(false)
    }
  }

  const handleProcess = async () => {
    if (!activeSubmission) {
      return
    }

    setIsRunningAction(true)
    setPageError('')
    try {
      const nextSubmission = await processSubmission(activeSubmission.id)
      replaceSubmission(nextSubmission)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to process request.')
    } finally {
      setIsRunningAction(false)
    }
  }

  const handleDelete = async () => {
    if (!activeSubmission || !canDeleteSubmission(activeSubmission.statusKey)) {
      return
    }

    setIsRunningAction(true)
    setPageError('')
    try {
      await deleteAdminSubmission(activeSubmission.id)
      setSubmissions((prevSubmissions) =>
        prevSubmissions.filter((submission) => submission.id !== activeSubmission.id),
      )
      handleCloseSubmission()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to delete request.')
    } finally {
      setIsRunningAction(false)
    }
  }

  return (
    <div className="role-page">
      <header className="role-page__header">
        <div>
          <span className="role-pill">Admin</span>
          <h1 className="role-page__title">Admin Review</h1>
          <p className="viewer-intro">Signed in as {userDisplayName}</p>
        </div>
        <div className="role-header-controls">
          <div className="button-row">
            <button className="btn ghost" type="button" onClick={onCreateAccount}>
              Create Account
            </button>
            <button className="btn ghost" type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
          <section className="role-quick-actions" aria-label="Admin actions">
            <ul className="role-quick-actions__list">
              <li>
                <button className="role-quick-actions__link" type="button" onClick={onOpenViewer}>
                  Go to Viewer
                </button>
              </li>
            </ul>
          </section>
        </div>
      </header>

      <section className="role-card">
        <p className="viewer-intro">
          Review SRD holder requests, compare old and new values, then approve, reject, or process
          them into live data.
        </p>
        {pageError && <p className="viewer-error">{pageError}</p>}

        {isLoading ? (
          <p className="viewer-intro">Loading change requests...</p>
        ) : submissions.length === 0 ? (
          <p className="viewer-intro">No change requests are waiting for review.</p>
        ) : (
          <div className="table-wrap">
            <table className="srd_holder-table">
              <thead>
                <tr>
                  <th className="col-number">Nr</th>
                  <th>Request</th>
                  <th>Submitted By</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Validation</th>
                  <th className="col-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission, index) => (
                  <tr key={submission.id}>
                    <td data-label="Nr">{index + 1}</td>
                    <td data-label="Request">
                      <strong>{formatRequestLabel(submission)}</strong>
                      <br />
                      <span>{submission.comment || '-'}</span>
                    </td>
                    <td data-label="Submitted By">
                      <strong>{submission.createdByName || 'Unknown user'}</strong>
                      <br />
                      <span>{submission.createdByEmail || '-'}</span>
                    </td>
                    <td data-label="Submitted">{formatDate(submission.submittedAt)}</td>
                    <td className="srd_holder-table__status" data-label="Status">
                      <span className={`status-tag ${getStatusClass(submission.statusKey)}`}>
                        {submission.status}
                      </span>
                    </td>
                    <td data-label="Validation">{submission.validationSummary || '-'}</td>
                    <td data-label="Action">
                      <div className="admin-actions">
                        <button
                          className="btn ghost small admin-view-button"
                          type="button"
                          onClick={() => handleOpenSubmission(submission)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubmission ? (
          <div
            className="admin-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-review-title"
            onClick={handleCloseSubmission}
          >
            <div className="admin-review-modal__panel" onClick={(event) => event.stopPropagation()}>
              <div className="admin-review-modal__header">
                <div>
                  <span className="role-pill">Review</span>
                  <h2 id="admin-review-title" className="admin-review-modal__title">
                    {formatRequestLabel(activeSubmission)}
                  </h2>
                </div>
                <button className="btn ghost small" type="button" onClick={handleCloseSubmission}>
                  Close
                </button>
              </div>

              <div className="admin-review-modal__meta">
                <span className="role-card__meta">Request #{activeSubmission.id}</span>
                <span className={`status-tag ${getStatusClass(activeSubmission.statusKey)}`}>
                  {activeSubmission.status}
                </span>
              </div>

              <div className="admin-review-grid">
                <div className="admin-review-item">
                  <span>Submitted By</span>
                  <strong>{activeSubmission.createdByName || activeSubmission.createdByEmail || '-'}</strong>
                </div>
                <div className="admin-review-item">
                  <span>Submitted At</span>
                  <strong>{formatDate(activeSubmission.submittedAt)}</strong>
                </div>
                <div className="admin-review-item">
                  <span>Reviewed By</span>
                  <strong>{activeSubmission.reviewedByName || '-'}</strong>
                </div>
                <div className="admin-review-item admin-review-item--wide">
                  <span>SRD Holder Comment</span>
                  <strong>{activeSubmission.comment || '-'}</strong>
                </div>
              </div>

              <div className="admin-review-section">
                <h3>Requested Change</h3>
                <div className="table-wrap">
                  <table className="srd_holder-table admin-diff-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Old</th>
                        <th>New</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffFields.map((field) => {
                        const changed = isChangedField(activeSubmission, field.key)

                        return (
                        <tr
                          key={String(field.key)}
                          className={changed ? 'admin-diff-row admin-diff-row--changed' : 'admin-diff-row'}
                        >
                          <td data-label="Field">{field.label}</td>
                          <td
                            data-label="Old"
                            className={changed ? 'admin-diff-cell admin-diff-cell--changed' : undefined}
                          >
                            {getBaselineValue(
                              activeSubmission.baselineSnapshot,
                              field.key,
                              activeSubmission.requestType,
                            )}
                          </td>
                          <td
                            data-label="New"
                            className={changed ? 'admin-diff-cell admin-diff-cell--new' : undefined}
                          >
                            {getRequestedValue(activeSubmission, field.key)}
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {shouldShowReviewControls(activeSubmission.statusKey) ? (
                <div className="admin-validation-banner admin-validation-banner--attention">
                  <strong>Please note!!!</strong>
                  <span>
                    {activeSubmission.requestType === 'delete'
                      ? 'Processing this request will remove the specification for this selected tanker and receiver combination. Check the selected combination carefully before you process this request.'
                      : 'There are requested changes in this submission. Check all highlighted differences carefully before you process this request into the live data.'}
                  </span>
                </div>
              ) : null}

              {activeSubmission.validationDetails.fieldConflicts.length > 0 ? (
                <div className="admin-review-section">
                  <h3>Live Mismatch Check</h3>
                  <div className="table-wrap">
                    <table className="srd_holder-table admin-diff-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Submitted Against</th>
                          <th>Current Live Value</th>
                          <th>Requested Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSubmission.validationDetails.fieldConflicts.map((field) => (
                          <tr key={field.field}>
                            <td data-label="Field">{field.label}</td>
                            <td data-label="Submitted Against">{valueAsText(field.baselineValue)}</td>
                            <td data-label="Current Live Value">{valueAsText(field.currentValue)}</td>
                            <td data-label="Requested Value">{valueAsText(field.requestedValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {shouldShowReviewControls(activeSubmission.statusKey) ? (
                <div className="admin-review-section">
                  <h3>Reject Comment</h3>
                  <label className="input-group input-group--wide">
                    Admin Comment
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      placeholder="Explain why this request is being sent back."
                    />
                  </label>
                </div>
              ) : null}

              {activeSubmission.processingError ? (
                <p className="viewer-error">{activeSubmission.processingError}</p>
              ) : null}

              {activeSubmission.statusKey === 'pending_review' ? (
                <p className="viewer-intro">
                  Approve this request first. Processing becomes available only after approval.
                </p>
              ) : null}

              <div className="admin-review-actions">
                {canDeleteSubmission(activeSubmission.statusKey) ? (
                  <button
                    className="btn ghost admin-review-actions__delete"
                    type="button"
                    onClick={handleDelete}
                    disabled={isRunningAction}
                  >
                    Delete
                  </button>
                ) : null}
                <button
                  className="btn"
                  type="button"
                  onClick={handleApprove}
                  disabled={isRunningAction || activeSubmission.statusKey !== 'pending_review'}
                >
                  Approve
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={handleReject}
                  disabled={
                    isRunningAction ||
                    reviewComment.trim().length === 0 ||
                    !['pending_review', 'approved'].includes(activeSubmission.statusKey)
                  }
                >
                  Reject
                </button>
                {activeSubmission.statusKey === 'approved' ? (
                  <button
                    className="btn primary"
                    type="button"
                    onClick={handleProcess}
                    disabled={isRunningAction}
                  >
                    Process
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
