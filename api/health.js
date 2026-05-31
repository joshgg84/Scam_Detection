// api/health.js
const { getScammerCount } = require('../scammers.js');

module.exports = (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        scammers: getScammerCount()
    });
};