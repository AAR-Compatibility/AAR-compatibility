// This workspace lets an SRD holder submit new aircraft requests, update one live
// specification, or request specification removal before an admin reviews it.
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import '../Styles/role-pages.css'
import {
  createSubmission,
  deleteSubmission,
  fetchOwnSubmissions,
  updateRejectedSubmission,
  type SubmissionRequestMode,
  type SubmissionRequestTarget,
  type SubmissionRequestType,
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

type PairingAction = 'update_pairing' | 'delete_pairing' | 'new_tanker' | 'new_receiver'

function createEmptyForm(
  requestTarget: SubmissionRequestTarget,
  requestMode: SubmissionRequestMode = 'existing',
  requestType?: SubmissionRequestType,
): SRD_holderFormValues {
  return {
    requestTarget,
    requestType: requestType ?? (requestMode === 'new' ? 'create' : 'update'),
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

const REFUEL_INTERFACE_LABELS: Record<string, string> = {
  B: 'Boom',
  P: 'Pod',
  HDU: 'HDU',
  CL: 'Centre Line',
}

function getCCategoryLabel(value: string) {
  return value ? `${value} (Cat-${value})` : value
}

function getRefuelInterfaceLabel(value: string) {
  const label = REFUEL_INTERFACE_LABELS[value]
  return label ? `${value} (${label})` : value
}

function getStatusClass(statusKey: SRD_holderSubmission['statusKey']) {
  if (statusKey === 'approved' || statusKey === 'processed') {
    return 'status-tag--approved'
  }
  if (statusKey === 'rejected' || statusKey === 'processing_failed') {
    return 'status-tag--rejected'
  }
  return 'status-tag--pending'
}

function formatDate(value: string) {
  if (!value) {
    return '-'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleString()
}

function formatRequestLabel(submission: SRD_holderSubmission) {
  if (submission.requestType === 'create') {
    return submission.requestTarget === 'tanker'
      ? 'New Tanker'
      : submission.requestTarget === 'receiver'
        ? 'New Receiver'
        : 'New Combination'
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

function formatAircraftLine(nation: string, type: string, model: string) {
  const parts = [nation, type, model].filter((value) => value.trim().length > 0)
  return parts.length > 0 ? parts.join(' / ') : '-'
}

function getPairingAction(
  requestTarget: SubmissionRequestTarget,
  requestMode: SubmissionRequestMode,
  requestType: SubmissionRequestType,
): PairingAction {
  if (requestMode === 'new') {
    return requestTarget === 'receiver' ? 'new_receiver' : 'new_tanker'
  }

  return requestType === 'delete' ? 'delete_pairing' : 'update_pairing'
}

function getActionConfig(action: PairingAction) {
  if (action === 'new_tanker') {
    return {
      requestTarget: 'tanker' as SubmissionRequestTarget,
      requestMode: 'new' as SubmissionRequestMode,
      requestType: 'create' as SubmissionRequestType,
    }
  }

  if (action === 'new_receiver') {
    return {
      requestTarget: 'receiver' as SubmissionRequestTarget,
      requestMode: 'new' as SubmissionRequestMode,
      requestType: 'create' as SubmissionRequestType,
    }
  }

  if (action === 'delete_pairing') {
    return {
      requestTarget: 'both' as SubmissionRequestTarget,
      requestMode: 'existing' as SubmissionRequestMode,
      requestType: 'delete' as SubmissionRequestType,
    }
  }

  return {
    requestTarget: 'both' as SubmissionRequestTarget,
    requestMode: 'existing' as SubmissionRequestMode,
    requestType: 'update' as SubmissionRequestType,
  }
}

export default function SRDHolderFormWorkspace({
  pageTitle,
  workspaceTarget,
  onLogout,
  onOpenViewer,
  onOpenMySrd,
}: SRDHolderFormWorkspaceProps) {
  const isBothWorkspace = workspaceTarget === 'both'
  const isTankersPage = workspaceTarget === 'tanker'
  const isReceiversPage = workspaceTarget === 'receiver'
  const pageRequestTarget: SubmissionRequestTarget = workspaceTarget
  const [formValues, setFormValues] = useState<SRD_holderFormValues>(() =>
    createEmptyForm(pageRequestTarget),
  )
  const [pairingAction, setPairingAction] = useState<PairingAction>('update_pairing')
  const [submissions, setSubmissions] = useState<SRD_holderSubmission[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [options, setOptions] = useState<ViewerOptionsResponse | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeMessage, setActiveMessage] = useState('')
  const [optionsError, setOptionsError] = useState('')
  const [submissionError, setSubmissionError] = useState('')

  const activeRequestTarget = formValues.requestTarget
  const isNewRequest = formValues.requestMode === 'new'
  const isDeleteRequest = formValues.requestType === 'delete'
  const isNewTankerRequest =
    (isTankersPage || isBothWorkspace) && activeRequestTarget === 'tanker' && isNewRequest
  const isNewReceiverRequest =
    (isReceiversPage || isBothWorkspace) && activeRequestTarget === 'receiver' && isNewRequest
  const showTankerCompatibility =
    activeRequestTarget !== 'receiver' && !isNewRequest && !isDeleteRequest
  const showReceiverCompatibility =
    activeRequestTarget !== 'tanker' && !isNewRequest && !isDeleteRequest
  const showOperationalFields = !isNewRequest && !isDeleteRequest
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

    const loadSubmissions = async () => {
      setIsLoadingSubmissions(true)
      try {
        const fetchedSubmissions = await fetchOwnSubmissions()
        if (!isMounted) {
          return
        }
        setSubmissions(fetchedSubmissions)
        setSubmissionError('')
      } catch (error) {
        if (!isMounted) {
          return
        }
        setSubmissionError(
          error instanceof Error ? error.message : 'Failed to load your requests.',
        )
      } finally {
        if (isMounted) {
          setIsLoadingSubmissions(false)
        }
      }
    }

    void loadOptions()
    void loadSubmissions()

    return () => {
      isMounted = false
    }
  }, [])

  const tankerNationOptions = useMemo(() => options?.tanker.nations ?? [], [options])

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

  const receiverNationOptions = useMemo(() => options?.receiver.nations ?? [], [options])

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

  const cTankerOptions = useMemo(() => options?.specification.cTanker ?? [], [options])
  const cReceiverOptions = useMemo(() => options?.specification.cReceiver ?? [], [options])
  const refuelInterfaceOptions = useMemo(
    () => options?.specification.refuellingInterface ?? [],
    [options],
  )

  const toggleLabels = isTankersPage
    ? { existing: 'Existing Tanker', replacement: 'New Tanker' }
    : isReceiversPage
      ? { existing: 'Existing Receiver', replacement: 'New Receiver' }
      : null

  const visibleSubmissions = useMemo(() => {
    return submissions.filter((submission) =>
      isBothWorkspace
        ? ['both', 'tanker', 'receiver'].includes(submission.requestTarget)
        : submission.requestTarget === pageRequestTarget,
    )
  }, [isBothWorkspace, pageRequestTarget, submissions])

  const handlePairingActionChange = (nextAction: PairingAction) => {
    setEditingId(null)
    setActiveMessage('')
    setSubmissionError('')
    setPairingAction(nextAction)

    const nextConfig = getActionConfig(nextAction)
    setFormValues((prev) => {
      const next = createEmptyForm(
        nextConfig.requestTarget,
        nextConfig.requestMode,
        nextConfig.requestType,
      )

      next.nationOrganisation = prev.nationOrganisation
      next.tankerType = prev.tankerType
      next.tankerModel = prev.tankerModel
      next.receiverNation = prev.receiverNation
      next.receiverType = prev.receiverType
      next.receiverModel = prev.receiverModel
      next.comment = prev.comment

      return next
    })
  }

  const handleRequestModeChange = (requestMode: SubmissionRequestMode) => {
    setEditingId(null)
    setActiveMessage('')
    setSubmissionError('')
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

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target
    setActiveMessage('')
    setSubmissionError('')
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

  const resetForm = () => {
    setEditingId(null)
    setActiveMessage('')
    setSubmissionError('')
    const resetTarget = isBothWorkspace
      ? getActionConfig(pairingAction)
      : {
          requestTarget: pageRequestTarget,
          requestMode: formValues.requestMode,
          requestType: formValues.requestType,
        }
    setFormValues(
      createEmptyForm(resetTarget.requestTarget, resetTarget.requestMode, resetTarget.requestType),
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmissionError('')
    setActiveMessage('')

    try {
      const nextSubmission = editingId
        ? await updateRejectedSubmission(editingId, formValues)
        : await createSubmission(formValues)

      setSubmissions((prevSubmissions) => {
        if (editingId) {
          return prevSubmissions.map((submission) =>
            submission.id === editingId ? nextSubmission : submission,
          )
        }
        return [nextSubmission, ...prevSubmissions]
      })

      setActiveMessage(
        editingId
          ? 'Your updated request was resubmitted for admin review.'
          : 'Your request was submitted for admin review.',
      )
      setEditingId(null)
      if (isBothWorkspace) {
        setPairingAction(getPairingAction(formValues.requestTarget, formValues.requestMode, formValues.requestType))
      }
      setFormValues(
        createEmptyForm(formValues.requestTarget, formValues.requestMode, formValues.requestType),
      )
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Request submission failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditRejected = (submission: SRD_holderSubmission) => {
    if (submission.statusKey !== 'rejected') {
      return
    }

    setEditingId(submission.id)
    setActiveMessage('')
    setSubmissionError('')
    if (isBothWorkspace) {
      setPairingAction(
        getPairingAction(submission.requestTarget, submission.requestMode, submission.requestType),
      )
    }
    setFormValues({
      requestTarget: submission.requestTarget,
      requestType: submission.requestType,
      requestMode: submission.requestMode,
      nationOrganisation: submission.nationOrganisation,
      tankerType: submission.tankerType,
      tankerModel: submission.tankerModel,
      receiverNation: submission.receiverNation,
      receiverType: submission.receiverType,
      receiverModel: submission.receiverModel,
      cTanker: submission.cTanker,
      cReciever: submission.cReciever,
      vSrdT: submission.vSrdT,
      vSrdR: submission.vSrdR,
      refuellingInterface: submission.refuellingInterface,
      minimumFlightLevel: submission.minimumFlightLevel,
      maximumFlightLevel: submission.maximumFlightLevel,
      minimumKcas: submission.minimumKcas,
      maximumKcas: submission.maximumKcas,
      maxAsM: submission.maxAsM,
      planningFuelTransferRate: submission.planningFuelTransferRate,
      comment: submission.comment,
    })
  }

  const handleDeleteRequest = async (submission: SRD_holderSubmission) => {
    try {
      setSubmissionError('')
      setActiveMessage('')
      await deleteSubmission(submission.id)
      setSubmissions((prevSubmissions) =>
        prevSubmissions.filter((currentSubmission) => currentSubmission.id !== submission.id),
      )
      if (editingId === submission.id) {
        resetForm()
      }
      setActiveMessage('The request was removed before processing.')
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to delete request.')
    }
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
          Use this form to submit new aircraft entries or update an existing tanker and receiver pairing.
        </p>
        <p className="viewer-intro">
          Approved requests are only written to the live tables after the admin processes them.
        </p>
        {pageRequestTarget === 'both' ? (
          <p className="viewer-intro">
            Deleting a pairing only removes the selected pairing. Aircraft records stay in the database.
          </p>
        ) : null}
        {optionsError && <p className="viewer-error">{optionsError}</p>}
        {submissionError && <p className="viewer-error">{submissionError}</p>}
        {activeMessage && <p className="create-account-success">{activeMessage}</p>}

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

          {isBothWorkspace ? (
            <div
              className="request-mode-toggle request-mode-toggle--four"
              role="tablist"
              aria-label="Pairing action"
            >
              <button
                className={`request-mode-toggle__option ${
                  pairingAction === 'update_pairing' ? 'request-mode-toggle__option--active' : ''
                }`}
                type="button"
                onClick={() => handlePairingActionChange('update_pairing')}
                aria-pressed={pairingAction === 'update_pairing'}
              >
                Update Pairing
              </button>
              <button
                className={`request-mode-toggle__option ${
                  pairingAction === 'delete_pairing' ? 'request-mode-toggle__option--active' : ''
                }`}
                type="button"
                onClick={() => handlePairingActionChange('delete_pairing')}
                aria-pressed={pairingAction === 'delete_pairing'}
              >
                Delete Pairing
              </button>
              <button
                className={`request-mode-toggle__option ${
                  pairingAction === 'new_tanker' ? 'request-mode-toggle__option--active' : ''
                }`}
                type="button"
                onClick={() => handlePairingActionChange('new_tanker')}
                aria-pressed={pairingAction === 'new_tanker'}
              >
                New Tanker
              </button>
              <button
                className={`request-mode-toggle__option ${
                  pairingAction === 'new_receiver' ? 'request-mode-toggle__option--active' : ''
                }`}
                type="button"
                onClick={() => handlePairingActionChange('new_receiver')}
                aria-pressed={pairingAction === 'new_receiver'}
              >
                New Receiver
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
                <select name="cTanker" value={formValues.cTanker} onChange={handleChange} required>
                  <option value="" disabled>
                    Select
                  </option>
                  {cTankerOptions.map((option) => (
                    <option key={option} value={option}>
                      {getCCategoryLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {showReceiverCompatibility ? (
              <label className="input-group">
                Cat-receiver
                <select
                  name="cReciever"
                  value={formValues.cReciever}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {cReceiverOptions.map((option) => (
                    <option key={option} value={option}>
                      {getCCategoryLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {showTankerCompatibility ? (
              <label className="input-group">
                Version SRD Tanker
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
                Version SRD Receiver
                <input
                  type="text"
                  name="vSrdR"
                  value={formValues.vSrdR}
                  onChange={handleChange}
                  placeholder="Version SRD"
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
                  {refuelInterfaceOptions.map((option) => (
                    <option key={option} value={option}>
                      {getRefuelInterfaceLabel(option)}
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
                  Minimum Speed KCAS
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
                  Maximum Speed KCAS
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
                  Maximum Speed MACH
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
                    placeholder="900"
                    required
                  />
                </label>
              </>
            ) : null}

            <label className="input-group input-group--wide">
              Comment
              <textarea
                name="comment"
                value={formValues.comment}
                onChange={handleChange}
                maxLength={300}
                placeholder="Explain the request clearly for the admin review."
                required
              />
            </label>
          </div>

          <div className="srd_holder-form__actions">
            <button className="btn ghost" type="button" onClick={resetForm}>
              {editingId ? 'Cancel Edit' : 'Clear'}
            </button>
            <button className="btn primary" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Submitting...'
                : editingId
                  ? 'Resubmit Request'
                  : formValues.requestType === 'delete'
                    ? 'Submit Delete Request'
                    : 'Submit Request'}
            </button>
          </div>
        </form>
      </section>

      <section className="role-card">
        <div className="role-card__header">
          <div>
            <h2>Your Requests</h2>
            <p className="viewer-intro">
              Rejected requests can be edited. Pending or rejected requests can be removed before
              processing.
            </p>
          </div>
        </div>

        {isLoadingSubmissions ? (
          <p className="viewer-intro">Loading your requests...</p>
        ) : visibleSubmissions.length === 0 ? (
          <p className="viewer-intro">No requests submitted yet for this workspace.</p>
        ) : (
          <div className="table-wrap">
            <table className="srd_holder-table">
              <thead>
                <tr>
                  <th className="col-number">Nr</th>
                  <th>Request</th>
                  <th>Tanker</th>
                  <th>Receiver</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Validation</th>
                  <th>Admin Feedback</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubmissions.map((submission, index) => {
                  const canEdit = submission.statusKey === 'rejected'
                  const canDelete =
                    submission.statusKey === 'pending_review' ||
                    submission.statusKey === 'rejected'

                  return (
                    <tr key={submission.id}>
                      <td data-label="Nr">{index + 1}</td>
                      <td data-label="Request">
                        <strong>{formatRequestLabel(submission)}</strong>
                        <br />
                        <span>{submission.comment || '-'}</span>
                      </td>
                      <td data-label="Tanker">
                        {formatAircraftLine(
                          submission.nationOrganisation,
                          submission.tankerType,
                          submission.tankerModel,
                        )}
                      </td>
                      <td data-label="Receiver">
                        {formatAircraftLine(
                          submission.receiverNation,
                          submission.receiverType,
                          submission.receiverModel,
                        )}
                      </td>
                      <td data-label="Submitted">{formatDate(submission.submittedAt)}</td>
                      <td className="srd_holder-table__status" data-label="Status">
                        <span className={`status-tag ${getStatusClass(submission.statusKey)}`}>
                          {submission.status}
                        </span>
                      </td>
                      <td data-label="Validation">
                        {submission.validationStatus ? (
                          <>
                            <strong>{submission.validationStatus}</strong>
                            <br />
                            <span>{submission.validationSummary || '-'}</span>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td data-label="Admin Feedback">{submission.reviewComment || '-'}</td>
                      <td data-label="Actions">
                        <div className="admin-actions">
                          <button
                            className="btn ghost small"
                            type="button"
                            onClick={() => handleEditRejected(submission)}
                            disabled={!canEdit}
                          >
                            Edit
                          </button>
                          <button
                            className="btn ghost small"
                            type="button"
                            onClick={() => handleDeleteRequest(submission)}
                            disabled={!canDelete}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
