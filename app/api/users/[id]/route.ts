import { NextRequest, NextResponse } from 'next/server'
import { getUserById, saveUser, deleteUser } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'

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
    
    // Decrypt password and TOTP/DOB for display
    let decryptedPassword = ''
    let decryptedTotpOrDOB = ''
    try {
      decryptedPassword = decrypt(user.encryptedPassword)
    } catch (e) {
      console.error('Failed to decrypt password:', e)
    }
    try {
      decryptedTotpOrDOB = decrypt(user.encryptedTotpSecret)
    } catch (e) {
      console.error('Failed to decrypt TOTP/DOB:', e)
    }
    
    return NextResponse.json({
      ...user,
      password: decryptedPassword,
      totpSecretOrDOB: decryptedTotpOrDOB,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const body = await request.json()
    const { name, tradetronUsername, brokerUsername, password, totpSecretOrDOB, isDOB, active } = body

    const updated: any = {
      ...user,
      updatedAt: new Date().toISOString(),
    }

    if (name !== undefined) updated.name = name
    if (brokerUsername !== undefined) updated.brokerUsername = brokerUsername
    if (tradetronUsername !== undefined) {
      updated.tradetronUsername = tradetronUsername
      // Auto-regenerate login URL when tradetronUsername changes
      updated.loginUrl = `https://flattrade.tradetron.tech/auth/${tradetronUsername}`
    }
    // Remove selectors handling - no longer needed
    if (active !== undefined) updated.active = active

    // Only update password/totp if provided (for "Change secret" flow)
    if (password !== undefined && password !== '') {
      updated.encryptedPassword = encrypt(password)
    }
    if (totpSecretOrDOB !== undefined && totpSecretOrDOB !== '') {
      const isDOBValue = isDOB !== undefined ? isDOB : /^\d{8}$/.test(totpSecretOrDOB)
      updated.encryptedTotpSecret = encrypt(totpSecretOrDOB)
      updated.isDOB = isDOBValue
    } else if (isDOB !== undefined) {
      // Preserve isDOB flag even if not changing TOTP/DOB value
      updated.isDOB = isDOB
    }
    // If isDOB is not provided, keep existing value (already preserved in spread operator)

      await saveUser(updated)

    // Decrypt for response
    let decryptedPassword = ''
    let decryptedTotpOrDOB = ''
    try {
      decryptedPassword = decrypt(updated.encryptedPassword)
    } catch (e) {
      console.error('Failed to decrypt password:', e)
    }
    try {
      decryptedTotpOrDOB = decrypt(updated.encryptedTotpSecret)
    } catch (e) {
      console.error('Failed to decrypt TOTP/DOB:', e)
    }
    
    return NextResponse.json({
      ...updated,
      password: decryptedPassword,
      totpSecretOrDOB: decryptedTotpOrDOB,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = await deleteUser(id)
    if (!deleted) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

