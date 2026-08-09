const { randomBytes, scryptSync, timingSafeEqual } = require('crypto')

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, 64)
  return `${salt}:${derivedKey.toString('hex')}`
}

function verifyPassword(password, hash) {
  const [salt, key] = hash.split(':')
  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = scryptSync(password, salt, 64)
  return timingSafeEqual(keyBuffer, derivedKey)
}

try {
  const pw = 'mysecret'
  const hash = hashPassword(pw)
  console.log('Hash:', hash)
  const ok = verifyPassword(pw, hash)
  console.log('Verified:', ok)
} catch (e) {
  console.error('ERROR:', e)
}
