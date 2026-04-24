// Nigeria Scam Detector Bot - Complete Version
// Creator: Joshua Giwa
// Community: https://t.me/+8JUqlJ-4SBdlZTM0

const { Telegraf } = require('telegraf');
const fs = require('fs');
const { addScammer, isScammer, getScammerCount, getAllScammers, getRecentScammers } = require('./scammers.js');
const { dailyTips } = require('./tips.js');

// Get token from environment variable (set in Render)
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found!');
    console.error('Add BOT_TOKEN in Render Environment Variables');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ========== YOUR INFO ==========
const YOUR_ID = 8447414897; // Joshua's Telegram ID
const COMMUNITY_LINK = "https://t.me/+8JUqlJ-4SBdlZTM0";
const GROUP_ID = -5079110119; // Nigeria Security Hub group ID

// ========== STORAGE FILES FOR DOWNLOAD ==========
const STORAGE_FILES = [
    { name: "scammers.json", description: "📋 List of all reported scammers" },
    { name: "scammers.js", description: "⚙️ Scammer database manager code" },
    { name: "tips.js", description: "💡 100+ security tips" },
    { name: "bot.js", description: "🤖 Main bot code" },
    { name: "package.json", description: "📦 Dependencies list" }
];

// ========== DATA FILES ==========
// Note: tipsubscribers.json is no longer used. Tips go to group only.
let tipSubscribers = []; // Kept for compatibility, but not used
function saveTipSubscribers() {} // Empty function

// ========== PHONE NUMBER HANDLING (Accepts Everything) ==========
// Check if a number is in the scammer database (any format works)
function checkNumberInDatabase(phoneNumber) {
    const scammers = getAllScammers();
    // Remove all non-digits for comparison
    const cleaned = phoneNumber.toString().replace(/\D/g, '');
    
    if (cleaned.length === 0) return false;
    
    return scammers.some(scammer => {
        const scammerCleaned = scammer.toString().replace(/\D/g, '');
        return scammerCleaned === cleaned;
    });
}

// ========== HELP MESSAGE (Reused for /start and /help) ==========
function getHelpMessage() {
    return `
📚 *NIGERIA SCAM DETECTOR - HELP*

*Creator:* Joshua Giwa

*Detection Commands:*
/check [number] - Check if a number is reported
/report [number] - Report a scammer

*Education Commands:*
/scamtypes - Learn common scams in Nigeria
/redflags - Words that signal a scam
/whattodo - Steps if you've been scammed
/tips - Get a random security tip

*Community Commands:*
/community - Join our Telegram group
/stats - Bot statistics

*Other Commands:*
/support - Support this free bot
/start - Show this menu
/help - Show this menu

*How to use:*
1. Forward any suspicious message to me
2. I'll analyze it and show the risk level
3. Report scammers to protect others

*Any phone number format works!* (international, spaces, dashes, etc.)

👥 *Join our community:* ${COMMUNITY_LINK}

🇳🇬 Stay safe. Verify first.
    `;
}

// ========== EDUCATION CONTENT ==========
const scamTypesContent = `📚 *COMMON SCAMS IN NIGERIA*

*1. Fake Bank Alerts* 🏦
Wait for money to reflect in your balance, not just SMS.

*2. Employment Scams* 💼
Legit jobs never ask for payment.

*3. Romance Scams* 💔
Never send money to someone you haven't met.

*4. Investment Scams* 📈
If it sounds too good to be true, it is.

*5. Phishing Links* 🔗
Never click links in suspicious messages.

👥 Join our community: ${COMMUNITY_LINK}`;

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

    // Look for phone numbers in various formats
    const phonePatterns = [
        /\+?\d[\d\s\-\(\)]{8,}\d/g  // Catches any phone number pattern
    ];
    
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

// ========== COMMANDS ==========

// Start command - Shows help message
bot.start((ctx) => {
    ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' });
});

// Help command - Same as start
bot.command('help', (ctx) => {
    ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' });
});

bot.command('check', (ctx) => {
    const parts = ctx.message.text.split(' ');
    let phoneNumber = parts[1];

    if (!phoneNumber) {
        ctx.reply('📞 *Usage:* `/check 08012345678`\n\n*Any phone number format accepted*', { parse_mode: 'Markdown' });
        return;
    }

    const formattedNumber = phoneNumber.toString().trim();
    const reported = checkNumberInDatabase(formattedNumber);

    if (reported) {
        ctx.reply(`🚨 *ALERT!*\n\nPhone: *${formattedNumber}*\nStatus: *REPORTED SCAMMER* ⚠️\n\n❌ Block immediately\n❌ Do not send money\n\n👥 Join our community: ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply(`✅ *CLEAR*\n\nPhone: *${formattedNumber}*\nStatus: *No reports*\n\n⚠️ Still be cautious.\n\nIf this number tries to scam you: /report ${formattedNumber}\n\n👥 Join our community: ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    }
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
✅ Connect with others

*Click here to join:* ${COMMUNITY_LINK}

No approval needed. Everyone welcome!

🇳🇬 Together we fight fraud.
    `, { parse_mode: 'Markdown' });
});
bot.command('howtoreport', (ctx) => {
    ctx.reply(`
📢 *HOW TO REPORT A SCAM*

*Option 1: Forward the message*
1. Press and hold the suspicious message
2. Tap "Forward"
3. Send to @JoshuaGiwaBot
4. Bot analyzes it instantly

*Option 2: Copy and paste*
1. Copy the suspicious text
2. Paste it here
3. Bot will analyze it

*Option 3: Report phone number*
/report 08012345678 [reason]

*What happens after you report:*
✅ Number goes into our database
✅ Others are protected when they /check
✅ You help fight fraud in Nigeria

👥 Join our community: ${COMMUNITY_LINK}
    `, { parse_mode: 'Markdown' });
});

bot.command('stats', (ctx) => {
    const scammerCount = getScammerCount();
    ctx.reply(`
📊 *STATISTICS*

Reported scammers: ${scammerCount}

👥 Join our community: ${COMMUNITY_LINK}
    `, { parse_mode: 'Markdown' });
});

bot.command('tips', (ctx) => {
    const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
    ctx.reply(`*SECURITY TIP*\n\n${randomTip}\n\n👥 Join our community for daily tips: ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
});

bot.command('scamtypes', (ctx) => {
    ctx.reply(scamTypesContent, { parse_mode: 'Markdown' });
});

bot.command('redflags', (ctx) => {
    ctx.reply(redFlagsContent, { parse_mode: 'Markdown' });
});

bot.command('whattodo', (ctx) => {
    ctx.reply(whatToDoContent, { parse_mode: 'Markdown' });
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

// Auto-analyze messages
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

// ========== ADMIN ONLY COMMANDS ==========

// Command: /download - Show available files
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
        message += `/download scammers.json`;
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

// Command: /listscammers - Show all reported scammers
bot.command('listscammers', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }

    const scammers = getAllScammers();
    
    if (scammers.length === 0) {
        ctx.reply('No scammers reported yet.');
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

// Command: /viewtips - Show all tips
bot.command('viewtips', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only command.');
        return;
    }

    const args = ctx.message.text.split(' ');
    
    // /viewtips - Show summary
    if (args.length === 1) {
        let message = `💡 *TIPS DATABASE*\n\n`;
        message += `Total tips: ${dailyTips.length}\n`;
        message += `Tips are sent daily at 8am to the group.\n\n`;
        message += `*Commands:*\n`;
        message += `/viewtips list - Show all tips\n`;
        message += `/viewtips [number] - Show tip #1, #2, etc.\n`;
        message += `/edittip [number] [new text] - Edit a tip\n`;
        message += `/addtip [new tip] - Add a new tip\n`;
        message += `/deletetip [number] - Delete a tip`;
        
        ctx.reply(message, { parse_mode: 'Markdown' });
        return;
    }
    
    // /viewtips list - Show all tips (paginated)
    if (args[1] === 'list') {
        let allTips = "";
        for (let i = 0; i < dailyTips.length; i++) {
            let tipText = dailyTips[i].replace(/📚 \*TODAY'S TIP\*\n\n/g, '').substring(0, 50);
            allTips += `${i+1}. ${tipText}...\n`;
        }
        
        // Split into multiple messages if too long
        const chunks = allTips.match(/[\s\S]{1,3800}/g) || [];
        
        ctx.reply(`💡 *ALL TIPS (${dailyTips.length})*\n\n${chunks[0]}`, { parse_mode: 'Markdown' });
        
        for (let i = 1; i < chunks.length; i++) {
            ctx.reply(chunks[i], { parse_mode: 'Markdown' });
        }
        return;
    }
    
    // /viewtips [number] - Show specific tip
    const tipNumber = parseInt(args[1]);
    if (!isNaN(tipNumber) && tipNumber >= 1 && tipNumber <= dailyTips.length) {
        const tip = dailyTips[tipNumber - 1];
        ctx.reply(`💡 *TIP #${tipNumber}*\n\n${tip}\n\n*To edit:* /edittip ${tipNumber} [new text]`, { parse_mode: 'Markdown' });
        return;
    }
    
    ctx.reply(`❌ Invalid. Use /viewtips list or /viewtips [1-${dailyTips.length}]`);
});

// Command: /edittip [number] [new text] - Edit a tip
bot.command('edittip', async (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only command.');
        return;
    }

    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) {
        ctx.reply('📝 *Usage:* `/edittip 5 Your new tip text here`\n\n*Example:* `/edittip 3 Never share your OTP with anyone!`', { parse_mode: 'Markdown' });
        return;
    }

    const tipNumber = parseInt(parts[1]);
    if (isNaN(tipNumber) || tipNumber < 1 || tipNumber > dailyTips.length) {
        ctx.reply(`❌ Invalid tip number. Tips range from 1 to ${dailyTips.length}. Use /viewtips to see all.`);
        return;
    }

    const newTip = parts.slice(2).join(' ');
    
    // Store old tip for confirmation
    const oldTip = dailyTips[tipNumber - 1];
    
    // Update the tip
    dailyTips[tipNumber - 1] = newTip;
    
    // Save to tips.js file
    const fs = require('fs');
    const tipsContent = `// Nigeria Scam Detector - Daily Tips Database\n// Updated by admin on ${new Date().toLocaleString()}\n\nconst dailyTips = ${JSON.stringify(dailyTips, null, 4)};\n\nmodule.exports = { dailyTips };\n`;
    
    try {
        fs.writeFileSync('tips.js', tipsContent);
        ctx.reply(`✅ *TIP #${tipNumber} UPDATED*\n\n*Old:* ${oldTip.substring(0, 100)}...\n\n*New:* ${newTip.substring(0, 100)}...\n\nChanges saved to tips.js`, { parse_mode: 'Markdown' });
        console.log(`📝 Admin edited tip #${tipNumber}`);
    } catch (err) {
        ctx.reply(`❌ Failed to save: ${err.message}`);
    }
});

// Command: /addtip [new tip] - Add a new tip
bot.command('addtip', async (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only command.');
        return;
    }

    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) {
        ctx.reply('📝 *Usage:* `/addtip Your new security tip here`\n\n*Example:* `/addtip Never share your BVN with anyone online`', { parse_mode: 'Markdown' });
        return;
    }

    const newTip = parts.slice(1).join(' ');
    
    // Add to array
    dailyTips.push(newTip);
    
    // Save to tips.js file
    const fs = require('fs');
    const tipsContent = `// Nigeria Scam Detector - Daily Tips Database\n// Updated by admin on ${new Date().toLocaleString()}\n\nconst dailyTips = ${JSON.stringify(dailyTips, null, 4)};\n\nmodule.exports = { dailyTips };\n`;
    
    try {
        fs.writeFileSync('tips.js', tipsContent);
        ctx.reply(`✅ *NEW TIP ADDED*\n\nTip #${dailyTips.length}: ${newTip}\n\nTotal tips: ${dailyTips.length}\n\n*To edit:* /edittip ${dailyTips.length} [new text]`, { parse_mode: 'Markdown' });
        console.log(`📝 Admin added new tip #${dailyTips.length}`);
    } catch (err) {
        ctx.reply(`❌ Failed to save: ${err.message}`);
    }
});

// Command: /deletetip [number] - Delete a tip
bot.command('deletetip', async (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only command.');
        return;
    }

    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) {
        ctx.reply('📝 *Usage:* `/deletetip 5`\n\n*Example:* `/deletetip 3`\n\nUse /viewtips to see tip numbers.', { parse_mode: 'Markdown' });
        return;
    }

    const tipNumber = parseInt(parts[1]);
    if (isNaN(tipNumber) || tipNumber < 1 || tipNumber > dailyTips.length) {
        ctx.reply(`❌ Invalid tip number. Tips range from 1 to ${dailyTips.length}. Use /viewtips to see all.`);
        return;
    }

    const deletedTip = dailyTips[tipNumber - 1];
    
    // Remove the tip
    dailyTips.splice(tipNumber - 1, 1);
    
    // Save to tips.js file
    const fs = require('fs');
    const tipsContent = `// Nigeria Scam Detector - Daily Tips Database\n// Updated by admin on ${new Date().toLocaleString()}\n\nconst dailyTips = ${JSON.stringify(dailyTips, null, 4)};\n\nmodule.exports = { dailyTips };\n`;
    
    try {
        fs.writeFileSync('tips.js', tipsContent);
        ctx.reply(`✅ *TIP #${tipNumber} DELETED*\n\nDeleted tip: ${deletedTip.substring(0, 100)}...\n\nTotal tips remaining: ${dailyTips.length}`, { parse_mode: 'Markdown' });
        console.log(`📝 Admin deleted tip #${tipNumber}`);
    } catch (err) {
        ctx.reply(`❌ Failed to save: ${err.message}`);
    }
});

// Command: /tipsbackup - Download tips.js file
bot.command('tipsbackup', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only command.');
        return;
    }

    try {
        if (!fs.existsSync('tips.js')) {
            ctx.reply('❌ tips.js file not found.');
            return;
        }

        ctx.replyWithDocument({ source: 'tips.js' }, {
            caption: `💡 *TIPS BACKUP*\n📅 ${new Date().toLocaleString()}\n📊 Total tips: ${dailyTips.length}\n🤖 @JoshuaGiwaBot`,
            parse_mode: 'Markdown'
        });
        console.log(`📥 Admin downloaded tips backup`);
    } catch (err) {
        ctx.reply(`❌ Error: ${err.message}`);
    }
});

// Command: /recent - Show last 10 reported scammers
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

// ========== DAILY TIPS (Send to Group Only) ==========

// Function to send daily tip to group
async function sendDailyTipToGroup() {
    // Get today's tip based on date
    const today = new Date();
    const nigeriaTime = new Date(today.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
    const dayOfMonth = nigeriaTime.getDate();
    const tipIndex = (dayOfMonth - 1) % dailyTips.length;
    const todaysTip = dailyTips[tipIndex];
    
    const message = `🔐 *DAILY SECURITY TIP* 🔐\n\n${todaysTip}\n\n🇳🇬 Stay safe! Report scammers to @JoshuaGiwaBot`;
    
    try {
        await bot.telegram.sendMessage(GROUP_ID, message, { parse_mode: 'Markdown' });
        console.log(`📰 Daily tip sent to group at ${nigeriaTime.toLocaleTimeString()}`);
    } catch (err) {
        console.log(`❌ Failed to send tip to group: ${err.message}`);
    }
}

// Schedule: Check every minute, send at 8:00 AM Nigeria time
function scheduleDailyTip() {
    const now = new Date();
    const nigeriaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
    const currentHour = nigeriaTime.getHours();
    const currentMinute = nigeriaTime.getMinutes();
    
    // Send at 8:00 AM
    if (currentHour === 8 && currentMinute === 0) {
        sendDailyTipToGroup();
    }
    
    // Check again in 60 seconds
    setTimeout(scheduleDailyTip, 60 * 1000);
}

// Start the scheduler
scheduleDailyTip();
console.log('⏰ Daily tip scheduler started - will send to group at 8am Nigeria time');

bot.command('adminhelp', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }
    
    ctx.reply(`
👑 *ADMIN COMMANDS*

*Tip Management:*
/viewtips - Show tip menu
/viewtips list - List all tips
/viewtips [number] - View specific tip
/edittip [number] [text] - Edit a tip
/addtip [text] - Add a new tip
/deletetip [number] - Delete a tip
/tipsbackup - Download tips.js file

*Database Management:*
/download - Download storage files
/listscammers - View all scammers
/recent - View last 10 scammers

*Bot Management:*
/adminhelp - Show this menu
    `, { parse_mode: 'Markdown' });
});

// ========== KEEP RENDER AWAKE (Ping every 5 minutes) ==========

// Simple web server for Render health checks
const PORT = process.env.PORT || 3000;
if (process.env.PORT) {
    const express = require('express');
    const app = express();
    app.get('/', (req, res) => res.send('Nigeria Scam Detector Bot is running!'));
    app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));
}

// Function to ping silently every 5 minutes
async function pingSelf() {
    const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    setInterval(async () => {
        try {
            // Silent ping - just logs to console
            console.log(`🔄 Self-ping at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
            console.log("❌ Self-ping failed:", err.message);
        }
    }, PING_INTERVAL);
}

// Start ping system only on Render
if (process.env.PORT) {
    pingSelf();
    console.log("⏰ Ping system active - pinging every 5 minutes to prevent sleep");
}

// ========== CLEAN START (Prevent 409 Conflict) ==========
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
    console.log(`👥 Community: ${COMMUNITY_LINK}`);
    console.log(`📰 Daily tips will be sent to group at 8am Nigeria time`);
    console.log('⏰ Ping system active every 5 minutes');
    console.log('========================================');
}).catch((err) => {
    console.error('❌ LAUNCH FAILED:', err);
    process.exit(1);
});

// Global error handlers
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