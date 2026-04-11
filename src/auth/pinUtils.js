/**
 * Hash a 4-digit PIN using SHA-256 via the Web Crypto API.
 * Returns a hex string.
 */
export async function hashPin(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(`artha:${pin}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify a raw PIN against a stored hash.
 */
export async function verifyPin(rawPin, storedHash) {
  const hash = await hashPin(rawPin)
  return hash === storedHash
}
