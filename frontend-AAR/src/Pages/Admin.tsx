// This page lets an admin review one submission in a popup and edit it directly in the popup form before approving, rejecting, or deleting it.
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import '../Styles/role-pages.css'
import {
  deleteSubmission,
  loadSubmissions,
  updateSubmission,
  updateSubmissionStatus,
  type SRD_holderFormValues,
  type SRD_holderSubmission,
} from '../Services/submissionService'
import {
  fetchViewerOptions,
  type ViewerOptionsResponse,
} from '../Services/viewerService'

type AdminPageProps = {
  currentUser: import('../Services/authService').AuthUser | null
  onLogout: () => void
  onOpenViewer: () => void
  onCreateAccount: () => void
}

const REFUEL_INTERFACE_OPTIONS = ['Boom', 'Pod', 'HDU', 'Centre Line (CL)']
const C_CATEGORY_OPTIONS = ['Cat-1', 'Cat-2', 'Cat-3']

// Render the Admin review page.
export default function AdminPage({
  currentUser,
  onLogout,
  onOpenViewer,
  onCreateAccount,
}: AdminPageProps) {
  const userDisplayName = currentUser?.name?.trim() || currentUser?.email || 'Unknown user'
  const [submissions, setSubmissions] = useState<SRD_holderSubmission[]>(() =>
    loadSubmissions(),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<SRD_holderFormValues | null>(null)
  const [editError, setEditError] = useState('')
  const [options, setOptions] = useState<ViewerOptionsResponse | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null)

  const resetEditState = () => {
    setEditingId(null)
    setEditValues(null)
    setEditError('')
  }

  const handleOpenSubmission = (submission: SRD_holderSubmission) => {
    if (editingId && editingId !== submission.id) {
      resetEditState()
    }
    setActiveSubmissionId(submission.id)
  }

  const handleCloseSubmission = () => {
    setActiveSubmissionId(null)
    resetEditState()
  }

  useEffect(() => {
    let isMounted = true

    const loadOptions = async () => {
      setIsLoadingOptions(true)
      try {
        const fetchedOptions = await fetchViewerOptions()
        if (!isMounted) {
          return
        }
        setOptions(fetchedOptions)
        setEditError('')
      } catch (error) {
        if (!isMounted) {
          return
        }
        setEditError(
          error instanceof Error ? error.message : 'Failed to load dropdown options.',
        )
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false)
        }
      }
    }

    void loadOptions()

    return () => {
      isMounted = false
    }
  }, [])

  // Mark one submission as approved.
  const handleApprove = (id: string) => {
    setSubmissions(updateSubmissionStatus(id, 'Approved'))
    setActiveSubmissionId((prev) => (prev === id ? null : prev))
  }

  // Mark one submission as rejected.
  const handleReject = (id: string) => {
    setSubmissions(updateSubmissionStatus(id, 'Rejected'))
    setActiveSubmissionId((prev) => (prev === id ? null : prev))
  }

  // Remove one submission from the admin list.
  const handleDelete = (id: string) => {
    setSubmissions(deleteSubmission(id))
    if (editingId === id) {
      resetEditState()
    }
    setActiveSubmissionId((prev) => (prev === id ? null : prev))
  }

  // Start editing one submission in the admin form.
  const handleStartEdit = (submission: SRD_holderSubmission) => {
    const { id, status, createdAt, ...values } = submission
    void id
    void status
    void createdAt
    setEditingId(submission.id)
    setEditValues(values)
    setEditError('')
    setActiveSubmissionId(submission.id)
  }

  // Track admin changes in the edit form.
  const handleEditChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target
    setEditValues((prev) => {
      if (!prev) return prev
      if (name === 'nationOrganisation') {
        return { ...prev, nationOrganisation: value, tankerType: '', tankerModel: '' }
      }
      if (name === 'tankerType') {
        return { ...prev, tankerType: value, tankerModel: '' }
      }
      if (name === 'receiverNation') {
        return { ...prev, receiverNation: value, receiverType: '', receiverModel: '' }
      }
      if (name === 'receiverType') {
        return { ...prev, receiverType: value, receiverModel: '' }
      }
      return { ...prev, [name]: value }
    })
  }

  // Save all admin edits for the selected submission.
  const handleSaveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingId || !editValues) return
    const requiredFields =
      editValues.requestMode === 'new'
        ? editValues.requestTarget === 'tanker'
          ? ['requestTarget', 'requestMode', 'nationOrganisation', 'tankerType', 'tankerModel', 'comment']
          : ['requestTarget', 'requestMode', 'receiverNation', 'receiverType', 'receiverModel', 'comment']
        : editValues.requestTarget === 'tanker'
          ? [
              'requestTarget',
              'requestMode',
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
              'comment',
            ]
          : editValues.requestTarget === 'receiver'
            ? [
                'requestTarget',
                'requestMode',
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
                'comment',
              ]
            : [
              'requestTarget',
              'requestMode',
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
              'comment',
            ]
    const allFilled = requiredFields.every((field) => {
      const value = editValues[field as keyof SRD_holderFormValues]
      return typeof value === 'string' && value.trim().length > 0
    })
    if (!allFilled) {
      setEditError('Fill in all fields before saving.')
      return
    }
    setSubmissions(updateSubmission(editingId, editValues))
    resetEditState()
  }

  // Exit edit mode without saving changes.
  const handleCancelEdit = () => {
    resetEditState()
  }

  const activeSubmission =
    submissions.find((submission) => submission.id === activeSubmissionId) ?? null

  function getSubmissionRole(submission: SRD_holderSubmission) {
    if (
      submission.requestTarget === 'tanker' ||
      submission.requestTarget === 'receiver' ||
      submission.requestTarget === 'both'
    ) {
      return submission.requestTarget
    }

    const hasTankerReviewData = Boolean(submission.cTanker || submission.vSrdT)
    const hasReceiverReviewData = Boolean(submission.cReciever || submission.vSrdR)

    if (hasTankerReviewData && hasReceiverReviewData) {
      return 'both'
    }

    if (hasTankerReviewData && !hasReceiverReviewData) {
      return 'tanker'
    }

    if (hasReceiverReviewData && !hasTankerReviewData) {
      return 'receiver'
    }

    return null
  }

  const activeSubmissionRole = activeSubmission
    ? getSubmissionRole(activeSubmission)
    : null
  const isEditingActiveSubmission =
    Boolean(editValues) && Boolean(activeSubmissionId) && editingId === activeSubmissionId
  const isNewEditRequest = editValues?.requestMode === 'new'
  const isNewActiveRequest = activeSubmission?.requestMode === 'new'

  const tankerNationOptions = useMemo(
    () => options?.tanker.nations ?? [],
    [options],
  )

  const tankerTypeOptions = useMemo(() => {
    if (!options || !editValues?.nationOrganisation) return []
    return options.tanker.byNation[editValues.nationOrganisation]?.types ?? []
  }, [options, editValues])

  const tankerModelOptions = useMemo(() => {
    if (!options || !editValues?.nationOrganisation || !editValues.tankerType) return []
    return (
      options.tanker.byNation[editValues.nationOrganisation]?.modelsByType[
        editValues.tankerType
      ] ?? []
    )
  }, [options, editValues])

  const receiverNationOptions = useMemo(
    () => options?.receiver.nations ?? [],
    [options],
  )

  const receiverTypeOptions = useMemo(() => {
    if (!options || !editValues?.receiverNation) return []
    return options.receiver.byNation[editValues.receiverNation]?.types ?? []
  }, [options, editValues])

  const receiverModelOptions = useMemo(() => {
    if (!options || !editValues?.receiverNation || !editValues.receiverType) return []
    return (
      options.receiver.byNation[editValues.receiverNation]?.modelsByType[
        editValues.receiverType
      ] ?? []
    )
  }, [options, editValues])

  const renderEditForm = () => {
    if (!editValues) return null

    return (
      <form className="srd_holder-form" onSubmit={handleSaveEdit}>
        <div className="role-card__header">
          <h2>Edit Form</h2>
          <span className="role-card__meta">ID: {editingId}</span>
        </div>
        <div className="srd_holder-form__grid">
          {editValues.requestTarget === 'tanker' || !isNewEditRequest ? (
            <>
              <label className="input-group">
                Nation / Org.
                {editValues.requestTarget === 'tanker' && isNewEditRequest ? (
                  <input
                    type="text"
                    name="nationOrganisation"
                    value={editValues.nationOrganisation}
                    onChange={handleEditChange}
                    required
                  />
                ) : (
                  <select
                    name="nationOrganisation"
                    value={editValues.nationOrganisation}
                    onChange={handleEditChange}
                    required
                    disabled={isLoadingOptions}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {tankerNationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label className="input-group">
                T type
                {editValues.requestTarget === 'tanker' && isNewEditRequest ? (
                  <input
                    type="text"
                    name="tankerType"
                    value={editValues.tankerType}
                    onChange={handleEditChange}
                    required
                  />
                ) : (
                  <select
                    name="tankerType"
                    value={editValues.tankerType}
                    onChange={handleEditChange}
                    required
                    disabled={isLoadingOptions || !editValues.nationOrganisation}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {tankerTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label className="input-group">
                T model
                {editValues.requestTarget === 'tanker' && isNewEditRequest ? (
                  <input
                    type="text"
                    name="tankerModel"
                    value={editValues.tankerModel}
                    onChange={handleEditChange}
                    required
                  />
                ) : (
                  <select
                    name="tankerModel"
                    value={editValues.tankerModel}
                    onChange={handleEditChange}
                    required
                    disabled={isLoadingOptions || !editValues.tankerType}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {tankerModelOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </>
          ) : null}
          {editValues.requestTarget === 'receiver' || !isNewEditRequest ? (
            <>
              <label className="input-group">
                R nation
                {editValues.requestTarget === 'receiver' && isNewEditRequest ? (
                  <input
                    type="text"
                    name="receiverNation"
                    value={editValues.receiverNation}
                    onChange={handleEditChange}
                    required
                  />
                ) : (
                  <select
                    name="receiverNation"
                    value={editValues.receiverNation}
                    onChange={handleEditChange}
                    required
                    disabled={isLoadingOptions}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {receiverNationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label className="input-group">
                R type
                {editValues.requestTarget === 'receiver' && isNewEditRequest ? (
                  <input
                    type="text"
                    name="receiverType"
                    value={editValues.receiverType}
                    onChange={handleEditChange}
                    required
                  />
                ) : (
                  <select
                    name="receiverType"
                    value={editValues.receiverType}
                    onChange={handleEditChange}
                    required
                    disabled={isLoadingOptions || !editValues.receiverNation}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {receiverTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label className="input-group">
                R model
                {editValues.requestTarget === 'receiver' && isNewEditRequest ? (
                  <input
                    type="text"
                    name="receiverModel"
                    value={editValues.receiverModel}
                    onChange={handleEditChange}
                    required
                  />
                ) : (
                  <select
                    name="receiverModel"
                    value={editValues.receiverModel}
                    onChange={handleEditChange}
                    required
                    disabled={isLoadingOptions || !editValues.receiverType}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {receiverModelOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </>
          ) : null}
          {!isNewEditRequest ? (
            <>
              {editValues.requestTarget === 'tanker' ? (
                <>
                  <label className="input-group">
                    C_tanker
                    <select
                      name="cTanker"
                      value={editValues.cTanker}
                      onChange={handleEditChange}
                      required
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {C_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="input-group">
                    V_srd_T
                    <input
                      type="text"
                      name="vSrdT"
                      value={editValues.vSrdT}
                      onChange={handleEditChange}
                      required
                    />
                  </label>
                </>
              ) : editValues.requestTarget === 'receiver' ? (
                <>
                  <label className="input-group">
                    C_reciever
                    <select
                      name="cReciever"
                      value={editValues.cReciever}
                      onChange={handleEditChange}
                      required
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {C_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="input-group">
                    V_srd_R
                    <input
                      type="text"
                      name="vSrdR"
                      value={editValues.vSrdR}
                      onChange={handleEditChange}
                      required
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="input-group">
                    C_tanker
                    <select
                      name="cTanker"
                      value={editValues.cTanker}
                      onChange={handleEditChange}
                      required
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {C_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="input-group">
                    C_reciever
                    <select
                      name="cReciever"
                      value={editValues.cReciever}
                      onChange={handleEditChange}
                      required
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {C_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="input-group">
                    V_srd_T
                    <input
                      type="text"
                      name="vSrdT"
                      value={editValues.vSrdT}
                      onChange={handleEditChange}
                      required
                    />
                  </label>
                  <label className="input-group">
                    V_srd_R
                    <input
                      type="text"
                      name="vSrdR"
                      value={editValues.vSrdR}
                      onChange={handleEditChange}
                      required
                    />
                  </label>
                </>
              )}
              <label className="input-group">
                Refuel interface
                <select
                  name="refuellingInterface"
                  value={editValues.refuellingInterface}
                  onChange={handleEditChange}
                  required
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {REFUEL_INTERFACE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="input-group">
                Min FL
                <input
                  type="text"
                  name="minimumFlightLevel"
                  value={editValues.minimumFlightLevel}
                  onChange={handleEditChange}
                  required
                />
              </label>
              <label className="input-group">
                Max FL
                <input
                  type="text"
                  name="maximumFlightLevel"
                  value={editValues.maximumFlightLevel}
                  onChange={handleEditChange}
                  required
                />
              </label>
              <label className="input-group">
                Min KCAS
                <input type="text" name="minimumKcas" value={editValues.minimumKcas} onChange={handleEditChange} required />
              </label>
              <label className="input-group">
                Max KCAS
                <input type="text" name="maximumKcas" value={editValues.maximumKcas} onChange={handleEditChange} required />
              </label>
              <label className="input-group">
                Max_as_m
                <input type="text" name="maxAsM" value={editValues.maxAsM} onChange={handleEditChange} required />
              </label>
              <label className="input-group">
                Fuel rate
                <input
                  type="text"
                  name="planningFuelTransferRate"
                  value={editValues.planningFuelTransferRate}
                  onChange={handleEditChange}
                  required
                />
              </label>
            </>
          ) : null}
          <label className="input-group">
            Comment
            <textarea
              name="comment"
              value={editValues.comment}
              onChange={handleEditChange}
              maxLength={150}
              required
            />
          </label>
        </div>
        {editError && <p className="viewer-error">{editError}</p>}
        <div className="admin-review-actions">
          <button className="btn ghost" type="button" onClick={handleCancelEdit}>
            Cancel
          </button>
          <button className="btn primary" type="submit">
            Save Changes
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="role-page">
      <header className="role-page__header">
        <div>
          <span className="role-pill">Admin</span>
          <h1 className="role-page__title">Current user: {userDisplayName}</h1>
        </div>
        <div className="role-header-controls">
          <button className="btn ghost" type="button" onClick={onLogout}>
            Logout
          </button>
          <section className="role-quick-actions" aria-label="Admin actions">      
            <ul className="role-quick-actions__list">
              <li>
                <button className="role-quick-actions__link" type="button" onClick={onOpenViewer}>
                  Go to Viewer
                </button>
              </li>
              <li>
                <button className="role-quick-actions__link" type="button" onClick={onCreateAccount}>
                  Create Account
                </button>
              </li>
            </ul>
          </section>
        </div>
      </header>

      <section className="role-card">
        <p className="viewer-intro">
          Review incoming srd_holder forms and approve or reject them.
        </p>
        {submissions.length === 0 ? (
          <p className="muted">No forms submitted yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="srd_holder-table">
              <colgroup>
                <col className="col-number" />
                <col className="col-nation" />
                <col className="col-type" />
                <col className="col-model" />
                <col className="col-nation" />
                <col className="col-type" />
                <col className="col-model" />
                <col className="col-minfl" />
                <col className="col-minfl" />
                <col className="col-minfl" />
                <col className="col-minfl" />
                <col className="col-refuel" />
                <col className="col-minfl" />
                <col className="col-maxfl" />
                <col className="col-minkcas" />
                <col className="col-maxkcas" />
                <col className="col-maxkcas" />
                <col className="col-fuel" />
                <col className="col-fuel" />
                <col className="col-status" />
                <col className="col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Nr</th>
                  <th>
                    <span title="Nation / Organisation">Nation/Org</span>
                  </th>
                  <th>
                    <span title="Tanker aircraft type">T type</span>
                  </th>
                  <th>
                    <span title="Tanker aircraft model">T model</span>
                  </th>
                  <th>
                    <span title="Receiver nation / organisation">R nation</span>
                  </th>
                  <th>
                    <span title="Receiver aircraft type">R type</span>
                  </th>
                  <th>
                    <span title="Receiver aircraft model">R model</span>
                  </th>
                  <th>
                    <span title="Compatibility tanker code">C_tanker</span>
                  </th>
                  <th>
                    <span title="Compatibility receiver code">C_reciever</span>
                  </th>
                  <th>
                    <span title="Valid SRD tanker">V_srd_T</span>
                  </th>
                  <th>
                    <span title="Valid SRD receiver">V_srd_R</span>
                  </th>
                  <th>
                    <span title="Refuelling interface type">Refuel IF</span>
                  </th>
                  <th>
                    <span title="Minimum altitude Flight Level">Min FL</span>
                  </th>
                  <th>
                    <span title="Maximum altitude Flight Level">Max FL</span>
                  </th>
                  <th>
                    <span title="Minimum speed KCAS">Min KCAS</span>
                  </th>
                  <th>
                    <span title="Maximum speed KCAS">Max KCAS</span>
                  </th>
                  <th>
                    <span title="Maximum speed Mach">Max_as_m</span>
                  </th>
                  <th>
                    <span title="Planning fuel transfer rate">Fuel rate</span>
                  </th>
                  <th>
                    <span title="Comment (max 150 characters)">Comment</span>
                  </th>
                  <th className="srd_holder-table__status">Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission, index) => (
                  <tr key={submission.id}>
                    <td data-label="Nr">{index + 1}</td>
                    <td data-label="Nation/Org">{submission.nationOrganisation}</td>
                    <td data-label="T type">{submission.tankerType}</td>
                    <td data-label="T model">{submission.tankerModel}</td>
                    <td data-label="R nation">{submission.receiverNation}</td>
                    <td data-label="R type">{submission.receiverType}</td>
                    <td data-label="R model">{submission.receiverModel}</td>
                    <td data-label="C_tanker">{submission.cTanker}</td>
                    <td data-label="C_reciever">{submission.cReciever}</td>
                    <td data-label="V_srd_T">{submission.vSrdT}</td>
                    <td data-label="V_srd_R">{submission.vSrdR}</td>
                    <td data-label="Refuel IF">
                      {submission.refuellingInterface}
                    </td>
                    <td data-label="Min FL">
                      {submission.minimumFlightLevel}
                    </td>
                    <td data-label="Max FL">
                      {submission.maximumFlightLevel}
                    </td>
                    <td data-label="Min KCAS">{submission.minimumKcas}</td>
                    <td data-label="Max KCAS">{submission.maximumKcas}</td>
                    <td data-label="Max_as_m">{submission.maxAsM}</td>
                    <td data-label="Fuel rate">
                      {submission.planningFuelTransferRate}
                    </td>
                    <td data-label="Comment">{submission.comment}</td>
                    <td className="srd_holder-table__status" data-label="Status">
                      <span
                        className={`status-tag ${
                            submission.status === 'Approved'
                            ? 'status-tag--approved'
                            : submission.status === 'Rejected'
                              ? 'status-tag--rejected'
                              : 'status-tag--pending'
                        }`}
                      >
                        {submission.status}
                      </span>
                    </td>
                    <td data-label="Action">
                      <div className="admin-actions">
                        <button
                          className={`btn ghost small admin-view-button ${
                            getSubmissionRole(submission) === 'tanker'
                              ? 'admin-view-button--tanker'
                              : getSubmissionRole(submission) === 'receiver'
                                ? 'admin-view-button--receiver'
                                : getSubmissionRole(submission) === 'both'
                                  ? 'admin-view-button--both'
                                  : ''
                          }`}
                          type="button"
                          onClick={() => handleOpenSubmission(submission)}
                        >
                          {getSubmissionRole(submission) === 'tanker' ? (
                            <span className="admin-view-button__marker">T</span>
                          ) : getSubmissionRole(submission) === 'receiver' ? (
                            <span className="admin-view-button__marker">R</span>
                          ) : getSubmissionRole(submission) === 'both' ? (
                            <span className="admin-view-button__marker">B</span>
                          ) : null}
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

        {activeSubmission && (
          <div
            className="admin-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-review-title"
            onClick={handleCloseSubmission}
          >
            <div
                className={`admin-review-modal__panel ${
                  activeSubmissionRole === 'tanker'
                    ? 'admin-review-modal__panel--tanker'
                  : activeSubmissionRole === 'receiver'
                      ? 'admin-review-modal__panel--receiver'
                    : activeSubmissionRole === 'both'
                        ? 'admin-review-modal__panel--both'
                      : ''
                }`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-review-modal__header">
                <div>
                  <span
                    className={`role-pill ${
                      activeSubmissionRole === 'tanker'
                        ? 'admin-review-pill--tanker'
                      : activeSubmissionRole === 'receiver'
                          ? 'admin-review-pill--receiver'
                        : activeSubmissionRole === 'both'
                            ? 'admin-review-pill--both'
                          : ''
                    }`}
                  >
                    Review
                  </span>
                  <h2 id="admin-review-title" className="admin-review-modal__title">
                    {activeSubmissionRole === 'tanker'
                      ? 'Tanker Submission Review'
                      : activeSubmissionRole === 'receiver'
                        ? 'Receiver Submission Review'
                        : activeSubmissionRole === 'both'
                          ? 'Tanker and Receiver Submission Review'
                        : 'Submission Review'}
                  </h2>
                </div>
                <button
                  className="btn ghost small"
                  type="button"
                  onClick={handleCloseSubmission}
                >
                  Close
                </button>
              </div>

              <div className="admin-review-modal__meta">
                <span className="role-card__meta">ID: {activeSubmission.id}</span>
                <span
                  className={`status-tag ${
                    activeSubmission.status === 'Approved'
                      ? 'status-tag--approved'
                      : activeSubmission.status === 'Rejected'
                        ? 'status-tag--rejected'
                        : 'status-tag--pending'
                  }`}
                >
                  {activeSubmission.status}
                </span>
              </div>

              {isEditingActiveSubmission ? (
                renderEditForm()
              ) : (
                <>
                  <div className="admin-review-grid">
                    {isNewActiveRequest ? (
                      <>
                        {activeSubmission.requestTarget === 'tanker' ? (
                          <>
                            <div className="admin-review-item">
                              <span>Tanker Nation / Org</span>
                              <strong>{activeSubmission.nationOrganisation}</strong>
                            </div>
                            <div className="admin-review-item">
                              <span>Tanker Type</span>
                              <strong>{activeSubmission.tankerType}</strong>
                            </div>
                            <div className="admin-review-item">
                              <span>Tanker Model</span>
                              <strong>{activeSubmission.tankerModel}</strong>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="admin-review-item">
                              <span>Receiver Nation</span>
                              <strong>{activeSubmission.receiverNation}</strong>
                            </div>
                            <div className="admin-review-item">
                              <span>Receiver Type</span>
                              <strong>{activeSubmission.receiverType}</strong>
                            </div>
                            <div className="admin-review-item">
                              <span>Receiver Model</span>
                              <strong>{activeSubmission.receiverModel}</strong>
                            </div>
                          </>
                        )}
                        <div className="admin-review-item">
                          <span>Request Type</span>
                          <strong>New {activeSubmission.requestTarget}</strong>
                        </div>
                        <div className="admin-review-item admin-review-item--wide">
                          <span>Comment</span>
                          <strong>{activeSubmission.comment}</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="admin-review-item">
                          <span>Tanker Nation / Org</span>
                          <strong>{activeSubmission.nationOrganisation}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Tanker Type</span>
                          <strong>{activeSubmission.tankerType}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Tanker Model</span>
                          <strong>{activeSubmission.tankerModel}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Receiver Nation</span>
                          <strong>{activeSubmission.receiverNation}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Receiver Type</span>
                          <strong>{activeSubmission.receiverType}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Receiver Model</span>
                          <strong>{activeSubmission.receiverModel}</strong>
                        </div>
                        {activeSubmissionRole === 'tanker' ? (
                          <>
                            <div className="admin-review-item">
                              <span>C_tanker</span>
                              <strong>{activeSubmission.cTanker}</strong>
                            </div>
                            <div className="admin-review-item">
                              <span>V_srd_T</span>
                              <strong>{activeSubmission.vSrdT}</strong>
                            </div>
                          </>
                        ) : activeSubmissionRole === 'receiver' ? (
                          <>
                            <div className="admin-review-item">
                              <span>C_reciever</span>
                              <strong>{activeSubmission.cReciever}</strong>
                            </div>
                            <div className="admin-review-item">
                              <span>V_srd_R</span>
                              <strong>{activeSubmission.vSrdR}</strong>
                            </div>
                          </>
                        ) : activeSubmissionRole === 'both' ? (
                          <>
                            <div className="admin-review-item">
                              <span>C_tanker</span>
                              <strong>{activeSubmission.cTanker}</strong>
                            </div>
                            <div className="admin-review-item">
                              <span>C_reciever</span>
                              <strong>{activeSubmission.cReciever}</strong>
                            </div>
                            <div className="admin-review-item">
                              <span>V_srd_T</span>
                              <strong>{activeSubmission.vSrdT}</strong>
                            </div>
                            <div className="admin-review-item">
                              <span>V_srd_R</span>
                              <strong>{activeSubmission.vSrdR}</strong>
                            </div>
                          </>
                        ) : null}
                        <div className="admin-review-item">
                          <span>Refuel Interface</span>
                          <strong>{activeSubmission.refuellingInterface}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Min FL</span>
                          <strong>{activeSubmission.minimumFlightLevel}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Max FL</span>
                          <strong>{activeSubmission.maximumFlightLevel}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Min KCAS</span>
                          <strong>{activeSubmission.minimumKcas}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Max KCAS</span>
                          <strong>{activeSubmission.maximumKcas}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Max_as_m</span>
                          <strong>{activeSubmission.maxAsM}</strong>
                        </div>
                        <div className="admin-review-item">
                          <span>Fuel Rate</span>
                          <strong>{activeSubmission.planningFuelTransferRate}</strong>
                        </div>
                        <div className="admin-review-item admin-review-item--wide">
                          <span>Comment</span>
                          <strong>{activeSubmission.comment}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="admin-review-actions">
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => handleStartEdit(activeSubmission)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => handleApprove(activeSubmission.id)}
                      disabled={activeSubmission.status === 'Approved'}
                    >
                      Approve
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => handleReject(activeSubmission.id)}
                      disabled={activeSubmission.status === 'Rejected'}
                    >
                      Reject
                    </button>
                    <button
                      className="btn ghost admin-review-actions__delete"
                      type="button"
                      onClick={() => handleDelete(activeSubmission.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </section>
    </div>
  )
}
