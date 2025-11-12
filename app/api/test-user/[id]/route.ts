import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { loginFlow } from '@/automations/loginFlow'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserById(id)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Decrypt credentials for verification (for testing only)
    let decryptedPassword: string
    let decryptedDOB: string
    
    try {
      decryptedPassword = decrypt(user.encryptedPassword)
      decryptedDOB = decrypt(user.encryptedTotpSecret)
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: 'Failed to decrypt credentials',
          message: error.message,
          user: {
            id: user.id,
            name: user.name,
            tradetronUsername: user.tradetronUsername,
            brokerUsername: user.brokerUsername,
            loginUrl: user.loginUrl,
            isDOB: user.isDOB,
          }
        },
        { status: 500 }
      )
    }

    // Verify credentials format
    const credentialsInfo = {
      user: {
        id: user.id,
        name: user.name,
        tradetronUsername: user.tradetronUsername,
        brokerUsername: user.brokerUsername,
        loginUrl: user.loginUrl,
        isDOB: user.isDOB,
      },
      credentials: {
        password: decryptedPassword ? `${decryptedPassword.substring(0, 2)}***${decryptedPassword.substring(decryptedPassword.length - 1)}` : 'NOT SET',
        passwordLength: decryptedPassword?.length || 0,
        dob: decryptedDOB || 'NOT SET',
        dobLength: decryptedDOB?.length || 0,
        dobFormat: user.isDOB ? (decryptedDOB && /^\d{8}$/.test(decryptedDOB) ? 'Valid (8 digits)' : `Invalid (expected 8 digits, got: ${decryptedDOB?.length || 0})`) : 'N/A (TOTP)',
      },
      validation: {
        passwordValid: decryptedPassword && decryptedPassword.length > 0,
        dobValid: user.isDOB ? (decryptedDOB && /^\d{8}$/.test(decryptedDOB)) : (decryptedDOB && decryptedDOB.length > 0),
        allValid: decryptedPassword && decryptedPassword.length > 0 && (user.isDOB ? (decryptedDOB && /^\d{8}$/.test(decryptedDOB)) : (decryptedDOB && decryptedDOB.length > 0)),
      }
    }

    // Run the login flow with headful mode for debugging
    console.log(`[Test] Starting login test for user: ${user.name} (${user.id})`)
    console.log(`[Test] Login URL: ${user.loginUrl}`)
    console.log(`[Test] Broker Username: ${user.brokerUsername}`)
    console.log(`[Test] Password length: ${decryptedPassword.length}`)
    console.log(`[Test] DOB/TOTP: ${user.isDOB ? 'DOB' : 'TOTP'}`)
    console.log(`[Test] DOB value: ${decryptedDOB}`)
    console.log(`[Test] DOB format valid: ${user.isDOB ? /^\d{8}$/.test(decryptedDOB) : 'N/A'}`)

    const result = await loginFlow({
      loginUrl: user.loginUrl,
      brokerUsername: user.brokerUsername,
      encryptedPassword: user.encryptedPassword,
      encryptedTotpSecret: user.encryptedTotpSecret,
      isDOB: user.isDOB || false,
      selectors: user.selectors,
      userId: user.id,
      headful: false, // Set to true to see browser (but for testing, false is better for automation)
    })

    return NextResponse.json({
      success: true,
      credentialsInfo,
      loginResult: {
        status: result.status,
        message: result.message,
        tokenGenerated: result.tokenGenerated || false,
        finalUrl: result.finalUrl,
        artifactDir: result.artifactDir,
      },
      analysis: {
        oauthSuccessful: result.status === 'success' && result.tokenGenerated === true,
        credentialIssue: !credentialsInfo.validation.allValid,
        passwordIssue: !credentialsInfo.validation.passwordValid,
        dobIssue: !credentialsInfo.validation.dobValid && user.isDOB,
      }
    })
  } catch (error: any) {
    console.error(`[Test] Error testing user:`, error)
    return NextResponse.json(
      { 
        error: error.message || 'Unknown error occurred',
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check credentials without running login
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserById(id)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Decrypt credentials for verification
    let decryptedPassword: string
    let decryptedDOB: string
    
    try {
      decryptedPassword = decrypt(user.encryptedPassword)
      decryptedDOB = decrypt(user.encryptedTotpSecret)
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: 'Failed to decrypt credentials',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        tradetronUsername: user.tradetronUsername,
        brokerUsername: user.brokerUsername,
        loginUrl: user.loginUrl,
        isDOB: user.isDOB,
        active: user.active,
      },
      credentials: {
        password: decryptedPassword ? `${decryptedPassword.substring(0, 2)}***${decryptedPassword.substring(decryptedPassword.length - 1)}` : 'NOT SET',
        passwordLength: decryptedPassword?.length || 0,
        dob: user.isDOB ? decryptedDOB : 'N/A (TOTP)',
        dobLength: decryptedDOB?.length || 0,
        dobFormat: user.isDOB ? (decryptedDOB && /^\d{8}$/.test(decryptedDOB) ? 'Valid (8 digits)' : `Invalid (expected 8 digits, got: ${decryptedDOB?.length || 0})`) : 'TOTP Secret',
      },
      validation: {
        passwordValid: decryptedPassword && decryptedPassword.length > 0,
        dobValid: user.isDOB ? (decryptedDOB && /^\d{8}$/.test(decryptedDOB)) : (decryptedDOB && decryptedDOB.length > 0),
        allValid: decryptedPassword && decryptedPassword.length > 0 && (user.isDOB ? (decryptedDOB && /^\d{8}$/.test(decryptedDOB)) : (decryptedDOB && decryptedDOB.length > 0)),
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

