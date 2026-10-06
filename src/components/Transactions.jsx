// Shows transactions as cards on phones and as a table on wider screens.
import { ArrowDownLeft, ArrowUpRight, Receipt, SlidersHorizontal } from 'lucide-react'
import { TX_TYPES } from '../lib/constants'
import { dateTime, money, shortDate } from '../lib/format'
import { Badge, EmptyState } from './ui'

export function TxIcon({ tx }) {
  const credit = tx.direction === 'credit'
  const Icon = tx.type === 'adjustment' ? SlidersHorizontal : credit ? ArrowDownLeft : ArrowUpRight
  return (
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${credit ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
      <Icon className="size-5" />
    </span>
  )
}

export const TxAmount = ({ tx }) => (
  <span className={`font-semibold tabular-nums ${tx.direction === 'credit' ? 'text-green-700' : 'text-slate-900'}`}>
    {tx.direction === 'credit' ? '+' : '−'}{money(tx.amount)}
  </span>
)

const typeColor = { deposit: 'green', transfer_in: 'green', withdrawal: 'amber', transfer_out: 'blue', payment: 'slate', adjustment: 'red' }
export const TxTypeBadge = ({ type }) => <Badge color={typeColor[type]}>{TX_TYPES[type]?.label || type}</Badge>

/**
 * props:
 *  - transactions: array
 *  - onSelect(tx): optional click handler (opens details / edit)
 *  - showOwner: show a "Customer" column (admin)
 *  - usersById: map uid -> user (admin)
 */
export default function TransactionList({ transactions, onSelect, showOwner, usersById = {}, compact }) {
  if (!transactions?.length) {
    return <EmptyState icon={Receipt} title="No transactions yet" text="Deposits, withdrawals and transfers will show up here." />
  }

  return (
    <>
      {/* Phone: list of cards */}
      <ul className={`divide-y divide-slate-100 ${compact ? '' : 'md:hidden'}`}>
        {transactions.map((tx) => (
          <li key={tx.id}>
            <button onClick={() => onSelect?.(tx)} className="flex w-full items-center gap-3 py-3 text-left">
              <TxIcon tx={tx} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900">{tx.description || TX_TYPES[tx.type]?.label}</span>
                <span className="block truncate text-xs text-slate-500">
                  {shortDate(tx.createdAt)} · {showOwner ? usersById[tx.uid]?.fullName || 'Unknown' : tx.category}
                  {tx.status === 'pending' && ' · Pending'}
                </span>
              </span>
              <TxAmount tx={tx} />
            </button>
          </li>
        ))}
      </ul>

      {/* Tablet / desktop: table */}
      {!compact && (
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-3 pr-3 font-medium">Date</th>
                {showOwner && <th className="py-3 pr-3 font-medium">Customer</th>}
                <th className="py-3 pr-3 font-medium">Description</th>
                <th className="py-3 pr-3 font-medium">Type</th>
                <th className="py-3 pr-3 font-medium">Category</th>
                <th className="py-3 pr-3 font-medium">Status</th>
                <th className="py-3 pr-3 text-right font-medium">Amount</th>
                <th className="py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} onClick={() => onSelect?.(tx)} className={onSelect ? 'cursor-pointer hover:bg-slate-50' : ''}>
                  <td className="whitespace-nowrap py-3 pr-3 text-slate-600">{dateTime(tx.createdAt)}</td>
                  {showOwner && <td className="py-3 pr-3">{usersById[tx.uid]?.fullName || 'Unknown'}</td>}
                  <td className="py-3 pr-3 font-medium text-slate-900">
                    {tx.description}
                    {tx.counterparty && <span className="block text-xs font-normal text-slate-500">{tx.direction === 'credit' ? 'From' : 'To'} {tx.counterparty}</span>}
                  </td>
                  <td className="py-3 pr-3"><TxTypeBadge type={tx.type} /></td>
                  <td className="py-3 pr-3 text-slate-600">{tx.category}</td>
                  <td className="py-3 pr-3"><Badge color={tx.status === 'pending' ? 'amber' : 'green'}>{tx.status}</Badge></td>
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
