'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sendTelegramNotification } from '@/lib/telegram'

const USERNAME = 'tradetron'
const PASSWORD = 'flattrade'
const COOKIE_NAME = 'auth_token'

export async function login(prevState: any, formData: FormData) {
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const rememberMe = formData.get('remember') === 'on'

    if (username === USERNAME && password === PASSWORD) {
        const expires = rememberMe ? Date.now() + 30 * 24 * 60 * 60 * 1000 : Date.now() + 24 * 60 * 60 * 1000

        cookies().set(COOKIE_NAME, 'true', {
            expires,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        })

        return { success: true }
    }

    return { success: false, message: 'Invalid username or password' }
}

export async function forgotPassword() {
    try {
        const message = `<b>🔐 Password Recovery</b>\n\n<b>Username:</b> ${USERNAME}\n<b>Password:</b> ${PASSWORD}`
        const sent = await sendTelegramNotification(message)

        if (sent) {
            return { success: true, message: 'Credentials sent to your Telegram!' }
        } else {
            return { success: false, message: 'Failed to send Telegram message. Check bot configuration.' }
        }
    } catch (error) {
        return { success: false, message: 'An error occurred.' }
    }
}

export async function logout() {
    cookies().delete(COOKIE_NAME)
    redirect('/login')
}
