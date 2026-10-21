// Transactions as a date-grouped list on phones and a table on wider screens.
import {
  ArrowDownLeft, ArrowUpRight, Banknote, CreditCard, FileCheck2, Globe, Landmark, Percent, Receipt, Repeat, SlidersHorizontal, TrendingUp,
} from 'lucide-react'
import { ACCOUNT_TYPES } from '../lib/accounts'
import { TX_TYPES } from '../lib/constants'
import { dateTime, dayLabel, money, shortDate } from '../lib/format'
import { Badge, EmptyState } from './ui'

const ICONS = {
  check: FileCheck2, card: CreditCard, wire: Globe, wire_intl: Globe, atm: Banknote, internal: Repeat,
  interest: Percent, trade: TrendingUp, billpay: Receipt, ach: Landmark, fee: Receipt,
}

export function TxIcon({ tx, size = 'md' }) {
  const credit = tx.direction === 'credit'
  const Icon = tx.type === 'adjustment' ? SlidersHorizontal : ICONS[tx.method] || (credit ? ArrowDownLeft : ArrowUpRight)
  const s = size === 'lg' ? 'size-14' : 'size-10'
  return (
    <span className={`flex ${s} shrink-0 items-center justify-center rounded-full ${credit ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
      <Icon className={size === 'lg' ? 'size-7' : 'size-5'} />
    </span>
  )
}

export const TxAmount = ({ tx }) => (
  <span className={`whitespace-nowrap font-semibold tabular-nums ${tx.direction === 'credit' ? 'text-green-700' : 'text-slate-900'}`}>
    {tx.direction === 'credit' ? '+' : '−'}{money(tx.amount)}
  </span>
)

const typeColor = { deposit: 'green', transfer_in: 'green', interest: 'green', withdrawal: 'amber', transfer_out: 'blue', wire: 'blue', payment: 'slate', purchase: 'slate', fee: 'red', adjustment: 'red', trade: 'blue' }
export const TxTypeBadge = ({ type }) => <Badge color={typeColor[type]}>{TX_TYPES[type]?.label || type}</Badge>

// "To David Kim" / "From Acme Corp" line
export function txParty(tx) {
  if (!tx.counterparty) return ''
  return `${tx.direction === 'credit' ? 'From' : 'To'} ${tx.counterparty}`
}

export const txTitle = (tx) => tx.description || TX_TYPES[tx.type]?.label

function groupByDay(txs) {
  const groups = []
  for (const tx of txs) {
    const label = dayLabel(tx.createdAt)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(tx)
    else groups.push({ label, items: [tx] })
  }
  return groups
}

/**
 * props:
 *  - transactions, onSelect(tx)
 *  - showOwner + usersById: admin "Customer" column
 *  - showAccount: show which account each transaction belongs to
 *  - compact: always use the card list (no table)
 */
export default function TransactionList({ transactions, onSelect, showOwner, usersById = {}, showAccount, compact }) {
  if (!transactions?.length) {
    return <EmptyState icon={Receipt} title="No transactions found" text="Deposits, payments and transfers will show up here." />
  }

  const subline = (tx) => [
    showOwner && (usersById[tx.uid]?.fullName || 'Unknown'),
    txParty(tx) && txParty(tx) !== `To ${txTitle(tx)}` ? txParty(tx) : tx.category,
    showAccount && ACCOUNT_TYPES[tx.accountId]?.short,
    tx.status === 'pending' && 'Pending',
  ].filter(Boolean).join(' · ')

  return (
    <>
      <div className={compact ? '' : 'md:hidden'}>
        {groupByDay(transactions).map((g) => (
          <div key={g.label}>
            <p className="sticky top-14 z-[1] -mx-4 bg-slate-50/95 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:-mx-5 sm:px-5">{g.label}</p>
            <ul className="divide-y divide-slate-100">
              {g.items.map((tx) => (
                <li key={tx.id}>
                  <button onClick={() => onSelect?.(tx)} className="flex w-full items-center gap-3 py-3 text-left">
                    <TxIcon tx={tx} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{txTitle(tx)}</span>
                      <span className="block truncate text-xs text-slate-500">{subline(tx)}</span>
                    </span>
                    <span className="text-right">
                      <TxAmount tx={tx} />
                      {tx.balanceAfter != null && !showOwner && <span className="block text-[11px] text-slate-400">Bal {money(tx.balanceAfter)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-3 pr-3 font-medium">Date</th>
                {showOwner && <th className="py-3 pr-3 font-medium">Customer</th>}
                <th className="py-3 pr-3 font-medium">Description</th>
                <th className="py-3 pr-3 font-medium">To / From</th>
                {showAccount && <th className="py-3 pr-3 font-medium">Account</th>}
                <th className="py-3 pr-3 font-medium">Type</th>
                <th className="py-3 pr-3 font-medium">Category</th>
                <th className="py-3 pr-3 text-right font-medium">Amount</th>
                <th className="py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} onClick={() => onSelect?.(tx)} className={onSelect ? 'cursor-pointer hover:bg-slate-50' : ''}>
                  <td className="whitespace-nowrap py-3 pr-3 text-slate-600">{shortDate(tx.createdAt)}<span className="block text-xs text-slate-400">{dateTime(tx.createdAt).split(', ').pop()}</span></td>
                  {showOwner && <td className="py-3 pr-3">{usersById[tx.uid]?.fullName || 'Unknown'}</td>}
                  <td className="py-3 pr-3 font-medium text-slate-900">{txTitle(tx)}{tx.status === 'pending' && <Badge color="amber">pending</Badge>}</td>
                  <td className="py-3 pr-3 text-slate-600">{txParty(tx) || '—'}</td>
                  {showAccount && <td className="py-3 pr-3 text-slate-600">{ACCOUNT_TYPES[tx.accountId]?.short}</td>}
                  <td className="py-3 pr-3"><TxTypeBadge type={tx.type} /></td>
                  <td className="py-3 pr-3 text-slate-600">{tx.category}</td>
                  <td className="py-3 pr-3 text-right"><TxAmount tx={tx} /></td>
                  <td className="py-3 text-right tabular-nums text-slate-600">{tx.balanceAfter == null ? '—' : money(tx.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
