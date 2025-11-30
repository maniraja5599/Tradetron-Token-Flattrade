import { NextRequest, NextResponse } from 'next/server'
import { getUsers, saveUser, deleteAllUsers } from '@/lib/db'
import { encrypt, maskSecret } from '@/lib/crypto'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const users = await getUsers()
    // Mask sensitive fields
    const masked = users.map(u => ({
      ...u,
      encryptedPassword: maskSecret(u.encryptedPassword),
      encryptedTotpSecret: maskSecret(u.encryptedTotpSecret),
    }))
    return NextResponse.json(masked)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, tradetronUsername, brokerUsername, password, totpSecretOrDOB, isDOB, selectors } = body

    if (!name || !tradetronUsername || !brokerUsername || !password || !totpSecretOrDOB) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Auto-generate login URL from tradetronUsername
    const loginUrl = `https://flattrade.tradetron.tech/auth/${tradetronUsername}`

    // Detect if it's DOB (8 digits format: DDMMYYYY)
    const isDOBValue = isDOB !== undefined ? isDOB : /^\d{8}$/.test(totpSecretOrDOB)

    const user = {
      id: uuidv4(),
      name,
      tradetronUsername,
      loginUrl,
      brokerUsername,
      encryptedPassword: encrypt(password),
      encryptedTotpSecret: encrypt(totpSecretOrDOB),
      isDOB: isDOBValue,
      selectors: selectors ? JSON.parse(selectors) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    }

    await saveUser(user)

    return NextResponse.json({
      ...user,
      encryptedPassword: maskSecret(user.encryptedPassword),
      encryptedTotpSecret: maskSecret(user.encryptedTotpSecret),
    })
  } catch (error: any) {
    // Provide helpful error message for encryption key issues
    let errorMessage = error.message
    if (error.message.includes('ENCRYPTION_KEY')) {
      errorMessage = `${error.message}\n\nTo fix this:\n1. Go to Railway → Your Service → Variables tab\n2. Add ENCRYPTION_KEY variable\n3. Set it to a random string of at least 32 characters\n4. You can generate one using: openssl rand -base64 32\n5. Redeploy your service after adding the variable`
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    await deleteAllUsers()
    return NextResponse.json({ success: true, message: 'All users deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

