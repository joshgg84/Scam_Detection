// Nigeria Scam Detector Bot - Joshua Giwa
const { Telegraf } = require('telegraf');

// Try to load .env locally, but don't fail on Render
try {
    require('dotenv').config();
} catch (err) {
    console.log('No .env file (running on Render)');
}

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found!');
    console.error('Make sure to add BOT_TOKEN in Environment Variables on Render');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const fs = require('fs');

// VIP users database
let vipUsers = [];
try {
    const vipData = fs.readFileSync('vipusers.json', 'utf8');
    vipUsers = JSON.parse(vipData);
    console.log(`👑 Loaded ${vipUsers.length} VIP users`);
} catch (err) {
    console.log('📝 No VIP users yet');
}

function saveVipUsers() {
    fs.writeFileSync('vipusers.json', JSON.stringify(vipUsers, null, 2));
}

// Scammers database
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

// Scam detection
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

// COMMANDS

bot.start((ctx) => {
    ctx.reply(`
🔒 *NIGERIA SCAM DETECTOR* 🔒
*Creator: Joshua Giwa*

Send any suspicious message to analyze it.

*Commands:*
/check [number] - Check a phone number
/report [number] - Report a scammer
/stats - Statistics
/tips - Security tips
/support - Support this bot
/vip - Join VIP community

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
        ctx.reply(`🚨 *ALERT!*\n\n${phoneNumber} is a REPORTED SCAMMER!\n\n❌ Block immediately\n✅ Report to authorities\n\n*Upgrade to VIP:* /vip`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply(`✅ *CLEAR*\n\n${phoneNumber} has no reports.\n\n⚠️ Still be cautious.\n\n*Upgrade to VIP for deep search:* /vip`, { parse_mode: 'Markdown' });
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

    ctx.reply(`✅ *REPORT RECORDED*\n\nPhone: ${phoneNumber}\nReason: ${reason}\n\nTotal reports: ${reportedScammers.length}\n\nThank you for protecting others! 🛡️`, { parse_mode: 'Markdown' });
    console.log(`[REPORT] ${phoneNumber} - ${reason}`);
});

bot.command('stats', (ctx) => {
    ctx.reply(`
📊 *STATISTICS*

Reported scammers: ${reportedScammers.length}
VIP members: ${vipUsers.length}

*Top scams in Nigeria:*
1. Fake bank alerts
2. Employment scams
3. Investment fraud

*Support the mission:* /support
    `, { parse_mode: 'Markdown' });
});

bot.command('tips', (ctx) => {
    const tips = [
        "🔐 Never share your OTP with anyone",
        "💰 10x returns = 100% scam",
        "📞 Verify urgent requests by CALLING back",
        "🏦 Banks never ask for your PIN",
        "💔 Romance scammers build trust for months"
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    ctx.reply(`*SECURITY TIP*\n\n${randomTip}\n\nSend /tips for more`, { parse_mode: 'Markdown' });
});

bot.command('support', (ctx) => {
    ctx.reply(`
💚 *SUPPORT THE MISSION*

Help keep Nigeria safe from scammers.

*Send support to:*

Bank: [YOUR BANK NAME]
Account: [YOUR ACCOUNT NUMBER]
Name: Joshua Giwa

Opay/PalmPay: [YOUR PHONE NUMBER]

*VIP membership:* Send /vip

Any amount matters! 🇳🇬
    `, { parse_mode: 'Markdown' });
});

bot.command('vip', (ctx) => {
    const userId = ctx.from.id;
    const isVip = vipUsers.includes(userId);

    if (isVip) {
        ctx.reply(`👑 *VIP MEMBER*\n\nYou have access to:\n✅ Deep search\n✅ Early alerts\n✅ Private group\n\nThank you for supporting!`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply(`💎 *UPGRADE TO VIP* 💎\n\n*Price:* ₦1,000 (one-time)\n\n*Benefits:*\n🔍 Deep search\n⚡ Early alerts\n👥 Private VIP group\n\n*How to join:*\n1. Send ₦1,000 to:\n   Bank: [YOUR BANK]\n   Account: [YOUR NUMBER]\n2. Send screenshot here\n3. Get VIP access instantly!`, { parse_mode: 'Markdown' });
    }
});

// Auto-analyze messages
bot.on('text', async (ctx) => {
    const message = ctx.message.text;
    if (message.startsWith('/')) return;

    const analysis = analyzeMessage(message);

    if (analysis.riskScore >= 20) {
        let response = `${analysis.emoji} *${analysis.riskLevel} RISK* ${analysis.emoji}\n\n`;
        response += `Score: ${analysis.riskScore}/100\n\n`;
        response += `${analysis.alerts.slice(0, 2).join('\n')}\n\n`;
        response += `*Action:* ${analysis.recommendation}\n\n`;
        response += `🛡️ *${analysis.riskLevel === 'HIGH' ? 'Upgrade to VIP: /vip' : 'Stay safe!'}*`;

        ctx.reply(response, { parse_mode: 'Markdown' });
    }
});

bot.help((ctx) => {
    ctx.reply(`
*COMMANDS*

/start - Welcome
/help - This menu
/check [number] - Check scammer
/report [number] - Report scammer
/stats - Statistics
/tips - Security tips
/support - Donate
/vip - Upgrade
    `, { parse_mode: 'Markdown' });
});

// Admin: Add VIP (only you)
bot.command('addvip', (ctx) => {
    const YOUR_ID = 123456789; // CHANGE THIS TO YOUR TELEGRAM ID

    if (ctx.from.id !== YOUR_ID) {
        ctx.reply('❌ Admin only.');
        return;
    }

    const parts = ctx.message.text.split(' ');
    const userId = parseInt(parts[1]);

    if (!userId) {
        ctx.reply('Usage: /addvip [user_id]\nGet ID from @userinfobot');
        return;
    }

    if (!vipUsers.includes(userId)) {
        vipUsers.push(userId);
        saveVipUsers();
        ctx.reply(`✅ VIP added for user ${userId}`);
    } else {
        ctx.reply(`User ${userId} is already VIP.`);
    }
});

// For Render - keep alive
const PORT = process.env.PORT || 3000;
if (process.env.PORT) {
    const express = require('express');
    const app = express();
    app.get('/', (req, res) => res.send('Bot is running'));
    app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));
}

// Launch
bot.launch().then(() => {
    console.log('========================================');
    console.log('✅ NIGERIA SCAM DETECTOR IS LIVE!');
    console.log('👑 Creator: Joshua Giwa');
    console.log(`📊 ${reportedScammers.length} scammers reported`);
    console.log(`👑 ${vipUsers.length} VIP members`);
    console.log('========================================');
});

bot.catch((err, ctx) => {
    console.error('Error:', err);
    ctx.reply('Error occurred. Try again.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));