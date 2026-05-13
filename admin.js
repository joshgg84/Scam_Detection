// admin.js - Admin-only commands for Nigeria Scam Detector Bot
// Creator: Joshua Giwa

const fs = require('fs');
const { getScammerCount, getAllScammers, getRecentScammers } = require('./scammers.js');
const { dailyTips } = require('./tips.js');

// Import scammers module for admin functions
const scammersModule = require('./scammers.js');

// ========== STORAGE FILES FOR DOWNLOAD ==========
const STORAGE_FILES = [
    { name: "scammers.json", description: "📋 List of all verified scammers" },
    { name: "pendingReports.json", description: "⏳ Reports waiting for verification" },
    { name: "userReports.json", description: "👤 User report history (prevents duplicates)" },
    { name: "real.json", description: "⭐ Trusted numbers (require 3 reports)" },
    { name: "scammers.js", description: "⚙️ Scammer database manager code" },
    { name: "tips.js", description: "💡 100+ security tips" },
    { name: "bot.js", description: "🤖 Main bot code" },
    { name: "admin.js", description: "👑 Admin commands" },
    { name: "detection.js", description: "🔍 Scam detection logic" },
    { name: "partner.js", description: "🤝 Partner core functions" },
    { name: "partnerCommands.js", description: "📝 Partner user commands" },
    { name: "links.js", description: "🔗 Link detection module" },
    { name: "ocr.js", description: "👁️ OCR module for reading screenshots" },
    { name: "partners.json", description: "🏪 Approved partners directory" },
    { name: "pendingPartners.json", description: "⏳ Pending partner registrations" },
    { name: "terms.json", description: "📖 Scam terms dictionary" },
    { name: "links.json", description: "🔗 Reported scam links database" },
    { name: "referrals.json", description: "📊 Referral tracking database" },
    { name: "package.json", description: "📦 Dependencies list" }
];

// ========== ADMIN HELP MESSAGE ==========
function getAdminHelpMessage(partnerSystem, dailyTips, scamTerms, linkModule) {
    return `
👑 *ADMIN COMMANDS*

*Trusted Numbers (real.json)*
/addtrusted [number] - Add number to trusted list
/removetrusted [number] - Remove from trusted list
/listtrusted - Show all trusted numbers

*Pending Reports*
/pending - View pending reports awaiting verification
/verify [number] - Manually verify a pending number
/reject [number] - Reject a pending report
/userstats [user_id] - See user's report history
/userreports - View all user report statistics

*Plea Management*
/pleas - View all pending pleas
/approveplea [id] - Approve plea and remove from scammers
/rejectplea [id] [reason] - Reject plea
/allpleas - View all pleas (approved/rejected/pending)

*Partner Management*
/approve [user_id] - Approve a partner
/reject [user_id] [reason] - Reject a partner
/verify [user_id] - Verify payment for featured partner
/find [name] - Find user by name or username
/pendingpartners - View all pending partner registrations

*Tip Management*
/viewtips - View all tips
/viewtips list - List first 20 tips
/viewtips [number] - View specific tip
/addtip [text] - Add a new tip
/edittip [number] [text] - Edit a tip
/deletetip [number] - Delete a tip

*Link Management*
/listlinks - View all reported scam links
/deletelink [id] - Delete a reported scam link
/addwhitelist [domain] - Add domain to whitelist
/removewhitelist [domain] - Remove domain from whitelist
/linkstats - Show link database stats

*Database Management*
/listscammers - View all reported scammers
/scammers - Same as /listscammers
/recent - View last 10 scammers
/download - Download backup files

*Stats*
Approved partners: ${partnerSystem.getPartnersCount()}
Pending registrations: ${partnerSystem.getPendingCount()}
Total tips: ${dailyTips.length}
Total scam terms: ${Object.keys(scamTerms).length}
Total reported links: ${linkModule?.getReportedLinkCount() || 0}
    `;
}

// ========== TRUSTED NUMBER MANAGEMENT COMMANDS ==========
function registerTrustedNumberCommands(bot, YOUR_ID) {
    
    bot.command('addtrusted', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const args = ctx.message.text.split(' ');
        const phoneNumber = args[1];
        
        if (!phoneNumber) {
            ctx.reply('📞 *Usage:* `/addtrusted 08012345678`\n\nAdds a number to the trusted list. Trusted numbers need 3 unique reports to become scammers.', { parse_mode: 'Markdown' });
            return;
        }
        
        const result = scammersModule.addToTrustedList(phoneNumber);
        ctx.reply(result.success ? `✅ ${result.message}` : `❌ ${result.message}`, { parse_mode: 'Markdown' });
    });
    
    bot.command('removetrusted', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const args = ctx.message.text.split(' ');
        const phoneNumber = args[1];
        
        if (!phoneNumber) {
            ctx.reply('📞 *Usage:* `/removetrusted 08012345678`\n\nRemoves a number from the trusted list.', { parse_mode: 'Markdown' });
            return;
        }
        
        const result = scammersModule.removeFromTrustedList(phoneNumber);
        ctx.reply(result.success ? `✅ ${result.message}` : `❌ ${result.message}`, { parse_mode: 'Markdown' });
    });
    
    bot.command('listtrusted', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const trusted = scammersModule.loadTrustedNumbers();
        
        if (trusted.length === 0) {
            ctx.reply('📋 No trusted numbers in real.json');
            return;
        }
        
        let message = `⭐ *TRUSTED NUMBERS* (${trusted.length})\n\n`;
        for (let i = 0; i < trusted.length; i++) {
            message += `${i+1}. ${trusted[i]}\n`;
        }
        message += `\n📌 These numbers need 3 unique reports to become scammers.`;
        
        ctx.reply(message, { parse_mode: 'Markdown' });
    });
}

// ========== PENDING REPORTS COMMANDS ==========
function registerPendingReportsCommands(bot, YOUR_ID) {
    
    bot.command('pending', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const pending = scammersModule.getPendingReports();
        
        if (pending.length === 0) {
            ctx.reply('📋 No pending reports. All numbers are verified or clean.');
            return;
        }
        
        let message = `⏳ *PENDING REPORTS* (${pending.length} numbers waiting)\n\n`;
        
        for (let i = 0; i < pending.length; i++) {
            const p = pending[i];
            message += `${i+1}. *${p.phoneNumber}*\n`;
            message += `   Reports: ${p.reportCount}/3\n`;
            message += `   First reported: ${new Date(p.firstReported).toLocaleDateString()}\n`;
            message += `   Last reported: ${new Date(p.lastReported).toLocaleDateString()}\n`;
            message += `   Reported by: ${p.reportedBy.length} unique user(s)\n`;
            if (p.reasons && p.reasons.length > 0) {
                message += `   Last reason: "${p.reasons[p.reasons.length - 1].substring(0, 50)}"\n`;
            }
            message += `\n`;
        }
        
        message += `\n*Commands:*\n/verify [number] - Verify as scammer\n/reject [number] - Reject report`;
        
        ctx.reply(message, { parse_mode: 'Markdown' });
    });
    
    bot.command('verify', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const args = ctx.message.text.split(' ');
        const phoneNumber = args[1];
        
        if (!phoneNumber) {
            ctx.reply('📞 *Usage:* `/verify 08012345678`\n\nManually verifies a pending number as a scammer.', { parse_mode: 'Markdown' });
            return;
        }
        
        const result = scammersModule.manuallyVerifyScammer(phoneNumber);
        ctx.reply(result.success ? `✅ ${result.message}` : `❌ ${result.message}`, { parse_mode: 'Markdown' });
    });
    
    bot.command('reject', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const args = ctx.message.text.split(' ');
        const phoneNumber = args[1];
        
        if (!phoneNumber) {
            ctx.reply('📞 *Usage:* `/reject 08012345678`\n\nRejects a pending report.', { parse_mode: 'Markdown' });
            return;
        }
        
        const result = scammersModule.rejectPendingReport(phoneNumber);
        ctx.reply(result.success ? `✅ ${result.message}` : `❌ ${result.message}`, { parse_mode: 'Markdown' });
    });
    
    bot.command('userstats', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const args = ctx.message.text.split(' ');
        let userId = args[1];
        
        if (!userId) {
            ctx.reply('📞 *Usage:* `/userstats [user_id]`\n\nShows how many reports a user has made.\n\nGet user ID by asking them to type /myid', { parse_mode: 'Markdown' });
            return;
        }
        
        userId = parseInt(userId);
        const stats = scammersModule.getUserReportStats(userId);
        
        let message = `👤 *USER REPORT STATS*\n\n`;
        message += `User ID: ${stats.userId}\n`;
        message += `Total reports made: ${stats.totalReports}\n\n`;
        
        if (stats.reportedNumbers.length > 0) {
            message += `*Numbers reported:*\n`;
            for (let i = 0; i < Math.min(10, stats.reportedNumbers.length); i++) {
                message += `${i+1}. ${stats.reportedNumbers[i]}\n`;
            }
            if (stats.reportedNumbers.length > 10) {
                message += `\n...and ${stats.reportedNumbers.length - 10} more.`;
            }
        } else {
            message += `No reports yet.`;
        }
        
        ctx.reply(message, { parse_mode: 'Markdown' });
    });
    
    bot.command('userreports', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const userReports = scammersModule.loadUserReports();
        const userId = ctx.message.text.split(' ')[1];
        
        if (userId) {
            const reports = userReports[userId] || [];
            ctx.reply(`👤 *User ${userId}*\n📊 Reported ${reports.length} numbers:\n${reports.join('\n')}`, { parse_mode: 'Markdown' });
        } else {
            const totalUsers = Object.keys(userReports).length;
            const totalReports = Object.values(userReports).reduce((sum, arr) => sum + arr.length, 0);
            ctx.reply(`📊 *USER REPORTS STATS*\n\n👥 Users who reported: ${totalUsers}\n📝 Total reports submitted: ${totalReports}\n🔹 /userreports [user_id] - View specific user`, { parse_mode: 'Markdown' });
        }
    });
}

// ========== PLEA MANAGEMENT COMMANDS ==========
function registerPleaCommands(bot, YOUR_ID) {
    
    // View all pending pleas
    bot.command('pleas', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const pendingPleas = scammersModule.getPendingPleas();
        
        if (pendingPleas.length === 0) {
            ctx.reply('📋 No pending pleas. All clear.');
            return;
        }
        
        let message = `📋 *PENDING PLEAS* (${pendingPleas.length})\n\n`;
        
        for (let i = 0; i < pendingPleas.length; i++) {
            const p = pendingPleas[i];
            message += `${i+1}. *ID:* ${p.id}\n`;
            message += `   📞 *Number:* ${p.phoneNumber}\n`;
            message += `   👤 *User:* @${p.username} (${p.userId})\n`;
            message += `   💬 *Reason:* ${p.reason.substring(0, 100)}${p.reason.length > 100 ? '...' : ''}\n`;
            message += `   📅 *Submitted:* ${new Date(p.submittedAt).toLocaleString()}\n`;
            message += `   🔹 */approveplea ${p.id}*\n`;
            message += `   🔸 */rejectplea ${p.id} [reason]*\n\n`;
        }
        
        ctx.reply(message, { parse_mode: 'Markdown' });
    });
    
    // Approve a plea (remove number from scammers)
    bot.command('approveplea', async (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            ctx.reply('📞 *Usage:* `/approveplea [plea_id]`\n\nUse /pleas to see pending plea IDs.', { parse_mode: 'Markdown' });
            return;
        }
        
        const pleaId = parseInt(args[1]);
        const adminNotes = args.slice(2).join(' ') || 'Approved by admin';
        
        const result = scammersModule.approvePlea(pleaId, adminNotes);
        
        if (result.success) {
            await ctx.reply(`✅ ${result.message}`);
            
            // Notify the user
            try {
                await bot.telegram.sendMessage(result.userId, `
✅ *PLEA APPROVED*

Your plea for number *${result.phoneNumber}* has been APPROVED.

This number has been removed from the scammers database.

If this was a mistake, please contact @JoshuaGiwa.

Thank you for your patience.
                `, { parse_mode: 'Markdown' });
            } catch (err) {
                console.log(`Could not notify user ${result.userId}`);
            }
        } else {
            await ctx.reply(`❌ ${result.message}`);
        }
    });
    
    // Reject a plea
    bot.command('rejectplea', async (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            ctx.reply('📞 *Usage:* `/rejectplea [plea_id] [reason]`\n\nExample: `/rejectplea 12345 Insufficient evidence`', { parse_mode: 'Markdown' });
            return;
        }
        
        const pleaId = parseInt(args[1]);
        const adminNotes = args.slice(2).join(' ') || 'Rejected by admin';
        
        const result = scammersModule.rejectPlea(pleaId, adminNotes);
        
        if (result.success) {
            await ctx.reply(`❌ ${result.message}`);
            
            // Notify the user
            try {
                await bot.telegram.sendMessage(result.userId, `
❌ *PLEA REJECTED*

Your plea for number *${result.phoneNumber}* has been REJECTED.

Reason: ${result.adminNotes}

This number will remain in the scammers database.

If you believe this is an error, please contact @JoshuaGiwa.
                `, { parse_mode: 'Markdown' });
            } catch (err) {
                console.log(`Could not notify user ${result.userId}`);
            }
        } else {
            await ctx.reply(`❌ ${result.message}`);
        }
    });
    
    // View all pleas (approved/rejected/pending)
    bot.command('allpleas', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const allPleas = scammersModule.getAllPleas();
        
        if (allPleas.length === 0) {
            ctx.reply('📋 No pleas found.');
            return;
        }
        
        let message = `📋 *ALL PLEAS* (${allPleas.length})\n\n`;
        
        for (let i = 0; i < Math.min(20, allPleas.length); i++) {
            const p = allPleas[i];
            const statusEmoji = p.status === 'approved' ? '✅' : (p.status === 'rejected' ? '❌' : '⏳');
            message += `${i+1}. ${statusEmoji} *${p.phoneNumber}* - ${p.status.toUpperCase()}\n`;
            message += `   🆔 ID: ${p.id} | 👤 @${p.username}\n`;
            message += `   📅 ${new Date(p.submittedAt).toLocaleDateString()}\n`;
            if (p.reviewedAt) {
                message += `   📌 Reviewed: ${new Date(p.reviewedAt).toLocaleDateString()}\n`;
            }
            message += `\n`;
        }
        
        if (allPleas.length > 20) {
            message += `\n...and ${allPleas.length - 20} more.`;
        }
        
        ctx.reply(message, { parse_mode: 'Markdown' });
    });
}

// ========== TIP MANAGEMENT COMMANDS ==========
function registerTipCommands(bot, YOUR_ID, dailyTips) {
    
    bot.command('viewtips', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }

        const args = ctx.message.text.split(' ');
        
        if (args.length === 1) {
            ctx.reply(`
💡 *TIP MANAGEMENT*

Total tips: ${dailyTips.length}

*Commands:*
/viewtips list - Show first 20 tips
/viewtips all - Show all tips
/viewtips [number] - View tip #1, #2, etc.
/addtip [text] - Add a new tip
/edittip [number] [new text] - Edit a tip
/deletetip [number] - Delete a tip
            `, { parse_mode: 'Markdown' });
            return;
        }
        
        const subCommand = args[1].toLowerCase();
        
        if (subCommand === 'list') {
            let message = `💡 *TIPS (first 20 of ${dailyTips.length})*\n\n`;
            for (let i = 0; i < Math.min(20, dailyTips.length); i++) {
                let tipText = dailyTips[i].replace(/📚 \*TODAY'S TIP\*\n\n/g, '').substring(0, 50);
                message += `${i+1}. ${tipText}...\n`;
            }
            ctx.reply(message, { parse_mode: 'Markdown' });
            return;
        }
        
        if (subCommand === 'all') {
            if (dailyTips.length === 0) {
                ctx.reply(`⚠️ No tips available.`);
                return;
            }
            
            let message = `💡 *ALL TIPS (${dailyTips.length})*\n\n`;
            let chunks = [];
            let currentChunk = message;
            
            for (let i = 0; i < dailyTips.length; i++) {
                let tipText = dailyTips[i].replace(/📚 \*TODAY'S TIP\*\n\n/g, '').substring(0, 60);
                let line = `${i+1}. ${tipText}...\n`;
                if ((currentChunk + line).length > 4000) {
                    chunks.push(currentChunk);
                    currentChunk = line;
                } else {
                    currentChunk += line;
                }
            }
            chunks.push(currentChunk);
            
            for (let chunk of chunks) {
                ctx.reply(chunk, { parse_mode: 'Markdown' });
            }
            return;
        }
        
        const tipNumber = parseInt(args[1]);
        if (!isNaN(tipNumber) && tipNumber >= 1 && tipNumber <= dailyTips.length) {
            const tip = dailyTips[tipNumber - 1];
            ctx.reply(`💡 *TIP #${tipNumber}*\n\n${tip}\n\n*To edit:* /edittip ${tipNumber} [new text]`, { parse_mode: 'Markdown' });
            return;
        }
        
        ctx.reply(`❌ Invalid. Use /viewtips list or /viewtips [1-${dailyTips.length}]`);
    });

    bot.command('addtip', async (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }

        const parts = ctx.message.text.split(' ');
        if (parts.length < 2) {
            ctx.reply('📝 *Usage:* `/addtip Your new security tip here`\n\nTip will automatically get the 📚 *TODAY\'S TIP* prefix.', { parse_mode: 'Markdown' });
            return;
        }

        const newTipText = parts.slice(1).join(' ');
        const formattedTip = `📚 *TODAY'S TIP*\n\n${newTipText}`;
        
        dailyTips.push(formattedTip);
        
        const tipsContent = `// Nigeria Scam Detector - Daily Tips Database\n// Updated by admin on ${new Date().toLocaleString()}\n\nconst dailyTips = ${JSON.stringify(dailyTips, null, 4)};\n\nmodule.exports = { dailyTips };\n`;
        
        try {
            fs.writeFileSync('tips.js', tipsContent);
            ctx.reply(`✅ *TIP ADDED*\n\nTip #${dailyTips.length}: ${newTipText.substring(0, 100)}${newTipText.length > 100 ? '...' : ''}\n\nTotal tips: ${dailyTips.length}`, { parse_mode: 'Markdown' });
            console.log(`📝 Admin added tip #${dailyTips.length}`);
        } catch (err) {
            ctx.reply(`❌ Failed to save: ${err.message}`);
        }
    });

    bot.command('edittip', async (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }

        const parts = ctx.message.text.split(' ');
        if (parts.length < 3) {
            ctx.reply('📝 *Usage:* `/edittip 5 Your new tip text here`', { parse_mode: 'Markdown' });
            return;
        }

        const tipNumber = parseInt(parts[1]);
        if (isNaN(tipNumber) || tipNumber < 1 || tipNumber > dailyTips.length) {
            ctx.reply(`❌ Invalid tip number. Tips range from 1 to ${dailyTips.length}.`);
            return;
        }

        const newTipText = parts.slice(2).join(' ');
        const formattedTip = `📚 *TODAY'S TIP*\n\n${newTipText}`;
        const oldTip = dailyTips[tipNumber - 1];
        
        dailyTips[tipNumber - 1] = formattedTip;
        
        const tipsContent = `// Nigeria Scam Detector - Daily Tips Database\n// Updated by admin on ${new Date().toLocaleString()}\n\nconst dailyTips = ${JSON.stringify(dailyTips, null, 4)};\n\nmodule.exports = { dailyTips };\n`;
        
        try {
            fs.writeFileSync('tips.js', tipsContent);
            ctx.reply(`✅ *TIP #${tipNumber} UPDATED*\n\n*Old:* ${oldTip.substring(0, 80)}...\n\n*New:* ${newTipText.substring(0, 80)}...`, { parse_mode: 'Markdown' });
            console.log(`📝 Admin edited tip #${tipNumber}`);
        } catch (err) {
            ctx.reply(`❌ Failed to save: ${err.message}`);
        }
    });

    bot.command('deletetip', async (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }

        const parts = ctx.message.text.split(' ');
        if (parts.length < 2) {
            ctx.reply('📝 *Usage:* `/deletetip 5`', { parse_mode: 'Markdown' });
            return;
        }

        const tipNumber = parseInt(parts[1]);
        if (isNaN(tipNumber) || tipNumber < 1 || tipNumber > dailyTips.length) {
            ctx.reply(`❌ Invalid tip number. Tips range from 1 to ${dailyTips.length}.`);
            return;
        }

        const deletedTip = dailyTips[tipNumber - 1];
        dailyTips.splice(tipNumber - 1, 1);
        
        const tipsContent = `// Nigeria Scam Detector - Daily Tips Database\n// Updated by admin on ${new Date().toLocaleString()}\n\nconst dailyTips = ${JSON.stringify(dailyTips, null, 4)};\n\nmodule.exports = { dailyTips };\n`;
        
        try {
            fs.writeFileSync('tips.js', tipsContent);
            ctx.reply(`✅ *TIP #${tipNumber} DELETED*\n\nDeleted: ${deletedTip.substring(0, 100)}...\n\nTotal tips remaining: ${dailyTips.length}`, { parse_mode: 'Markdown' });
            console.log(`📝 Admin deleted tip #${tipNumber}`);
        } catch (err) {
            ctx.reply(`❌ Failed to save: ${err.message}`);
        }
    });
}

// ========== DATABASE COMMANDS ==========
function registerDatabaseCommands(bot, YOUR_ID) {
    
    bot.command('listscammers', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }

        const scammers = getAllScammers();
        
        if (scammers.length === 0) {
            ctx.reply('📋 No scammers reported yet.');
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

    bot.command('scammers', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }

        const scammers = getAllScammers();
        
        if (scammers.length === 0) {
            ctx.reply('📋 No scammers reported yet.');
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
            message += `/download partners.json`;
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
}

// ========== LINK MANAGEMENT COMMANDS ==========
function registerLinkCommands(bot, YOUR_ID, linkModule) {
    
    bot.command('listlinks', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const links = linkModule.getAllReportedLinks();
        if (links.length === 0) {
            ctx.reply('📋 No reported scam links yet.');
            return;
        }
        
        let message = `🔗 *REPORTED SCAM LINKS (${links.length})*\n\n`;
        for (let i = 0; i < Math.min(20, links.length); i++) {
            const l = links[i];
            message += `${i+1}. \`${l.url}\`\n`;
            message += `   📝 ${l.reason}\n`;
            message += `   📅 ${l.dateReported} | ⚠️ ${l.riskLevel}\n`;
            message += `   🆔 ID: ${l.id}\n\n`;
        }
        
        if (links.length > 20) {
            message += `\n...and ${links.length - 20} more. Use /deletelink [id] to remove.`;
        }
        
        ctx.reply(message, { parse_mode: 'Markdown' });
    });
    
    bot.command('deletelink', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            ctx.reply('📝 *Usage:* `/deletelink [link_id]`\n\nUse /listlinks to find the ID of the link to delete.', { parse_mode: 'Markdown' });
            return;
        }
        
        const linkId = parseInt(args[1]);
        if (isNaN(linkId)) {
            ctx.reply('❌ Invalid link ID. Use the number from /listlinks.');
            return;
        }
        
        const result = linkModule.deleteReportedLink(linkId);
        if (result.success) {
            ctx.reply(`✅ ${result.message}`, { parse_mode: 'Markdown' });
        } else {
            ctx.reply(`❌ ${result.message}`, { parse_mode: 'Markdown' });
        }
    });
    
    bot.command('addwhitelist', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            ctx.reply('📝 *Usage:* `/addwhitelist [domain]`\n\nExample: /addwhitelist mybank.com\n\nThis domain will never be flagged as suspicious.', { parse_mode: 'Markdown' });
            return;
        }
        
        const domain = args[1].toLowerCase();
        const result = linkModule.addToWhitelist(domain);
        ctx.reply(`${result.success ? '✅' : '⚠️'} ${result.message}`, { parse_mode: 'Markdown' });
    });
    
    bot.command('removewhitelist', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            ctx.reply('📝 *Usage:* `/removewhitelist [domain]`\n\nExample: /removewhitelist mybank.com', { parse_mode: 'Markdown' });
            return;
        }
        
        const domain = args[1].toLowerCase();
        const result = linkModule.removeFromWhitelist(domain);
        ctx.reply(`${result.success ? '✅' : '⚠️'} ${result.message}`, { parse_mode: 'Markdown' });
    });
    
    bot.command('linkstats', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        
        const count = linkModule.getReportedLinkCount();
        const data = linkModule.loadLinks();
        const whitelistCount = data.whitelist.length;
        
        ctx.reply(`
🔗 *LINK DATABASE STATS*

📊 Total reported scam links: ${count}
✅ Whitelisted domains: ${whitelistCount}
📅 Database created: ${data.settings.dateCreated || 'Unknown'}

*Commands:*
/listlinks - View all reported links
/deletelink [id] - Remove a scam link
/addwhitelist [domain] - Trust a domain
/removewhitelist [domain] - Untrust a domain
        `, { parse_mode: 'Markdown' });
    });
}

// ========== REGISTER ALL ADMIN COMMANDS ==========
function registerAdminCommands(bot, YOUR_ID, partnerSystem, dailyTips, scamTerms, linkModule) {
    
    // Admin help command
    bot.command('adminhelp', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        ctx.reply(getAdminHelpMessage(partnerSystem, dailyTips, scamTerms, linkModule), { parse_mode: 'Markdown' });
    });
    
    // Trusted number management
    registerTrustedNumberCommands(bot, YOUR_ID);
    
    // Pending reports management
    registerPendingReportsCommands(bot, YOUR_ID);
    
    // Plea management
    registerPleaCommands(bot, YOUR_ID);
    
    // Tip management
    registerTipCommands(bot, YOUR_ID, dailyTips);
    
    // Database management
    registerDatabaseCommands(bot, YOUR_ID);
    
    // Link management (if linkModule is provided)
    if (linkModule) {
        registerLinkCommands(bot, YOUR_ID, linkModule);
    }
    
    console.log('✅ Admin commands registered');
}

module.exports = { registerAdminCommands };