import { useCallback, useEffect, useState } from 'react'
import { onDataChange } from '../services/events'

// Runs an async loader, and re-runs it whenever data changes anywhere in the app.
// const { data, loading, error, reload } = useData(() => api.listTransactions(uid), [uid])
export function useData(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps)

  const reload = useCallback(() => {
    let alive = true
    load()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState((s) => ({ ...s, loading: false, error })))
    return () => { alive = false }
  }, [load])

  useEffect(() => {
    const cancel = reload()
    const unsub = onDataChange(reload)
    return () => { cancel(); unsub() }
  }, [reload])

  return { ...state, reload }
}
