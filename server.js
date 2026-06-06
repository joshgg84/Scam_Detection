// server.js - API Gateway + Website Server (No Telegram Bot)

const express = require('express');
const cors = require('cors');
const path = require('path');

const handlers = require('./handlers.js');
const partnerSystem = require('./partner.js');
const { getScammerCount } = require('./scammers.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Serve static website files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize partner system (for support messages)
partnerSystem.initPartnerSystem();

// ========== API ENDPOINTS ==========

// Main chat endpoint - all messages go through handlers
app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`📨 API: ${message.substring(0, 50)}...`);
    
    try {
        const response = await handlers.processCommand(message, userId || 'web_user');
        res.json({ success: true, response: response });
    } catch (err) {
        console.error('API error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(), 
        scammers: getScammerCount()
    });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
    res.json({ scammers: getScammerCount() });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'API is online', timestamp: new Date().toISOString() });
});

// Serve website root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log('========================================');
    console.log('🌐 Detective Jai API & Website Running!');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📡 POST /api/chat - Chat endpoint`);
    console.log(`📊 GET /health - Health check`);
    console.log(`📈 GET /api/stats - Statistics`);
    console.log('========================================');
});