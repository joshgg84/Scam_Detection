// Nigeria Scam Detector Bot - Main Bot File
// Creator: Joshua Giwa
// Community: https://t.me/+8JUqlJ-4SBdlZTM0

const { Telegraf } = require('telegraf');
const fs = require('fs');
const { addScammer, getScammerCount, getAllScammers, getRecentScammers } = require('./scammers.js');
const { dailyTips } = require('./tips.js');

// Import modules
const partnerSystem = require('./partner.js');
const ocr = require('./ocr.js');
const linkModule = require('./links.js');
const detection = require('./detection.js');
const referralSystem = require('./referrals.js');
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

// Store users who want to give testimonial
let awaitingTestimonial = {};

// Initialize Partner System
partnerSystem.initPartnerSystem();

// ========== HELPER FUNCTIONS ==========
function getHelpMessage() {
    return `
📚 *NIGERIA SCAM DETECTOR - HELP*

*Creator:* Joshua Giwa

⏰ *Note:* First message may take 30-50 seconds to wake me up.
After that, I respond instantly. Thanks for your patience! 🇳🇬

📝 *How to check a suspicious message:*
/check [paste the suspicious message here]

📞 *How to check a phone number:*
/check 08012345678

*Commands:*
/check [message or number] - Analyze any suspicious message
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

// ========== REGISTER ALL PUBLIC COMMANDS ==========

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

// ========== CHECK COMMAND ==========
bot.command('check', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        ctx.reply(`
📞 *USAGE:*

/check [phone number] - Check if a number is reported
/check [message] - Analyze a suspicious message

*Examples:*
/check 08012345678
/check URGENT: Your bank account will be closed

👥 ${COMMUNITY_LINK}
        `, { parse_mode: 'Markdown' });
        return;
    }
    
    const input = args.slice(1).join(' ');
    const phoneMatch = input.match(/0[789][01]\d{8}/);
    const userId = ctx.from.id;
    
    if (phoneMatch) {
        const formattedNumber = phoneMatch[0];
        const reported = detection.checkNumberInDatabase(formattedNumber);
        
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
        
        // Ask for testimonial
        await askForTestimonial(ctx, 'phone', formattedNumber);
        
    } else {
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
        
        // Ask for testimonial
        await askForTestimonial(ctx, 'message', input.substring(0, 50));
    }
});

// ========== LINK CHECK COMMAND ==========
bot.command('checklink', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        ctx.reply(`
🔗 *CHECK A LINK*

Usage: /checklink [url]

Example: /checklink https://fake-gtbank-verify.com

👥 ${COMMUNITY_LINK}
        `, { parse_mode: 'Markdown' });
        return;
    }
    
    const url = args[1];
    const analysis = linkModule.analyzeLink(url);
    const reported = linkModule.checkLink(url);
    
    let response = `🔗 *LINK ANALYSIS*\n\n`;
    response += `URL: \`${url}\`\n\n`;
    
    if (reported) {
        response += `🚨 *⚠️ SCAM LINK DETECTED!*\n\n`;
        response += `*Reason:* ${reported.reason}\n`;
        response += `*Reported by:* ${reported.reportedBy}\n`;
        response += `*Date:* ${reported.dateReported}\n`;
        response += `*Risk Level:* ${reported.riskLevel}\n\n`;
        response += `❌ DO NOT click this link!\n`;
    } else if (analysis.riskScore >= 30) {
        response += `🟡 *SUSPICIOUS LINK*\n\n`;
        response += `*Risk Score:* ${analysis.riskScore}/100\n`;
        response += `*Reasons:*\n${analysis.reasons.slice(0, 3).join('\n')}\n\n`;
        response += `⚠️ Be very careful with this link.\n`;
    } else {
        response += `🟢 *LINK APPEARS SAFE*\n\n`;
        response += `*Risk Score:* ${analysis.riskScore}/100\n`;
        response += `✅ No scam reports for this link.\n`;
    }
    
    response += `\n📞 *To report this link:* /reportlink ${url} [reason]\n👥 ${COMMUNITY_LINK}`;
    
    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Ask for testimonial
    await askForTestimonial(ctx, 'link', url);
});

// ========== REPORT COMMAND ==========
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
    
    // Use the new reportNumber function from scammers.js
    const result = await reportNumber(formattedNumber, userId, reason);
    
    if (result.success) {
        ctx.reply(`✅ *REPORTED*\n${formattedNumber}\n${result.message}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
        
        // If number became verified, notify admin
        if (result.status === 'verified') {
            await bot.telegram.sendMessage(YOUR_ID, `🚨 *NUMBER VERIFIED AS SCAMMER*\n\n📞 ${formattedNumber}\n📊 Total scammers: ${result.total}\n📝 Reason: ${reason}\n👤 Reported by: @${username}`);
        }
    } else {
        ctx.reply(`❌ ${result.message}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    }
});

// ========== REPORT LINK COMMAND ==========
bot.command('reportlink', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        ctx.reply(`
🔗 *REPORT A SCAM LINK*

Usage: /reportlink [url] [reason]

Example: /reportlink https://fake-site.com "Fake bank login page"

👥 ${COMMUNITY_LINK}
        `, { parse_mode: 'Markdown' });
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

// ========== PLEA COMMAND ==========
bot.command('plea', async (ctx) => {
    const args = ctx.message.text.split(' ');
    
    if (args.length < 2) {
        ctx.reply(`
📝 *PLEA COMMAND*

Use this command if your number was wrongly marked as a scammer.

*Usage:* /plea 08012345678 I am a legitimate business

Your plea will be reviewed by admin. You will be notified when a decision is made.
        `, { parse_mode: 'Markdown' });
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
    
    // Need to import submitPlea from scammers.js
    const { submitPlea } = require('./scammers.js');
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

// ========== REFERRAL COMMANDS ==========
bot.command('referral', async (ctx) => {
    await referralSystem.handleReferralCommand(ctx);
});

bot.command('leaderboard', async (ctx) => {
    await referralSystem.handleLeaderboardCommand(ctx);
});

bot.command('myreferrals', async (ctx) => {
    await referralSystem.handleMyReferralsCommand(ctx);
});

// ========== PARTNERS COMMAND ==========
bot.command('partners', async (ctx) => {
    try {
        await partnerSystem.handlePartnersCommand(ctx, COMMUNITY_LINK);
    } catch (err) {
        console.error('Partners error:', err);
        ctx.reply(`🤝 *PARTNERS DIRECTORY*\n\nNo partners yet. Be the first!\nContact @JoshuaGiwa to register.\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    }
});

// ========== PARTNER COMMAND ==========
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

// ========== EDUCATION COMMANDS ==========
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

// ========== HANDLE DOCUMENTS/FILES (for OCR) ==========
bot.on('document', async (ctx) => {
    const document = ctx.message.document;
    const mimeType = document.mime_type;
    
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

// ========== TESTIMONIAL CALLBACKS ==========
bot.action('give_testimonial', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    
    await ctx.answerCbQuery("Great! Send your testimonial now.");
    
    if (awaitingTestimonial[userId]) {
        awaitingTestimonial[userId].username = username;
        awaitingTestimonial[userId].ready = true;
    } else {
        awaitingTestimonial[userId] = { username: username, ready: true, type: 'unknown', details: 'N/A' };
    }
    
    await ctx.reply("📝 *Please send your testimonial now*\n\nExample:\n_\"This bot saved me from losing ₦50k to a fake loan agent. Thank you!\"_\n\nJust type your message (2-3 sentences).", {
        parse_mode: 'Markdown'
    });
});

bot.action('no_testimonial', async (ctx) => {
    const userId = ctx.from.id;
    delete awaitingTestimonial[userId];
    
    await ctx.answerCbQuery("Sorry it wasn't helpful. I'm always improving.");
    await ctx.reply("Thanks for your honesty. I'll keep making the bot better. 🙏");
});

bot.action('share_bot', async (ctx) => {
    await ctx.answerCbQuery();
    
    const shareText = `🚨 *FREE SCAM DETECTOR* 🚨\n\nBefore you send money, check the number first.\n\n👉 @JoshuaGiwaBot\n\nFree. Fast. Anonymous.`;
    
    const buttons = {
        inline_keyboard: [
            [{ text: "📱 Share on WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(shareText)}` }],
            [{ text: "📋 Copy Bot Link", callback_data: "copy_bot_link" }]
        ]
    };
    
    await ctx.reply("📢 *Share This Life-Saving Tool*\n\nHelp your friends and family avoid scams. Share the bot with just one click.", {
        parse_mode: 'Markdown',
        reply_markup: buttons
    });
});

bot.action('copy_bot_link', async (ctx) => {
    await ctx.answerCbQuery("Bot link copied!", { show_alert: false });
    await ctx.reply(`✅ *Bot link copied!*\n\nShare: @JoshuaGiwaBot`);
});

// ========== HANDLE TEXT MESSAGES (with testimonial support) ==========
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
        
        await ctx.reply("✅ *Thank you for your testimonial!*\n\nYour feedback helps others trust the bot and protects more Nigerians from scams.\n\n🙏 God bless you.", { parse_mode: 'Markdown' });
        
        const shareButtons = {
            inline_keyboard: [
                [{ text: "📢 Share This Bot", callback_data: "share_bot" }]
            ]
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
        if (sponsorMessage) {
            todaysTip += sponsorMessage;
        }
        
        const message = `${todaysTip}\n\n🇳🇬 Stay safe! Report scammers to @JoshuaGiwaBot`;
        
        try {
            await bot.telegram.sendMessage(GROUP_ID, message, { parse_mode: 'Markdown' });
            console.log(`📰 Daily tip sent at ${nigeriaTime.toLocaleTimeString()}`);
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
bot.action(/copy_ref_\d+/, async (ctx) => {
    await referralSystem.handleReferralCallback(ctx);
});

bot.action('copy_group', async (ctx) => {
    await referralSystem.handleReferralCallback(ctx);
});

bot.action('show_leaderboard', async (ctx) => {
    await referralSystem.handleReferralCallback(ctx);
});

bot.action(/my_stats_\d+/, async (ctx) => {
    await referralSystem.handleReferralCallback(ctx);
});

bot.action('get_referral_link', async (ctx) => {
    await referralSystem.handleReferralCallback(ctx);
});

// ========== WEB SERVER ==========
const PORT = process.env.PORT || 3000;
if (process.env.PORT) {
    const express = require('express');
    const app = express();
    app.get('/', (req, res) => res.send('Bot running'));
    app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
    app.listen(PORT, () => console.log(`Web server on port ${PORT}`));
    setInterval(() => console.log('🔄 Ping'), 5 * 60000);
}

// ========== START LEADERBOARD SCHEDULER ==========
referralSystem.startLeaderboardScheduler(bot);

// ========== LAUNCH ==========
bot.launch().then(() => {
    console.log('========================================');
    console.log('✅ NIGERIA SCAM DETECTOR IS LIVE!');
    console.log(`📊 ${getScammerCount()} scammers reported`);
    console.log(`🔗 ${linkModule.getReportedLinkCount()} scam links reported`);
    console.log(`🤝 ${partnerSystem.getPartnersCount()} partners`);
    console.log('========================================');
}).catch(err => { console.error('❌ Launch failed:', err); process.exit(1); });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));