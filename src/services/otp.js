// One-time passcode (OTP) helpers shared by both backends.
//
// How it works in this app:
//   1. After the password, a customer REQUESTS a code (stored in the database as "pending").
//   2. An admin sees the request on Admin → Security codes, generates the code and sends it
//      to the customer (SMS / WhatsApp / phone). The customer never sees it on screen.
//   3. The customer types it in. The code expires after 10 minutes.
// A real bank would send the SMS automatically from a server (e.g. Firebase Phone Auth,
// Twilio Verify). This version keeps a human in the loop so you can see every step.

const VERIFIED = 'parakeet_otp_verified'
export const OTP_TTL = 10 * 60 * 1000 // 10 minutes
export const RESEND_AFTER = 30 * 1000 // 30 seconds

export const newOtpCode = () => {
  // crypto.getRandomValues is unpredictable, unlike Math.random
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000
  return String(100000 + n)
}

// Verification lasts for this browser tab session (cleared on logout or closing the tab).
export const isOtpVerified = (uid) => Boolean(uid) && sessionStorage.getItem(VERIFIED) === uid
export const markOtpVerified = (uid) => sessionStorage.setItem(VERIFIED, uid)
export const clearOtp = () => sessionStorage.removeItem(VERIFIED)
