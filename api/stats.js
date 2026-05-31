// api/stats.js
const { getScammerCount } = require('../scammers.js');

module.exports = (req, res) => {
    res.json({ scammers: getScammerCount() });
};