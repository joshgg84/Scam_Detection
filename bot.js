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
ACCOUNT: "RENT", "LEASE", "LINKEDIN", "FACEBOOK", "INSTAGRAM"
JOBS: "WORK FROM HOME", "EASY MONEY", "NO EXPERIENCE NEEDED"

👥 Join our community: ${COMMUNITY_LINK}`;

const whatToDoContent = `🆘 *YOU'VE BEEN SCAMMED*

1. Contact your bank immediately
2. Save all evidence
3. Report to EFCC: 08093322644
4. Report number to this bot: /report
5. Join our community for support: ${COMMUNITY_LINK}`;

// ========== ENHANCED SCAM DETECTION ==========
function analyzeMessage(text) {
    const alerts = [];
    let riskScore = 0;
    const lowerText = text.toLowerCase();

    // Comprehensive scam red flags
    const redFlags = [
        // Urgency & money scams
        'urgent', 'immediately', 'verify account', 'bank details', 'winning', 'prize',
        'lottery', 'inheritance', 'prince', 'activate your card', 'suspended account',
        'click here', 'update your profile', 'confirm your pin', 'send money',
        'western union', 'gift card', 'bitcoin investment', 'double your money',
        
        // Account rental / social media scams
        'rent', 'rental', 'linkedin', 'facebook', 'instagram', 'tiktok', 'twitter',
        'account for rent', 'lease account', 'old account', 'aged account',
        'social media account', 'verify account',
        
        // Job scam keywords
        'work from home', 'easy money', 'no experience needed', 'get paid daily',
        'sign up bonus', 'referral bonus', 'commission based', 'passive income',
        
        // Identity theft
        'verify your identity', 'send your id', 'upload your passport', 'nin verification',
        'bvn update', 'account verification needed', 'send your document',
        
        // Fake rental/property
        'deposit now', 'holding fee', 'viewing fee', 'application fee', 'background check fee',
        'refundable deposit', 'key fee', 'admin fee',
        
        // Loan scams
        'loan approval', 'guaranteed loan', 'no credit check', 'instant loan',
        'pay advance fee', 'processing fee', 'loan insurance',
        
        // Investment scams
        'guaranteed returns', 'risk free investment', 'crypto trading', 'forex trading',
        'binary options', 'get rich quick', 'financial freedom'
    ];
    
    const sensitiveInfo = [
        'pin', 'password', 'otp', 'bvn', 'nuban', 'cvv', 'card number',
        'atm', 'verification code', 'passport', 'driver license', 'nin',
        'id card', 'means of identification', 'utility bill', 'statement of account'
    ];

    // Check for red flags
    redFlags.forEach(flag => {
        if (lowerText.includes(flag)) {
            alerts.push(`⚠️ Suspicious: "${flag}"`);
            riskScore += 10;
        }
    });

    // Check for sensitive info requests
    sensitiveInfo.forEach(info => {
        if (lowerText.includes(info)) {
            alerts.push(`🚨 NEVER share your ${info.toUpperCase()}`);
            riskScore += 30;
        }
    });

    // Check for urgency tactics
    const urgencyWords = ['immediately', 'within 24 hours', 'asap', 'right now', 'today only'];
    urgencyWords.forEach(word => {
        if (lowerText.includes(word)) {
            alerts.push("⏰ False urgency tactic");
            riskScore += 15;
        }
    });

    // Check for phone numbers
    const phonePatterns = [/\+?\d[\d\s\-\(\)]{8,}\d/g];
    for (const pattern of phonePatterns) {
        const matches = text.match(pattern);
        if (matches) {
            for (const number of matches) {
                const cleanedNumber = number.replace(/\D/g, '');
                if (cleanedNumber.length >= 10) {
                    if (checkNumberInDatabase(cleanedNumber)) {
                        alerts.push(`🚨 ${cleanedNumber} is a REPORTED SCAMMER!`);
                        riskScore += 50;
                    } else {
                        alerts.push(`📞 Phone number found: ${cleanedNumber}`);
                        riskScore += 5;
                    }
                }
            }
        }
    }

    // Check for links (phishing)
    if (lowerText.includes('http://') || lowerText.includes('https://') || lowerText.includes('.com') || lowerText.includes('.ng')) {
        alerts.push("🔗 Link detected - could be phishing");
        riskScore += 15;
    }

    // Determine risk level
    let riskLevel, emoji, recommendation;
    if (riskScore >= 40) {
        riskLevel = "HIGH";
        emoji = "🔴";
        recommendation = "DO NOT RESPOND. Block and report immediately!";
    } else if (riskScore >= 20) {
        riskLevel = "MEDIUM";
        emoji = "🟡";
        recommendation = "Be very careful. Verify the sender through another channel.";
    } else if (riskScore >= 10) {
        riskLevel = "LOW-MEDIUM";
        emoji = "🟠";
        recommendation = "Some suspicious signs. Proceed with caution.";
    } else {
        riskLevel = "LOW";
        emoji = "🟢";
        recommendation = "No obvious scam indicators, but always stay cautious.";
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
    const extractedText = await ocr.extractTextWithFallbacks(fileUrl, BOT_TOKEN);
    
    if (!extractedText || extractedText.length < 10) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, 
            ocr.getLowQualityHelpMessage(), 
            { parse_mode: 'Markdown' });
        return;
    }
    
    const analysis = analyzeMessage(extractedText);
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
    response += `*Extracted:* ${extractedText.substring(0, 200)}...\n\n`;
    response += `*Findings:* ${analysis.alerts.slice(0, 4).join(', ') || 'None'}\n\n`;
    response += `*Action:* ${analysis.recommendation}\n\n👥 ${COMMUNITY_LINK}`;
    
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    
    // Extract and check phone numbers from the image
    const phoneMatch = extractedText.match(/0[789][01]\d{8}/g);
    if (phoneMatch) {
        for (const phone of phoneMatch) {
            const reported = checkNumberInDatabase(phone);
            await ctx.reply(`${reported ? '🚨' : '📞'} *Phone found in image:* ${phone}\n${reported ? '⚠️ REPORTED SCAMMER! Do not engage.' : 'Not reported yet. Still be cautious.'}`, { parse_mode: 'Markdown' });
        }
    }
});

// ========== HANDLE DOCUMENTS/FILES (for OCR) ==========
bot.on('document', async (ctx) => {
    const document = ctx.message.document;
    const mimeType = document.mime_type;
    
    // Only process image files
    if (!mimeType || !mimeType.startsWith('image/')) {
        await ctx.reply('📄 *Please send an image file* (jpg, png) for OCR analysis.\n\nFor text messages, just forward them directly.', { parse_mode: 'Markdown' });
        return;
    }
    
    const file = await ctx.telegram.getFile(document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    const processingMsg = await ctx.reply('🔍 *Analyzing file...*', { parse_mode: 'Markdown' });
    const extractedText = await ocr.extractTextWithFallbacks(fileUrl, BOT_TOKEN);
    
    if (!extractedText || extractedText.length < 10) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, 
            ocr.getLowQualityHelpMessage(), 
            { parse_mode: 'Markdown' });
        return;
    }
    
    const analysis = analyzeMessage(extractedText);
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
    response += `*Extracted:* ${extractedText.substring(0, 300)}${extractedText.length > 300 ? '...' : ''}\n\n`;
    response += `*Findings:*\n${analysis.alerts.slice(0, 4).join('\n') || 'No obvious scam indicators'}\n\n`;
    response += `*Action:* ${analysis.recommendation}\n\n👥 ${COMMUNITY_LINK}`;
    
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    
    // Extract and check phone numbers from the image
    const phoneMatch = extractedText.match(/0[789][01]\d{8}/g);
    if (phoneMatch) {
        for (const phone of phoneMatch) {
            const reported = checkNumberInDatabase(phone);
            await ctx.reply(`${reported ? '🚨' : '📞'} *Phone found in file:* ${phone}\n${reported ? '⚠️ REPORTED SCAMMER! Do not engage.' : 'Not reported yet. Still be cautious.'}`, { parse_mode: 'Markdown' });
        }
    }
});

// ========== AUTO-ANALYZE TEXT MESSAGES ==========
bot.on('text', async (ctx) => {
    const message = ctx.message.text;
    if (message.startsWith('/')) return;
    
    const analysis = analyzeMessage(message);
    
    // Only respond if risk score is 10 or higher (catches more scams)
    if (analysis.riskScore >= 10) {
        let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
        response += `*Findings:*\n${analysis.alerts.slice(0, 4).join('\n')}\n\n`;
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