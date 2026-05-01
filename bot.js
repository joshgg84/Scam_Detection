// Nigeria Scam Detector Bot - Complete Version
// Creator: Joshua Giwa
// Community: https://t.me/+8JUqlJ-4SBdlZTM0

const { Telegraf } = require('telegraf');
const fs = require('fs');
const { addScammer, getScammerCount, getAllScammers, getRecentScammers } = require('./scammers.js');
const { dailyTips } = require('./tips.js');

// Import Partner System
const partnerSystem = require('./partner.js');

// ========== CONFIGURATION ==========
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found!');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const YOUR_ID = 8447414897;
const COMMUNITY_LINK = "https://t.me/+8JUqlJ-4SBdlZTM0";
const GROUP_ID = -5079110119;

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
            console.log(`📚 Loaded ${Object.keys(scamTerms).length} scam terms from terms.json`);
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
    
    // Exact match
    if (scamTerms[lowerTerm]) {
        return scamTerms[lowerTerm];
    }
    
    // Partial match (e.g., user types "phish" and finds "phishing")
    for (const [key, value] of Object.entries(scamTerms)) {
        if (key.includes(lowerTerm) || lowerTerm.includes(key)) {
            return value;
        }
    }
    return null;
}

function getAllTermKeys() {
    return Object.keys(scamTerms);
}

function getCommonScams() {
    // Order of common scams to display in /scamtypes
    const commonKeys = ['phishing', '419', 'romance scam', 'fake alert', 'investment scam', 'job scam', 'loan scam', 'sim swap', 'otp scam', 'pig butchering'];
    return commonKeys.filter(key => scamTerms[key]);
}

loadTerms();

// ========== STORAGE FILES FOR DOWNLOAD ==========
const STORAGE_FILES = [
    { name: "scammers.json", description: "📋 List of all reported scammers" },
    { name: "scammers.js", description: "⚙️ Scammer database manager code" },
    { name: "tips.js", description: "💡 100+ security tips" },
    { name: "bot.js", description: "🤖 Main bot code" },
    { name: "partner.js", description: "🤝 Partner system module" },
    { name: "partners.json", description: "🏪 Approved partners directory" },
    { name: "pendingPartners.json", description: "⏳ Pending partner registrations" },
    { name: "terms.json", description: "📖 Scam terms dictionary" },
    { name: "package.json", description: "📦 Dependencies list" }
];

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
After that, I respond instantly. Thanks for your patience! 🇳🇬

*Detection Commands:*
/check [number] - Check if a number is reported
/report [number] - Report a scammer

*Education Commands:*
/scamtypes - Learn common scams
/redflags - Words that signal a scam
/whattodo - Steps if you've been scammed
/tips - Get a random security tip
/whatis [term] - Learn scam terms (phishing, 419, etc.)

*Business & Community:*
/partners - Browse trusted businesses
/partner - Register your business
/community - Join our Telegram group
/stats - Bot statistics
/support - Support this free bot

*Admin Commands:*
/adminhelp - Show admin menu

👥 *Join our community:* ${COMMUNITY_LINK}

🇳🇬 Stay safe. Verify first.
    `;
}

function getAdminHelpMessage() {
    return `
👑 *ADMIN COMMANDS*

*Partner Management:*
/approve [user_id] - Approve a partner
/reject [user_id] [reason] - Reject a partner
/verify [user_id] - Verify payment for featured partner
/find [name] - Find user by name or username
/pending - View all pending registrations

*Tip Management:*
/viewtips - View all tips
/viewtips list - List first 20 tips
/viewtips [number] - View specific tip
/addtip [text] - Add a new tip
/edittip [number] [text] - Edit a tip
/deletetip [number] - Delete a tip

*Database Management:*
/listscammers - View all reported scammers
/recent - View last 10 scammers
/download - Download backup files

*Your Info:*
Admin ID: ${YOUR_ID}

*Stats:*
Approved partners: ${partnerSystem.getPartnersCount()}
Pending registrations: ${partnerSystem.getPendingCount()}
Total tips: ${dailyTips.length}
Total scam terms: ${Object.keys(scamTerms).length}
    `;
}

// ========== EDUCATION CONTENT ==========
const redFlagsContent = `🚩 *SCAM RED FLAGS*

URGENCY: "URGENT", "IMMEDIATELY", "ACT NOW"
MONEY: "SEND MONEY", "GIFT CARD", "BITCOIN"
INFO: "PIN", "OTP", "BVN", "CVV"
FAKE: "WINNING", "LOTTERY", "PRINCE"

If you see these + asking for money = SCAM

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

// ========== PUBLIC COMMANDS ==========

bot.start((ctx) => {
    ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' });
});

bot.command('help', (ctx) => {
    ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' });
});

bot.command('adminhelp', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }
    ctx.reply(getAdminHelpMessage(), { parse_mode: 'Markdown' });
});

bot.command('myid', (ctx) => {
    ctx.reply(`Your Telegram ID is: \`${ctx.from.id}\`\n\nShare this with admin if needed.`, { parse_mode: 'Markdown' });
});

bot.command('check', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    let phoneNumber = parts[1];

    if (!phoneNumber) {
        ctx.reply('📞 *Usage:* `/check 08012345678`\n\n*Any phone number format accepted*', { parse_mode: 'Markdown' });
        return;
    }

    const formattedNumber = phoneNumber.toString().trim();
    const reported = checkNumberInDatabase(formattedNumber);

    let reply = '';
    
    if (reported) {
        reply = `🚨 *ALERT!*\n\nPhone: *${formattedNumber}*\nStatus: *REPORTED SCAMMER* ⚠️\n\n❌ Block immediately\n❌ Do not send money\n\n`;
    } else {
        reply = `✅ *CLEAR*\n\nPhone: *${formattedNumber}*\nStatus: *No reports*\n\n⚠️ Still be cautious.\n\nIf this number tries to scam you: /report ${formattedNumber}\n\n`;
    }
    
    if (!reported) {
        const featuredPartner = partnerSystem.getNextFeaturedPartner();
        if (featuredPartner) {
            reply += `\n⭐ *Featured Partner*\n${featuredPartner.businessName} — ${featuredPartner.description ? featuredPartner.description.substring(0, 60) : 'Trusted business'}\n📞 ${featuredPartner.contact}\n\n`;
            
            const buttons = partnerSystem.getPartnerButtons(featuredPartner);
            if (buttons.length > 0) {
                await ctx.reply(reply, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: buttons }
                });
                return;
            }
        }
    }
    
    reply += `👥 Join our community: ${COMMUNITY_LINK}`;
    ctx.reply(reply, { parse_mode: 'Markdown' });
});

bot.command('report', (ctx) => {
    const parts = ctx.message.text.split(' ');
    let phoneNumber = parts[1];
    const reason = parts.slice(2).join(' ') || 'Suspicious activity';
    const reporter = ctx.from.username || ctx.from.id.toString();
    
    if (!phoneNumber) {
        ctx.reply('📞 *Usage:* `/report 08012345678 [reason]`\n\n*Any phone number format accepted*', { parse_mode: 'Markdown' });
        return;
    }
    
    const formattedNumber = phoneNumber.toString().trim();
    
    if (checkNumberInDatabase(formattedNumber)) {
        ctx.reply(`⚠️ *Already Reported*\n\n${formattedNumber} is already in our scammer database.`, { parse_mode: 'Markdown' });
        return;
    }
    
    const result = addScammer(formattedNumber, reason, reporter);
    ctx.reply(`✅ *REPORT RECORDED*\n\nPhone: *${formattedNumber}*\nReason: ${reason}\n\nTotal reports: ${result.total}\n\nYou just protected others! 🛡️\n\n👥 Join our community: ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    console.log(`[REPORT] ${formattedNumber} - ${reason} - By: ${reporter}`);
});

bot.command('community', (ctx) => {
    ctx.reply(`
👥 *NIGERIA SECURITY HUB*

Join our Telegram community for:
✅ Live scam alerts
✅ Ask "Is this a scam?" anytime
✅ Share your experience
✅ Get help if scammed

*Click here to join:* ${COMMUNITY_LINK}

No approval needed. Everyone welcome!

🇳🇬 Together we fight fraud.
    `, { parse_mode: 'Markdown' });
});

bot.command('stats', (ctx) => {
    const scammerCount = getScammerCount();
    ctx.reply(`
📊 *STATISTICS*

Reported scammers: ${scammerCount}
Approved partners: ${partnerSystem.getPartnersCount()}
Pending registrations: ${partnerSystem.getPendingCount()}
Total tips: ${dailyTips.length}
Scam terms available: ${Object.keys(scamTerms).length}
Community members: Growing daily!

👥 Join our community: ${COMMUNITY_LINK}
    `, { parse_mode: 'Markdown' });
});

bot.command('tips', (ctx) => {
    if (dailyTips.length === 0) {
        ctx.reply(`⚠️ No tips available yet. Admin will add soon.\n\n👥 ${COMMUNITY_LINK}`);
        return;
    }
    const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
    ctx.reply(`${randomTip}\n\n👥 Join our community for daily tips: ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
});

// ========== SCAMTYPES COMMAND (uses terms.json) ==========
bot.command('scamtypes', (ctx) => {
    const commonScams = getCommonScams();
    
    if (commonScams.length === 0) {
        ctx.reply(`📚 *COMMON SCAMS IN NIGERIA*\n\nNo scam terms loaded. Admin please check terms.json file.\n\n👥 Join our community: ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
        return;
    }
    
    let message = `📚 *COMMON SCAMS IN NIGERIA*\n\n`;
    
    for (const scamKey of commonScams) {
        const term = scamTerms[scamKey];
        if (term) {
            const title = term.title || `📖 ${scamKey.toUpperCase()}`;
            const content = term.content || term;
            // Get first sentence only for the list (up to 80 chars)
            const shortContent = content.split('.')[0] + '.';
            message += `${title}\n   ${shortContent.substring(0, 80)}...\n\n`;
        }
    }
    
    message += `📖 *Learn more:* /whatis [term]\n`;
    message += `👥 Join our community: ${COMMUNITY_LINK}`;
    
    ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('redflags', (ctx) => {
    ctx.reply(redFlagsContent, { parse_mode: 'Markdown' });
});

bot.command('whattodo', (ctx) => {
    ctx.reply(whatToDoContent, { parse_mode: 'Markdown' });
});

// ========== WHATIS COMMAND (uses terms.json) ==========
bot.command('whatis', (ctx) => {
    const args = ctx.message.text.split(' ');
    const term = args.slice(1).join(' ').toLowerCase();
    
    if (!term) {
        const termList = getAllTermKeys().slice(0, 15).join(', ');
        ctx.reply(`
📖 *WHAT IS? - USAGE*

Type /whatis [term] to learn scam-related terms.

*Examples:*
/whatis phishing
/whatis 419
/whatis yahoo boy
/whatis romance scam

*Available terms (${getAllTermKeys().length} total):*
${termList}...

👥 Join our community: ${COMMUNITY_LINK}
        `, { parse_mode: 'Markdown' });
        return;
    }
    
    const termData = getTerm(term);
    
    if (termData) {
        ctx.reply(`
${termData.title || `📖 *${term.toUpperCase()}*`}

${termData.content || termData}

👥 Join our community: ${COMMUNITY_LINK}
        `, { parse_mode: 'Markdown' });
    } else {
        ctx.reply(`
❓ *"${term}" not found in scam dictionary.*

Try: ${getAllTermKeys().slice(0, 10).join(', ')}

👥 Join our community: ${COMMUNITY_LINK}
        `, { parse_mode: 'Markdown' });
    }
});

bot.command('support', (ctx) => {
    ctx.reply(`
💚 *SUPPORT THE MISSION*

This bot is free forever. But running costs money.

*Send support to:*

🏦 *Zenith Bank*
Account: 4268186069
Name: Joshua Giwa

Any amount helps! 🇳🇬

👥 *Join our community:* ${COMMUNITY_LINK}
    `, { parse_mode: 'Markdown' });
});

// ========== PARTNER COMMANDS (from partner.js) ==========
bot.command('partners', async (ctx) => {
    await partnerSystem.handlePartnersCommand(ctx, COMMUNITY_LINK);
});

bot.command('partner', async (ctx) => {
    await partnerSystem.handlePartnerCommand(ctx, COMMUNITY_LINK, YOUR_ID, bot);
});

// ========== ADMIN PARTNER COMMANDS ==========
bot.command('approve', async (ctx) => {
    await partnerSystem.handleApprove(ctx, bot, YOUR_ID);
});

bot.command('reject', async (ctx) => {
    await partnerSystem.handleReject(ctx, bot, YOUR_ID);
});

bot.command('verify', async (ctx) => {
    await partnerSystem.handleVerify(ctx, bot, YOUR_ID);
});

bot.command('find', (ctx) => {
    partnerSystem.handleFind(ctx, YOUR_ID);
});

bot.command('pending', (ctx) => {
    partnerSystem.handlePending(ctx, YOUR_ID);
});

// ========== ADMIN TIP MANAGEMENT COMMANDS ==========

bot.command('viewtips', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }

    const args = ctx.message.text.split(' ');
    
    if (args.length === 1) {
        ctx.reply(`
💡 *TIP MANAGEMENT*

Total tips: ${dailyTips.length}

*Commands:*
/viewtips list - Show first 20 tips
/viewtips all - Show all tips
/viewtips [number] - View tip #1, #2, etc.
/addtip [text] - Add a new tip
/edittip [number] [new text] - Edit a tip
/deletetip [number] - Delete a tip
        `, { parse_mode: 'Markdown' });
        return;
    }
    
    const subCommand = args[1].toLowerCase();
    
    if (subCommand === 'list') {
        let message = `💡 *TIPS (first 20 of ${dailyTips.length})*\n\n`;
        for (let i = 0; i < Math.min(20, dailyTips.length); i++) {
            let tipText = dailyTips[i].replace(/📚 \*TODAY'S TIP\*\n\n/g, '').substring(0, 50);
            message += `${i+1}. ${tipText}...\n`;
        }
        ctx.reply(message, { parse_mode: 'Markdown' });
        return;
    }
    
    if (subCommand === 'all') {
        if (dailyTips.length === 0) {
            ctx.reply(`⚠️ No tips available.`);
            return;
        }
        
        let message = `💡 *ALL TIPS (${dailyTips.length})*\n\n`;
        let chunks = [];
        let currentChunk = message;
        
        for (let i = 0; i < dailyTips.length; i++) {
            let tipText = dailyTips[i].replace(/📚 \*TODAY'S TIP\*\n\n/g, '').substring(0, 60);
            let line = `${i+1}. ${tipText}...\n`;
            if ((currentChunk + line).length > 4000) {
                chunks.push(currentChunk);
                currentChunk = line;
            } else {
                currentChunk += line;
            }
        }
        chunks.push(currentChunk);
        
        for (let chunk of chunks) {
            ctx.reply(chunk, { parse_mode: 'Markdown' });
        }
        return;
    }
    
    const tipNumber = parseInt(args[1]);
    if (!isNaN(tipNumber) && tipNumber >= 1 && tipNumber <= dailyTips.length) {
        const tip = dailyTips[tipNumber - 1];
        ctx.reply(`💡 *TIP #${tipNumber}*\n\n${tip}\n\n*To edit:* /edittip ${tipNumber} [new text]`, { parse_mode: 'Markdown' });
        return;
    }
    
    ctx.reply(`❌ Invalid. Use /viewtips list or /viewtips [1-${dailyTips.length}]`);
});

bot.command('addtip', async (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }

    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) {
        ctx.reply('📝 *Usage:* `/addtip Your new security tip here`\n\nTip will automatically get the 📚 *TODAY\'S TIP* prefix.', { parse_mode: 'Markdown' });
        return;
    }

    const newTipText = parts.slice(1).join(' ');
    const formattedTip = `📚 *TODAY'S TIP*\n\n${newTipText}`;
    
    dailyTips.push(formattedTip);
    
    const tipsContent = `// Nigeria Scam Detector - Daily Tips Database\n// Updated by admin on ${new Date().toLocaleString()}\n\nconst dailyTips = ${JSON.stringify(dailyTips, null, 4)};\n\nmodule.exports = { dailyTips };\n`;
    
    try {
        fs.writeFileSync('tips.js', tipsContent);
        ctx.reply(`✅ *TIP ADDED*\n\nTip #${dailyTips.length}: ${newTipText.substring(0, 100)}${newTipText.length > 100 ? '...' : ''}\n\nTotal tips: ${dailyTips.length}`, { parse_mode: 'Markdown' });
        console.log(`📝 Admin added tip #${dailyTips.length}`);
    } catch (err) {
        ctx.reply(`❌ Failed to save: ${err.message}`);
    }
});

bot.command('edittip', async (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }

    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) {
        ctx.reply('📝 *Usage:* `/edittip 5 Your new tip text here`', { parse_mode: 'Markdown' });
        return;
    }

    const tipNumber = parseInt(parts[1]);
    if (isNaN(tipNumber) || tipNumber < 1 || tipNumber > dailyTips.length) {
        ctx.reply(`❌ Invalid tip number. Tips range from 1 to ${dailyTips.length}.`);
        return;
    }

    const newTipText = parts.slice(2).join(' ');
    const formattedTip = `📚 *TODAY'S TIP*\n\n${newTipText}`;
    const oldTip = dailyTips[tipNumber - 1];
    
    dailyTips[tipNumber - 1] = formattedTip;
    
    const tipsContent = `// Nigeria Scam Detector - Daily Tips Database\n// Updated by admin on ${new Date().toLocaleString()}\n\nconst dailyTips = ${JSON.stringify(dailyTips, null, 4)};\n\nmodule.exports = { dailyTips };\n`;
    
    try {
        fs.writeFileSync('tips.js', tipsContent);
        ctx.reply(`✅ *TIP #${tipNumber} UPDATED*\n\n*Old:* ${oldTip.substring(0, 80)}...\n\n*New:* ${newTipText.substring(0, 80)}...`, { parse_mode: 'Markdown' });
        console.log(`📝 Admin edited tip #${tipNumber}`);
    } catch (err) {
        ctx.reply(`❌ Failed to save: ${err.message}`);
    }
});

bot.command('deletetip', async (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }

    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) {
        ctx.reply('📝 *Usage:* `/deletetip 5`', { parse_mode: 'Markdown' });
        return;
    }

    const tipNumber = parseInt(parts[1]);
    if (isNaN(tipNumber) || tipNumber < 1 || tipNumber > dailyTips.length) {
        ctx.reply(`❌ Invalid tip number. Tips range from 1 to ${dailyTips.length}.`);
        return;
    }

    const deletedTip = dailyTips[tipNumber - 1];
    dailyTips.splice(tipNumber - 1, 1);
    
    const tipsContent = `// Nigeria Scam Detector - Daily Tips Database\n// Updated by admin on ${new Date().toLocaleString()}\n\nconst dailyTips = ${JSON.stringify(dailyTips, null, 4)};\n\nmodule.exports = { dailyTips };\n`;
    
    try {
        fs.writeFileSync('tips.js', tipsContent);
        ctx.reply(`✅ *TIP #${tipNumber} DELETED*\n\nDeleted: ${deletedTip.substring(0, 100)}...\n\nTotal tips remaining: ${dailyTips.length}`, { parse_mode: 'Markdown' });
        console.log(`📝 Admin deleted tip #${tipNumber}`);
    } catch (err) {
        ctx.reply(`❌ Failed to save: ${err.message}`);
    }
});

// ========== ADMIN DATABASE COMMANDS ==========

bot.command('listscammers', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }

    const scammers = getAllScammers();
    
    if (scammers.length === 0) {
        ctx.reply('📋 No scammers reported yet.');
        return;
    }

    let message = `📋 *REPORTED SCAMMERS (${scammers.length})*\n\n`;
    for (let i = 0; i < Math.min(30, scammers.length); i++) {
        message += `${i+1}. ${scammers[i]}\n`;
    }
    
    if (scammers.length > 30) {
        message += `\n...and ${scammers.length - 30} more.`;
    }
    
    ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('recent', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }

    const recent = getRecentScammers(10);
    
    if (recent.length === 0) {
        ctx.reply('No scammers reported yet.');
        return;
    }

    let message = `📋 *RECENT SCAMMERS (last ${recent.length})*\n\n`;
    for (let i = 0; i < recent.length; i++) {
        message += `${i+1}. ${recent[i]}\n`;
    }
    
    ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('download', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only command.');
        return;
    }

    const args = ctx.message.text.split(' ');
    if (args.length === 1) {
        let message = `📁 *AVAILABLE FILES FOR DOWNLOAD*\n\n`;
        for (let i = 0; i < STORAGE_FILES.length; i++) {
            message += `${i+1}. ${STORAGE_FILES[i].name}\n   └ ${STORAGE_FILES[i].description}\n\n`;
        }
        message += `*Usage:* /download [number or filename]\n\n`;
        message += `*Examples:*\n`;
        message += `/download 1\n`;
        message += `/download partners.json`;
        ctx.reply(message, { parse_mode: 'Markdown' });
        return;
    }

    const query = args[1];
    
    let selectedFile = null;
    if (!isNaN(query)) {
        const index = parseInt(query) - 1;
        if (index >= 0 && index < STORAGE_FILES.length) {
            selectedFile = STORAGE_FILES[index].name;
        }
    } else {
        const match = STORAGE_FILES.find(f => f.name === query);
        if (match) selectedFile = match.name;
    }

    if (!selectedFile) {
        ctx.reply(`❌ File not found. Use /download to see available files.`);
        return;
    }

    try {
        if (!fs.existsSync(selectedFile)) {
            ctx.reply(`❌ ${selectedFile} does not exist yet. It will be created when data is saved.`);
            return;
        }

        ctx.replyWithDocument({ source: selectedFile }, {
            caption: `📄 *${selectedFile}*\n📅 ${new Date().toLocaleString()}\n🤖 @JoshuaGiwaBot`,
            parse_mode: 'Markdown'
        });
        console.log(`📥 Admin downloaded: ${selectedFile}`);
    } catch (err) {
        ctx.reply(`❌ Error: ${err.message}`);
    }
});

// ========== AUTO-ANALYZE MESSAGES ==========
bot.on('text', async (ctx) => {
    const message = ctx.message.text;
    if (message.startsWith('/')) return;

    const analysis = analyzeMessage(message);

    if (analysis.riskScore >= 20) {
        let response = `${analysis.emoji} *${analysis.riskLevel} RISK* ${analysis.emoji}\n\n`;
        response += `*Findings:*\n${analysis.alerts.slice(0, 3).join('\n')}\n\n`;
        response += `*Action:* ${analysis.recommendation}\n\n`;
        response += `👥 *Join our community for help:* ${COMMUNITY_LINK}`;

        ctx.reply(response, { parse_mode: 'Markdown' });
    }
});

// ========== DAILY TIPS TO GROUP ==========
async function sendDailyTipToGroup() {
    if (dailyTips.length === 0) {
        console.log('⚠️ No tips available to send');
        return;
    }
    
    const today = new Date();
    const nigeriaTime = new Date(today.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
    const dayOfMonth = nigeriaTime.getDate();
    const tipIndex = (dayOfMonth - 1) % dailyTips.length;
    const todaysTip = dailyTips[tipIndex];
    
    const message = `${todaysTip}\n\n🇳🇬 Stay safe! Report scammers to @JoshuaGiwaBot`;
    
    try {
        await bot.telegram.sendMessage(GROUP_ID, message, { parse_mode: 'Markdown' });
        console.log(`📰 Daily tip sent to group at ${nigeriaTime.toLocaleTimeString()}`);
    } catch (err) {
        console.log(`❌ Failed to send tip to group: ${err.message}`);
    }
}

function scheduleDailyTip() {
    const now = new Date();
    const nigeriaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
    const currentHour = nigeriaTime.getHours();
    const currentMinute = nigeriaTime.getMinutes();
    
    if (currentHour === 8 && currentMinute === 0) {
        sendDailyTipToGroup();
    }
    
    setTimeout(scheduleDailyTip, 60 * 1000);
}

scheduleDailyTip();
console.log('⏰ Daily tip scheduler started - will send to group at 8am Nigeria time');

// ========== CALLBACK QUERIES ==========
bot.action(/partner_register/, async (ctx) => {
    await partnerSystem.handlePartnerCallback(ctx, COMMUNITY_LINK);
});

// ========== WEB SERVER FOR HEALTH CHECKS ==========
const PORT = process.env.PORT || 3000;
if (process.env.PORT) {
    const express = require('express');
    const app = express();
    app.get('/', (req, res) => res.send('Nigeria Scam Detector Bot is running!'));
    app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));
}

// ========== PING SYSTEM ==========
if (process.env.PORT) {
    setInterval(() => {
        console.log(`🔄 Self-ping at ${new Date().toLocaleTimeString()}`);
    }, 5 * 60 * 1000);
    console.log("⏰ Ping system active - pinging every 5 minutes");
}

// ========== CLEAN START ==========
bot.telegram.deleteWebhook().then(() => {
    console.log('✅ Webhook deleted, starting fresh');
}).catch(err => {
    console.log('No webhook to delete');
});

// ========== LAUNCH ==========
bot.launch().then(() => {
    console.log('========================================');
    console.log('✅ NIGERIA SCAM DETECTOR IS LIVE!');
    console.log('👑 Creator: Joshua Giwa');
    console.log(`📊 ${getScammerCount()} scammers reported`);
    console.log(`🤝 ${partnerSystem.getPartnersCount()} partners approved`);
    console.log(`💡 ${dailyTips.length} security tips loaded`);
    console.log(`📚 ${Object.keys(scamTerms).length} scam terms loaded`);
    console.log(`👥 Community: ${COMMUNITY_LINK}`);
    console.log('========================================');
}).catch((err) => {
    console.error('❌ LAUNCH FAILED:', err);
    process.exit(1);
});

// ========== ERROR HANDLERS ==========
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ UNHANDLED REJECTION:', err);
});

bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('⚠️ Error occurred. Try again.');
});

process.once('SIGINT', () => {
    console.log('🛑 Bot shutting down...');
    bot.stop('SIGINT');
    process.exit();
});

process.once('SIGTERM', () => {
    console.log('🛑 Bot shutting down...');
    bot.stop('SIGTERM');
    process.exit();
});