// bot.js - Telegram Bot + Express API

const { Telegraf } = require('telegraf');
const express = require('express');
const cors = require('cors');

// Import modules
const partnerSystem = require('./partner.js');
const detection = require('./detection.js');
const referralSystem = require('./referrals.js');
const { registerAdminCommands } = require('./admin.js');
const { getScammerCount, getAllScammers, reportNumber, submitPlea } = require('./scammers.js');
const { dailyTips } = require('./tips.js');
const linkModule = require('./links.js');
const ocr = require('./ocr.js');
const handlers = require('./handlers.js');

// ========== TELEGRAM BOT CONFIGURATION ==========
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found!');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const YOUR_ID = 8447414897;
const COMMUNITY_LINK = "https://t.me/+8JUqlJ-4SBdlZTM0";
const GROUP_ID = -1003513272328;
let awaitingTestimonial = {};

partnerSystem.initPartnerSystem();

// ========== EXPRESS API ==========
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

// API endpoint for website
app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    
    console.log(`📨 API: ${message.substring(0, 50)}...`);
    
    try {
        const response = await handlers.processCommand(message, userId || 'web_user');
        res.json({ success: true, response: response });
    } catch (err) {
        console.error('API error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), scammers: getScammerCount() });
});

app.get('/api/stats', (req, res) => {
    res.json({ scammers: getScammerCount() });
});

app.listen(PORT, () => {
    console.log(`🌐 API running on port ${PORT}`);
    console.log(`📡 POST /api/chat`);
});

// ========== TELEGRAM BOT COMMANDS ==========
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

bot.use((ctx, next) => {
    const message = ctx.message?.text;
    if (message && message.startsWith('/')) {
        const originalCommand = message.split(' ')[0].slice(1);
        const lowerCommand = originalCommand.toLowerCase();
        if (originalCommand !== lowerCommand && validCommands.includes(lowerCommand)) {
            ctx.reply(`⚠️ *Case-Sensitive Command*\n\nDid you mean *${lowerCommand}*?\n\nType /help to see commands.`, { parse_mode: 'Markdown' });
            return;
        }
    }
    return next();
});

function getHelpMessage() {
    return `
📚 *DETECTIVE JAI - HELP*

📞 /checknumber 08012345678 - Check a phone number
📝 /checkmsg [message] - Analyze a suspicious message
🔗 /checklink [url] - Check if a link is a scam
📢 /report [number] [reason] - Report a scammer
🔍 /search [digits] - Search scammer database
📊 /stats - Bot statistics
🤝 /referral - Get your referral link
🏆 /leaderboard - Top inviters

👥 Community: ${COMMUNITY_LINK}
🇳🇬 Stay safe. Verify first.
    `;
}

async function askForTestimonial(ctx, type, details) {
    const userId = ctx.from.id;
    awaitingTestimonial[userId] = { type, details };
    const buttons = { inline_keyboard: [[{ text: "✅ Yes, it helped me", callback_data: "give_testimonial" }, { text: "❌ No, not helpful", callback_data: "no_testimonial" }]] };
    await ctx.reply("🤝 *Was this helpful?*", { parse_mode: 'Markdown', reply_markup: buttons });
}

// Basic commands
bot.start(async (ctx) => {
    const args = ctx.message.text.split(' ');
    const startParam = args[1];
    if (startParam && startParam.startsWith('ref_')) {
        const referrerId = startParam.split('_')[1];
        await referralSystem.handleReferralStart(ctx, referrerId, ctx.from.id, ctx.from.username || ctx.from.first_name);
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
bot.command('support', (ctx) => ctx.reply(`💚 *Support:* Zenith Bank\n4268186069\nJoshua Giwa`, { parse_mode: 'Markdown' }));

// Check number
bot.command('checknumber', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const phoneNumber = args[1];
    const userId = ctx.from.id;
    const response = await handlers.handleCheckNumber(phoneNumber);
    const referralResult = referralSystem.addReferralSectionToCheck(response, userId, 0);
    await ctx.reply(referralResult.fullText, { parse_mode: 'Markdown', reply_markup: referralResult.buttons });
    await askForTestimonial(ctx, 'phone', phoneNumber || 'unknown');
});
bot.command('cn', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply('📞 Usage: /cn 08012345678');
    ctx.message.text = '/checknumber ' + args.slice(1).join(' ');
    await bot.commands.get('checknumber')(ctx);
});

// Check message
bot.command('checkmsg', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const input = args.slice(1).join(' ');
    const userId = ctx.from.id;
    const response = await handlers.handleCheckMessage(input);
    const referralResult = referralSystem.addReferralSectionToCheck(response, userId, 0);
    await ctx.reply(referralResult.fullText, { parse_mode: 'Markdown', reply_markup: referralResult.buttons });
    await askForTestimonial(ctx, 'message', input.substring(0, 50));
});
bot.command('cm', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply('📝 Usage: /cm [message]');
    ctx.message.text = '/checkmsg ' + args.slice(1).join(' ');
    await bot.commands.get('checkmsg')(ctx);
});

// Check link
bot.command('checklink', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const url = args[1];
    const response = await handlers.handleCheckLink(url);
    await ctx.reply(response, { parse_mode: 'Markdown' });
    await askForTestimonial(ctx, 'link', url || 'unknown');
});

// Report
bot.command('report', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    const phoneNumber = parts[1];
    const reason = parts.slice(2).join(' ') || 'Suspicious activity';
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const result = await handlers.handleReport(phoneNumber, reason, userId);
    ctx.reply(`✅ *REPORTED*\n${phoneNumber}\n${result}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    if (result.includes('VERIFIED')) {
        await bot.telegram.sendMessage(YOUR_ID, `🚨 *NUMBER VERIFIED AS SCAMMER*\n📞 ${phoneNumber}\n👤 Reported by: @${username}`);
    }
});

// Report link
bot.command('reportlink', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const url = args[1];
    const reason = args.slice(2).join(' ') || 'Suspicious link';
    const reporter = ctx.from.username || ctx.from.id.toString();
    const result = linkModule.reportLink(url, reason, reporter);
    if (result.success) {
        ctx.reply(`✅ *LINK REPORTED!*\n\nURL: \`${url}\`\nReason: ${reason}\nTotal: ${result.total}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
        await bot.telegram.sendMessage(YOUR_ID, `🔗 *NEW SCAM LINK REPORTED*\nURL: ${url}\nReason: ${reason}\nReported by: @${ctx.from.username || reporter}`);
    } else {
        ctx.reply(`⚠️ *Link already reported*\n\nURL: \`${url}\`\nReason: ${result.existing.reason}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    }
});

// Plea
bot.command('plea', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply(`📝 *PLEA COMMAND*\n\nUsage: /plea 08012345678 I am a legitimate business`);
    const phoneNumber = args[1];
    const reason = args.slice(2).join(' ') || 'No reason provided';
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 8 || cleaned.length > 14) return ctx.reply('❌ Invalid phone number format.');
    const result = submitPlea(cleaned, userId, username, reason);
    await ctx.reply(result.message, { parse_mode: 'Markdown' });
    if (result.success && result.status === 'submitted') {
        await bot.telegram.sendMessage(YOUR_ID, `📋 *NEW PLEA SUBMITTED*\n🆔 ID: ${result.pleaId}\n📞 Number: ${cleaned}\n👤 User: @${username} (${userId})\n💬 Reason: ${reason}\n\n/approveplea ${result.pleaId}\n/rejectplea ${result.pleaId} [reason]`);
    }
});

// Referral
bot.command('referral', async (ctx) => { await referralSystem.handleReferralCommand(ctx); });
bot.command('leaderboard', async (ctx) => { await referralSystem.handleLeaderboardCommand(ctx); });
bot.command('myreferrals', async (ctx) => { await referralSystem.handleMyReferralsCommand(ctx); });

// Partners
bot.command('partners', async (ctx) => {
    try { await partnerSystem.handlePartnersCommand(ctx, COMMUNITY_LINK); } 
    catch (err) { ctx.reply(`🤝 *PARTNERS DIRECTORY*\n\nNo partners yet. Be the first!\nContact @JoshuaGiwa\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' }); }
});
bot.command('partner', (ctx) => {
    ctx.reply(`🤝 *PARTNER PROGRAM*\n\n*Standard* - ₦11,000/month\n*Premium* - ₦17,000/month\n\nRegister: Contact @JoshuaGiwa\nWhatsApp: 09025839789\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
});

// Education
bot.command('tips', (ctx) => {
    if (dailyTips.length === 0) return ctx.reply('⚠️ No tips yet.');
    ctx.reply(`${dailyTips[Math.floor(Math.random() * dailyTips.length)]}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
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
    if (!term) return ctx.reply(`📖 Usage: /whatis phishing\n\nAvailable: ${detection.getAllTermKeys().slice(0, 15).join(', ')}`);
    const data = detection.getTerm(term);
    if (data) ctx.reply(`${data.title}\n\n${data.content}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    else ctx.reply(`❌ "${term}" not found. Try: ${detection.getAllTermKeys().slice(0, 10).join(', ')}`);
});
bot.command('stats', (ctx) => {
    ctx.reply(`📊 *STATS*\nScammers: ${getScammerCount()}\nPartners: ${partnerSystem.getPartnersCount()}\nTips: ${dailyTips.length}\nTerms: ${Object.keys(detection.scamTerms).length}`, { parse_mode: 'Markdown' });
});

// Admin commands
registerAdminCommands(bot, YOUR_ID, partnerSystem, dailyTips, detection.scamTerms, linkModule);

// Media handlers
bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.telegram.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const processingMsg = await ctx.reply('🔍 *Analyzing screenshot...*', { parse_mode: 'Markdown' });
    const extractedText = await ocr.extractTextWithFallbacks(fileUrl, BOT_TOKEN);
    if (!extractedText || extractedText.length < 10) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, ocr.getLowQualityHelpMessage(), { parse_mode: 'Markdown' });
        return;
    }
    const response = await handlers.handleCheckMessage(extractedText);
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
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
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, ocr.getLowQualityHelpMessage(), { parse_mode: 'Markdown' });
        return;
    }
    const response = await handlers.handleCheckMessage(extractedText);
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    await askForTestimonial(ctx, 'file', extractedText.substring(0, 50));
});

// Text handler
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const message = ctx.message.text;
    if (message.startsWith('/')) return;
    if (awaitingTestimonial[userId] && awaitingTestimonial[userId].ready) {
        const testimonial = message.trim();
        const data = awaitingTestimonial[userId];
        await bot.telegram.sendMessage(YOUR_ID, `📝 *NEW TESTIMONIAL*\n\n👤 @${data.username || 'unknown'} (${userId})\n🔍 ${data.type}\n💬 "${testimonial}"`);
        await ctx.reply("✅ *Thank you for your testimonial!* 🙏");
        delete awaitingTestimonial[userId];
        return;
    }
    const response = await handlers.handleAutoDetect(message);
    if (response && (!response.includes('No obvious scam indicators') || response.includes('RISK'))) {
        await ctx.reply(response, { parse_mode: 'Markdown' });
        await askForTestimonial(ctx, 'auto_message', message.substring(0, 50));
    }
});

// Callbacks
bot.action('give_testimonial', async (ctx) => {
    const userId = ctx.from.id;
    awaitingTestimonial[userId] = { ...awaitingTestimonial[userId], username: ctx.from.username || ctx.from.first_name, ready: true };
    await ctx.answerCbQuery("Great! Send your testimonial now.");
    await ctx.reply("📝 *Please send your testimonial now* (2-3 sentences)");
});
bot.action('no_testimonial', async (ctx) => {
    delete awaitingTestimonial[ctx.from.id];
    await ctx.answerCbQuery("Thanks for your honesty!");
});
bot.action(/copy_ref_\d+/, async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('copy_group', async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('show_leaderboard', async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action(/my_stats_\d+/, async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('get_referral_link', async (ctx) => { await referralSystem.handleReferralCallback(ctx); });
bot.action('share_bot', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("📢 Share: @JoshuaGiwaBot");
});
bot.action('copy_bot_link', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`✅ @JoshuaGiwaBot`);
});

// Daily tips
let lastTipDate = null;
async function sendDailyTipToGroup() {
    if (dailyTips.length === 0) return;
    const now = new Date();
    const nigeriaTime = new Date(now.getTime() + 3600000);
    const currentHour = nigeriaTime.getUTCHours();
    const currentDate = nigeriaTime.toDateString();
    if (currentHour === 8 && lastTipDate !== currentDate) {
        const tipIndex = (nigeriaTime.getUTCDate() - 1) % dailyTips.length;
        let todaysTip = dailyTips[tipIndex];
        const sponsorMessage = partnerSystem.getDailyTipSponsorMessage();
        if (sponsorMessage) todaysTip += sponsorMessage;
        try {
            await bot.telegram.sendMessage(GROUP_ID, `${todaysTip}\n\n🇳🇬 Stay safe!`, { parse_mode: 'Markdown' });
            lastTipDate = currentDate;
        } catch (err) { console.log(`❌ Failed to send tip: ${err.message}`); }
    }
}
setInterval(sendDailyTipToGroup, 60000);
bot.command('testtip', async (ctx) => {
    if (ctx.from.id !== YOUR_ID) return ctx.reply('❌ Admin only.');
    await bot.telegram.sendMessage(GROUP_ID, `${dailyTips[Math.floor(Math.random() * dailyTips.length)]}\n\n🧪 *TEST*`, { parse_mode: 'Markdown' });
    ctx.reply('✅ Test tip sent');
});

// Leaderboard scheduler
referralSystem.startLeaderboardScheduler(bot);

// Launch
bot.launch().then(() => {
    console.log('✅ DETECTIVE JAI TELEGRAM BOT IS LIVE!');
    console.log(`📊 ${getScammerCount()} scammers reported`);
}).catch(err => { console.error('Launch failed:', err); process.exit(1); });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));