// Picks the backend: Firebase if keys are configured in .env.local, otherwise the demo backend.
// Every screen imports from HERE, so the UI never cares which backend is in use.

import * as demo from './demoBackend'

export const firebaseConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY)

const api = firebaseConfigured ? await import('./firebaseBackend') : demo

export default api
