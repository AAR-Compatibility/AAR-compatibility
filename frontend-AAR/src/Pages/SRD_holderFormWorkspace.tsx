import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import '../Styles/role-pages.css'
import {
  addSubmission,
  loadSubmissions,
  updateSubmission,
  updateSubmissionStatus,
  type SRD_holderFormValues,
  type SRD_holderSubmission,
} from '../Services/submissionService'

type SRDHolderFormWorkspaceProps = {
  pageTitle: string
  onLogout: () => void
  onOpenViewer: () => void
  onOpenMySrd: () => void
}

const EMPTY_FORM: SRD_holderFormValues = {
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

const REFUEL_INTERFACE_OPTIONS = ['Boom', 'Pod', 'HDU', 'Centre Line (CL)']
const C_CATEGORY_OPTIONS = ['Cat-1', 'Cat-2', 'Cat-3']
const NATION_OPTIONS = ['MMF', 'Australie']
const TANKER_TYPE_OPTIONS = ['A330 MRTT']
const TANKER_MODEL_OPTIONS: Record<string, string[]> = {
  'A330 MRTT': ['KC-30M', 'KC-30A'],
}
const RECEIVER_TYPE_OPTIONS = ['F-16', 'F-35', 'C-17']
const RECEIVER_MODEL_OPTIONS: Record<string, string[]> = {
  'F-16': ['A', 'B', 'C'],
  'F-35': ['A'],
  'C-17': ['A'],
}

// Shared form workspace for both Tankers and Receivers pages.
export default function SRDHolderFormWorkspace({
  pageTitle,
  onLogout,
  onOpenViewer,
  onOpenMySrd,
}: SRDHolderFormWorkspaceProps) {
  const isTankersPage = pageTitle.trim().toLowerCase() === 'tankers'
  const isReceiversPage = pageTitle.trim().toLowerCase() === 'receivers'
  const showTankerCompatibility = !isReceiversPage
  const showReceiverCompatibility = !isTankersPage
  const [formValues, setFormValues] = useState<SRD_holderFormValues>(EMPTY_FORM)
  const [submissions, setSubmissions] = useState<SRD_holderSubmission[]>(() =>
    loadSubmissions(),
  )
  const [editingId, setEditingId] = useState<string | null>(null)

  const tankerModelOptions = useMemo(() => {
    if (formValues.tankerType) {
      return TANKER_MODEL_OPTIONS[formValues.tankerType] ?? []
    }
    return []
  }, [formValues.tankerType])

  const receiverModelOptions = useMemo(() => {
    if (formValues.receiverType) {
      return RECEIVER_MODEL_OPTIONS[formValues.receiverType] ?? []
    }
    return []
  }, [formValues.receiverType])

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target
    setFormValues((prev) => {
      if (name === 'tankerType') {
        return { ...prev, tankerType: value, tankerModel: '' }
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
      setFormValues(EMPTY_FORM)
      return
    }
    setSubmissions(addSubmission(formValues))
    setFormValues(EMPTY_FORM)
  }

  const handleReset = () => {
    setEditingId(null)
    setFormValues(EMPTY_FORM)
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
        <form className="srd_holder-form" onSubmit={handleSubmit}>
          <div className="srd_holder-form__grid">
            <label className="input-group">
              Tanker Nation
              <select
                name="nationOrganisation"
                value={formValues.nationOrganisation}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select
                </option>
                {NATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-group">
              Tanker Type
              <select
                name="tankerType"
                value={formValues.tankerType}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select
                </option>
                {TANKER_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-group">
              Tanker Model
              <select
                name="tankerModel"
                value={formValues.tankerModel}
                onChange={handleChange}
                required
                disabled={!formValues.tankerType}
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
            </label>
            <label className="input-group">
              Receiver Nation
              <select
                name="receiverNation"
                value={formValues.receiverNation}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select
                </option>
                {NATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-group">
              Receiver Type
              <select
                name="receiverType"
                value={formValues.receiverType}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select
                </option>
                {RECEIVER_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-group">
              Receiver Model
              <select
                name="receiverModel"
                value={formValues.receiverModel}
                onChange={handleChange}
                required
                disabled={!formValues.receiverType}
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
            </label>
            {showTankerCompatibility ? (
              <label className="input-group">
                C_tanker
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
                C_reciever
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
                V_srd_T
                <input
                  type="text"
                  name="vSrdT"
                  value={formValues.vSrdT}
                  onChange={handleChange}
                  placeholder="V_srd_T"
                  required
                />
              </label>
            ) : null}
            {showReceiverCompatibility ? (
              <label className="input-group">
                V_srd_R
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
            <label className="input-group">
              Refuel interface
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
              Min FL
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
              Max FL
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
              Min KCAS
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
              Max KCAS
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
              Max_as_m
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
              Fuel rate
              <input
                type="text"
                name="planningFuelTransferRate"
                value={formValues.planningFuelTransferRate}
                onChange={handleChange}
                placeholder="900 kg/min"
                required
              />
            </label>
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
          <span className="role-card__meta">{submissions.length} total</span>
        </div>
        <p className="muted">Track the status of each submission after the admin decision.</p>
        {submissions.length === 0 ? (
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
                {submissions.map((submission) => (
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
