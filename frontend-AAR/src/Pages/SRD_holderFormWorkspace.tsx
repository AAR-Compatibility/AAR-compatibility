// This form supports existing and new tanker/receiver requests while reusing the same viewer dropdown data and submission flow.
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import '../Styles/role-pages.css'
import {
  addSubmission,
  loadSubmissions,
  updateSubmission,
  updateSubmissionStatus,
  type SubmissionRequestMode,
  type SubmissionRequestTarget,
  type SRD_holderFormValues,
  type SRD_holderSubmission,
} from '../Services/submissionService'
import {
  fetchViewerOptions,
  type ViewerOptionsResponse,
} from '../Services/viewerService'

type SRDHolderFormWorkspaceProps = {
  pageTitle: string
  workspaceTarget: SubmissionRequestTarget
  onLogout: () => void
  onOpenViewer: () => void
  onOpenMySrd: () => void
}

function createEmptyForm(
  requestTarget: SubmissionRequestTarget,
  requestMode: SubmissionRequestMode = 'existing',
): SRD_holderFormValues {
  return {
    requestTarget,
    requestMode,
    nationOrganisation: '',
    tankerType: '',
    tankerModel: '',
    receiverNation: '',
    receiverType: '',
    receiverModel: '',
    cTanker: '',
    cReciever: '',
    vSrdT: '',
    vSrdR: '',
    refuellingInterface: '',
    minimumFlightLevel: '',
    maximumFlightLevel: '',
    minimumKcas: '',
    maximumKcas: '',
    maxAsM: '',
    planningFuelTransferRate: '',
    comment: '',
  }
}

const REFUEL_INTERFACE_OPTIONS = ['Boom', 'Pod', 'HDU', 'Centre Line (CL)']
const C_CATEGORY_OPTIONS = ['Cat-1', 'Cat-2', 'Cat-3']

// Shared form workspace for both Tankers and Receivers pages.
export default function SRDHolderFormWorkspace({
  pageTitle,
  workspaceTarget,
  onLogout,
  onOpenViewer,
  onOpenMySrd,
}: SRDHolderFormWorkspaceProps) {
  const isTankersPage = workspaceTarget === 'tanker'
  const isReceiversPage = workspaceTarget === 'receiver'
  const pageRequestTarget: SubmissionRequestTarget = workspaceTarget
  const [formValues, setFormValues] = useState<SRD_holderFormValues>(() =>
    createEmptyForm(pageRequestTarget),
  )
  const [submissions, setSubmissions] = useState<SRD_holderSubmission[]>(() =>
    loadSubmissions(),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [options, setOptions] = useState<ViewerOptionsResponse | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [optionsError, setOptionsError] = useState('')
  const isNewRequest = formValues.requestMode === 'new'
  const isNewTankerRequest = isTankersPage && isNewRequest
  const isNewReceiverRequest = isReceiversPage && isNewRequest
  const showTankerCompatibility = pageRequestTarget !== 'receiver' && !isNewRequest
  const showReceiverCompatibility = pageRequestTarget !== 'tanker' && !isNewRequest
  const showOperationalFields = !isNewRequest
  const showTankerSelection = !isNewReceiverRequest
  const showReceiverSelection = !isNewTankerRequest

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
        setOptionsError('')
      } catch (error) {
        if (!isMounted) {
          return
        }
        setOptionsError(
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

  const tankerNationOptions = useMemo(
    () => options?.tanker.nations ?? [],
    [options],
  )

  const tankerTypeOptions = useMemo(() => {
    if (!options || !formValues.nationOrganisation) {
      return []
    }
    return options.tanker.byNation[formValues.nationOrganisation]?.types ?? []
  }, [options, formValues.nationOrganisation])

  const tankerModelOptions = useMemo(() => {
    if (!options || !formValues.nationOrganisation || !formValues.tankerType) {
      return []
    }
    return (
      options.tanker.byNation[formValues.nationOrganisation]?.modelsByType[
        formValues.tankerType
      ] ?? []
    )
  }, [options, formValues.nationOrganisation, formValues.tankerType])

  const receiverNationOptions = useMemo(
    () => options?.receiver.nations ?? [],
    [options],
  )

  const receiverTypeOptions = useMemo(() => {
    if (!options || !formValues.receiverNation) {
      return []
    }
    return options.receiver.byNation[formValues.receiverNation]?.types ?? []
  }, [options, formValues.receiverNation])

  const receiverModelOptions = useMemo(() => {
    if (!options || !formValues.receiverNation || !formValues.receiverType) {
      return []
    }
    return (
      options.receiver.byNation[formValues.receiverNation]?.modelsByType[
        formValues.receiverType
      ] ?? []
    )
  }, [options, formValues.receiverNation, formValues.receiverType])

  const toggleLabels = isTankersPage
    ? { existing: 'Existing Tanker', replacement: 'New Tanker' }
    : isReceiversPage
      ? { existing: 'Existing Receiver', replacement: 'New Receiver' }
      : null

  const handleRequestModeChange = (requestMode: SubmissionRequestMode) => {
    setEditingId(null)
    setFormValues((prev) => {
      const next = createEmptyForm(pageRequestTarget, requestMode)

      if (pageRequestTarget === 'tanker') {
        next.nationOrganisation = prev.nationOrganisation
        next.tankerType = prev.tankerType
        next.tankerModel = prev.tankerModel
      } else if (pageRequestTarget === 'receiver') {
        next.receiverNation = prev.receiverNation
        next.receiverType = prev.receiverType
        next.receiverModel = prev.receiverModel
      } else {
        next.nationOrganisation = prev.nationOrganisation
        next.tankerType = prev.tankerType
        next.tankerModel = prev.tankerModel
        next.receiverNation = prev.receiverNation
        next.receiverType = prev.receiverType
        next.receiverModel = prev.receiverModel
      }

      next.comment = prev.comment
      return next
    })
  }

  const visibleSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      return submission.requestTarget === pageRequestTarget
    })
  }, [pageRequestTarget, submissions])

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target
    setFormValues((prev) => {
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editingId) {
      updateSubmission(editingId, formValues)
      setSubmissions(updateSubmissionStatus(editingId, 'Pending Review'))
      setEditingId(null)
      setFormValues(createEmptyForm(pageRequestTarget, formValues.requestMode))
      return
    }
    setSubmissions(addSubmission(formValues))
    setFormValues(createEmptyForm(pageRequestTarget, formValues.requestMode))
  }

  const handleReset = () => {
    setEditingId(null)
    setFormValues(createEmptyForm(pageRequestTarget, formValues.requestMode))
  }

  const handleEditRejected = (submission: SRD_holderSubmission) => {
    if (submission.status !== 'Rejected') return
    const { id, status, createdAt, ...values } = submission
    void id
    void status
    void createdAt
    setEditingId(submission.id)
    setFormValues(values)
  }

  return (
    <div className="role-page">
      <header className="role-page__header">
        <div>
          <span className="role-pill">SRD_holder</span>
          <h1 className="role-page__title">{pageTitle}</h1>
        </div>
        <div className="role-header-controls">
          <div className="button-row">
            <button className="btn ghost" type="button" onClick={onOpenMySrd}>
              Back
            </button>
            <button className="btn ghost" type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
          <section className="role-quick-actions" aria-label="SRD holder actions">
            <ul className="role-quick-actions__list">
              <li>
                <button className="role-quick-actions__link" type="button" onClick={onOpenViewer}>
                  Go to Viewer
                </button>
              </li>
              <li>
                <button className="role-quick-actions__link" type="button" onClick={onOpenMySrd}>
                  My SRD
                </button>
              </li>
            </ul>
          </section>
        </div>
      </header>

      <section className="role-card">
        <p className="viewer-intro">
          This page lets you fill in and submit compatibility data for admin review.
        </p>
        <p className="viewer-intro">
          {editingId
            ? 'Edit your rejected form and submit it again for admin review.'
            : 'Fill in the form below and submit it for admin review.'}
        </p>
        {optionsError && <p className="viewer-error">{optionsError}</p>}
        <form className="srd_holder-form" onSubmit={handleSubmit}>
          {toggleLabels ? (
            <div className="request-mode-toggle" role="tablist" aria-label="Request mode">
              <button
                className={`request-mode-toggle__option ${
                  formValues.requestMode === 'existing'
                    ? 'request-mode-toggle__option--active'
                    : ''
                }`}
                type="button"
                onClick={() => handleRequestModeChange('existing')}
                aria-pressed={formValues.requestMode === 'existing'}
              >
                {toggleLabels.existing}
              </button>
              <button
                className={`request-mode-toggle__option ${
                  formValues.requestMode === 'new' ? 'request-mode-toggle__option--active' : ''
                }`}
                type="button"
                onClick={() => handleRequestModeChange('new')}
                aria-pressed={formValues.requestMode === 'new'}
              >
                {toggleLabels.replacement}
              </button>
            </div>
          ) : null}
          <div className="srd_holder-form__grid">
            {showTankerSelection ? (
              <>
                <label className="input-group">
                  Tanker Nation
                  {isNewTankerRequest ? (
                    <input
                      type="text"
                      name="nationOrganisation"
                      value={formValues.nationOrganisation}
                      onChange={handleChange}
                      placeholder="Enter tanker nation"
                      required
                    />
                  ) : (
                    <select
                      name="nationOrganisation"
                      value={formValues.nationOrganisation}
                      onChange={handleChange}
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
                  Tanker Type
                  {isNewTankerRequest ? (
                    <input
                      type="text"
                      name="tankerType"
                      value={formValues.tankerType}
                      onChange={handleChange}
                      placeholder="Enter tanker type"
                      required
                    />
                  ) : (
                    <select
                      name="tankerType"
                      value={formValues.tankerType}
                      onChange={handleChange}
                      required
                      disabled={isLoadingOptions || !formValues.nationOrganisation}
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
                  Tanker Model
                  {isNewTankerRequest ? (
                    <input
                      type="text"
                      name="tankerModel"
                      value={formValues.tankerModel}
                      onChange={handleChange}
                      placeholder="Enter tanker model"
                      required
                    />
                  ) : (
                    <select
                      name="tankerModel"
                      value={formValues.tankerModel}
                      onChange={handleChange}
                      required
                      disabled={isLoadingOptions || !formValues.tankerType}
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
            {showReceiverSelection ? (
              <>
                <label className="input-group">
                  Receiver Nation
                  {isNewReceiverRequest ? (
                    <input
                      type="text"
                      name="receiverNation"
                      value={formValues.receiverNation}
                      onChange={handleChange}
                      placeholder="Enter receiver nation"
                      required
                    />
                  ) : (
                    <select
                      name="receiverNation"
                      value={formValues.receiverNation}
                      onChange={handleChange}
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
                  Receiver Type
                  {isNewReceiverRequest ? (
                    <input
                      type="text"
                      name="receiverType"
                      value={formValues.receiverType}
                      onChange={handleChange}
                      placeholder="Enter receiver type"
                      required
                    />
                  ) : (
                    <select
                      name="receiverType"
                      value={formValues.receiverType}
                      onChange={handleChange}
                      required
                      disabled={isLoadingOptions || !formValues.receiverNation}
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
                  Receiver Model
                  {isNewReceiverRequest ? (
                    <input
                      type="text"
                      name="receiverModel"
                      value={formValues.receiverModel}
                      onChange={handleChange}
                      placeholder="Enter receiver model"
                      required
                    />
                  ) : (
                    <select
                      name="receiverModel"
                      value={formValues.receiverModel}
                      onChange={handleChange}
                      required
                      disabled={isLoadingOptions || !formValues.receiverType}
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
            {showTankerCompatibility ? (
              <label className="input-group">
                Cat-tanker
                <select
                  name="cTanker"
                  value={formValues.cTanker}
                  onChange={handleChange}
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
            ) : null}
            {showReceiverCompatibility ? (
              <label className="input-group">
                Cat-reciever
                <select
                  name="cReciever"
                  value={formValues.cReciever}
                  onChange={handleChange}
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
            ) : null}
            {showTankerCompatibility ? (
              <label className="input-group">
                Version Srd Tanker
                <input
                  type="text"
                  name="vSrdT"
                  value={formValues.vSrdT}
                  onChange={handleChange}
                  placeholder="Version SRD"
                  required
                />
              </label>
            ) : null}
            {showReceiverCompatibility ? (
              <label className="input-group">
                Version Srd Receiver
                <input
                  type="text"
                  name="vSrdR"
                  value={formValues.vSrdR}
                  onChange={handleChange}
                  placeholder="V_srd_R"
                  required
                />
              </label>
            ) : null}
            {showOperationalFields ? (
              <>
                <label className="input-group">
                  Refuel Interface
                  <select
                    name="refuellingInterface"
                    value={formValues.refuellingInterface}
                    onChange={handleChange}
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
                  Minimum Altitude FL
                  <input
                    type="text"
                    name="minimumFlightLevel"
                    value={formValues.minimumFlightLevel}
                    onChange={handleChange}
                    placeholder="FL180"
                    required
                  />
                </label>
                <label className="input-group">
                  Maximum Altitude FL
                  <input
                    type="text"
                    name="maximumFlightLevel"
                    value={formValues.maximumFlightLevel}
                    onChange={handleChange}
                    placeholder="FL300"
                    required
                  />
                </label>
                <label className="input-group">
                  Minimum speed KCAS
                  <input
                    type="text"
                    name="minimumKcas"
                    value={formValues.minimumKcas}
                    onChange={handleChange}
                    placeholder="220"
                    required
                  />
                </label>
                <label className="input-group">
                  Maximum speed KCAS
                  <input
                    type="text"
                    name="maximumKcas"
                    value={formValues.maximumKcas}
                    onChange={handleChange}
                    placeholder="300"
                    required
                  />
                </label>
                <label className="input-group">
                  Maximum speed MACH
                  <input
                    type="text"
                    name="maxAsM"
                    value={formValues.maxAsM}
                    onChange={handleChange}
                    placeholder="0.82"
                    required
                  />
                </label>
                <label className="input-group">
                  Fuel Flow Rate
                  <input
                    type="text"
                    name="planningFuelTransferRate"
                    value={formValues.planningFuelTransferRate}
                    onChange={handleChange}
                    placeholder="900 lb/min"
                    required
                  />
                </label>
              </>
            ) : null}
            <label className="input-group">
              Comment
              <textarea
                name="comment"
                value={formValues.comment}
                onChange={handleChange}
                maxLength={150}
                placeholder="Max 150 characters, enough for 3 short sentences."
                required
              />
            </label>
          </div>
          <div className="srd_holder-form__actions">
            <button className="btn ghost" type="button" onClick={handleReset}>
              {editingId ? 'Cancel Edit' : 'Clear'}
            </button>
            <button className="btn primary" type="submit">
              {editingId ? 'Save Changes' : 'Save Form'}
            </button>
          </div>
        </form>
      </section>

      <section className="role-card">
        <div className="role-card__header">
          <h2>Submitted Forms</h2>
          <span className="role-card__meta">{visibleSubmissions.length} total</span>
        </div>
        <p className="muted">Track the status of each submission after the admin decision.</p>
        {visibleSubmissions.length === 0 ? (
          <p className="muted">No forms submitted yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="srd_holder-table">
              <colgroup>
                <col className="col-nation" />
                <col className="col-type" />
                <col className="col-model" />
                <col className="col-nation" />
                <col className="col-type" />
                <col className="col-model" />
                {showTankerCompatibility ? <col className="col-minfl" /> : null}
                {showReceiverCompatibility ? <col className="col-minfl" /> : null}
                {showTankerCompatibility ? <col className="col-minfl" /> : null}
                {showReceiverCompatibility ? <col className="col-minfl" /> : null}
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
                  <th>
                    <span title="Tanker nation / organisation">Tanker Nation</span>
                  </th>
                  <th>
                    <span title="Tanker aircraft type">Tanker Type</span>
                  </th>
                  <th>
                    <span title="Tanker aircraft model">Tanker Model</span>
                  </th>
                  <th>
                    <span title="Receiver nation / organisation">Receiver Nation</span>
                  </th>
                  <th>
                    <span title="Receiver aircraft type">Receiver Type</span>
                  </th>
                  <th>
                    <span title="Receiver aircraft model">Receiver Model</span>
                  </th>
                  {showTankerCompatibility ? (
                    <th>
                      <span title="Compatibility tanker code">C_tanker</span>
                    </th>
                  ) : null}
                  {showReceiverCompatibility ? (
                    <th>
                      <span title="Compatibility receiver code">C_reciever</span>
                    </th>
                  ) : null}
                  {showTankerCompatibility ? (
                    <th>
                      <span title="Valid SRD tanker">V_srd_T</span>
                    </th>
                  ) : null}
                  {showReceiverCompatibility ? (
                    <th>
                      <span title="Valid SRD receiver">V_srd_R</span>
                    </th>
                  ) : null}
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
                {visibleSubmissions.map((submission) => (
                  <tr key={submission.id}>
                    <td data-label="Tanker Nation">{submission.nationOrganisation}</td>
                    <td data-label="Tanker Type">{submission.tankerType}</td>
                    <td data-label="Tanker Model">{submission.tankerModel}</td>
                    <td data-label="Receiver Nation">{submission.receiverNation}</td>
                    <td data-label="Receiver Type">{submission.receiverType}</td>
                    <td data-label="Receiver Model">{submission.receiverModel}</td>
                    {showTankerCompatibility ? (
                      <td data-label="C_tanker">{submission.cTanker}</td>
                    ) : null}
                    {showReceiverCompatibility ? (
                      <td data-label="C_reciever">{submission.cReciever}</td>
                    ) : null}
                    {showTankerCompatibility ? <td data-label="V_srd_T">{submission.vSrdT}</td> : null}
                    {showReceiverCompatibility ? <td data-label="V_srd_R">{submission.vSrdR}</td> : null}
                    <td data-label="Refuel IF">{submission.refuellingInterface}</td>
                    <td data-label="Min FL">{submission.minimumFlightLevel}</td>
                    <td data-label="Max FL">{submission.maximumFlightLevel}</td>
                    <td data-label="Min KCAS">{submission.minimumKcas}</td>
                    <td data-label="Max KCAS">{submission.maximumKcas}</td>
                    <td data-label="Max_as_m">{submission.maxAsM}</td>
                    <td data-label="Fuel rate">{submission.planningFuelTransferRate}</td>
                    <td data-label="Comment">{submission.comment}</td>
                    <td className="srd_holder-table__status">
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
                          className="btn ghost small"
                          type="button"
                          onClick={() => handleEditRejected(submission)}
                          disabled={submission.status !== 'Rejected'}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
