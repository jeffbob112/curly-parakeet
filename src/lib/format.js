// Small formatting helpers used all over the UI.

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const money = (n) => currency.format(Number(n) || 0)

export const shortDate = (ms) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const dateTime = (ms) =>
  new Date(ms).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })

// "1234567890" -> "•••• 7890"
export const maskAccount = (num = '') => `•••• ${String(num).slice(-4)}`

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

// Input type="date" works with "YYYY-MM-DD" strings.
export const toDateInput = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 10)
export const fromDateInput = (str) => {
  const [y, m, d] = str.split('-').map(Number)
  const now = new Date()
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes()).getTime()
}
