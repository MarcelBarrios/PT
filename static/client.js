// static/client.js
const socket = io();

// --- DOM Elements ---
const tickerGrid = document.getElementById('ticker-grid');
const stockInput = document.getElementById('stock-input');
const addStockBtn = document.getElementById('add-stock-btn');
const alertSymbolInput = document.getElementById('alert-symbol-input');
const alertPriceInput = document.getElementById('alert-price-input');
const alertEmailInput = document.getElementById('alert-email-input');
const setAlertBtn = document.getElementById('set-alert-btn');

// --- Functions ---
const updateGrid = (symbols, prices) => {
    // ... (this function is the same as before)
};

// --- Socket.IO Event Listeners ---
socket.on('initial_data', (data) => { /* same as before */ });
socket.on('price_update', (prices) => { /* same as before */ });
socket.on('symbols_update', (symbols) => { /* same as before */ });

// Listen for a confirmation that our alert was set
socket.on('alert_confirmation', (message) => {
    alert(message); // Simple alert to confirm
});

socket.on('action_feedback', (message) => {
    alert(message); // Show the feedback message in a simple popup
});

// --- Socket.IO Event Emitters ---
addStockBtn.addEventListener('click', () => { /* same as before */ });

// Send the price alert data to the server
setAlertBtn.addEventListener('click', () => {
    const symbol = alertSymbolInput.value.trim();
    const price = alertPriceInput.value.trim();
    const email = alertEmailInput.value.trim();

    if (symbol && price && email) {
        socket.emit('set_alert', { symbol, price, email });
        // Clear the form
        alertSymbolInput.value = '';
        alertPriceInput.value = '';
        alertEmailInput.value = '';
    } else {
        alert('Please fill out all fields for the price alert.');
    }
});