import { TX_TYPES } from '../lib/constants'
import { dateTime, money } from '../lib/format'
import { TxAmount, TxIcon, TxTypeBadge } from './Transactions'
import { Modal } from './ui'

// Read-only receipt for one transaction (customer view).
export default function TxDetail({ tx, onClose }) {
  return (
    <Modal open={Boolean(tx)} onClose={onClose} title="Transaction details">
      {tx && (
        <div>
          <div className="flex flex-col items-center gap-2 pb-5 text-center">
            <TxIcon tx={tx} />
            <p className="text-3xl"><TxAmount tx={tx} /></p>
            <p className="font-medium">{tx.description || TX_TYPES[tx.type]?.label}</p>
            <TxTypeBadge type={tx.type} />
          </div>
          <dl className="divide-y divide-slate-100 text-sm">
            {[
              ['Date', dateTime(tx.createdAt)],
              ['Category', tx.category],
              tx.counterparty && [tx.direction === 'credit' ? 'From' : 'To', tx.counterparty],
              ['Status', tx.status],
              ['Balance after', tx.balanceAfter == null ? '—' : money(tx.balanceAfter)],
              ['Reference', tx.id.slice(0, 12).toUpperCase()],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium capitalize">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  )
}
