// bot.js - Telegram Bot Only (No Express)

const { Telegraf } = require('telegraf');

// Import modules
const partnerSystem = require('./partner.js');
const referralSystem = require('./referrals.js');
const handlers = require('./handlers.js');
const { registerAdminCommands } = require('./admin.js');
const { getScammerCount, reportNumber, submitPlea } = require('./scammers.js');
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

// Initialize systems
partnerSystem.initPartnerSystem();

// ========== VALID COMMANDS ==========
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

// ========== TESTIMONIAL COLLECTION ==========
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

// ========== BASIC COMMANDS ==========
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

// ========== CHECK NUMBER (USES HANDLER) ==========
bot.command('checknumber', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const phoneNumber = args[1];
    const userId = ctx.from.id;
    
    const response = await handlers.handleCheckNumber(phoneNumber);
    
    const referralResult = referralSystem.addReferralSectionToCheck(response, userId, 0);
    await ctx.reply(referralResult.fullText, {
        parse_mode: 'Markdown',
        reply_markup: referralResult.buttons
    });
    
    await askForTestimonial(ctx, 'phone', phoneNumber || 'unknown');
});

bot.command('cn', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply('📞 Usage: /cn 08012345678');
    ctx.message.text = '/checknumber ' + args.slice(1).join(' ');
    await bot.commands.get('checknumber')(ctx);
});

// ========== CHECK MESSAGE (USES HANDLER) ==========
bot.command('checkmsg', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const input = args.slice(1).join(' ');
    const userId = ctx.from.id;
    
    const response = await handlers.handleCheckMessage(input);
    
    const referralResult = referralSystem.addReferralSectionToCheck(response, userId, 0);
    await ctx.reply(referralResult.fullText, {
        parse_mode: 'Markdown',
        reply_markup: referralResult.buttons
    });
    
    await askForTestimonial(ctx, 'message', input.substring(0, 50));
});

bot.command('cm', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply('📝 Usage: /cm [message]');
    ctx.message.text = '/checkmsg ' + args.slice(1).join(' ');
    await bot.commands.get('checkmsg')(ctx);
});

// ========== CHECK LINK (USES HANDLER) ==========
bot.command('checklink', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const url = args[1];
    
    const response = await handlers.handleCheckLink(url);
    await ctx.reply(response, { parse_mode: 'Markdown' });
    await askForTestimonial(ctx, 'link', url || 'unknown');
});

// ========== REPORT (USES HANDLER) ==========
bot.command('report', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    const phoneNumber = parts[1];
    const reason = parts.slice(2).join(' ') || 'Suspicious activity';
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    
    const result = await handlers.handleReport(phoneNumber, reason, userId);
    ctx.reply(`✅ *REPORTED*\n${phoneNumber}\n${result}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    
    if (result.includes('VERIFIED')) {
        await bot.telegram.sendMessage(YOUR_ID, `🚨 *NUMBER VERIFIED AS SCAMMER*\n\n📞 ${phoneNumber}\n👤 Reported by: @${username}`);
    }
});

// ========== REPORT LINK ==========
bot.command('reportlink', async (ctx) => {
    const linkModule = require('./links.js');
    const args = ctx.message.text.split(' ');
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

// ========== PLEA ==========
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

// ========== REFERRAL COMMANDS ==========
bot.command('referral', async (ctx) => { await referralSystem.handleReferralCommand(ctx); });
bot.command('leaderboard', async (ctx) => { await referralSystem.handleLeaderboardCommand(ctx); });
bot.command('myreferrals', async (ctx) => { await referralSystem.handleMyReferralsCommand(ctx); });

// ========== PARTNERS ==========
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
    ctx.reply(`📊 *STATS*\nScammers: ${getScammerCount()}\nPartners: ${partnerSystem.getPartnersCount()}\nTips: ${dailyTips.length}\nTerms: ${Object.keys(detection.scamTerms).length}`, { parse_mode: 'Markdown' });
});

// Register admin commands
registerAdminCommands(bot, YOUR_ID, partnerSystem, dailyTips, detection.scamTerms, require('./links.js'));

// ========== MEDIA HANDLERS ==========
const ocr = require('./ocr.js');
const linkModule = require('./links.js');

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
    
    const response = await handlers.handleCheckMessage(extractedText);
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
    
    const response = await handlers.handleCheckMessage(extractedText);
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
    
    const response = await handlers.handleAutoDetect(message);
    if (response && !response.includes('No obvious scam indicators') || response.includes('RISK')) {
        await ctx.reply(response, { parse_mode: 'Markdown' });
        await askForTestimonial(ctx, 'auto_message', message.substring(0, 50));
    }
});

// ========== CALLBACK HANDLERS ==========
bot.action(/copy_ref_\d+/, async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('copy_group', async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('show_leaderboard', async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action(/my_stats_\d+/, async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('get_referral_link', async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('share_bot', async (ctx) => {
    await ctx.answerCbQuery();
    const shareText = `🚨 *FREE SCAM DETECTOR* 🚨\n\nBefore you send money, check the number first.\n\n👉 @JoshuaGiwaBot\n\nFree. Fast. Anonymous.`;
    const buttons = {
        inline_keyboard: [
            [{ text: "📱 Share on WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(shareText)}` }],
            [{ text: "📋 Copy Bot Link", callback_data: "copy_bot_link" }]
        ]
    };
    await ctx.reply("📢 *Share This Life-Saving Tool*\n\nHelp your friends and family avoid scams.", {
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
        if (sponsorMessage) todaysTip += sponsorMessage;
        
        const message = `${todaysTip}\n\n🇳🇬 Stay safe! Report scammers to @JoshuaGiwaBot`;
        
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

// ========== START LEADERBOARD SCHEDULER ==========
referralSystem.startLeaderboardScheduler(bot);

// ========== LAUNCH ==========
bot.launch().then(() => {
    console.log('========================================');
    console.log('✅ DETECTIVE JAI TELEGRAM BOT IS LIVE!');
    console.log(`📊 ${getScammerCount()} scammers reported`);
    console.log(`🤝 ${partnerSystem.getPartnersCount()} partners`);
    console.log('========================================');
}).catch(err => { console.error('❌ Launch failed:', err); process.exit(1); });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));