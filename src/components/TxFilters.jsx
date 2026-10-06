import { Search } from 'lucide-react'
import { RANGE_FILTERS, TYPE_FILTERS } from '../lib/filters'
import { Select } from './ui'

// Search box + type chips + date range. `value` is { q, type, range }.
export default function TxFilters({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={value.q} onChange={(e) => set('q', e.target.value)} placeholder="Search description, category, amount…"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:text-sm" />
        </div>
        <div className="sm:w-48">
          <Select value={value.range} onChange={(e) => set('range', e.target.value)} aria-label="Date range">
            {RANGE_FILTERS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </Select>
        </div>
      </div>
      {/* Horizontally scrollable chips on phones */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {TYPE_FILTERS.map((f) => (
          <button key={f.id} onClick={() => set('type', f.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${value.type === f.id ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand'}`}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
