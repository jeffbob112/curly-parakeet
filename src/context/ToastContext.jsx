import { CheckCircle2, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(() => {})

// toast('Saved!') or toast('Something broke', 'error')
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((message, type = 'success') => {
    const id = Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} role="status"
            className="animate-slide-up pointer-events-auto flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium shadow-lg ring-1 ring-slate-200 max-w-md w-full">
            {t.type === 'error'
              ? <XCircle className="size-5 shrink-0 text-accent" />
              : <CheckCircle2 className="size-5 shrink-0 text-green-600" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
