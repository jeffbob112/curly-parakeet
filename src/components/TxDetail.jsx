import { ACCOUNT_TYPES } from '../lib/accounts'
import { dateTime, money } from '../lib/format'
import { TxAmount, TxIcon, TxTypeBadge, txParty, txTitle } from './Transactions'
import { Modal } from './ui'

const METHODS = {
  check: 'Mobile check deposit', card: 'Card', wire: 'Domestic wire', wire_intl: 'International wire', atm: 'ATM', internal: 'Transfer between your accounts',
  send: 'Send money', billpay: 'Bill Pay', ach: 'Direct deposit (ACH)', interest: 'Interest', trade: 'Trade', fee: 'Fee', cash: 'Cash',
}

// Receipt for one transaction (customer view). Shows the check images for check deposits.
export default function TxDetail({ tx, onClose }) {
  return (
    <Modal open={Boolean(tx)} onClose={onClose} title="Transaction details">
      {tx && (
        <div>
          <div className="flex flex-col items-center gap-2 pb-5 text-center">
            <TxIcon tx={tx} size="lg" />
            <p className="text-3xl"><TxAmount tx={tx} /></p>
            <p className="font-medium">{txTitle(tx)}</p>
            {txParty(tx) && <p className="text-sm text-slate-500">{txParty(tx)}</p>}
            <TxTypeBadge type={tx.type} />
          </div>
          {tx.checkImages && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {['front', 'back'].map((side) => tx.checkImages[side] && (
                <figure key={side}>
                  <img src={tx.checkImages[side]} alt={`Check ${side}`} className="aspect-[16/8] w-full rounded-lg bg-slate-100 object-contain ring-1 ring-slate-200" />
                  <figcaption className="mt-1 text-center text-xs capitalize text-slate-500">{side}</figcaption>
                </figure>
              ))}
            </div>
          )}
          <dl className="divide-y divide-slate-100 text-sm">
            {[
              ['Date', dateTime(tx.createdAt)],
              ['Account', `${ACCOUNT_TYPES[tx.accountId]?.label || '—'}`],
              tx.counterparty && [tx.direction === 'credit' ? 'From' : 'To', tx.counterparty],
              tx.counterpartyAccount && ['Their account', tx.counterpartyAccount],
              tx.meta?.bankName && ['Bank', tx.meta.bankName],
              tx.meta?.swift && ['SWIFT / BIC', tx.meta.swift],
              ['Method', METHODS[tx.method] || '—'],
              ['Category', tx.category],
              ['Status', tx.status],
              ['Balance after', tx.balanceAfter == null ? '—' : money(tx.balanceAfter)],
              ['Reference', String(tx.id).slice(0, 12).toUpperCase()],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  )
}
