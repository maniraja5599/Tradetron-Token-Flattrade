import { v4 as uuidv4 } from 'uuid'
import { saveUser } from '@/lib/db'
import { encrypt } from '@/lib/crypto'

async function seed() {
  console.log('Seeding database...')

  const sampleUser = {
    id: uuidv4(),
    name: 'Sample User',
    tradetronUsername: '724700',
    loginUrl: 'https://flattrade.tradetron.tech/auth/724700',
    brokerUsername: '724700',
    encryptedPassword: encrypt('changeme'),
    encryptedTotpSecret: encrypt('17111992'), // DOB format
    isDOB: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    active: false, // Set to false so it doesn't run automatically
  }

  await saveUser(sampleUser)
  console.log('✓ Sample user created (set active=true and update credentials to use)')
  console.log('')
  console.log('IMPORTANT: Update the sample user with your actual credentials!')
}

seed().catch(console.error)

