import { ACCOUNT_TYPES, accountValue, available, isLiability } from '../lib/accounts'
import { money } from '../lib/format'
import { Select } from './ui'

// Dropdown of the user's accounts with their balance next to each one.
export default function AccountSelect({ accounts, value, onChange, exclude, ...props }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {accounts.filter((a) => a.id !== exclude).map((a) => (
        <option key={a.id} value={a.id}>
          {ACCOUNT_TYPES[a.id].label} ••{String(a.number).slice(-4)} — {isLiability(a) ? `${money(available(a))} available` : money(a.id === 'inv' ? a.balance : accountValue(a))}
        </option>
      ))}
    </Select>
  )
}
