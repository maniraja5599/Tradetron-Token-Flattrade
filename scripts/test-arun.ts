import { getUserById } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { loginFlow } from '@/automations/loginFlow'

async function testArun() {
  console.log('='.repeat(60))
  console.log('Testing ARUN OAuth Login')
  console.log('='.repeat(60))
  console.log('')

  // Find ARUN user
  const users = await import('@/lib/db').then(m => m.getUsers())
  const arun = users.find(u => u.name.toUpperCase() === 'ARUN')

  if (!arun) {
    console.error('❌ ARUN user not found!')
    console.log('Available users:', users.map(u => u.name).join(', '))
    process.exit(1)
  }

  console.log('✓ Found ARUN user')
  console.log('')

  // Decrypt and verify credentials
  console.log('📋 User Information:')
  console.log(`   Name: ${arun.name}`)
  console.log(`   Tradetron Username: ${arun.tradetronUsername}`)
  console.log(`   Broker Username: ${arun.brokerUsername}`)
  console.log(`   Login URL: ${arun.loginUrl}`)
  console.log(`   Is DOB: ${arun.isDOB}`)
  console.log(`   Active: ${arun.active}`)
  console.log('')

  let password: string
  let dob: string

  try {
    password = decrypt(arun.encryptedPassword)
    dob = decrypt(arun.encryptedTotpSecret)
    
    console.log('🔐 Credentials (masked for security):')
    console.log(`   Password: ${password.substring(0, 2)}***${password.substring(password.length - 1)} (length: ${password.length})`)
    console.log(`   DOB/TOTP: ${dob} (length: ${dob.length})`)
    console.log('')

    // Validate credentials
    console.log('✓ Credentials Validation:')
    const passwordValid = password && password.length > 0
    const dobValid = arun.isDOB ? (dob && /^\d{8}$/.test(dob)) : (dob && dob.length > 0)
    
    console.log(`   Password valid: ${passwordValid ? '✓' : '✗'}`)
    console.log(`   DOB/TOTP valid: ${dobValid ? '✓' : '✗'}`)
    
    if (arun.isDOB) {
      console.log(`   DOB format: ${/^\d{8}$/.test(dob) ? '✓ Valid (8 digits)' : `✗ Invalid (expected 8 digits, got: ${dob.length})`}`)
      if (dob) {
        console.log(`   DOB value: ${dob}`)
        // Try to parse DOB
        if (/^\d{8}$/.test(dob)) {
          const day = dob.substring(0, 2)
          const month = dob.substring(2, 4)
          const year = dob.substring(4, 8)
          console.log(`   Parsed as: DD=${day}, MM=${month}, YYYY=${year}`)
        }
      }
    }
    console.log('')

    if (!passwordValid || !dobValid) {
      console.error('❌ Credentials validation failed!')
      console.log('Please check:')
      if (!passwordValid) console.log('  - Password is empty or invalid')
      if (!dobValid) console.log('  - DOB/TOTP is empty or invalid format')
      process.exit(1)
    }
  } catch (error: any) {
    console.error('❌ Failed to decrypt credentials:', error.message)
    process.exit(1)
  }

  // Run login flow
  console.log('🚀 Starting OAuth login flow...')
  console.log('')

  try {
    const result = await loginFlow({
      loginUrl: arun.loginUrl,
      brokerUsername: arun.brokerUsername,
      encryptedPassword: arun.encryptedPassword,
      encryptedTotpSecret: arun.encryptedTotpSecret,
      isDOB: arun.isDOB || false,
      selectors: arun.selectors,
      userId: arun.id,
      headful: false,
    })

    console.log('')
    console.log('='.repeat(60))
    console.log('OAuth Login Result:')
    console.log('='.repeat(60))
    console.log(`   Status: ${result.status}`)
    console.log(`   Message: ${result.message}`)
    console.log(`   Token Generated: ${result.tokenGenerated ? '✓ Yes' : '✗ No'}`)
    if (result.finalUrl) {
      console.log(`   Final URL: ${result.finalUrl}`)
    }
    if (result.artifactDir) {
      console.log(`   Artifact Dir: ${result.artifactDir}`)
    }
    console.log('')

    if (result.status === 'success' && result.tokenGenerated) {
      console.log('✅ OAuth SUCCESSFUL!')
      console.log('   Username, password, and DOB/TOTP are correct.')
      console.log('   Token was generated successfully.')
    } else {
      console.log('❌ OAuth FAILED!')
      console.log('   Possible issues:')
      console.log('   - Wrong username (Broker Username)')
      console.log('   - Wrong password')
      console.log('   - Wrong DOB/TOTP')
      console.log('   - Login page changed (selectors need update)')
      console.log('   - Network/timeout issue')
      if (result.artifactDir) {
        console.log(`   - Check artifacts in: ${result.artifactDir}`)
      }
    }
    console.log('')

    process.exit(result.status === 'success' && result.tokenGenerated ? 0 : 1)
  } catch (error: any) {
    console.error('')
    console.error('❌ Error during login flow:')
    console.error(`   Message: ${error.message}`)
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`)
    }
    console.error('')
    process.exit(1)
  }
}

testArun().catch(console.error)

