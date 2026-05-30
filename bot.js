// Nigeria Scam Detector Bot - Main Bot File
// Creator: Joshua Giwa (Det. jai)
// Community: https://t.me/+8JUqlJ-4SBdlZTM0

const { Telegraf } = require('telegraf');
const fs = require('fs');

// Import modules
const partnerSystem = require('./partner.js');
const ocr = require('./ocr.js');
const linkModule = require('./links.js');
const detection = require('./detection.js');
const referralSystem = require('./referrals.js');
const { registerAdminCommands } = require('./admin.js');
const { getScammerCount, getAllScammers, getRecentScammers, reportNumber, submitPlea } = require('./scammers.js');
const { dailyTips } = require('./tips.js');

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

// Store users who want to give testimonial
let awaitingTestimonial = {};

// Initialize Partner System
partnerSystem.initPartnerSystem();

// ========== VALID COMMANDS FOR CASE CHECK ==========
const validCommands = [
    'start', 'help', 'myid', 'community', 'support',
    'checknumber', 'cn', 'checkmsg', 'cm',
    'checklink', 'report', 'reportlink',
    'referral', 'leaderboard', 'myreferrals', 'plea',
    'scamtypes', 'redflags', 'whattodo', 'tips', 'whatis',
    'stats', 'partners', 'partner',
    'testtip', 'adminhelp', 'listscammers', 'scammers', 'recent', 'download',
    'addtrusted', 'removetrusted', 'listtrusted',
    'pending', 'verify', 'reject', 'userstats', 'userreports',
    'pleas', 'approveplea', 'rejectplea', 'allpleas',
    'listlinks', 'deletelink', 'addwhitelist', 'removewhitelist', 'linkstats'
];

// ========== CASE-SENSITIVE COMMAND HANDLER ==========
bot.use((ctx, next) => {
    const message = ctx.message?.text;
    if (message && message.startsWith('/')) {
        const originalCommand = message.split(' ')[0].slice(1);
        const lowerCommand = originalCommand.toLowerCase();
        
        if (originalCommand !== lowerCommand && validCommands.includes(lowerCommand)) {
            ctx.reply(`
⚠️ *Case-Sensitive Command*

Did you mean *${lowerCommand}*?

Commands are case-sensitive. Please use lowercase letters.

Example: *${lowerCommand}* ${message.split(' ').slice(1).join(' ')}

Type /help to see all commands.
            `, { parse_mode: 'Markdown' });
            return;
        }
    }
    return next();
});

// ========== HELPER FUNCTIONS ==========
function getHelpMessage() {
    return `
📚 *NIGERIA SCAM DETECTOR - HELP*

*Creator:* Joshua Giwa (Det. jai)

⏰ *Note:* First message may take 30-50 seconds to wake me up.
After that, I respond instantly. Thanks for your patience! 🇳🇬

⚠️ *Commands are case-sensitive.* Please use lowercase letters.
Example: /checknumber 08012345678 (not /CHECKNUMBER)

📞 *Check a phone number:*
/checknumber 08012345678

📝 *Check a suspicious message:*
/checkmsg [paste the suspicious message here]

*Shortcuts:*
/cn 08012345678 - Same as /checknumber
/cm [message] - Same as /checkmsg

*Other Commands:*
/report [number] [reason] - Report a scammer
/checklink [url] - Check if a link is a scam
/reportlink [url] [reason] - Report a scam link
/referral - Get your unique referral link
/leaderboard - View top inviters
/myreferrals - Check your referral stats
/plea [number] [reason] - Request removal from scammer list

*Education:*
/scamtypes - Learn common scams
/redflags - Scam warning words
/whattodo - Steps after being scammed
/tips - Random security tip
/whatis [term] - Learn scam terms

*Business:*
/partners - Browse trusted businesses
/partner - Partner program info
/community - Join our Telegram group
/stats - Bot statistics

👥 *Community:* ${COMMUNITY_LINK}

🇳🇬 Stay safe. Always VERIFY before you trust.
    `;
}

// ========== TESTIMONIAL COLLECTION FUNCTIONS ==========
async function askForTestimonial(ctx, type, details) {
    const userId = ctx.from.id;
    awaitingTestimonial[userId] = { type: type, details: details };
    
    const buttons = {
        inline_keyboard: [
            [
                { text: "✅ Yes, it helped me", callback_data: "give_testimonial" },
                { text: "❌ No, not helpful", callback_data: "no_testimonial" }
            ]
        ]
    };
    
    await ctx.reply("🤝 *Was this helpful?*\n\nYour feedback helps me improve the bot and protect more Nigerians.", {
        parse_mode: 'Markdown',
        reply_markup: buttons
    });
}

// ========== TELEGRAM BOT COMMANDS ==========

// Basic commands
bot.start(async (ctx) => {
    const args = ctx.message.text.split(' ');
    const startParam = args[1];
    
    if (startParam && startParam.startsWith('ref_')) {
        const referrerId = startParam.split('_')[1];
        const newUserId = ctx.from.id;
        const newUsername = ctx.from.username || ctx.from.first_name;
        
        await referralSystem.handleReferralStart(ctx, referrerId, newUserId, newUsername);
        return;
    }
    
    if (startParam === 'referral') {
        await referralSystem.handleReferralCommand(ctx);
        return;
    }
    
    ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' });
});

bot.command('help', (ctx) => ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' }));
bot.command('myid', (ctx) => ctx.reply(`Your ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' }));
bot.command('community', (ctx) => ctx.reply(`👥 Join: ${COMMUNITY_LINK}`));
bot.command('support', (ctx) => ctx.reply(`💚 *Support:*\nZenith Bank\n4268186069\nJoshua Giwa`, { parse_mode: 'Markdown' }));

// Check number command
bot.command('checknumber', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        ctx.reply(`📞 *Usage:* /checknumber 08012345678`, { parse_mode: 'Markdown' });
        return;
    }
    
    const phoneNumber = args[1];
    const phoneMatch = phoneNumber.match(/0[789][01]\d{8}/);
    
    if (!phoneMatch) {
        ctx.reply('❌ Invalid phone number format. Please use a valid Nigerian number like 08012345678', { parse_mode: 'Markdown' });
        return;
    }
    
    const formattedNumber = phoneMatch[0];
    const reported = detection.checkNumberInDatabase(formattedNumber);
    const userId = ctx.from.id;
    
    let resultText = reported 
        ? `🚨 *ALERT!*\n${formattedNumber} is a REPORTED SCAMMER!\n\n❌ Do not send money\n❌ Block immediately`
        : `✅ *CLEAR*\n${formattedNumber} has no reports.\n\n⚠️ Still be cautious.`;
    
    const sponsor = partnerSystem.getCheckSponsorMessage();
    if (sponsor && !reported) {
        resultText += `\n\n📢 *Sponsored by ${sponsor.businessName}*\n${sponsor.message}`;
    }
    
    const referralResult = referralSystem.addReferralSectionToCheck(resultText, userId, 0);
    
    await ctx.reply(referralResult.fullText, {
        parse_mode: 'Markdown',
        reply_markup: referralResult.buttons
    });
    
    await askForTestimonial(ctx, 'phone', formattedNumber);
});

// Shortcut for checknumber
bot.command('cn', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        ctx.reply('📞 Usage: /cn 08012345678', { parse_mode: 'Markdown' });
        return;
    }
    ctx.message.text = '/checknumber ' + args.slice(1).join(' ');
    await bot.commands.get('checknumber')(ctx);
});

// Check message command
bot.command('checkmsg', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        ctx.reply(`📝 *Usage:* /checkmsg [suspicious message]`, { parse_mode: 'Markdown' });
        return;
    }
    
    const input = args.slice(1).join(' ');
    const userId = ctx.from.id;
    
    const analysisResult = await detection.analyzeMessageWithLinks(input, linkModule);
    const analysis = analysisResult.analysis;
    const linkWarnings = analysisResult.linkWarnings;
    
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
    response += `*📝 Message:*\n${input.substring(0, 300)}${input.length > 300 ? '...' : ''}\n\n`;
    
    if (analysis.alerts.length > 0) {
        response += `*🔍 WHY THIS IS SUSPICIOUS:*\n${analysis.alerts.slice(0, 5).join('\n')}\n\n`;
    }
    
    for (const warning of linkWarnings) {
        if (warning.type === 'reported') {
            response += `🚨 *REPORTED SCAM LINK:* \`${warning.url}\`\n   Reason: ${warning.reason}\n   ⚠️ DO NOT CLICK!\n\n`;
        }
    }
    
    response += `*✅ WHAT YOU SHOULD DO:*\n${analysis.recommendation}\n\n`;
    
    const referralResult = referralSystem.addReferralSectionToCheck(response, userId, analysis.riskScore);
    
    await ctx.reply(referralResult.fullText, {
        parse_mode: 'Markdown',
        reply_markup: referralResult.buttons
    });
    
    await askForTestimonial(ctx, 'message', input.substring(0, 50));
});

// Shortcut for checkmsg
bot.command('cm', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        ctx.reply('📝 Usage: /cm [suspicious message]', { parse_mode: 'Markdown' });
        return;
    }
    ctx.message.text = '/checkmsg ' + args.slice(1).join(' ');
    await bot.commands.get('checkmsg')(ctx);
});

// Link check command
bot.command('checklink', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        ctx.reply(`🔗 *Usage:* /checklink [url]`, { parse_mode: 'Markdown' });
        return;
    }
    
    const url = args[1];
    const analysis = linkModule.analyzeLink(url);
    const reported = linkModule.checkLink(url);
    
    let response = `🔗 *LINK ANALYSIS*\n\nURL: \`${url}\`\n\n`;
    
    if (reported) {
        response += `🚨 *⚠️ SCAM LINK DETECTED!*\n\n*Reason:* ${reported.reason}\n❌ DO NOT click this link!\n`;
    } else if (analysis.riskScore >= 30) {
        response += `🟡 *SUSPICIOUS LINK*\n\n*Risk Score:* ${analysis.riskScore}/100\n*Reasons:*\n${analysis.reasons.slice(0, 3).join('\n')}\n\n⚠️ Be very careful.\n`;
    } else {
        response += `🟢 *LINK APPEARS SAFE*\n\nNo scam reports for this link.\n⚠️ Still be cautious.\n`;
    }
    
    response += `\n📞 *To report this link:* /reportlink ${url} [reason]\n👥 ${COMMUNITY_LINK}`;
    
    await ctx.reply(response, { parse_mode: 'Markdown' });
    await askForTestimonial(ctx, 'link', url);
});

// Report command
bot.command('report', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    let phoneNumber = parts[1];
    const reason = parts.slice(2).join(' ') || 'Suspicious activity';
    
    if (!phoneNumber) {
        ctx.reply('📞 *Usage:* `/report 08012345678 [reason]`', { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const formattedNumber = phoneNumber.toString().trim();
    
    const result = await reportNumber(formattedNumber, userId, reason);
    
    if (result.success) {
        ctx.reply(`✅ *REPORTED*\n${formattedNumber}\n${result.message}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
        
        if (result.status === 'verified') {
            await bot.telegram.sendMessage(YOUR_ID, `🚨 *NUMBER VERIFIED AS SCAMMER*\n\n📞 ${formattedNumber}\n📊 Total scammers: ${result.total}\n📝 Reason: ${reason}\n👤 Reported by: @${username}`);
        }
    } else {
        ctx.reply(`❌ ${result.message}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    }
});

// Report link command
bot.command('reportlink', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        ctx.reply(`🔗 *Usage:* /reportlink [url] [reason]`, { parse_mode: 'Markdown' });
        return;
    }
    
    const url = args[1];
    const reason = args.slice(2).join(' ') || 'Suspicious link';
    const reporter = ctx.from.username || ctx.from.id.toString();
    
    const result = linkModule.reportLink(url, reason, reporter);
    
    if (result.success) {
        ctx.reply(`✅ *LINK REPORTED!*\n\nURL: \`${url}\`\nReason: ${reason}\nTotal reported links: ${result.total}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
        await bot.telegram.sendMessage(YOUR_ID, `🔗 *NEW SCAM LINK REPORTED*\n\nURL: ${url}\nReason: ${reason}\nReported by: @${ctx.from.username || reporter}`);
    } else {
        ctx.reply(`⚠️ *Link already reported*\n\nURL: \`${url}\`\nReason: ${result.existing.reason}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    }
});

// Plea command
bot.command('plea', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        ctx.reply(`📝 *PLEA COMMAND*\n\nUsage: /plea 08012345678 I am a legitimate business`, { parse_mode: 'Markdown' });
        return;
    }
    
    const phoneNumber = args[1];
    const reason = args.slice(2).join(' ') || 'No reason provided';
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 8 || cleaned.length > 14) {
        ctx.reply('❌ Invalid phone number format.');
        return;
    }
    
    const result = submitPlea(cleaned, userId, username, reason);
    await ctx.reply(result.message, { parse_mode: 'Markdown' });
    
    if (result.success && result.status === 'submitted') {
        await bot.telegram.sendMessage(YOUR_ID, `
📋 *NEW PLEA SUBMITTED*

🆔 ID: ${result.pleaId}
📞 Number: ${cleaned}
👤 User: @${username} (${userId})
💬 Reason: ${reason}

/approveplea ${result.pleaId}
/rejectplea ${result.pleaId} [reason]
        `, { parse_mode: 'Markdown' });
    }
});

// Referral commands
bot.command('referral', async (ctx) => { await referralSystem.handleReferralCommand(ctx); });
bot.command('leaderboard', async (ctx) => { await referralSystem.handleLeaderboardCommand(ctx); });
bot.command('myreferrals', async (ctx) => { await referralSystem.handleMyReferralsCommand(ctx); });

// Partners commands
bot.command('partners', async (ctx) => {
    try {
        await partnerSystem.handlePartnersCommand(ctx, COMMUNITY_LINK);
    } catch (err) {
        ctx.reply(`🤝 *PARTNERS DIRECTORY*\n\nNo partners yet. Be the first!\nContact @JoshuaGiwa to register.\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    }
});

bot.command('partner', (ctx) => {
    ctx.reply(`
🤝 *PARTNER PROGRAM*

*Standard Partner* - ₦11,000/month
✅ Business contact in /partners
✅ "⭐ Standard Partner" badge
✅ Featured in daily tips
✅ FREE 3-week trial

*Premium Partner* - ₦17,000/month
✅ Everything in Standard
✅ "💎 Premium Partner" badge
✅ Sponsorship in /check responses
✅ FREE 1-week trial

*Register:* Contact @JoshuaGiwa
WhatsApp: 09025839789

👥 ${COMMUNITY_LINK}
    `, { parse_mode: 'Markdown' });
});

// Education commands
bot.command('tips', (ctx) => {
    if (dailyTips.length === 0) return ctx.reply('⚠️ No tips yet.');
    const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
    ctx.reply(`${randomTip}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
});

bot.command('scamtypes', (ctx) => {
    const commonScams = detection.getCommonScams();
    if (commonScams.length === 0) return ctx.reply('No scam terms loaded.');
    let message = `📚 *COMMON SCAMS*\n\n`;
    for (const key of commonScams.slice(0, 8)) {
        const term = detection.scamTerms[key];
        if (term) message += `${term.title}\n   ${(term.content || term).split('.')[0]}.\n\n`;
    }
    ctx.reply(message + `👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
});

bot.command('redflags', (ctx) => ctx.reply(detection.redFlagsContent, { parse_mode: 'Markdown' }));
bot.command('whattodo', (ctx) => ctx.reply(detection.whatToDoContent, { parse_mode: 'Markdown' }));

bot.command('whatis', (ctx) => {
    const term = ctx.message.text.split(' ').slice(1).join(' ').toLowerCase();
    if (!term) {
        ctx.reply(`📖 *Usage:* /whatis phishing\n\nAvailable: ${detection.getAllTermKeys().slice(0, 15).join(', ')}`, { parse_mode: 'Markdown' });
        return;
    }
    const data = detection.getTerm(term);
    if (data) ctx.reply(`${data.title}\n\n${data.content}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    else ctx.reply(`❌ "${term}" not found. Try: ${detection.getAllTermKeys().slice(0, 10).join(', ')}`);
});

bot.command('stats', (ctx) => {
    ctx.reply(`📊 *STATS*\nScammers: ${getScammerCount()}\nLinks: ${linkModule.getReportedLinkCount()}\nPartners: ${partnerSystem.getPartnersCount()}\nTips: ${dailyTips.length}\nTerms: ${Object.keys(detection.scamTerms).length}`, { parse_mode: 'Markdown' });
});

// Register admin commands
registerAdminCommands(bot, YOUR_ID, partnerSystem, dailyTips, detection.scamTerms, linkModule);

// ========== TELEGRAM MEDIA HANDLERS ==========
bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.telegram.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    const processingMsg = await ctx.reply('🔍 *Analyzing screenshot...*', { parse_mode: 'Markdown' });
    const extractedText = await ocr.extractTextWithFallbacks(fileUrl, BOT_TOKEN);
    
    if (!extractedText || extractedText.length < 10) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, 
            ocr.getLowQualityHelpMessage(), { parse_mode: 'Markdown' });
        return;
    }
    
    const analysisResult = await detection.analyzeMessageWithLinks(extractedText, linkModule);
    const analysis = analysisResult.analysis;
    
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
    response += `*Extracted:* ${extractedText.substring(0, 200)}...\n\n`;
    response += `*Findings:* ${analysis.alerts.slice(0, 4).join(', ') || 'None'}\n\n`;
    response += `*Action:* ${analysis.recommendation}\n\n👥 ${COMMUNITY_LINK}`;
    
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    
    const phoneMatch = extractedText.match(/0[789][01]\d{8}/g);
    if (phoneMatch) {
        for (const phone of phoneMatch) {
            const reported = detection.checkNumberInDatabase(phone);
            await ctx.reply(`${reported ? '🚨' : '📞'} *Phone found:* ${phone}\n${reported ? '⚠️ REPORTED SCAMMER!' : 'Not reported yet.'}`, { parse_mode: 'Markdown' });
        }
    }
    
    await askForTestimonial(ctx, 'image', extractedText.substring(0, 50));
});

bot.on('document', async (ctx) => {
    const document = ctx.message.document;
    const mimeType = document.mime_type;
    
    if (!mimeType || !mimeType.startsWith('image/')) {
        await ctx.reply('📄 *Please send an image file* (jpg, png) for OCR analysis.', { parse_mode: 'Markdown' });
        return;
    }
    
    const file = await ctx.telegram.getFile(document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    const processingMsg = await ctx.reply('🔍 *Analyzing file...*', { parse_mode: 'Markdown' });
    const extractedText = await ocr.extractTextWithFallbacks(fileUrl, BOT_TOKEN);
    
    if (!extractedText || extractedText.length < 10) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, 
            ocr.getLowQualityHelpMessage(), { parse_mode: 'Markdown' });
        return;
    }
    
    const analysisResult = await detection.analyzeMessageWithLinks(extractedText, linkModule);
    const analysis = analysisResult.analysis;
    
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
    response += `*Extracted:* ${extractedText.substring(0, 300)}${extractedText.length > 300 ? '...' : ''}\n\n`;
    response += `*Findings:*\n${analysis.alerts.slice(0, 4).join('\n') || 'No obvious scam indicators'}\n\n`;
    response += `*Action:* ${analysis.recommendation}\n\n👥 ${COMMUNITY_LINK}`;
    
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    
    const phoneMatch = extractedText.match(/0[789][01]\d{8}/g);
    if (phoneMatch) {
        for (const phone of phoneMatch) {
            const reported = detection.checkNumberInDatabase(phone);
            await ctx.reply(`${reported ? '🚨' : '📞'} *Phone found:* ${phone}\n${reported ? '⚠️ REPORTED SCAMMER!' : 'Not reported yet.'}`, { parse_mode: 'Markdown' });
        }
    }
    
    await askForTestimonial(ctx, 'file', extractedText.substring(0, 50));
});

// ========== TEXT MESSAGE HANDLER ==========
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const message = ctx.message.text;
    
    if (message.startsWith('/')) return;
    
    if (awaitingTestimonial[userId] && awaitingTestimonial[userId].ready) {
        const testimonial = message.trim();
        const data = awaitingTestimonial[userId];
        
        const adminMsg = `
📝 *NEW TESTIMONIAL*

👤 *User:* @${data.username || 'unknown'} (ID: ${userId})
🔍 *After checking:* ${data.type || 'unknown'}
📄 *Details:* ${data.details || 'N/A'}

💬 *Testimonial:*
"${testimonial}"

📅 ${new Date().toLocaleString()}
        `;
        
        await bot.telegram.sendMessage(YOUR_ID, adminMsg, { parse_mode: 'Markdown' });
        await ctx.reply("✅ *Thank you for your testimonial!*\n\n🙏 God bless you.", { parse_mode: 'Markdown' });
        
        const shareButtons = {
            inline_keyboard: [[{ text: "📢 Share This Bot", callback_data: "share_bot" }]]
        };
        await ctx.reply("🤝 *Help Others Stay Safe*\n\nShare this bot with your family and friends.", {
            parse_mode: 'Markdown',
            reply_markup: shareButtons
        });
        
        delete awaitingTestimonial[userId];
        return;
    }
    
    const analysis = detection.analyzeMessage(message);
    if (analysis.riskScore >= 10) {
        let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
        response += `*Findings:*\n${analysis.alerts.slice(0, 4).join('\n')}\n\n`;
        response += `*Action:* ${analysis.recommendation}\n\n👥 ${COMMUNITY_LINK}`;
        await ctx.reply(response, { parse_mode: 'Markdown' });
        await askForTestimonial(ctx, 'auto_message', message.substring(0, 50));
    }
});

// ========== API GATEWAY FOR WEBSITE ==========
const express = require('express');
const apiApp = express();
const API_PORT = process.env.API_PORT || 3001;

apiApp.use(express.json());

// ========== HANDLERS FOR API GATEWAY ==========

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
    
    const result = await reportNumber(phoneNumber, userId || 'website_user', reason);
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

async function handleHelp() {
    return `📚 *DETECTIVE JAI - COMMANDS*\n\n📞 /checknumber 08012345678\n📝 /checkmsg [message]\n🔗 /checklink [url]\n📢 /report [number] [reason]\n🔍 /search [digits]\n📊 /stats\n\n🆓 Free forever.`;
}

async function handleStats() {
    return `📊 *STATS*\nScammers reported: ${getScammerCount()}\n🆓 Free forever\n🇳🇬 Protecting Nigerians`;
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

// ========== SINGLE GATEWAY ENDPOINT ==========
apiApp.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`📨 Gateway: ${message.substring(0, 50)}...`);
    
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
        console.error('Gateway error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
apiApp.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), scammers: getScammerCount() });
});

// Start API server
apiApp.listen(API_PORT, () => {
    console.log(`🔗 API Gateway running on port ${API_PORT}`);
    console.log(`   POST /api/chat - Single endpoint for website`);
    console.log(`   GET  /health - Health check`);
});

// ========== DAILY TIPS SCHEDULER ==========
let lastTipDate = null;

async function sendDailyTipToGroup() {
    if (dailyTips.length === 0) return;
    
    const now = new Date();
    const nigeriaTime = new Date(now.getTime() + 3600000);
    const currentHour = nigeriaTime.getUTCHours();
    const currentDate = nigeriaTime.toDateString();
    
    if (currentHour === 8 && lastTipDate !== currentDate) {
        const dayOfMonth = nigeriaTime.getUTCDate();
        const tipIndex = (dayOfMonth - 1) % dailyTips.length;
        let todaysTip = dailyTips[tipIndex];
        
        const sponsorMessage = partnerSystem.getDailyTipSponsorMessage();
        if (sponsorMessage) todaysTip += sponsorMessage;
        
        const message = `${todaysTip}\n\n🇳🇬 Stay safe! Report scammers to @Det_jai_bot`;
        
        try {
            await bot.telegram.sendMessage(GROUP_ID, message, { parse_mode: 'Markdown' });
            console.log(`📰 Daily tip sent`);
            lastTipDate = currentDate;
        } catch (err) {
            console.log(`❌ Failed to send tip: ${err.message}`);
        }
    }
}

setInterval(sendDailyTipToGroup, 60 * 1000);
console.log('⏰ Daily tip scheduler started');

bot.command('testtip', async (ctx) => {
    if (ctx.from.id !== YOUR_ID) return ctx.reply('❌ Admin only.');
    const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
    try {
        await bot.telegram.sendMessage(GROUP_ID, `${randomTip}\n\n🧪 *TEST*`, { parse_mode: 'Markdown' });
        ctx.reply('✅ Test tip sent');
    } catch (err) {
        ctx.reply(`❌ Failed: ${err.message}`);
    }
});

// ========== CALLBACK HANDLERS ==========
bot.action(/copy_ref_\d+/, async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('copy_group', async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('show_leaderboard', async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action(/my_stats_\d+/, async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('get_referral_link', async (ctx) => { await referralSystem.handleReferralCallback(ctx); });

// ========== WEB SERVER (for bot health) ==========
const expressApp = express();
const PORT = process.env.PORT || 3000;
expressApp.get('/', (req, res) => res.send('Detective Jai Bot is running!'));
expressApp.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
expressApp.listen(PORT, () => console.log(`🌐 Bot web server on port ${PORT}`));

// ========== START LEADERBOARD SCHEDULER ==========
referralSystem.startLeaderboardScheduler(bot);

// ========== LAUNCH TELEGRAM BOT ==========
bot.launch().then(() => {
    console.log('========================================');
    console.log('✅ DETECTIVE JAI TELEGRAM BOT IS LIVE!');
    console.log(`📊 ${getScammerCount()} scammers reported`);
    console.log(`🤝 ${partnerSystem.getPartnersCount()} partners`);
    console.log(`🔗 API Gateway on port ${API_PORT}`);
    console.log('========================================');
}).catch(err => { console.error('❌ Launch failed:', err); process.exit(1); });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));