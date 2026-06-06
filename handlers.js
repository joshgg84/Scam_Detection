// handlers.js - Shared command handlers for both bot and API

const detection = require('./detection.js');
const linkModule = require('./links.js');
const partnerSystem = require('./partner.js');
const { getAllScammers, getScammerCount, reportNumber } = require('./scammers.js');

async function handleCheckNumber(phoneNumber) {
    if (!phoneNumber || !phoneNumber.match(/0[789][01]\d{8}/)) {
        return `📞 *Check Phone Number*\n\nUsage: /checknumber 08012345678`;
    }
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    const scammers = getAllScammers();
    const isScammer = scammers.includes(cleaned);
    
    let response = isScammer 
        ? `🚨 *ALERT!*\n${phoneNumber} is a REPORTED SCAMMER!\n\n❌ Do not send money`
        : `✅ *CLEAR*\n${phoneNumber} has no reports.\n\n⚠️ Still be cautious.`;
    
    const supportMessage = partnerSystem.getRandomPartnerSupportMessage();
    response += `\n\n${supportMessage}`;
    
    return response;
}

async function handleCheckMessage(messageText) {
    if (!messageText) {
        return `📝 *Check Message*\n\nUsage: /checkmsg [suspicious message]`;
    }
    
    const analysisResult = await detection.analyzeMessageWithLinks(messageText, linkModule);
    const analysis = analysisResult.analysis;
    
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
    response += `*📝 Message:*\n${messageText.substring(0, 300)}${messageText.length > 300 ? '...' : ''}\n\n`;
    
    if (analysis.alerts.length > 0) {
        response += `*🔍 WHY THIS IS SUSPICIOUS:*\n${analysis.alerts.slice(0, 5).join('\n')}\n\n`;
    }
    
    response += `*✅ WHAT YOU SHOULD DO:*\n${analysis.recommendation}\n\n`;
    
    const supportMessage = partnerSystem.getRandomPartnerSupportMessage();
    response += `${supportMessage}`;
    
    return response;
}

async function handleCheckLink(url) {
    if (!url) return `🔗 *Check Link*\n\nUsage: /checklink https://example.com`;
    
    const reported = linkModule.checkLink(url);
    const analysis = linkModule.analyzeLink(url);
    
    if (reported) {
        return `🚨 *SCAM LINK DETECTED!*\n\nURL: ${url}\nReason: ${reported.reason}\n❌ DO NOT CLICK!`;
    } else if (analysis.riskScore >= 30) {
        return `🟡 *SUSPICIOUS LINK*\n\nRisk Score: ${analysis.riskScore}/100\n${analysis.reasons.slice(0, 3).join('\n')}\n⚠️ Be very careful.`;
    } else {
        return `🟢 *LINK APPEARS SAFE*\n\nNo scam reports for this link.\n⚠️ Still be cautious.`;
    }
}

async function handleReport(phoneNumber, reason, userId) {
    if (!phoneNumber) return `📢 *Report Scammer*\n\nUsage: /report 08012345678 [reason]`;
    
    const result = await reportNumber(phoneNumber, userId || 'web_user', reason || 'Suspicious activity');
    return result.message;
}

async function handleSearch(query) {
    if (!query) return `🔍 *Search Scammers*\n\nUsage: /search 080`;
    
    const scammers = getAllScammers();
    const results = scammers.filter(s => s.includes(query));
    
    if (results.length === 0) return `🔍 No scammers found matching "${query}"`;
    return `🔍 *Search Results for "${query}"*\n\nFound ${results.length} number(s):\n${results.slice(0, 10).join('\n')}`;
}

function handleHelp() {
    return `📚 *DETECTIVE JAI - COMMANDS*\n\n📞 /checknumber 08012345678\n📝 /checkmsg [message]\n🔗 /checklink [url]\n📢 /report [number] [reason]\n🔍 /search [digits]\n📊 /stats\n\n🆓 Free forever.`;
}

function handleStats() {
    return `📊 *STATS*\nScammers reported: ${getScammerCount()}\n🆓 Free forever\n🇳🇬 Protecting Nigerians`;
}

async function handleAutoDetect(message) {
    const phoneMatch = message.match(/0[789][01]\d{8}/);
    if (phoneMatch) return await handleCheckNumber(phoneMatch[0]);
    
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    if (urlMatch) return await handleCheckLink(urlMatch[0]);
    
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

async function processCommand(message, userId = null) {
    const command = message.split(' ')[0].toLowerCase();
    const args = message.split(' ').slice(1);
    
    if (command === '/checknumber' || command === '/cn') {
        return await handleCheckNumber(args[0]);
    }
    if (command === '/checkmsg' || command === '/cm') {
        return await handleCheckMessage(args.join(' '));
    }
    if (command === '/checklink') {
        return await handleCheckLink(args[0]);
    }
    if (command === '/report') {
        return await handleReport(args[0], args.slice(1).join(' '), userId);
    }
    if (command === '/search') {
        return await handleSearch(args[0]);
    }
    if (command === '/stats') {
        return handleStats();
    }
    if (command === '/help') {
        return handleHelp();
    }
    
    return await handleAutoDetect(message);
}

module.exports = {
    processCommand,
    handleCheckNumber,
    handleCheckMessage,
    handleCheckLink,
    handleReport,
    handleSearch,
    handleHelp,
    handleStats,
    handleAutoDetect
};