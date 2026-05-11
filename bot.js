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

// Store testimonial mode temporarily (in memory)
let userTestimonialMode = {};

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

// ========== EDUCATION CONTENT ==========
const redFlagsContent = `🚩 *SCAM RED FLAGS*

URGENCY: "URGENT", "IMMEDIATELY", "ACT NOW"
MONEY: "SEND MONEY", "GIFT CARD", "BITCOIN"
INFO: "PIN", "OTP", "BVN", "CVV"
FAKE: "WINNING", "LOTTERY", "PRINCE"
ACCOUNT: "RENT", "LEASE", "LINKEDIN"
JOBS: "WORK FROM HOME", "EASY MONEY"

👥 Join our community: ${COMMUNITY_LINK}`;

const whatToDoContent = `🆘 *YOU'VE BEEN SCAMMED*

1. Contact your bank immediately
2. Save all evidence
3. Report to EFCC: 08093322644
4. Report number to this bot: /report
5. Join our community for support: ${COMMUNITY_LINK}`;

// ========== TESTIMONIAL COLLECTION FUNCTIONS ==========
async function askForTestimonial(ctx, resultType, details) {
    const userId = ctx.from.id;
    
    const buttons = {
        inline_keyboard: [
            [
                { text: "✅ Yes, it helped me", callback_data: `testimonial_yes_${resultType}_${details}` },
                { text: "❌ No, not helpful", callback_data: "testimonial_no" }
            ]
        ]
    };
    
    await ctx.reply("🤝 *Was this helpful?*\n\nYour feedback helps me improve the bot and protect more Nigerians.\n\nJust one click.", {
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

// ========== CHECK COMMAND (Phone Number OR Message) ==========
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
        // It's a phone number
        const formattedNumber = phoneMatch[0];
        const reported = checkNumberInDatabase(formattedNumber);
        
        let resultText = reported 
            ? `🚨 *ALERT!*\n${formattedNumber} is a REPORTED SCAMMER!\n\n❌ Do not send money\n❌ Block immediately`
            : `✅ *CLEAR*\n${formattedNumber} has no reports.\n\n⚠️ Still be cautious.`;
        
        const sponsor = partnerSystem.getCheckSponsorMessage();
        if (sponsor && !reported) {
            resultText += `\n\n📢 *Sponsored by ${sponsor.businessName}*\n${sponsor.message}`;
        }
        
        // Add referral section
        const { fullText, buttons } = referralSystem.addReferralSectionToCheck(resultText, userId, 0);
        
        await ctx.reply(fullText, {
            parse_mode: 'Markdown',
            reply_markup: buttons
        });
        
        // Ask for testimonial
        await askForTestimonial(ctx, 'phone', encodeURIComponent(formattedNumber));
        
    } else {
        // It's a message - analyze it
        const { analysis, linkWarnings } = await detection.analyzeMessageWithLinks(input, linkModule);
        
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
        
        // Add referral section
        const { fullText, buttons } = referralSystem.addReferralSectionToCheck(response, userId, analysis.riskScore);
        
        await ctx.reply(fullText, {
            parse_mode: 'Markdown',
            reply_markup: buttons
        });
        
        // Ask for testimonial
        await askForTestimonial(ctx, 'message', encodeURIComponent(input.substring(0, 50)));
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
    await askForTestimonial(ctx, 'link', encodeURIComponent(url));
});

// ========== REPORT COMMAND ==========
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
    ctx.reply(`✅ *REPORTED*\n${formattedNumber}\nTotal: ${result.total}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
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

// ========== SIMPLIFIED PARTNER COMMAND ==========
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
    const commonScams = getCommonScams();
    if (commonScams.length === 0) return ctx.reply('No scam terms loaded.');
    let message = `📚 *COMMON SCAMS*\n\n`;
    for (const key of commonScams.slice(0, 8)) {
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
    ctx.reply(`📊 *STATS*\nScammers: ${getScammerCount()}\nLinks: ${linkModule.getReportedLinkCount()}\nPartners: ${partnerSystem.getPartnersCount()}\nTips: ${dailyTips.length}\nTerms: ${Object.keys(scamTerms).length}`, { parse_mode: 'Markdown' });
});

// Register admin commands
registerAdminCommands(bot, YOUR_ID, partnerSystem, dailyTips, scamTerms, linkModule);

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
    
    const { analysis, linkWarnings } = await detection.analyzeMessageWithLinks(extractedText, linkModule);
    
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
    response += `*Extracted:* ${extractedText.substring(0, 200)}...\n\n`;
    response += `*Findings:* ${analysis.alerts.slice(0, 4).join(', ') || 'None'}\n\n`;
    response += `*Action:* ${analysis.recommendation}\n\n👥 ${COMMUNITY_LINK}`;
    
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    
    const phoneMatch = extractedText.match(/0[789][01]\d{8}/g);
    if (phoneMatch) {
        for (const phone of phoneMatch) {
            const reported = checkNumberInDatabase(phone);
            await ctx.reply(`${reported ? '🚨' : '📞'} *Phone found:* ${phone}\n${reported ? '⚠️ REPORTED SCAMMER!' : 'Not reported yet.'}`, { parse_mode: 'Markdown' });
        }
    }
    
    // Ask for testimonial
    await askForTestimonial(ctx, 'image', encodeURIComponent(extractedText.substring(0, 50)));
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
    
    const { analysis, linkWarnings } = await detection.analyzeMessageWithLinks(extractedText, linkModule);
    
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
    response += `*Extracted:* ${extractedText.substring(0, 300)}${extractedText.length > 300 ? '...' : ''}\n\n`;
    response += `*Findings:*\n${analysis.alerts.slice(0, 4).join('\n') || 'No obvious scam indicators'}\n\n`;
    response += `*Action:* ${analysis.recommendation}\n\n👥 ${COMMUNITY_LINK}`;
    
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    
    const phoneMatch = extractedText.match(/0[789][01]\d{8}/g);
    if (phoneMatch) {
        for (const phone of phoneMatch) {
            const reported = checkNumberInDatabase(phone);
            await ctx.reply(`${reported ? '🚨' : '📞'} *Phone found:* ${phone}\n${reported ? '⚠️ REPORTED SCAMMER!' : 'Not reported yet.'}`, { parse_mode: 'Markdown' });
        }
    }
    
    // Ask for testimonial
    await askForTestimonial(ctx, 'file', encodeURIComponent(extractedText.substring(0, 50)));
});

// ========== TESTIMONIAL CALLBACK HANDLERS ==========
bot.action(/testimonial_yes_(.+)_(.+)/, async (ctx) => {
    const resultType = ctx.match[1];
    const details = decodeURIComponent(ctx.match[2]);
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const fullName = ctx.from.first_name || username;
    
    await ctx.answerCbQuery("Great! Please send your testimonial in the next message.");
    
    // Store that user is in testimonial mode
    userTestimonialMode[userId] = { resultType, details, username, fullName };
    
    await ctx.reply("📝 *Please send your testimonial now*\n\nExample:\n_"This bot saved me from losing ₦50k to a fake loan agent. Thank you!"_\n\nJust type your message. Keep it short (2-3 sentences).", {
        parse_mode: 'Markdown'
    });
});

bot.action('testimonial_no', async (ctx) => {
    await ctx.answerCbQuery("Sorry it wasn't helpful. I'm always improving.");
    await ctx.reply("Thanks for your honesty. I'll keep making the bot better. 🙏");
});

// ========== HANDLE TESTIMONIAL TEXT MESSAGES ==========
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const message = ctx.message.text;
    
    // Check if user is in testimonial mode
    if (userTestimonialMode[userId] && !message.startsWith('/')) {
        const testimonialData = userTestimonialMode[userId];
        const testimonial = message.trim();
        
        // Send to admin
        const adminMessage = `
📝 *NEW TESTIMONIAL*

👤 *User:* ${testimonialData.fullName} (@${testimonialData.username})
📋 *User ID:* ${userId}
🔍 *After checking:* ${testimonialData.resultType === 'phone' ? 'Phone Number' : (testimonialData.resultType === 'link' ? 'Link' : (testimonialData.resultType === 'image' ? 'Screenshot' : 'Message'))}
📄 *Details:* ${testimonialData.details.substring(0, 100)}

💬 *Testimonial:*
"${testimonial}"

📅 ${new Date().toLocaleString()}

*To share in group:* Copy this message and post in Telegram group.
        `;
        
        await bot.telegram.sendMessage(YOUR_ID, adminMessage, { parse_mode: 'Markdown' });
        
        // Send confirmation to user
        await ctx.reply("✅ *Thank you for your testimonial!*\n\nYour feedback has been sent to the creator. It helps others trust the bot and protects more Nigerians from scams.\n\n🙏 God bless you.", {
            parse_mode: 'Markdown'
        });
        
        // Also send a share button
        const shareButtons = {
            inline_keyboard: [
                [{ text: "📢 Share This Bot with Friends", callback_data: "share_bot" }]
            ]
        };
        
        await ctx.reply("🤝 *Help Others Stay Safe*\n\nShare this bot with your family and friends. One share could save someone from losing money.", {
            parse_mode: 'Markdown',
            reply_markup: shareButtons
        });
        
        // Clear testimonial mode
        delete userTestimonialMode[userId];
        return;
    }
    
    // Skip auto-analysis for command messages and testimonial mode
    if (message.startsWith('/')) return;
    
    // Normal auto-analysis
    const analysis = detection.analyzeMessage(message);
    if (analysis.riskScore >= 10) {
        let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
        response += `*Findings:*\n${analysis.alerts.slice(0, 4).join('\n')}\n\n`;
        response += `*Action:* ${analysis.recommendation}\n\n👥 ${COMMUNITY_LINK}`;
        await ctx.reply(response, { parse_mode: 'Markdown' });
        
        // Ask for testimonial
        await askForTestimonial(ctx, 'auto_message', encodeURIComponent(message.substring(0, 50)));
    }
});

// ========== SHARE BOT CALLBACK ==========
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