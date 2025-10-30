import { NextRequest, NextResponse } from 'next/server'
import { getUsers, saveUser } from '@/lib/db'
import { encrypt, maskSecret } from '@/lib/crypto'
import { v4 as uuidv4 } from 'uuid'

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
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

