// One-time passcode (OTP) step after login — "our side" version for learning.
// The code is generated in the browser and "delivered" as a simulated text message
// (a banner + an Inbox message). A real bank would generate and check the code on a
// server and send it by SMS (e.g. Firebase Phone Auth, Twilio Verify).
import { notify } from './notifications'

const CHALLENGE = 'parakeet_otp_challenge'
const VERIFIED = 'parakeet_otp_verified'
export const OTP_TTL = 5 * 60 * 1000 // 5 minutes
export const RESEND_AFTER = 30 * 1000 // 30 seconds
const MAX_ATTEMPTS = 5

const read = () => {
  try { return JSON.parse(sessionStorage.getItem(CHALLENGE)) } catch { return null }
}

// Creates a new 6-digit code and "sends" it. Returns the code so the UI can show the fake SMS.
export function sendOtp(user) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const challenge = { uid: user.uid, code, expiresAt: Date.now() + OTP_TTL, sentAt: Date.now(), attempts: 0 }
  sessionStorage.setItem(CHALLENGE, JSON.stringify(challenge))
  notify(user.uid, {
    kind: 'security',
    title: 'Your verification code',
    body: `Parakeet Bank: ${code} is your verification code. It expires in 5 minutes. Never share this code with anyone.`,
  })
  return challenge
}

export const getChallenge = () => read()

export function verifyOtp(uid, input) {
  const c = read()
  if (!c || c.uid !== uid) throw new Error('Please request a new code.')
  if (Date.now() > c.expiresAt) throw new Error('This code has expired. Tap "Resend code".')
  if (c.attempts >= MAX_ATTEMPTS) throw new Error('Too many attempts. Tap "Resend code" to get a new one.')
  if (String(input).trim() !== c.code) {
    c.attempts += 1
    sessionStorage.setItem(CHALLENGE, JSON.stringify(c))
    const left = MAX_ATTEMPTS - c.attempts
    throw new Error(left > 0 ? `That code isn't right. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many attempts. Tap "Resend code".')
  }
  sessionStorage.removeItem(CHALLENGE)
  sessionStorage.setItem(VERIFIED, uid)
}

// Verification lasts for this browser tab session (cleared on logout or closing the tab).
export const isOtpVerified = (uid) => Boolean(uid) && sessionStorage.getItem(VERIFIED) === uid

export function clearOtp() {
  sessionStorage.removeItem(VERIFIED)
  sessionStorage.removeItem(CHALLENGE)
}
