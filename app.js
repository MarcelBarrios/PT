// app.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const mailgunTransport = require('nodemailer-mailgun-transport');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- API and Email Setup ---
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const mailgunAuth = {
    auth: {
        api_key: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
    },
};
const emailTransporter = nodemailer.createTransport(mailgunTransport(mailgunAuth));

app.use(express.static('static'));

// --- In-Memory Data Storage ---
let trackedSymbols = ['VT', 'SPY', 'QQQ'];
let lastPrices = {};
let priceAlerts = []; // Store for price alerts: { symbol, price, email, triggered }

// --- Core Functions ---

// Function to send the price alert email
const sendAlertEmail = (alert) => {
    console.log(`Sending price alert for ${alert.symbol} to ${alert.email}`);
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: alert.email,
        subject: `Price Alert for ${alert.symbol}!`,
        text: `This is an automated alert from ETF Snapshot.\n\nThe price for ${alert.symbol} has reached your target of $${alert.price}.\n\nThe current price is $${lastPrices[alert.symbol]}.`,
    };

    emailTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.error('Error sending email:', error);
        }
        console.log('Email sent:', info.response);
    });
};

// Function to check if any alerts should be triggered
const checkPriceAlerts = () => {
    priceAlerts.forEach((alert) => {
        // Check if the alert hasn't been triggered and the condition is met
        if (!alert.triggered && lastPrices[alert.symbol] && parseFloat(lastPrices[alert.symbol]) >= parseFloat(alert.price)) {
            sendAlertEmail(alert);
            alert.triggered = true; // Mark as triggered to avoid sending multiple emails
        }
    });
    // Optional: Clean up triggered alerts to save memory
    priceAlerts = priceAlerts.filter(alert => !alert.triggered);
};

// Function to fetch stock prices from the API
const fetchPrices = async () => {
    console.log('Fetching latest prices...');
    const pricePromises = trackedSymbols.map(async (symbol) => {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const quote = data['Global Quote'];
            if (quote && quote['05. price']) {
                return { symbol: quote['01. symbol'], price: parseFloat(quote['05. price']).toFixed(2) };
            }
        } catch (error) { console.error(`Error fetching ${symbol}:`, error); }
        return null;
    });

    const results = await Promise.all(pricePromises);
    results.forEach(res => { if (res) lastPrices[res.symbol] = res.price; });

    io.emit('price_update', lastPrices);
    checkPriceAlerts(); // After getting new prices, check our alerts
};

// --- Socket.IO Event Handling ---
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.emit('initial_data', { symbols: trackedSymbols, prices: lastPrices });

    socket.on('add_stock', (newSymbol) => {
        const symbol = newSymbol.toUpperCase();
        if (!trackedSymbols.includes(symbol)) {
            trackedSymbols.push(symbol);
            io.emit('symbols_update', trackedSymbols);
            fetchPrices();
        } else {
            socket.emit('action_feedback', `The symbol ${symbol} is already being tracked.`);
        }
    });

    // Event to set a new price alert
    socket.on('set_alert', (data) => {
        console.log('New price alert set:', data);
        priceAlerts.push({
            symbol: data.symbol.toUpperCase(),
            price: data.price,
            email: data.email,
            triggered: false,
        });
        // Send a confirmation back to the client who set it
        socket.emit('alert_confirmation', `Alert set for ${data.symbol} at $${data.price}.`);
    });

    socket.on('disconnect', () => { console.log('User disconnected'); });
});

setInterval(fetchPrices, 60000);
fetchPrices();

const PORT = 3000;
server.listen(PORT, () => console.log(`Server is listening on http://localhost:${PORT}`));