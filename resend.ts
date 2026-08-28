/**
 * Creates a Resend client lazily — only when called, not at module import time.
 * This avoids build failures when RESEND_API_KEY is not set (e.g. first deploy).
 */
export function getResend() {
  const { Resend } = require("resend")
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("RESEND_API_KEY non configurata")
  }
  return new Resend(apiKey)
}