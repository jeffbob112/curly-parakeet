# Parakeet Bank 🦜

A mini banking web app built for learning. It's mobile-first, installable as an app (PWA), and has a customer side and an admin dashboard.

> Parakeet Bank is a made-up brand for a practice project. It is not a real bank.

## Features

**Customers**
- Register, log in and log out
- Dashboard: balance card (tap the eye to hide it), money in/out this month, quick actions
- Charts: spending by category (donut) and money in vs. out per month (bars)
- Deposit (with check photo preview), withdraw, pay bills, and transfer to another customer by account number
- Every money action has a **form → review → confirm → receipt** flow
- Activity: search, filter by type and date, totals, tap for a receipt, export to CSV
- Profile: edit name, phone, address and avatar color, and copy your account number

**Admin** (`/admin`)
- Overview: number of customers, total deposits, transactions this month, frozen accounts, and bank-wide charts
- Customers: search and open any customer
- Customer detail: edit their profile, **freeze or unfreeze** the account, make someone an admin, **set an exact balance**, **generate sample history**, and add, edit or delete transactions
- All transactions: search, filter, add, edit, delete, CSV export

Deleting a transaction **reverses its effect on the balance**, and "set balance" records an *adjustment* transaction, so the history always adds up to the balance.

## Quick start (demo mode, no setup)

```bash
npm install
npm run dev
```

Open the URL it prints (on your phone, use your computer's IP address with `npm run dev -- --host`).

With no Firebase keys, the app runs in **demo mode** and saves data in your browser's `localStorage`. Demo logins (tap them on the login page):

| Role     | Email                 | Password   |
|----------|-----------------------|------------|
| Customer | jane@parakeet.bank    | demo123    |
| Customer | john@parakeet.bank    | demo123    |
| Admin    | admin@parakeet.bank   | admin123   |

To start over, use **Admin → Overview → Reset demo data**.

## Going live with Firebase

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Get started → Email/Password → Enable.**
3. **Firestore Database → Create database** (production mode).
4. **Firestore → Rules**: paste the contents of [`firestore.rules`](./firestore.rules) and click **Publish**.
5. **Project settings → Your apps → Web (`</>`)**: register an app and copy the config.
6. Copy `.env.example` to `.env.local` and fill in the values. Restart `npm run dev`.
7. Register your own account in the app. Then in **Firestore → users → (your document)**, change `role` from `user` to `admin`. Refresh, and you'll see the **Admin** button.

To deploy (optional): `npm i -g firebase-tools`, `firebase login`, `firebase init` (pick your project and keep the existing `firebase.json`), then `npm run build && firebase deploy`.

### Firestore data model

| Collection | Document ID | What's inside |
|---|---|---|
| `users` | user's uid | `fullName, email, phone, address, role, status, accountNumber, balance, avatarColor, createdAt` |
| `accounts` | account number | `{ uid, fullName }`: a small public directory used to find transfer recipients |
| `transactions` | auto | `uid, type, direction, amount, description, category, counterparty, balanceAfter, status, createdAt, createdBy` |

> **Learning note on security:** a real bank never lets the browser change balances. All money movement happens on a server (for example, Firebase Cloud Functions). Here, the browser does it inside Firestore transactions, and `firestore.rules` stops the obvious abuses: users can't change their own role or status, frozen accounts can't move money, and other users can only *increase* your balance. Moving the money logic into Cloud Functions is a great next step once you're comfortable.

## Install it on your phone (PWA)

Deploy it (or run `npm run build && npm run preview -- --host`), open it on your phone, then:
- **Android/Chrome:** menu ⋮ → *Add to Home screen* / *Install app*
- **iPhone/Safari:** Share → *Add to Home Screen*

## How the code is organised

```
src/
  services/
    api.js              ← picks Firebase or demo backend. Screens import ONLY this.
    demoBackend.js      ← localStorage version
    firebaseBackend.js  ← Firebase Auth + Firestore version
    events.js           ← tiny "data changed" event so screens refresh
  lib/
    ledger.js           ← the money rules (limits, insufficient funds, frozen…)
    sampleData.js       ← generates realistic transaction history
    chartData.js        ← turns transactions into chart data
    filters.js          ← search/filter + CSV export
    format.js, constants.js, hooks.js, nav.js
  context/              ← logged-in user (AuthContext) and toasts
  components/           ← layout, UI kit, charts, transaction list, money flow
  pages/                ← customer screens
  pages/admin/          ← admin screens
```

A good way to learn: start at `src/App.jsx` (all routes), then follow one feature, e.g. **Deposit**. That's `pages/Deposit.jsx`, then `components/MoneyFlow.jsx`, then `api.deposit()` in `services/`, then `lib/ledger.js`.

## Tech

React 19 · Vite · Tailwind CSS v4 · React Router · Recharts · lucide-react icons · Firebase
