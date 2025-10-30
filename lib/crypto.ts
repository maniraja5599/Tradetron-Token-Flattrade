import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long')
  }
  // Use SHA-256 to derive a consistent 32-byte key from the env var
  return crypto.createHash('sha256').update(key).digest()
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const tag = cipher.getAuthTag()

  // Format: iv|tag|encrypted (all base64)
  const result = Buffer.concat([iv, tag, encrypted]).toString('base64')
  return result
}

export function decrypt(payload: string): string {
  const key = getEncryptionKey()
  const buffer = Buffer.from(payload, 'base64')

  if (buffer.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted payload')
  }

  const iv = buffer.subarray(0, IV_LENGTH)
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString('utf8')
}

export function maskSecret(value: string, showLast: number = 3): string {
  if (!value || value.length <= showLast) return '•••'
  return '•••' + value.slice(-showLast)
}

