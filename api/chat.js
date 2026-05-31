// api/chat.js - Vercel serverless function for your bot API

const { getAllScammers, getScammerCount, reportNumber } = require('../scammers.js');
const detection = require('../detection.js');
const linkModule = require('../links.js');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { message, userId } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`📨 API: ${message.substring(0, 50)}...`);
    
    const command = message.split(' ')[0].toLowerCase();
    const args = message.split(' ').slice(1);
    
    try {
        let response;
        
        if (command === '/checknumber' || command === '/cn') {
            response = await handleCheckNumber(args);
        } else if (command === '/checkmsg' || command === '/cm') {
            response = await handleCheckMessage(args);
        } else if (command === '/checklink') {
            response = await handleCheckLink(args);
        } else if (command === '/report') {
            response = await handleReport(args, userId);
        } else if (command === '/search') {
            response = await handleSearch(args);
        } else if (command === '/stats') {
            response = await handleStats();
        } else if (command === '/help') {
            response = await handleHelp();
        } else {
            response = await handleAutoDetect(message);
        }
        
        res.json({ success: true, response: response });
        
    } catch (err) {
        console.error('API error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ========== HANDLERS ==========

async function handleCheckNumber(args) {
    const phoneNumber = args[0];
    if (!phoneNumber || !phoneNumber.match(/0[789][01]\d{8}/)) {
        return `📞 *Check Phone Number*\n\nUsage: /checknumber 08012345678`;
    }
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    const scammers = getAllScammers();
    const isScammer = scammers.includes(cleaned);
    
    return isScammer 
        ? `🚨 *ALERT!*\n${phoneNumber} is a REPORTED SCAMMER!\n\n❌ Do not send money`
        : `✅ *CLEAR*\n${phoneNumber} has no reports.\n\n⚠️ Still be cautious.`;
}

async function handleCheckMessage(args) {
    const message = args.join(' ');
    if (!message) {
        return `📝 *Check Message*\n\nUsage: /checkmsg [suspicious message]`;
    }
    
    const analysis = detection.analyzeMessage(message);
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
    if (analysis.alerts.length > 0) {
        response += `*Why this is suspicious:*\n${analysis.alerts.slice(0, 3).join('\n')}\n\n`;
    }
    response += `*What to do:* ${analysis.recommendation}`;
    return response;
}

async function handleCheckLink(args) {
    const url = args[0];
    if (!url) return `🔗 *Check Link*\n\nUsage: /checklink https://example.com`;
    
    const reported = linkModule.checkLink(url);
    const analysis = linkModule.analyzeLink(url);
    
    if (reported) {
        return `🚨 *SCAM LINK DETECTED!*\n\nURL: ${url}\nReason: ${reported.reason}\n❌ DO NOT CLICK!`;
    } else if (analysis.riskScore >= 30) {
        return `🟡 *SUSPICIOUS LINK*\n\nRisk Score: ${analysis.riskScore}/100\n${analysis.reasons.slice(0, 2).join('\n')}\n⚠️ Be very careful.`;
    } else {
        return `🟢 *LINK APPEARS SAFE*\n\nNo scam reports for this link.\n⚠️ Still be cautious.`;
    }
}

async function handleReport(args, userId) {
    const phoneNumber = args[0];
    const reason = args.slice(1).join(' ') || 'Suspicious activity';
    if (!phoneNumber) return `📢 *Report Scammer*\n\nUsage: /report 08012345678 [reason]`;
    
    const result = await reportNumber(phoneNumber, userId || 'web_user', reason);
    return result.message;
}

async function handleSearch(args) {
    const query = args[0];
    if (!query) return `🔍 *Search Scammers*\n\nUsage: /search 080`;
    
    const scammers = getAllScammers();
    const results = scammers.filter(s => s.includes(query));
    
    if (results.length === 0) return `🔍 No scammers found matching "${query}"`;
    return `🔍 *Search Results for "${query}"*\n\nFound ${results.length} number(s):\n${results.slice(0, 10).join('\n')}`;
}

async function handleStats() {
    return `📊 *STATS*\nScammers reported: ${getScammerCount()}\n🆓 Free forever\n🇳🇬 Protecting Nigerians`;
}

async function handleHelp() {
    return `📚 *DETECTIVE JAI - COMMANDS*\n\n📞 /checknumber 08012345678\n📝 /checkmsg [message]\n🔗 /checklink [url]\n📢 /report [number] [reason]\n🔍 /search [digits]\n📊 /stats\n\n🆓 Free forever.`;
}

async function handleAutoDetect(message) {
    const phoneMatch = message.match(/0[789][01]\d{8}/);
    if (phoneMatch) return await handleCheckNumber([phoneMatch[0]]);
    
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    if (urlMatch) return await handleCheckLink([urlMatch[0]]);
    
    const analysis = detection.analyzeMessage(message);
    if (analysis.riskScore >= 10) {
        let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
        if (analysis.alerts.length > 0) {
            response += `*Suspicious signs:*\n${analysis.alerts.slice(0, 3).join('\n')}\n\n`;
        }
        response += `*Recommendation:* ${analysis.recommendation}`;
        return response;
    }
    
    return `🔍 I analyzed your message.\n\nNo obvious scam indicators.\n\n⚠️ Always be cautious with unknown senders.\n\nType /help to see commands.`;
}