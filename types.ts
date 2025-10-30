import { defaultSelectors } from './lib/selectors'

export type User = {
  id: string
  name: string
  tradetronUsername: string // e.g., "724700"
  loginUrl: string // Auto-generated: https://flattrade.tradetron.tech/auth/{tradetronUsername}
  brokerUsername: string
  encryptedPassword: string
  encryptedTotpSecret: string // Can be TOTP secret (base32) or DOB (DDMMYYYY)
  isDOB: boolean // true if encryptedTotpSecret contains DOB, false if TOTP secret
  selectors?: Partial<typeof defaultSelectors>
  createdAt: string
  updatedAt: string
  active: boolean
}

export type RunLog = {
  id: string
  userId: string
  userName: string
  startedAt: string
  finishedAt: string
  ms: number
  status: 'success' | 'fail'
  message?: string
  artifactDir?: string
  finalUrl?: string
  tokenGenerated?: boolean
}

export type SelectorsConfig = typeof defaultSelectors

