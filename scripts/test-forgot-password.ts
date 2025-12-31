
// Mock the environment variables for the test if not present
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'mock_token'
process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'mock_chat_id'

import { forgotPassword } from '../app/actions/auth'

// Mock the console.log/error to capture output if needed, or just let it print
// But sendTelegramNotification is imported from lib. 
// We want to see what sendTelegramNotification receives.

// Note: modifying imported modules in ESM/TSX is hard.
// Instead, let's just run the function and see the result.
// Since we set mock env vars, it should "try" to send.
// If valid keys were there, it would work.
// With "mock_token", the fetch call to Telegram API will fail, but we can catch that error.

console.log('--- Testing Forgot Password Logic ---')

async function runTest() {
    console.log('Calling forgotPassword()...')
    const result = await forgotPassword()
    console.log('Result:', result)
}

runTest()
