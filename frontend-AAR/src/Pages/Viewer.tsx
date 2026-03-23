// This page shows viewer search and supports optional back navigation to the previous role page.
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import '../Styles/role-pages.css'
import {
  fetchViewerOptions,
  searchViewer,
  type ViewerOptionsResponse,
  type ViewerPayload,
  type ViewerResultRow,
} from '../Services/viewerService'

type ViewerPageProps = {
  onLogout: () => void
  onBack?: () => void
  backLabel?: string
}

type ViewerResultItem = {
  query: ViewerPayload
  result: ViewerResultRow
}

const RESULT_METRIC_COLUMNS: Array<{
  key:
    | 'boom_pod_bda'
    | 'min_alt'
    | 'max_alt'
    | 'min_as'
    | 'max_as_kcas'
    | 'max_as_m'
    | 'fuel_flow_rate'
    | 'notes'
  label: string
}> = [
  { key: 'boom_pod_bda', label: 'Boom_pod_bda' },
  { key: 'min_alt', label: 'Min_Alt' },
  { key: 'max_alt', label: 'Max_Alt' },
  { key: 'min_as', label: 'Min_as_kcas' },
  { key: 'max_as_kcas', label: 'Max_as_kcas' },
  { key: 'max_as_m', label: 'Max_as_m' },
  { key: 'fuel_flow_rate', label: 'fuel flow rate' },
  { key: 'notes', label: 'notes' },
]

const EMPTY_FORM: ViewerPayload = {
  tankerNation: '',
  tankerType: '',
  tankerModel: '',
  receiverNation: '',
  receiverType: '',
  receiverModel: '',
}

function formatResultValue(value: string | number | null) {
  if (value === null || value === '') {
    return '-'
  }
  return String(value)
}

function buildResultSignature(item: ViewerResultItem) {
  return JSON.stringify({
    query: item.query,
    result: item.result,
  })
}

export default function ViewerPage({
  onLogout,
  onBack,
  backLabel = 'Back',
}: ViewerPageProps) {
  const [formValues, setFormValues] = useState<ViewerPayload>(EMPTY_FORM)
  const [options, setOptions] = useState<ViewerOptionsResponse | null>(null)
  const [resultItems, setResultItems] = useState<ViewerResultItem[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

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
      } catch (err) {
        if (!isMounted) {
          return
        }
        setError(err instanceof Error ? err.message : 'Failed to load options.')
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false)
        }
      }
    }

    loadOptions()

    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setError('')
    setStatusMessage('')

    setFormValues((prev) => {
      if (name === 'tankerNation') {
        return { ...prev, tankerNation: value, tankerType: '', tankerModel: '' }
      }
      if (name === 'tankerType') {
        return { ...prev, tankerType: value, tankerModel: '' }
      }
      if (name === 'tankerModel') {
        return { ...prev, tankerModel: value }
      }
      if (name === 'receiverNation') {
        return { ...prev, receiverNation: value, receiverType: '', receiverModel: '' }
      }
      if (name === 'receiverType') {
        return { ...prev, receiverType: value, receiverModel: '' }
      }
      if (name === 'receiverModel') {
        return { ...prev, receiverModel: value }
      }
      return prev
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    setStatusMessage('')

    try {
      const response = await searchViewer(formValues)
      let addedCount = 0
      let skippedCount = 0
      let totalCount = 0

      setResultItems((prevItems) => {
        const nextItems = [...prevItems]
        const seenSignatures = new Set(
          prevItems.map((item) => buildResultSignature(item)),
        )

        response.rows.forEach((row) => {
          const candidate: ViewerResultItem = {
            query: { ...formValues },
            result: row,
          }
          const signature = buildResultSignature(candidate)
          if (seenSignatures.has(signature)) {
            skippedCount += 1
            return
          }
          seenSignatures.add(signature)
          nextItems.push(candidate)
          addedCount += 1
        })

        totalCount = nextItems.length
        return nextItems
      })
      setHasSearched(true)

      if (response.rows.length === 0) {
        setStatusMessage('No new results found for this combination.')
      } else if (addedCount === 0) {
        setStatusMessage('All found results are already in the list.')
      } else {
        const addedLabel = addedCount === 1 ? 'result' : 'results'
        const totalLabel = totalCount === 1 ? 'result' : 'results'
        const duplicateMessage =
          skippedCount > 0
            ? ` ${skippedCount} duplicate${skippedCount === 1 ? '' : 's'} skipped.`
            : ''
        setStatusMessage(`${addedCount} ${addedLabel} added. Total: ${totalCount} ${totalLabel}.${duplicateMessage}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
      setHasSearched(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteResult = (resultIndex: number) => {
    setResultItems((prevItems) => {
      const updatedItems = prevItems.filter((_, index) => index !== resultIndex)
      if (updatedItems.length === 0) {
        setStatusMessage('No results left.')
      } else {
        const label = updatedItems.length === 1 ? 'result' : 'results'
        setStatusMessage(`${updatedItems.length} ${label} found.`)
      }
      return updatedItems
    })
  }

  const tankerNationOptions = useMemo(
    () => options?.tanker.nations ?? [],
    [options],
  )

  const tankerTypeOptions = useMemo(() => {
    if (!options || !formValues.tankerNation) {
      return []
    }
    return options.tanker.byNation[formValues.tankerNation]?.types ?? []
  }, [options, formValues.tankerNation])

  const tankerModelOptions = useMemo(() => {
    if (!options || !formValues.tankerNation || !formValues.tankerType) {
      return []
    }
    return (
      options.tanker.byNation[formValues.tankerNation]?.modelsByType[
        formValues.tankerType
      ] ?? []
    )
  }, [options, formValues.tankerNation, formValues.tankerType])

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

  return (
    <div className="role-page">
      <header className="role-page__header">
        <div>
          <span className="role-pill">Viewer</span>
          <h1 className="role-page__title">Viewer</h1>
        </div>
        <div className="role-header-controls">
          {onBack && (
            <button className="btn ghost" type="button" onClick={onBack}>
              {backLabel}
            </button>
          )}
          <button className="btn ghost" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="role-card">
        <p className="viewer-intro">
          Enter the tanker and receiver details below, then press Search to
          review compatible options.
        </p>
        <form className="viewer-form" onSubmit={handleSubmit}>
          <div className="viewer-form__grid">
            <label className="viewer-field">
              <span>Tanker Nation:</span>
              <select
                name="tankerNation"
                value={formValues.tankerNation}
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
            </label>
            <label className="viewer-field">
              <span>Tanker Type:</span>
              <select
                name="tankerType"
                value={formValues.tankerType}
                onChange={handleChange}
                required
                disabled={isLoadingOptions || !formValues.tankerNation}
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
            </label>
            <label className="viewer-field">
              <span>Tanker Model:</span>
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
            </label>
            <label className="viewer-field">
              <span>Receiver Nation:</span>
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
            </label>
            <label className="viewer-field">
              <span>Receiver Type:</span>
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
            </label>
            <label className="viewer-field">
              <span>Receiver Model:</span>
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
            </label>
          </div>
          {error && <p className="viewer-error">{error}</p>}
          {statusMessage && <p className="viewer-intro">{statusMessage}</p>}
          <div className="viewer-form__footer">
            <button className="btn primary" type="submit" disabled={isLoadingOptions}>
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </section>

      <section className="role-card">
        <p className="viewer-intro">Results based on your selections.</p>
        <div className="viewer-excel-wrap">
          <table className="viewer-excel-table">
            <colgroup>
              <col className="excel-col-number" />
              <col className="excel-col-wide" />
              <col className="excel-col-wide" />
              <col className="excel-col-wide" />
              <col className="excel-col-code" />
              <col className="excel-col-code" />
              <col className="excel-col-metric" />
              <col className="excel-col-alt" />
              <col className="excel-col-alt" />
              <col className="excel-col-metric" />
              <col className="excel-col-metric" />
              <col className="excel-col-metric" />
              <col className="excel-col-metric" />
              <col className="excel-col-notes" />
              <col className="excel-col-action" />
            </colgroup>
            <thead>
              <tr>
                <th>Nr</th>
                <th />
                <th />
                <th />
                <th />
                <th />
                {RESULT_METRIC_COLUMNS.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {resultItems.length > 0 ? (
                resultItems.map((item, rowIndex) => (
                  <Fragment
                    key={`${item.result.c_tanker ?? 'ct'}-${item.result.c_receiver ?? 'cr'}-${rowIndex}`}
                  >
                    <tr>
                      <td className="viewer-result-number" rowSpan={4}>
                        {rowIndex + 1}
                      </td>
                      <td className="label-cell">Tanker Nation</td>
                      <td className="label-cell">Tanker type</td>
                      <td className="label-cell">Tanker model</td>
                      <td className="label-cell">C_tanker</td>
                      <td className="label-cell">V_srd_tanker</td>
                      {RESULT_METRIC_COLUMNS.map((column) => (
                        <td key={`tanker-label-${column.key}-${rowIndex}`} className="boom-gap-top" />
                      ))}
                      <td className="viewer-result-action" rowSpan={4}>
                        <button
                          className="btn ghost small"
                          type="button"
                          onClick={() => handleDeleteResult(rowIndex)}
                          aria-label={`Delete result ${rowIndex + 1}`}
                          title="Delete result"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>{item.query.tankerNation}</td>
                      <td>{item.query.tankerType}</td>
                      <td>{item.query.tankerModel}</td>
                      <td>{formatResultValue(item.result.c_tanker)}</td>
                      <td>{formatResultValue(item.result.v_srd_tanker)}</td>
                      {RESULT_METRIC_COLUMNS.map((column) => (
                        <td
                          key={`tanker-value-${column.key}-${rowIndex}`}
                          className="boom-gap-middle metric-value-cell"
                        >
                          {formatResultValue(item.result[column.key])}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="label-cell">Receiver nation</td>
                      <td className="label-cell">Receiver type</td>
                      <td className="label-cell">Receiver model</td>
                      <td className="label-cell">C_receiver</td>
                      <td className="label-cell">V_srd_receiver</td>
                      {RESULT_METRIC_COLUMNS.map((column) => (
                        <td
                          key={`receiver-label-${column.key}-${rowIndex}`}
                          className="boom-gap-middle"
                        />
                      ))}
                    </tr>
                    <tr>
                      <td>{item.query.receiverNation}</td>
                      <td>{item.query.receiverType}</td>
                      <td>{item.query.receiverModel}</td>
                      <td>{formatResultValue(item.result.c_receiver)}</td>
                      <td>{formatResultValue(item.result.v_srd_receiver)}</td>
                      {RESULT_METRIC_COLUMNS.map((column) => (
                        <td key={`receiver-value-${column.key}-${rowIndex}`} className="boom-gap-bottom" />
                      ))}
                    </tr>
                  </Fragment>
                ))
              ) : (
                <Fragment>
                  <tr>
                    <td rowSpan={4} />
                    <td className="label-cell">Tanker Nation</td>
                    <td className="label-cell">Tanker type</td>
                    <td className="label-cell">Tanker model</td>
                    <td className="label-cell">C_tanker</td>
                    <td className="label-cell">V_srd_tanker</td>
                    {RESULT_METRIC_COLUMNS.map((column) => (
                      <td key={`empty-tanker-label-${column.key}`} className="boom-gap-top" />
                    ))}
                    <td rowSpan={4} />
                  </tr>
                  <tr>
                    <td />
                    <td />
                    <td />
                    <td />
                    <td />
                    {RESULT_METRIC_COLUMNS.map((column) => (
                      <td key={`empty-tanker-value-${column.key}`} className="boom-gap-middle" />
                    ))}
                  </tr>
                  <tr>
                    <td className="label-cell">Receiver nation</td>
                    <td className="label-cell">Receiver type</td>
                    <td className="label-cell">Receiver model</td>
                    <td className="label-cell">C_receiver</td>
                    <td className="label-cell">V_srd_receiver</td>
                    {RESULT_METRIC_COLUMNS.map((column) => (
                      <td key={`empty-receiver-label-${column.key}`} className="boom-gap-middle" />
                    ))}
                  </tr>
                  <tr>
                    <td />
                    <td />
                    <td />
                    <td />
                    <td />
                    {RESULT_METRIC_COLUMNS.map((column) => (
                      <td key={`empty-receiver-value-${column.key}`} className="boom-gap-bottom" />
                    ))}
                  </tr>
                </Fragment>
              )}
            </tbody>
          </table>
        </div>
        {resultItems.length === 0 && (
          <p className="viewer-intro">
            {hasSearched
              ? 'No results found for this combination.'
              : 'Fill in the selection and click Search.'}
          </p>
        )}
      </section>
    </div>
  )
}
