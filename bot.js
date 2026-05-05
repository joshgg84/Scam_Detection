// Nigeria Scam Detector Bot - Main Bot File
// Creator: Joshua Giwa
// Community: https://t.me/+8JUqlJ-4SBdlZTM0

const { Telegraf } = require('telegraf');
const fs = require('fs');
const { addScammer, getScammerCount, getAllScammers } = require('./scammers.js');
const { dailyTips } = require('./tips.js');

// Import modules
const partnerSystem = require('./partner.js');
const ocr = require('./ocr.js');
const { registerAdminCommands } = require('./admin.js');

// ========== CONFIGURATION ==========
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found!');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const YOUR_ID = 8447414897;
const COMMUNITY_LINK = "https://t.me/+8JUqlJ-4SBdlZTM0";
const GROUP_ID = -1003513272328;

// Initialize Partner System
partnerSystem.initPartnerSystem();

// ========== LOAD TERMS DATABASE ==========
let scamTerms = {};
const TERMS_FILE = 'terms.json';

function loadTerms() {
    try {
        if (fs.existsSync(TERMS_FILE)) {
            const data = fs.readFileSync(TERMS_FILE, 'utf8');
            scamTerms = JSON.parse(data);
            console.log(`📚 Loaded ${Object.keys(scamTerms).length} scam terms`);
        } else {
            console.error('❌ terms.json not found!');
            scamTerms = {};
        }
    } catch (err) {
        console.error('Error loading terms.json:', err);
        scamTerms = {};
    }
}

function getTerm(term) {
    const lowerTerm = term.toLowerCase();
    if (scamTerms[lowerTerm]) return scamTerms[lowerTerm];
    for (const [key, value] of Object.entries(scamTerms)) {
        if (key.includes(lowerTerm) || lowerTerm.includes(key)) return value;
    }
    return null;
}

function getAllTermKeys() {
    return Object.keys(scamTerms);
}

function getCommonScams() {
    const commonKeys = ['phishing', '419', 'romance scam', 'fake alert', 'investment scam', 'job scam', 'loan scam', 'sim swap', 'otp scam', 'pig butchering'];
    return commonKeys.filter(key => scamTerms[key]);
}

loadTerms();

// ========== HELPER FUNCTIONS ==========
function checkNumberInDatabase(phoneNumber) {
    const scammers = getAllScammers();
    const cleaned = phoneNumber.toString().replace(/\D/g, '');
    if (cleaned.length === 0) return false;
    return scammers.some(scammer => {
        const scammerCleaned = scammer.toString().replace(/\D/g, '');
        return scammerCleaned === cleaned;
    });
}

function getHelpMessage() {
    return `
📚 *NIGERIA SCAM DETECTOR - HELP*

*Creator:* Joshua Giwa

⏰ *Note:* First message may take 20-30 seconds to wake me up.

*Detection:*
/check [number] - Check if a number is reported
/report [number] - Report a scammer
📸 Send a CLEAR screenshot or image file
📝 Forward suspicious messages as TEXT (best method)

*Education:*
/scamtypes - Learn common scams
/redflags - Scam warning words
/whattodo - Steps after being scammed
/tips - Random security tip
/whatis [term] - Learn scam terms

*Business:*
/partners - Browse trusted businesses
/partner - Contact Joshua Giwa
/community - Join our Telegram group
/stats - Bot statistics
/support - Support this bot

👥 *Community:* ${COMMUNITY_LINK}

🇳🇬 Stay safe. Verify first.
    `;
}

// ========== EDUCATION CONTENT ==========
const redFlagsContent = `🚩 *SCAM RED FLAGS*

URGENCY: "URGENT", "IMMEDIATELY", "ACT NOW"
MONEY: "SEND MONEY", "GIFT CARD", "BITCOIN"
INFO: "PIN", "OTP", "BVN", "CVV"
FAKE: "WINNING", "LOTTERY", "PRINCE"

👥 Join our community: ${COMMUNITY_LINK}`;

const whatToDoContent = `🆘 *YOU'VE BEEN SCAMMED*

1. Contact your bank immediately
2. Save all evidence
3. Report to EFCC: 08093322644
4. Report number to this bot: /report
5. Join our community for support: ${COMMUNITY_LINK}`;

// ========== SCAM DETECTION ==========
function analyzeMessage(text) {
    const alerts = [];
    let riskScore = 0;
    const lowerText = text.toLowerCase();

    const redFlags = ['urgent', 'immediately', 'verify account', 'bank details', 'winning', 'prize', 'lottery', 'inheritance', 'prince', 'activate your card', 'suspended account', 'click here', 'update your profile', 'confirm your pin', 'send money', 'western union', 'gift card', 'bitcoin investment', 'double your money'];
    const sensitiveInfo = ['pin', 'password', 'otp', 'bvn', 'nuban', 'cvv', 'card number', 'atm', 'verification code'];

    redFlags.forEach(flag => {
        if (lowerText.includes(flag)) {
            alerts.push(`⚠️ Suspicious: "${flag}"`);
            riskScore += 10;
        }
    });

    sensitiveInfo.forEach(info => {
        if (lowerText.includes(info)) {
            alerts.push(`🚨 NEVER share your ${info.toUpperCase()}`);
            riskScore += 30;
        }
    });

    if (lowerText.includes('immediately') || lowerText.includes('within 24 hours')) {
        alerts.push("⏰ False urgency tactic");
        riskScore += 15;
    }

    const phonePatterns = [/\+?\d[\d\s\-\(\)]{8,}\d/g];
    for (const pattern of phonePatterns) {
        const matches = text.match(pattern);
        if (matches) {
            for (const number of matches) {
                if (checkNumberInDatabase(number)) {
                    alerts.push(`🚨 ${number} is a REPORTED SCAMMER!`);
                    riskScore += 50;
                }
            }
        }
    }

    let riskLevel, emoji, recommendation;
    if (riskScore >= 40) {
        riskLevel = "HIGH";
        emoji = "🔴";
        recommendation = "DO NOT RESPOND. Block and report!";
    } else if (riskScore >= 20) {
        riskLevel = "MEDIUM";
        emoji = "🟡";
        recommendation = "Be very careful. Verify first.";
    } else {
        riskLevel = "LOW";
        emoji = "🟢";
        recommendation = "No obvious scam indicators.";
    }

    return { riskLevel, emoji, riskScore, alerts, recommendation };
}

// ========== REGISTER ALL PUBLIC COMMANDS ==========

// Basic commands
bot.start((ctx) => ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' }));
bot.command('help', (ctx) => ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' }));
bot.command('myid', (ctx) => ctx.reply(`Your ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' }));
bot.command('community', (ctx) => ctx.reply(`👥 Join: ${COMMUNITY_LINK}`));
bot.command('support', (ctx) => ctx.reply(`💚 *Support:*\nZenith Bank\n4268186069\nJoshua Giwa`, { parse_mode: 'Markdown' }));

// Detection commands
bot.command('check', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    let phoneNumber = parts[1];
    if (!phoneNumber) {
        ctx.reply('📞 *Usage:* `/check 08012345678`', { parse_mode: 'Markdown' });
        return;
    }
    const formattedNumber = phoneNumber.toString().trim();
    const reported = checkNumberInDatabase(formattedNumber);
    let reply = reported ? `🚨 *ALERT!*\n${formattedNumber} is a REPORTED SCAMMER!` : `✅ *CLEAR*\n${formattedNumber} has no reports.`;
    
    if (!reported) {
        const featuredPartner = partnerSystem.getNextFeaturedPartner();
        if (featuredPartner) {
            reply += `\n\n⭐ *Featured Partner*\n${featuredPartner.businessName}\n📞 ${featuredPartner.contact}`;
            const buttons = partnerSystem.getPartnerButtons(featuredPartner);
            if (buttons.length) {
                await ctx.reply(reply, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
                return;
            }
        }
    }
    ctx.reply(reply + `\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
});

bot.command('report', (ctx) => {
    const parts = ctx.message.text.split(' ');
    let phoneNumber = parts[1];
    const reason = parts.slice(2).join(' ') || 'Suspicious activity';
    if (!phoneNumber) {
        ctx.reply('📞 *Usage:* `/report 08012345678 [reason]`', { parse_mode: 'Markdown' });
        return;
    }
    const formattedNumber = phoneNumber.toString().trim();
    if (checkNumberInDatabase(formattedNumber)) {
        ctx.reply(`⚠️ ${formattedNumber} is already reported.`);
        return;
    }
    const result = addScammer(formattedNumber, reason, ctx.from.username || ctx.from.id);
    ctx.reply(`✅ *REPORTED*\n${formattedNumber}\nTotal: ${result.total}`, { parse_mode: 'Markdown' });
});

// Education commands
bot.command('tips', (ctx) => {
    if (dailyTips.length === 0) return ctx.reply('⚠️ No tips yet.');
    const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
    ctx.reply(`${randomTip}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
});

bot.command('scamtypes', (ctx) => {
    const commonScams = getCommonScams();
    if (commonScams.length === 0) return ctx.reply('No scam terms loaded.');
    let message = `📚 *COMMON SCAMS*\n\n`;
    for (const key of commonScams) {
        const term = scamTerms[key];
        if (term) message += `${term.title}\n   ${(term.content || term).split('.')[0]}.\n\n`;
    }
    ctx.reply(message + `👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
});

bot.command('redflags', (ctx) => ctx.reply(redFlagsContent, { parse_mode: 'Markdown' }));
bot.command('whattodo', (ctx) => ctx.reply(whatToDoContent, { parse_mode: 'Markdown' }));

bot.command('whatis', (ctx) => {
    const term = ctx.message.text.split(' ').slice(1).join(' ').toLowerCase();
    if (!term) {
        ctx.reply(`📖 *Usage:* /whatis phishing\n\nAvailable: ${getAllTermKeys().slice(0, 15).join(', ')}`, { parse_mode: 'Markdown' });
        return;
    }
    const data = getTerm(term);
    if (data) ctx.reply(`${data.title}\n\n${data.content}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    else ctx.reply(`❌ "${term}" not found. Try: ${getAllTermKeys().slice(0, 10).join(', ')}`);
});

bot.command('stats', (ctx) => {
    ctx.reply(`📊 *STATS*\nScammers: ${getScammerCount()}\nPartners: ${partnerSystem.getPartnersCount()}\nTips: ${dailyTips.length}\nTerms: ${Object.keys(scamTerms).length}`, { parse_mode: 'Markdown' });
});

// Partner commands
bot.command('partners', async (ctx) => await partnerSystem.handlePartnersCommand(ctx, COMMUNITY_LINK));
bot.command('partner', async (ctx) => await partnerSystem.handlePartnerCommand(ctx, COMMUNITY_LINK, YOUR_ID, bot));

// Register admin commands
registerAdminCommands(bot, YOUR_ID, partnerSystem, dailyTips, scamTerms);

// Register partner admin commands
bot.command('approve', async (ctx) => await partnerSystem.handleApprove(ctx, bot, YOUR_ID));
bot.command('reject', async (ctx) => await partnerSystem.handleReject(ctx, bot, YOUR_ID));
bot.command('verify', async (ctx) => await partnerSystem.handleVerify(ctx, bot, YOUR_ID));
bot.command('find', (ctx) => partnerSystem.handleFind(ctx, YOUR_ID));
bot.command('pending', (ctx) => partnerSystem.handlePending(ctx, YOUR_ID));

// ========== HANDLE PHOTOS (for OCR) ==========
bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.telegram.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    const processingMsg = await ctx.reply('🔍 *Analyzing screenshot...*', { parse_mode: 'Markdown' });
    const extractedText = await ocr.extractTextFromImage(fileUrl, BOT_TOKEN);
    
    if (!extractedText || extractedText.length < 10) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, 
            '⚠️ *Could not read text from this image.*\n\n' +
            '📝 *Better options:*\n' +
            '• Forward the message as TEXT (best)\n' +
            '• Send image as FILE (not photo)\n' +
            '• Make sure text is clear and readable\n\n' +
            `👥 ${COMMUNITY_LINK}`, 
            { parse_mode: 'Markdown' });
        return;
    }
    
    const analysis = analyzeMessage(extractedText);
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK*\n\n`;
    response += `*Text:* ${extractedText.substring(0, 200)}...\n\n`;
    response += `*Findings:* ${analysis.alerts.slice(0, 3).join(', ') || 'None'}\n\n`;
    response += `*Action:* ${analysis.recommendation}\n\n👥 ${COMMUNITY_LINK}`;
    
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    
    // Check for phone numbers
    const phoneMatch = extractedText.match(/0[789][01]\d{8}/g);
    if (phoneMatch) {
        for (const phone of phoneMatch) {
            const reported = checkNumberInDatabase(phone);
            await ctx.reply(`${reported ? '🚨' : '📞'} *Phone found:* ${phone}\n${reported ? '⚠️ REPORTED SCAMMER! Do not engage.' : 'Not reported yet. Still be cautious.'}`, { parse_mode: 'Markdown' });
        }
    }
});

// ========== HANDLE DOCUMENTS/FILES (for OCR) ==========
bot.on('document', async (ctx) => {
    const document = ctx.message.document;
    const mimeType = document.mime_type;
    const fileName = document.file_name || '';
    
    // Only process image files
    if (!mimeType || !mimeType.startsWith('image/')) {
        await ctx.reply('📄 *Please send an image file* (jpg, png) for OCR analysis.\n\nFor text messages, just forward them directly.', { parse_mode: 'Markdown' });
        return;
    }
    
    // Get the file
    const file = await ctx.telegram.getFile(document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    // Send processing message
    const processingMsg = await ctx.reply('🔍 *Analyzing file...*', { parse_mode: 'Markdown' });
    
    // Extract text using OCR
    const extractedText = await ocr.extractTextFromImage(fileUrl, BOT_TOKEN);
    
    if (!extractedText || extractedText.length < 10) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, 
            '⚠️ *Could not read text from this file.*\n\n' +
            '📝 *Better options:*\n' +
            '1️⃣ Forward the suspicious message as TEXT\n' +
            '2️⃣ Type /check [phone number]\n' +
            '3️⃣ Make sure the image has clear, readable text\n\n' +
            `👥 Join our community: ${COMMUNITY_LINK}`, 
            { parse_mode: 'Markdown' });
        return;
    }
    
    // Analyze the extracted text
    const analysis = analyzeMessage(extractedText);
    
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* ${analysis.emoji}\n\n`;
    response += `*Extracted from file:*\n${extractedText.substring(0, 300)}${extractedText.length > 300 ? '...' : ''}\n\n`;
    response += `*Findings:*\n${analysis.alerts.slice(0, 3).join('\n') || 'No obvious scam indicators'}\n\n`;
    response += `*Action:* ${analysis.recommendation}\n\n`;
    response += `👥 *Join our community:* ${COMMUNITY_LINK}`;
    
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    
    // Also check for phone numbers in the extracted text
    const phoneMatch = extractedText.match(/0[789][01]\d{8}/g);
    if (phoneMatch) {
        for (const phone of phoneMatch) {
            const reported = checkNumberInDatabase(phone);
            await ctx.reply(`${reported ? '🚨' : '📞'} *Phone found:* ${phone}\n${reported ? '⚠️ REPORTED SCAMMER! Do not engage.' : 'Not reported yet. Still be cautious.'}`, { parse_mode: 'Markdown' });
        }
    }
});

// ========== AUTO-ANALYZE TEXT MESSAGES ==========
bot.on('text', async (ctx) => {
    const message = ctx.message.text;
    if (message.startsWith('/')) return;
    const analysis = analyzeMessage(message);
    if (analysis.riskScore >= 20) {
        let response = `${analysis.emoji} *${analysis.riskLevel} RISK*\n\n`;
        response += `*Findings:*\n${analysis.alerts.slice(0, 3).join('\n')}\n\n`;
        response += `*Action:* ${analysis.recommendation}\n\n👥 ${COMMUNITY_LINK}`;
        ctx.reply(response, { parse_mode: 'Markdown' });
    }
});

// ========== DAILY TIPS SCHEDULER ==========
async function sendDailyTipToGroup() {
    if (dailyTips.length === 0) return;
    const now = new Date();
    const nigeriaHour = new Date(now.getTime() + 3600000).getUTCHours();
    if (nigeriaHour === 8) {
        const tipIndex = new Date().getDate() % dailyTips.length;
        try {
            await bot.telegram.sendMessage(GROUP_ID, `${dailyTips[tipIndex]}\n\n🇳🇬 Stay safe!`, { parse_mode: 'Markdown' });
            console.log('📰 Daily tip sent');
        } catch (err) { console.log('❌ Tip error:', err.message); }
    }
}
setInterval(sendDailyTipToGroup, 60000);
console.log('⏰ Daily tip scheduler started');

// ========== WEB SERVER ==========
const PORT = process.env.PORT || 3000;
if (process.env.PORT) {
    const express = require('express');
    const app = express();
    app.get('/', (req, res) => res.send('Bot running'));
    app.listen(PORT, () => console.log(`Web server on port ${PORT}`));
    setInterval(() => console.log('🔄 Ping'), 5 * 60000);
}

// ========== LAUNCH ==========
bot.launch().then(() => {
    console.log('========================================');
    console.log('✅ NIGERIA SCAM DETECTOR IS LIVE!');
    console.log(`📊 ${getScammerCount()} scammers reported`);
    console.log(`🤝 ${partnerSystem.getPartnersCount()} partners`);
    console.log(`👥 ${COMMUNITY_LINK}`);
    console.log('========================================');
}).catch(err => { console.error('❌ Launch failed:', err); process.exit(1); });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));