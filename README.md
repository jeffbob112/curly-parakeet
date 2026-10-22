# Parakeet Bank 🦜

A mini banking web app built for learning. It's mobile-first, installable as an app (PWA), and has a customer side and an admin dashboard.

> Parakeet Bank is a made-up brand for a practice project. It is not a real bank.

## Features

**Logging in**
- Register, then log in with email + password
- **Second step: a one-time passcode (OTP).** A 6-digit code is "texted" to you. In this learning version it is generated in the browser and shows up as a simulated text message banner (tap it to fill the code) and in your **Inbox**. Codes expire after 5 minutes, allow 5 attempts, and can be resent after 30 seconds.

**Customer app** (mobile-first, laid out like a real banking app)
- Header with **Menu · Inbox · Products · Log Out**, a "How can we help?" search bar, and a bottom tab bar: **Accounts · Pay & Transfer · Deposit Checks · Invest · Activity**
- **Accounts tab:** Hello card with Preferred Client + **My Rewards** points, net worth, a **Manage Expenses** donut, and grouped accounts with balances:
  - **Banking:** Adv Plus Checking, Advantage Savings
  - **Credit Cards:** Customized Cash Rewards Visa (balance owed + available credit)
  - **Loans:** Home Equity Line of Credit
  - **Investments:** Self-Directed Investing (value + today's change)
- **Dashboard tab:** 12-month monthly expense flow chart, "where your money went" flow (Sankey) chart, money in vs. out
- **Account pages:** balance, account/routing number (show/copy), **account age**, opened date, APR/limit/minimum payment for cards and loans, balance history chart, and transactions grouped by date with names (to/from)
- **Pay & Transfer** hub with options: Transfer between my accounts · Send money (send/receive) · Pay Bills (saved payees) · Wire (U.S. or international, with fees) · Pay card or loan (minimum/balance/other) · Withdraw, plus history
- **Deposit Checks:** add front and back cheque images (camera/upload, or a sample cheque), choose the account, enter the amount, see your monthly limit, Next → review → processing → receipt. The images are saved with the transaction.
- **Invest:** portfolio value, performance chart, allocation, holdings with gains, and buy/sell stocks
- **Expenses & insights:** monthly expense flow for 6 months / 1 year / 2 years, money-flow chart, category breakdown per month, month-by-month changes
- **Activity:** two years of history across all accounts, search, filters (account, type, date), CSV export, receipts
- **Products:** open a new checking, savings, credit card, HELOC or investment account (instant approval in the demo)
- **Inbox:** OTP messages and transaction alerts
- **Profile:** edit details, member since / relationship age, all account numbers

**Admin** (`/admin`)
- Overview: customers, deposits held, credit outstanding, investments held, transactions this month, frozen profiles, charts
- Customer page: edit profile and **member-since date** (relationship age), freeze/unfreeze, make admin
- **Per account:** open/close, set balance, set credit limit, set opened date (account age)
- Generate up to 24 months of realistic sample history
- Add transactions to any account (with a name, category and backdated date), edit or delete them. Deleting reverses the balance effect.

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

After logging in you'll be asked for the one-time passcode: tap the simulated text message at the top of the screen to fill it in.

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
| `users` | user's uid | `fullName, email, phone, address, role, status, avatarColor, memberSince, accounts` where `accounts` is a map: `{ chk, sav, cc, heloc, inv }`, each `{ number, balance, openedAt, status, creditLimit?, holdings? }` |
| `accounts` | account number | `{ uid, fullName, accountId }`: a small public directory used to find transfer recipients |
| `transactions` | auto | `uid, accountId, type, direction, amount, description, category, counterparty, counterpartyAccount, method, internal, balanceAfter, status, checkImages?, createdAt, createdBy` |

**Card and loan balances** are what you *owe*: a purchase is a `debit` (owe more) and a payment is a `credit` (owe less). `internal: true` marks transfers between your own accounts so they don't count as spending.

> **Learning note on security:** a real bank never lets the browser change balances. All money movement happens on a server (for example, Firebase Cloud Functions). Here, the browser does it inside Firestore transactions, and `firestore.rules` stops the obvious abuses: users can't change their own role or status, frozen accounts can't move money, and other users can only *increase* your balance. Moving the money logic into Cloud Functions is a great next step once you're comfortable.

## Deploy to Vercel (free demo link)

1. Sign in at <https://vercel.com> with GitHub.
2. **Add New… → Project**, pick `curly-parakeet`, click **Import**.
3. Leave the settings as detected (Vite, `npm run build`, output `dist`) and click **Deploy**.
4. You get a link like `https://curly-parakeet.vercel.app`. Every push to GitHub redeploys it automatically.

Without Firebase keys it runs in demo mode, so each visitor gets their own sample data in their browser. To use Firebase, add the `VITE_FIREBASE_*` values under **Project → Settings → Environment Variables**, redeploy, and add your Vercel domain in **Firebase → Authentication → Settings → Authorized domains**.

`vercel.json` sends every page URL (like `/app/deposit`) to `index.html`, so refreshing a page doesn't 404.

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
    otp.js              ← one-time passcode step (simulated SMS)
    notifications.js    ← the Inbox
  lib/
    accounts.js         ← account products (checking, savings, card, HELOC, investing)
    ledger.js           ← the money rules (limits, insufficient funds, credit limits…)
    operations.js       ← every money action as a pure function (shared by both backends)
    sampleData.js       ← generates 2 years of realistic history across accounts
    checkImages.js      ← photo compression + the sample cheque images
    chartData.js        ← turns transactions into chart data
    filters.js          ← search/filter + CSV export
    format.js, constants.js, hooks.js, nav.js
  context/              ← logged-in user (AuthContext) and toasts
  components/           ← layout, UI kit, charts, transaction list, money flow
  pages/                ← customer screens
  pages/admin/          ← admin screens
```

A good way to learn: start at `src/App.jsx` (all routes), then follow one feature, e.g. **Deposit**. That's `pages/Deposit.jsx`, then `components/MoneyFlow.jsx`, then `api.deposit()` in `services/`, then `opDeposit` in `lib/operations.js`.

> **OTP note:** a real bank generates and checks the code on a server and sends a real SMS (for example with Firebase Phone Auth or Twilio Verify). Swapping `services/otp.js` for one of those is a good next step.

## Tech

React 19 · Vite · Tailwind CSS v4 · React Router · Recharts · lucide-react icons · Firebase
