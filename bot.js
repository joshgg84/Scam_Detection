// bot.js - Telegram Bot with LAZY LOADING + Health Check + Admin Guard
// Detective Jai - Nigeria Scam Detector Bot

const { Telegraf } = require('telegraf');
const express = require('express');

// ========== HEALTH CHECK (Required for Render) ==========
const app = express();
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🏥 Health check running on port ${PORT}`);
});

// ========== LAZY LOAD MODULES ==========
let partnerSystem, referralSystem, detection, natural, admin, scammers, tips, ocr, linkModule;
let adminCommandsRegistered = false;

function lazyLoadModules() {
    if (!detection) {
        console.log('⏳ Lazy loading modules...');
        const start = Date.now();
        
        partnerSystem = require('./partner.js');
        referralSystem = require('./referrals.js');
        detection = require('./detection.js');
        natural = require('./natural.js');
        admin = require('./admin.js');
        scammers = require('./scammers.js');
        tips = require('./tips.js');
        ocr = require('./ocr.js');
        linkModule = require('./links.js');
        
        // Initialize systems
        partnerSystem.initPartnerSystem();
        
        console.log(`✅ Modules loaded in ${Date.now() - start}ms`);
    }
    return { partnerSystem, referralSystem, detection, natural, admin, scammers, tips, ocr, linkModule };
}

// ========== CONFIGURATION ==========
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found!');
    console.error('💡 Add BOT_TOKEN to your Render environment variables');
    process.exit(1);
}

console.log('✅ BOT_TOKEN loaded (length:', BOT_TOKEN.length, ')');

const bot = new Telegraf(BOT_TOKEN);
const YOUR_ID = 8447414897; // Your personal Telegram ID
const COMMUNITY_LINK = "https://t.me/+8JUqlJ-4SBdlZTM0";
const GROUP_ID = -1003513272328;

// Store users who want to give testimonial
let awaitingTestimonial = {};

// ========== ADMIN COMMAND REGISTRATION ==========
function registerAdminCommandsOnce() {
    if (adminCommandsRegistered) return;
    
    const modules = lazyLoadModules();
    console.log('👑 Registering admin commands...');
    
    // This registers ALL admin commands from admin.js
    modules.admin.registerAdminCommands(
        bot, 
        YOUR_ID, 
        modules.partnerSystem, 
        modules.tips.dailyTips, 
        modules.detection.scamTerms, 
        modules.linkModule
    );
    
    adminCommandsRegistered = true;
    console.log('✅ Admin commands registered successfully');
}

// ========== ADMIN GUARD MIDDLEWARE ==========
// This runs BEFORE any command to check admin access
bot.use(async (ctx, next) => {
    const msg = ctx.message?.text;
    if (msg && msg.startsWith('/')) {
        const cmd = msg.split(' ')[0].slice(1).toLowerCase();
        
        // List of admin commands
        const adminCommands = [
            'listscammers', 'scammers', 'recent', 'download',
            'addtrusted', 'removetrusted', 'listtrusted',
            'pleas', 'approveplea', 'rejectplea', 'allpleas',
            'listlinks', 'deletelink', 'addwhitelist', 'removewhitelist', 'linkstats',
            'userstats', 'userreports', 'testtip', 'adminhelp',
            'pending', 'verify', 'reject',
            'viewtips', 'addtip', 'edittip', 'deletetip'
        ];
        
        if (adminCommands.includes(cmd)) {
            // Check if user is admin
            if (ctx.from.id !== YOUR_ID) {
                return ctx.reply(
                    '🚫 *Access Denied*\n\nThis command is restricted to the bot owner.\n\n' +
                    'If you need help, please contact @JoshuaGiwa.',
                    { parse_mode: 'Markdown' }
                );
            }
            
            // Register admin commands if not already registered
            registerAdminCommandsOnce();
        }
    }
    return next();
});

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
    'listlinks', 'deletelink', 'addwhitelist', 'removewhitelist', 'linkstats',
    'viewtips', 'addtip', 'edittip', 'deletetip'
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
📚 *DETECTIVE JAI - HELP*

*Creator:* Joshua Giwa

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
    const modules = lazyLoadModules();
    const args = ctx.message.text.split(' ');
    const startParam = args[1];
    
    if (startParam && startParam.startsWith('ref_')) {
        const referrerId = startParam.split('_')[1];
        const newUserId = ctx.from.id;
        const newUsername = ctx.from.username || ctx.from.first_name;
        await modules.referralSystem.handleReferralStart(ctx, referrerId, newUserId, newUsername);
        return;
    }
    
    if (startParam === 'referral') {
        await modules.referralSystem.handleReferralCommand(ctx);
        return;
    }
    
    ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' });
});

bot.command('help', (ctx) => ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' }));
bot.command('myid', (ctx) => ctx.reply(`Your ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' }));
bot.command('community', (ctx) => ctx.reply(`👥 Join: ${COMMUNITY_LINK}`));
bot.command('support', (ctx) => ctx.reply(`💚 *Support:*\nZenith Bank\n4268186069\nJoshua Giwa`, { parse_mode: 'Markdown' }));

// ========== CHECK NUMBER ==========
bot.command('checknumber', async (ctx) => {
    const modules = lazyLoadModules();
    const args = ctx.message.text.split(' ');
    const phoneNumber = args[1];
    const userId = ctx.from.id;
    
    if (!phoneNumber) {
        ctx.reply(`📞 *Usage:* /checknumber 08012345678`, { parse_mode: 'Markdown' });
        return;
    }
    
    const phoneMatch = phoneNumber.match(/0[789][01]\d{8}/);
    if (!phoneMatch) {
        ctx.reply('❌ Invalid phone number format. Please use a valid Nigerian number like 08012345678', { parse_mode: 'Markdown' });
        return;
    }
    
    const result = modules.detection.checkNumberWithName(phoneMatch[0]);
    let response = '';
    
    if (result.isScammer) {
        response = `🚨 *ALERT!*\n${result.phoneNumber} is a REPORTED SCAMMER!\n\n❌ Do not send money\n❌ Block immediately`;
    } else if (result.isTrusted) {
        response = `✅ *TRUSTED NUMBER*\n${result.phoneNumber} - ${result.trustedName}\n\n⚠️ This is a known trusted number. Still be cautious if misused.`;
    } else {
        response = `✅ *CLEAR*\n${result.phoneNumber} has no reports.\n\n⚠️ Still be cautious.`;
    }
    
    const supportMessage = modules.partnerSystem.getRandomPartnerSupportMessage();
    response += `\n\n${supportMessage}`;
    
    const referralResult = modules.referralSystem.addReferralSectionToCheck(response, userId, 0);
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

// ========== CHECK MESSAGE ==========
bot.command('checkmsg', async (ctx) => {
    const modules = lazyLoadModules();
    const args = ctx.message.text.split(' ');
    const input = args.slice(1).join(' ');
    const userId = ctx.from.id;
    
    if (!input) {
        ctx.reply(`📝 *Usage:* /checkmsg [suspicious message]`, { parse_mode: 'Markdown' });
        return;
    }
    
    const response = modules.natural.processNaturalInput(input, userId, ctx.from.username);
    
    const referralResult = modules.referralSystem.addReferralSectionToCheck(response, userId, 0);
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

// ========== CHECK LINK ==========
bot.command('checklink', async (ctx) => {
    const modules = lazyLoadModules();
    const args = ctx.message.text.split(' ');
    const url = args[1];
    
    if (!url) {
        ctx.reply(`🔗 *Usage:* /checklink [url]`, { parse_mode: 'Markdown' });
        return;
    }
    
    const response = await modules.natural.handleCheckLink(url);
    await ctx.reply(response, { parse_mode: 'Markdown' });
    await askForTestimonial(ctx, 'link', url || 'unknown');
});

// ========== REPORT ==========
bot.command('report', async (ctx) => {
    const modules = lazyLoadModules();
    const parts = ctx.message.text.split(' ');
    const phoneNumber = parts[1];
    const reason = parts.slice(2).join(' ') || 'Suspicious activity';
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    
    if (!phoneNumber) {
        ctx.reply('📞 *Usage:* `/report 08012345678 [reason]`', { parse_mode: 'Markdown' });
        return;
    }
    
    const result = await modules.scammers.reportNumber(phoneNumber, userId, reason);
    ctx.reply(`✅ *REPORTED*\n${phoneNumber}\n${result.message}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    
    if (result.status === 'verified') {
        await bot.telegram.sendMessage(YOUR_ID, `🚨 *NUMBER VERIFIED AS SCAMMER*\n\n📞 ${phoneNumber}\n📊 Total scammers: ${result.total}\n📝 Reason: ${reason}\n👤 Reported by: @${username}`);
    }
});

// ========== REPORT LINK ==========
bot.command('reportlink', async (ctx) => {
    const modules = lazyLoadModules();
    const args = ctx.message.text.split(' ');
    const url = args[1];
    const reason = args.slice(2).join(' ') || 'Suspicious link';
    const reporter = ctx.from.username || ctx.from.id.toString();
    
    if (!url) {
        ctx.reply(`🔗 *Usage:* /reportlink [url] [reason]`, { parse_mode: 'Markdown' });
        return;
    }
    
    const result = modules.linkModule.reportLink(url, reason, reporter);
    
    if (result.success) {
        ctx.reply(`✅ *LINK REPORTED!*\n\nURL: \`${url}\`\nReason: ${reason}\nTotal reported links: ${result.total}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
        await bot.telegram.sendMessage(YOUR_ID, `🔗 *NEW SCAM LINK REPORTED*\n\nURL: ${url}\nReason: ${reason}\nReported by: @${ctx.from.username || reporter}`);
    } else {
        ctx.reply(`⚠️ *Link already reported*\n\nURL: \`${url}\`\nReason: ${result.existing.reason}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    }
});

// ========== PLEA ==========
bot.command('plea', async (ctx) => {
    const modules = lazyLoadModules();
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
    
    const result = modules.scammers.submitPlea(cleaned, userId, username, reason);
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
    const modules = lazyLoadModules();
    await modules.referralSystem.handleReferralCommand(ctx); 
});
bot.command('leaderboard', async (ctx) => { 
    const modules = lazyLoadModules();
    await modules.referralSystem.handleLeaderboardCommand(ctx); 
});
bot.command('myreferrals', async (ctx) => { 
    const modules = lazyLoadModules();
    await modules.referralSystem.handleMyReferralsCommand(ctx); 
});

// ========== PARTNERS ==========
bot.command('partners', async (ctx) => {
    const modules = lazyLoadModules();
    try {
        await modules.partnerSystem.handlePartnersCommand(ctx, COMMUNITY_LINK);
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
    const modules = lazyLoadModules();
    if (modules.tips.dailyTips.length === 0) return ctx.reply('⚠️ No tips yet.');
    const randomTip = modules.tips.dailyTips[Math.floor(Math.random() * modules.tips.dailyTips.length)];
    ctx.reply(`${randomTip}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
});

bot.command('scamtypes', (ctx) => {
    const modules = lazyLoadModules();
    const commonScams = modules.detection.getCommonScams();
    if (commonScams.length === 0) return ctx.reply('No scam terms loaded.');
    let message = `📚 *COMMON SCAMS*\n\n`;
    for (const key of commonScams.slice(0, 8)) {
        const term = modules.detection.scamTerms[key];
        if (term) message += `${term.title}\n   ${(term.content || term).split('.')[0]}.\n\n`;
    }
    ctx.reply(message + `👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
});

bot.command('redflags', (ctx) => {
    const modules = lazyLoadModules();
    ctx.reply(modules.detection.redFlagsContent, { parse_mode: 'Markdown' });
});

bot.command('whattodo', (ctx) => {
    const modules = lazyLoadModules();
    ctx.reply(modules.detection.whatToDoContent, { parse_mode: 'Markdown' });
});

bot.command('whatis', (ctx) => {
    const modules = lazyLoadModules();
    const term = ctx.message.text.split(' ').slice(1).join(' ').toLowerCase();
    if (!term) {
        ctx.reply(`📖 *Usage:* /whatis phishing\n\nAvailable: ${modules.detection.getAllTermKeys().slice(0, 15).join(', ')}`, { parse_mode: 'Markdown' });
        return;
    }
    const data = modules.detection.getTerm(term);
    if (data) ctx.reply(`${data.title}\n\n${data.content}\n\n👥 ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
    else ctx.reply(`❌ "${term}" not found. Try: ${modules.detection.getAllTermKeys().slice(0, 10).join(', ')}`);
});

bot.command('stats', (ctx) => {
    const modules = lazyLoadModules();
    ctx.reply(`📊 *STATS*\nScammers: ${modules.scammers.getScammerCount()}\nPartners: ${modules.partnerSystem.getPartnersCount()}\nTips: ${modules.tips.dailyTips.length}\nTerms: ${Object.keys(modules.detection.scamTerms).length}`, { parse_mode: 'Markdown' });
});

// ========== ADMIN HELP COMMAND ==========
bot.command('adminhelp', async (ctx) => {
    if (ctx.from.id !== YOUR_ID) {
        return ctx.reply('🚫 *Access Denied*', { parse_mode: 'Markdown' });
    }
    
    // Register admin commands first
    registerAdminCommandsOnce();
    
    // Now show help (the admin.js will handle it)
    // But we need to call the command again since registerAdminCommands registered it
    // The middleware will handle it
});

// ========== MEDIA HANDLERS ==========
bot.on('photo', async (ctx) => {
    const modules = lazyLoadModules();
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.telegram.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    const processingMsg = await ctx.reply('🔍 *Analyzing screenshot...*', { parse_mode: 'Markdown' });
    const extractedText = await modules.ocr.extractTextWithFallbacks(fileUrl, BOT_TOKEN);
    
    if (!extractedText || extractedText.length < 10) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, 
            modules.ocr.getLowQualityHelpMessage(), { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = ctx.from.id;
    const response = modules.natural.processNaturalInput(extractedText, userId, ctx.from.username);
    
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    
    const phoneMatch = extractedText.match(/0[789][01]\d{8}/g);
    if (phoneMatch) {
        for (const phone of phoneMatch) {
            const result = modules.detection.checkNumberWithName(phone);
            if (result.isScammer) {
                await ctx.reply(`🚨 *Phone found:* ${phone} → REPORTED SCAMMER!`, { parse_mode: 'Markdown' });
            } else if (result.isTrusted) {
                await ctx.reply(`✅ *Phone found:* ${phone} (${result.trustedName}) → TRUSTED NUMBER`, { parse_mode: 'Markdown' });
            } else {
                await ctx.reply(`📞 *Phone found:* ${phone} → Not reported yet.`, { parse_mode: 'Markdown' });
            }
        }
    }
    
    await askForTestimonial(ctx, 'image', extractedText.substring(0, 50));
});

bot.on('document', async (ctx) => {
    const modules = lazyLoadModules();
    const document = ctx.message.document;
    const mimeType = document.mime_type;
    
    if (!mimeType || !mimeType.startsWith('image/')) {
        await ctx.reply('📄 *Please send an image file* (jpg, png) for OCR analysis.', { parse_mode: 'Markdown' });
        return;
    }
    
    const file = await ctx.telegram.getFile(document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    const processingMsg = await ctx.reply('🔍 *Analyzing file...*', { parse_mode: 'Markdown' });
    const extractedText = await modules.ocr.extractTextWithFallbacks(fileUrl, BOT_TOKEN);
    
    if (!extractedText || extractedText.length < 10) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, 
            modules.ocr.getLowQualityHelpMessage(), { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = ctx.from.id;
    const response = modules.natural.processNaturalInput(extractedText, userId, ctx.from.username);
    
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, response, { parse_mode: 'Markdown' });
    
    const phoneMatch = extractedText.match(/0[789][01]\d{8}/g);
    if (phoneMatch) {
        for (const phone of phoneMatch) {
            const result = modules.detection.checkNumberWithName(phone);
            if (result.isScammer) {
                await ctx.reply(`🚨 *Phone found:* ${phone} → REPORTED SCAMMER!`, { parse_mode: 'Markdown' });
            } else if (result.isTrusted) {
                await ctx.reply(`✅ *Phone found:* ${phone} (${result.trustedName}) → TRUSTED NUMBER`, { parse_mode: 'Markdown' });
            } else {
                await ctx.reply(`📞 *Phone found:* ${phone} → Not reported yet.`, { parse_mode: 'Markdown' });
            }
        }
    }
    
    await askForTestimonial(ctx, 'file', extractedText.substring(0, 50));
});

// ========== TEXT MESSAGE HANDLER ==========
bot.on('text', async (ctx) => {
    const modules = lazyLoadModules();
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
    
    const response = modules.natural.processNaturalInput(message, userId, ctx.from.username);
    
    if (response && response.length > 5) {
        await ctx.reply(response, { parse_mode: 'Markdown' });
        
        if (response.includes('RISK') || response.includes('SCAMMER') || response.includes('CLEAR')) {
            await askForTestimonial(ctx, 'auto_message', message.substring(0, 50));
        }
    }
});

// ========== CALLBACK HANDLERS ==========
bot.action(/copy_ref_\d+/, async (ctx) => { 
    const modules = lazyLoadModules();
    await modules.referralSystem.handleReferralCallback(ctx); 
});
bot.action('copy_group', async (ctx) => { 
    const modules = lazyLoadModules();
    await modules.referralSystem.handleReferralCallback(ctx); 
});
bot.action('show_leaderboard', async (ctx) => { 
    const modules = lazyLoadModules();
    await modules.referralSystem.handleReferralCallback(ctx); 
});
bot.action(/my_stats_\d+/, async (ctx) => { 
    const modules = lazyLoadModules();
    await modules.referralSystem.handleReferralCallback(ctx); 
});
bot.action('get_referral_link', async (ctx) => { 
    const modules = lazyLoadModules();
    await modules.referralSystem.handleReferralCallback(ctx); 
});

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
    const modules = lazyLoadModules();
    if (modules.tips.dailyTips.length === 0) return;
    
    const now = new Date();
    const nigeriaTime = new Date(now.getTime() + 3600000);
    const currentHour = nigeriaTime.getUTCHours();
    const currentDate = nigeriaTime.toDateString();
    
    if (currentHour === 8 && lastTipDate !== currentDate) {
        const dayOfMonth = nigeriaTime.getUTCDate();
        const tipIndex = (dayOfMonth - 1) % modules.tips.dailyTips.length;
        let todaysTip = modules.tips.dailyTips[tipIndex];
        
        const sponsorMessage = modules.partnerSystem.getDailyTipSponsorMessage();
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
    const modules = lazyLoadModules();
    const randomTip = modules.tips.dailyTips[Math.floor(Math.random() * modules.tips.dailyTips.length)];
    try {
        await bot.telegram.sendMessage(GROUP_ID, `${randomTip}\n\n🧪 *TEST*`, { parse_mode: 'Markdown' });
        ctx.reply('✅ Test tip sent');
    } catch (err) {
        ctx.reply(`❌ Failed: ${err.message}`);
    }
});

// ========== START LEADERBOARD SCHEDULER ==========
// Will be loaded when needed

// ========== LAUNCH ==========
console.log('🚀 Starting bot...');

bot.launch()
    .then(() => {
        console.log('========================================');
        console.log('✅ DETECTIVE JAI TELEGRAM BOT IS LIVE!');
        console.log('🤖 Bot is ready to receive messages!');
        console.log('👑 Admin: @JoshuaGiwa (ID: ' + YOUR_ID + ')');
        console.log('========================================');
        console.log('💡 Admin commands will register on first use.');
        console.log('   Type /adminhelp to get started.');
    })
    .catch(err => {
        console.error('❌ Launch failed:', err);
        console.error('Error details:', err.message);
        if (err.response) {
            console.error('Telegram response:', err.response);
        }
        process.exit(1);
    });

process.once('SIGINT', () => {
    console.log('🛑 Received SIGINT, stopping...');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, stopping...');
    bot.stop('SIGTERM');
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection:', reason);
});