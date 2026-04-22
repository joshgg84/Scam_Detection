// Nigeria Scam Detector Bot - Open Community Version
// Creator: Joshua Giwa
// Community: https://t.me/+8JUqlJ-4SBdlZTM0

const { Telegraf } = require('telegraf');
const fs = require('fs');

try {
    require('dotenv').config();
} catch (err) {
    console.log('No .env file (running on Render)');
}

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found!');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ========== YOUR INFO ==========
const YOUR_ID = 8447414897; // Joshua's Telegram ID
const COMMUNITY_LINK = "https://t.me/+8JUqlJ-4SBdlZTM0";

// ========== DATA FILES ==========
let reportedScammers = [];
try {
    const data = fs.readFileSync('scammers.json', 'utf8');
    reportedScammers = JSON.parse(data);
    console.log(`📚 Loaded ${reportedScammers.length} reported scammers`);
} catch (err) {
    console.log('📝 No scammers yet');
}

function saveScammers() {
    fs.writeFileSync('scammers.json', JSON.stringify(reportedScammers, null, 2));
}

let tipSubscribers = [];
try {
    const tipData = fs.readFileSync('tipsubscribers.json', 'utf8');
    tipSubscribers = JSON.parse(tipData);
    console.log(`📰 Loaded ${tipSubscribers.length} tip subscribers`);
} catch (err) {
    console.log('📝 No tip subscribers yet');
}

function saveTipSubscribers() {
    fs.writeFileSync('tipsubscribers.json', JSON.stringify(tipSubscribers, null, 2));
}

// Education content
const defaultScamTypes = `📚 *COMMON SCAMS IN NIGERIA*

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

👥 Join our community: https://t.me/+8JUqlJ-4SBdlZTM0`;

const defaultRedFlags = `🚩 *SCAM RED FLAGS*

URGENCY: "URGENT", "IMMEDIATELY", "ACT NOW"
MONEY: "SEND MONEY", "GIFT CARD", "BITCOIN"
INFO: "PIN", "OTP", "BVN", "CVV"
FAKE: "WINNING", "LOTTERY", "PRINCE"

If you see these + asking for money = SCAM

👥 Join our community: https://t.me/+8JUqlJ-4SBdlZTM0`;

const defaultWhatToDo = `🆘 *YOU'VE BEEN SCAMMED*

1. Contact your bank immediately
2. Save all evidence
3. Report to EFCC: 08093322644
4. Report number to this bot: /report
5. Join our community for support: https://t.me/+8JUqlJ-4SBdlZTM0`;

const dailyTips = [
    "📚 Never share your OTP with anyone. Banks will NEVER ask for it.",
    "📚 If someone promises to double your money in 24 hours, RUN.",
    "📚 Verify urgent requests by CALLING the person back.",
    "📚 Romance scammers build trust for months before asking for money.",
    "📚 Legitimate jobs never ask for payment to hire you.",
    "📚 Always /check any number before sending money.",
    "📚 Join our community for real-time scam alerts: https://t.me/+8JUqlJ-4SBdlZTM0"
];

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

    const phoneMatch = text.match(/0[789][01]\d{8}/);
    if (phoneMatch) {
        const number = phoneMatch[0];
        if (reportedScammers.includes(number)) {
            alerts.push(`🚨 ${number} is a REPORTED SCAMMER!`);
            riskScore += 50;
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

bot.start((ctx) => {
    ctx.reply(`
🔒 *NIGERIA SCAM DETECTOR* 🔒
*Creator: Joshua Giwa*

I analyze messages and detect scams instantly.

*Commands:*
/check [number] - Check a phone number
/report [number] - Report a scammer
/scamtypes - Learn common scams
/redflags - Words that signal a scam
/whattodo - If you've been scammed
/tips - Security tips
/community - Join our group
/stats - Bot statistics
/help - All commands

*Just forward any suspicious message to me!*

👥 *Join our community:* https://t.me/+8JUqlJ-4SBdlZTM0

🇳🇬 Fighting fraud together!
    `, { parse_mode: 'Markdown' });
});

bot.command('check', (ctx) => {
    const parts = ctx.message.text.split(' ');
    const phoneNumber = parts[1];

    if (!phoneNumber) {
        ctx.reply('📞 Usage: `/check 08012345678`', { parse_mode: 'Markdown' });
        return;
    }

    const isReported = reportedScammers.includes(phoneNumber);

    if (isReported) {
        ctx.reply(`🚨 *ALERT!*\n\nPhone: *${phoneNumber}*\nStatus: *REPORTED SCAMMER* ⚠️\n\n❌ Block immediately\n❌ Do not send money\n\n👥 Join our community for live alerts: https://t.me/+8JUqlJ-4SBdlZTM0`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply(`✅ *CLEAR*\n\nPhone: *${phoneNumber}*\nStatus: *No reports*\n\n⚠️ Still be cautious.\n\nIf this number tries to scam you: /report ${phoneNumber}\n\n👥 Join our community: https://t.me/+8JUqlJ-4SBdlZTM0`, { parse_mode: 'Markdown' });
    }
});

bot.command('report', (ctx) => {
    const parts = ctx.message.text.split(' ');
    const phoneNumber = parts[1];
    const reason = parts.slice(2).join(' ') || 'Suspicious activity';

    if (!phoneNumber) {
        ctx.reply('📞 Usage: `/report 08012345678 [reason]`', { parse_mode: 'Markdown' });
        return;
    }

    if (reportedScammers.includes(phoneNumber)) {
        ctx.reply(`⚠️ ${phoneNumber} is already reported.`);
        return;
    }

    reportedScammers.push(phoneNumber);
    saveScammers();

    ctx.reply(`✅ *REPORT RECORDED*\n\nPhone: ${phoneNumber}\nReason: ${reason}\n\nTotal reports: ${reportedScammers.length}\n\nYou just protected others! 🛡️\n\n👥 Join our community: https://t.me/+8JUqlJ-4SBdlZTM0`, { parse_mode: 'Markdown' });
    console.log(`[REPORT] ${phoneNumber} - ${reason}`);
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

*Click here to join:* https://t.me/+8JUqlJ-4SBdlZTM0

No approval needed. Everyone welcome!

🇳🇬 Together we fight fraud.
    `, { parse_mode: 'Markdown' });
});

bot.command('stats', (ctx) => {
    ctx.reply(`
📊 *STATISTICS*

Reported scammers: ${reportedScammers.length}
Tip subscribers: ${tipSubscribers.length}

👥 Join our community: https://t.me/+8JUqlJ-4SBdlZTM0
    `, { parse_mode: 'Markdown' });
});

bot.command('tips', (ctx) => {
    const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
    ctx.reply(`*SECURITY TIP*\n\n${randomTip}\n\nSubscribe for daily tips: /subscribetips`, { parse_mode: 'Markdown' });
});

bot.command('subscribetips', (ctx) => {
    const userId = ctx.from.id;
    if (!tipSubscribers.includes(userId)) {
        tipSubscribers.push(userId);
        saveTipSubscribers();
        ctx.reply(`✅ Subscribed! You'll get a tip every morning.\n\n👥 Join community: https://t.me/+8JUqlJ-4SBdlZTM0`);
    } else {
        ctx.reply(`ℹ️ You're already subscribed!`);
    }
});

bot.command('unsubscribetips', (ctx) => {
    const userId = ctx.from.id;
    const index = tipSubscribers.indexOf(userId);
    if (index > -1) {
        tipSubscribers.splice(index, 1);
        saveTipSubscribers();
        ctx.reply(`❌ Unsubscribed from daily tips.`);
    } else {
        ctx.reply(`ℹ️ You weren't subscribed.`);
    }
});

bot.command('scamtypes', (ctx) => {
    ctx.reply(defaultScamTypes, { parse_mode: 'Markdown' });
});

bot.command('redflags', (ctx) => {
    ctx.reply(defaultRedFlags, { parse_mode: 'Markdown' });
});

bot.command('whattodo', (ctx) => {
    ctx.reply(defaultWhatToDo, { parse_mode: 'Markdown' });
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

👥 *Better yet, join our community:* https://t.me/+8JUqlJ-4SBdlZTM0
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
        response += `👥 *Join our community for help:* https://t.me/+8JUqlJ-4SBdlZTM0`;

        ctx.reply(response, { parse_mode: 'Markdown' });
    }
});

bot.help((ctx) => {
    ctx.reply(`
📚 *COMMANDS*

/check [number] - Check scammer
/report [number] - Report scammer
/community - Join our group
/scamtypes - Learn common scams
/redflags - Scam warning words
/whattodo - After being scammed
/tips - Security tip
/subscribetips - Daily tips
/stats - Statistics
/support - Support the mission

👥 *Community:* https://t.me/+8JUqlJ-4SBdlZTM0
    `, { parse_mode: 'Markdown' });
});

// Admin commands
bot.command('addvip', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }
    ctx.reply('ℹ️ VIP system is disabled. Everyone is welcome in the community!');
});

bot.command('listscammers', (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }

    if (reportedScammers.length === 0) {
        ctx.reply('No scammers reported yet.');
        return;
    }

    let message = `📋 SCAMMERS (${reportedScammers.length})\n\n`;
    for (let i = 0; i < Math.min(30, reportedScammers.length); i++) {
        message += `${i+1}. ${reportedScammers[i]}\n`;
    }
    ctx.reply(message);
});

// Daily tips function
async function sendDailyTips() {
    const now = new Date();
    const nigeriaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
    const tipIndex = nigeriaTime.getDate() % dailyTips.length;
    const tip = dailyTips[tipIndex];
    
    for (let userId of tipSubscribers) {
        try {
            await bot.telegram.sendMessage(userId, tip, { parse_mode: 'Markdown' });
        } catch (err) {}
    }
    console.log(`Sent tips to ${tipSubscribers.length} users`);
}

// Keep alive for Render
const PORT = process.env.PORT || 3000;
if (process.env.PORT) {
    const express = require('express');
    const app = express();
    app.get('/', (req, res) => res.send('Nigeria Scam Detector Bot is running!'));
    app.listen(PORT, () => console.log(`Web server on port ${PORT}`));
}

// Schedule daily tips at 8am Nigeria time
function scheduleDailyTips() {
    const now = new Date();
    const nigeriaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
    if (nigeriaTime.getHours() === 8) {
        sendDailyTips();
    }
    setTimeout(scheduleDailyTips, 60 * 60 * 1000);
}
scheduleDailyTips();

// Launch
bot.launch().then(() => {
    console.log('========================================');
    console.log('✅ NIGERIA SCAM DETECTOR IS LIVE!');
    console.log('👑 Creator: Joshua Giwa');
    console.log(`📊 ${reportedScammers.length} scammers reported`);
    console.log(`📰 ${tipSubscribers.length} tip subscribers`);
    console.log(`👥 Community: https://t.me/+8JUqlJ-4SBdlZTM0`);
    console.log('========================================');
});

bot.catch((err, ctx) => {
    console.error('Error:', err);
    ctx.reply('⚠️ Error occurred. Try again.');
});

process.once('SIGINT', () => {
    saveScammers();
    saveTipSubscribers();
    bot.stop('SIGINT');
    process.exit();
});

process.once('SIGTERM', () => {
    saveScammers();
    saveTipSubscribers();
    bot.stop('SIGTERM');
    process.exit();
});