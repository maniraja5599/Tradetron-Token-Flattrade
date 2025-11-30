
const { sendTelegramNotification } = require('../lib/telegram');
const { updateSchedule } = require('../lib/scheduler');

async function test() {
    console.log('Testing Telegram Notification...');
    const success = await sendTelegramNotification('🧪 <b>Test Notification</b>\n\nThis is a test from the debug script.');
    console.log('Notification sent:', success);

    if (success) {
        console.log('Now testing updateSchedule notification...');
        // We can't easily call updateSchedule because it depends on DB and Cron which might not work in this script context
        // without full setup. But we can check if the import works.
        console.log('updateSchedule is imported:', typeof updateSchedule === 'function');
    }
}

test().catch(console.error);
