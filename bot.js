// bot.js - Telegram Bot + Express API
// Natural language support for English & Pidgin

// ============================================
// DEPENDENCIES
// ============================================

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
const natural = require('./natural.js');

// ============================================
// CONFIGURATION
// ============================================

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN environment variable is required');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const CONFIG = {
    ADMIN_ID: 8447414897,
    COMMUNITY_LINK: "https://t.me/+8JUqlJ-4SBdlZTM0",
    GROUP_ID: -1003513272328,
    PORT: process.env.PORT || 3000
};

// State management
const awaitingTestimonial = {};
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
    'listlinks', 'deletelink', 'addwhitelist', 'removewhitelist', 'linkstats',
    'loan'
];

// ============================================
// EXPRESS API SERVER
// ============================================

const app = express();
app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'], 
    allowedHeaders: ['Content-Type'] 
}));
app.use(express.json());

// API: Chat endpoint for website
app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    
    if (!message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Message is required' 
        });
    }
    
    console.log(`📨 API Request: ${message.substring(0, 50)}...`);
    
    try {
        const response = natural.processNaturalInput(
            message, 
            userId || 'web_user', 
            'web_user'
        );
        res.json({ 
            success: true, 
            response: response 
        });
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// API: Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(), 
        scammers: getScammerCount() 
    });
});

// API: Stats
app.get('/api/stats', (req, res) => {
    res.json({ scammers: getScammerCount() });
});

// Start Express server
app.listen(CONFIG.PORT, () => {
    console.log(`🌐 API running on port ${CONFIG.PORT}`);
    console.log(`📡 POST /api/chat`);
});

// ============================================
// TELEGRAM BOT SETUP
// ============================================

partnerSystem.initPartnerSystem();

// ============================================
// MIDDLEWARE: Case-Insensitive Commands
// ============================================

bot.use((ctx, next) => {
    const message = ctx.message?.text;
    
    if (message && message.startsWith('/')) {
        const originalCommand = message.split(' ')[0].slice(1);
        const lowerCommand = originalCommand.toLowerCase();
        
        if (originalCommand !== lowerCommand && validCommands.includes(lowerCommand)) {
            return ctx.reply(
                `⚠️ *Case-Sensitive Command*\n\nDid you mean *${lowerCommand}*?\n\nType /help to see commands.`,
                { parse_mode: 'Markdown' }
            );
        }
    }
    return next();
});

// ============================================
// HELP MESSAGE
// ============================================

function getHelpMessage() {
    return `
📚 *DETECTIVE JAI - HELP*

*Commands (or just talk naturally)*

📞 /checknumber 08012345678 - Check a phone number
📝 /checkmsg [message] - Analyze a suspicious message
🔗 /checklink [url] - Check if a link is a scam
📢 /report [number] [reason] - Report a scammer
💰 /loan [amount] [income] - Get loan advice
📊 /stats - Bot statistics
🤝 /referral - Get your referral link
🏆 /leaderboard - Top inviters

*Or just talk to me naturally:*
"Check this number: 080..."
"I need a loan of ₦50,000"
"Is this link safe? https://..."

👥 Community: ${CONFIG.COMMUNITY_LINK}
🇳🇬 Stay safe. Verify first.
    `;
}

// ============================================
// TESTIMONIAL HANDLER
// ============================================

async function askForTestimonial(ctx, type, details) {
    const userId = ctx.from.id;
    awaitingTestimonial[userId] = { type, details };
    
    const buttons = {
        inline_keyboard: [
            [
                { text: "✅ Yes, it helped me", callback_data: "give_testimonial" },
                { text: "❌ No, not helpful", callback_data: "no_testimonial" }
            ]
        ]
    };
    
    await ctx.reply(
        "🤝 *Was this helpful?*",
        { parse_mode: 'Markdown', reply_markup: buttons }
    );
}

// ============================================
// COMMAND HANDLERS
// ============================================

// Start
bot.start(async (ctx) => {
    const args = ctx.message.text.split(' ');
    const startParam = args[1];
    
    // Handle referral links
    if (startParam && startParam.startsWith('ref_')) {
        const referrerId = startParam.split('_')[1];
        await referralSystem.handleReferralStart(ctx, referrerId, ctx.from.id, ctx.from.username || ctx.from.first_name);
        return;
    }
    
    if (startParam === 'referral') {
        await referralSystem.handleReferralCommand(ctx);
        return;
    }
    
    const lang = natural.detectLanguage(ctx.message.text);
    ctx.reply(natural.getResponse('welcome', null, lang), { parse_mode: 'Markdown' });
});

// Help
bot.command('help', (ctx) => {
    ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' });
});

// My ID
bot.command('myid', (ctx) => {
    ctx.reply(`Your ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// Community
bot.command('community', (ctx) => {
    ctx.reply(`👥 Join: ${CONFIG.COMMUNITY_LINK}`);
});

// Support
bot.command('support', (ctx) => {
    ctx.reply(
        `💚 *Support:* Zenith Bank\n4268186069\nJoshua Giwa`,
        { parse_mode: 'Markdown' }
    );
});

// Check Number
bot.command('checknumber', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const phoneNumber = args[1];
    
    if (!phoneNumber) {
        return ctx.reply(
            "📞 *Check Number*\n\nSend me a number like this:\n/checknumber 08012345678\n\nOr just say: 'Check this number: 08012345678'"
        );
    }
    
    const lang = natural.detectLanguage(ctx.message.text);
    const response = natural.handleCheckNumber(phoneNumber, lang);
    await ctx.reply(response, { parse_mode: 'Markdown' });
    await askForTestimonial(ctx, 'phone', phoneNumber);
});

// Check Number (shortcut)
bot.command('cn', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply('📞 Usage: /cn 08012345678');
    }
    ctx.message.text = '/checknumber ' + args.slice(1).join(' ');
    await bot.commands.get('checknumber')(ctx);
});

// Check Message
bot.command('checkmsg', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const input = args.slice(1).join(' ');
    
    if (!input) {
        return ctx.reply(
            "📝 *Check Message*\n\nSend me a message like this:\n/checkmsg Urgent: Your account will be closed\n\nOr just say: 'Check this message: ...'"
        );
    }
    
    const lang = natural.detectLanguage(ctx.message.text);
    const response = natural.handleCheckMessage(input, lang);
    await ctx.reply(response, { parse_mode: 'Markdown' });
    await askForTestimonial(ctx, 'message', input.substring(0, 50));
});

// Check Message (shortcut)
bot.command('cm', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply('📝 Usage: /cm [message]');
    }
    ctx.message.text = '/checkmsg ' + args.slice(1).join(' ');
    await bot.commands.get('checkmsg')(ctx);
});

// Check Link
bot.command('checklink', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const url = args[1];
    
    if (!url) {
        return ctx.reply(
            "🔗 *Check Link*\n\nSend me a link like this:\n/checklink https://example.com\n\nOr just say: 'Is this link safe? https://...'"
        );
    }
    
    const lang = natural.detectLanguage(ctx.message.text);
    const response = natural.handleCheckLink(url, lang);
    await ctx.reply(response, { parse_mode: 'Markdown' });
    await askForTestimonial(ctx, 'link', url);
});

// Report
bot.command('report', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    const phoneNumber = parts[1];
    const reason = parts.slice(2).join(' ') || 'Suspicious activity';
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    
    if (!phoneNumber) {
        return ctx.reply(
            "📢 *Report Scammer*\n\nSend me a number like this:\n/report 08012345678 loan scam\n\nOr just say: 'I want to report 080... for scam'"
        );
    }
    
    const lang = natural.detectLanguage(ctx.message.text);
    const response = natural.getResponse('reportSuccess', { number: phoneNumber, reason: reason }, lang);
    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Notify admin
    await bot.telegram.sendMessage(
        CONFIG.ADMIN_ID,
        `🚨 *NUMBER REPORTED*\n📞 ${phoneNumber}\n👤 Reported by: @${username}\n📌 Reason: ${reason}`,
        { parse_mode: 'Markdown' }
    );
});

// Loan
bot.command('loan', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const amount = parseInt(args[1]);
    const income = parseInt(args[2]);
    const lang = natural.detectLanguage(ctx.message.text);

    if (!amount) {
        return ctx.reply(natural.getResponse('loanAskAmount', null, lang), { parse_mode: 'Markdown' });
    }

    if (!income) {
        return ctx.reply(natural.getResponse('loanAskIncome', { amount: amount.toLocaleString() }, lang), { parse_mode: 'Markdown' });
    }

    const response = natural.handleLoanWithIncome(amount, income, lang);
    await ctx.reply(response, { parse_mode: 'Markdown' });
});

// Stats
bot.command('stats', (ctx) => {
    const lang = natural.detectLanguage(ctx.message.text);
    const response = natural.handleStats(lang);
    ctx.reply(response, { parse_mode: 'Markdown' });
});

// Scam Types
bot.command('scamtypes', (ctx) => {
    const lang = natural.detectLanguage(ctx.message.text);
    const response = natural.getResponse('scamTypes', null, lang);
    ctx.reply(response, { parse_mode: 'Markdown' });
});

// Red Flags
bot.command('redflags', (ctx) => {
    const lang = natural.detectLanguage(ctx.message.text);
    const response = natural.getResponse('redFlags', null, lang);
    ctx.reply(response, { parse_mode: 'Markdown' });
});

// What To Do
bot.command('whattodo', (ctx) => {
    const lang = natural.detectLanguage(ctx.message.text);
    const response = natural.getResponse('whatToDo', null, lang);
    ctx.reply(response, { parse_mode: 'Markdown' });
});

// Tips
bot.command('tips', (ctx) => {
    const lang = natural.detectLanguage(ctx.message.text);
    const response = natural.handleTips(lang);
    ctx.reply(response, { parse_mode: 'Markdown' });
});

// What Is
bot.command('whatis', (ctx) => {
    const term = ctx.message.text.split(' ').slice(1).join(' ');
    const lang = natural.detectLanguage(ctx.message.text);
    
    if (!term) {
        return ctx.reply(
            "📖 *What Is...*\n\nTell me what you want to know: /whatis phishing\n\nOr just say: 'What is phishing?'"
        );
    }
    
    const response = natural.handleWhatIs(term, lang);
    ctx.reply(response, { parse_mode: 'Markdown' });
});

// Partners
bot.command('partners', async (ctx) => {
    try { 
        await partnerSystem.handlePartnersCommand(ctx, CONFIG.COMMUNITY_LINK); 
    } catch (err) { 
        ctx.reply(
            `🤝 *PARTNERS DIRECTORY*\n\nNo partners yet. Be the first!\nContact @JoshuaGiwa\n\n👥 ${CONFIG.COMMUNITY_LINK}`,
            { parse_mode: 'Markdown' }
        ); 
    }
});

// Partner Program
bot.command('partner', (ctx) => {
    const lang = natural.detectLanguage(ctx.message.text);
    const response = natural.getResponse('partner', null, lang);
    ctx.reply(response, { parse_mode: 'Markdown' });
});

// Referral
bot.command('referral', async (ctx) => { 
    await referralSystem.handleReferralCommand(ctx); 
});

// Leaderboard
bot.command('leaderboard', async (ctx) => { 
    await referralSystem.handleLeaderboardCommand(ctx); 
});

// My Referrals
bot.command('myreferrals', async (ctx) => { 
    await referralSystem.handleMyReferralsCommand(ctx); 
});

// Plea
bot.command('plea', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply(
            `📝 *PLEA COMMAND*\n\nUsage: /plea 08012345678 I am a legitimate business`
        );
    }
    
    const phoneNumber = args[1];
    const reason = args.slice(2).join(' ') || 'No reason provided';
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length < 8 || cleaned.length > 14) {
        return ctx.reply('❌ Invalid phone number format.');
    }
    
    const result = submitPlea(cleaned, userId, username, reason);
    await ctx.reply(result.message, { parse_mode: 'Markdown' });
    
    if (result.success && result.status === 'submitted') {
        await bot.telegram.sendMessage(
            CONFIG.ADMIN_ID,
            `📋 *NEW PLEA SUBMITTED*\n🆔 ID: ${result.pleaId}\n📞 Number: ${cleaned}\n👤 User: @${username} (${userId})\n💬 Reason: ${reason}\n\n/approveplea ${result.pleaId}\n/rejectplea ${result.pleaId} [reason]`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Admin Commands
registerAdminCommands(bot, CONFIG.ADMIN_ID, partnerSystem, dailyTips, detection.scamTerms, linkModule);

// ============================================
// MEDIA HANDLERS (Images & Documents)
// ============================================

// Photo handler with OCR
bot.on('photo', async (ctx) => {
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        
        const processingMsg = await ctx.reply('🔍 *Analyzing screenshot...*', { parse_mode: 'Markdown' });
        const extractedText = await ocr.extractTextWithFallbacks(fileUrl, BOT_TOKEN);
        
        if (!extractedText || extractedText.length < 10) {
            await ctx.telegram.editMessageText(
                ctx.chat.id, 
                processingMsg.message_id, 
                null, 
                ocr.getLowQualityHelpMessage(), 
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        const lang = natural.detectLanguage(extractedText);
        const response = natural.handleCheckMessage(extractedText, lang);
        
        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            processingMsg.message_id, 
            null, 
            response, 
            { parse_mode: 'Markdown' }
        );
        
        await askForTestimonial(ctx, 'image', extractedText.substring(0, 50));
    } catch (err) {
        console.error('Photo handler error:', err);
        await ctx.reply('❌ Failed to process image. Please try again.');
    }
});

// Document handler (images only)
bot.on('document', async (ctx) => {
    try {
        const document = ctx.message.document;
        const mimeType = document.mime_type;
        
        if (!mimeType || !mimeType.startsWith('image/')) {
            await ctx.reply(
                '📄 *Please send an image file* (jpg, png) for OCR analysis.',
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        const file = await ctx.telegram.getFile(document.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        
        const processingMsg = await ctx.reply('🔍 *Analyzing file...*', { parse_mode: 'Markdown' });
        const extractedText = await ocr.extractTextWithFallbacks(fileUrl, BOT_TOKEN);
        
        if (!extractedText || extractedText.length < 10) {
            await ctx.telegram.editMessageText(
                ctx.chat.id, 
                processingMsg.message_id, 
                null, 
                ocr.getLowQualityHelpMessage(), 
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        const lang = natural.detectLanguage(extractedText);
        const response = natural.handleCheckMessage(extractedText, lang);
        
        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            processingMsg.message_id, 
            null, 
            response, 
            { parse_mode: 'Markdown' }
        );
        
        await askForTestimonial(ctx, 'file', extractedText.substring(0, 50));
    } catch (err) {
        console.error('Document handler error:', err);
        await ctx.reply('❌ Failed to process file. Please try again.');
    }
});

// ============================================
// NATURAL LANGUAGE TEXT HANDLER
// ============================================

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const message = ctx.message.text;
    
    // Skip commands (handled above)
    if (message.startsWith('/')) return;
    
    // Check for testimonial submission
    if (awaitingTestimonial[userId] && awaitingTestimonial[userId].ready) {
        const testimonial = message.trim();
        const data = awaitingTestimonial[userId];
        
        await bot.telegram.sendMessage(
            CONFIG.ADMIN_ID,
            `📝 *NEW TESTIMONIAL*\n\n👤 @${data.username || 'unknown'} (${userId})\n🔍 ${data.type}\n💬 "${testimonial}"`,
            { parse_mode: 'Markdown' }
        );
        
        await ctx.reply("✅ *Thank you for your testimonial!* 🙏");
        delete awaitingTestimonial[userId];
        return;
    }
    
    // Process natural language
    const username = ctx.from.username || ctx.from.first_name;
    const response = natural.processNaturalInput(message, userId, username);
    
    // Only reply if there's a meaningful response
    if (response && !response.includes("I don't understand")) {
        await ctx.reply(response, { parse_mode: 'Markdown' });
        
        // Ask for testimonial if it was a check
        const lower = message.toLowerCase();
        if (lower.includes('check') || lower.includes('number') || lower.includes('link')) {
            await askForTestimonial(ctx, 'natural', message.substring(0, 50));
        }
    }
});

// ============================================
// CALLBACK HANDLERS
// ============================================

bot.action('give_testimonial', async (ctx) => {
    const userId = ctx.from.id;
    awaitingTestimonial[userId] = { 
        ...awaitingTestimonial[userId], 
        username: ctx.from.username || ctx.from.first_name, 
        ready: true 
    };
    await ctx.answerCbQuery("Great! Send your testimonial now.");
    await ctx.reply("📝 *Please send your testimonial now* (2-3 sentences)");
});

bot.action('no_testimonial', async (ctx) => {
    delete awaitingTestimonial[ctx.from.id];
    await ctx.answerCbQuery("Thanks for your honesty!");
});

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

bot.action('share_bot', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("📢 Share: @JoshuaGiwaBot");
});

bot.action('copy_bot_link', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`✅ @JoshuaGiwaBot`);
});

// ============================================
// DAILY TIPS SCHEDULER
// ============================================

let lastTipDate = null;

async function sendDailyTipToGroup() {
    if (dailyTips.length === 0) return;
    
    const now = new Date();
    const nigeriaTime = new Date(now.getTime() + 3600000); // GMT+1
    const currentHour = nigeriaTime.getUTCHours();
    const currentDate = nigeriaTime.toDateString();
    
    if (currentHour === 8 && lastTipDate !== currentDate) {
        const tipIndex = (nigeriaTime.getUTCDate() - 1) % dailyTips.length;
        let todaysTip = dailyTips[tipIndex];
        
        const sponsorMessage = partnerSystem.getDailyTipSponsorMessage();
        if (sponsorMessage) todaysTip += sponsorMessage;
        
        try {
            await bot.telegram.sendMessage(
                CONFIG.GROUP_ID,
                `${todaysTip}\n\n🇳🇬 Stay safe!`,
                { parse_mode: 'Markdown' }
            );
            lastTipDate = currentDate;
        } catch (err) {
            console.log(`❌ Failed to send tip: ${err.message}`);
        }
    }
}

setInterval(sendDailyTipToGroup, 60000);

// Test Tip (admin only)
bot.command('testtip', async (ctx) => {
    if (ctx.from.id !== CONFIG.ADMIN_ID) {
        return ctx.reply('❌ Admin only.');
    }
    
    const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
    await bot.telegram.sendMessage(
        CONFIG.GROUP_ID,
        `${randomTip}\n\n🧪 *TEST*`,
        { parse_mode: 'Markdown' }
    );
    ctx.reply('✅ Test tip sent');
});

// ============================================
// LEADERBOARD SCHEDULER
// ============================================

referralSystem.startLeaderboardScheduler(bot);

// ============================================
// LAUNCH BOT
// ============================================

bot.launch().then(() => {
    console.log('========================================');
    console.log('✅ DETECTIVE JAI TELEGRAM BOT IS LIVE!');
    console.log('📊 Natural language processing enabled');
    console.log('🗣️ Pidgin + English support');
    console.log(`📊 ${getScammerCount()} scammers reported`);
    console.log('========================================');
}).catch(err => {
    console.error('❌ Launch failed:', err);
    process.exit(1);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));