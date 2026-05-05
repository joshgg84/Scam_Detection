// admin.js - Admin-only commands for Nigeria Scam Detector Bot
// Creator: Joshua Giwa

const fs = require('fs');
const { getScammerCount, getAllScammers, getRecentScammers } = require('./scammers.js');
const { dailyTips } = require('./tips.js');

// ========== STORAGE FILES FOR DOWNLOAD ==========
const STORAGE_FILES = [
    { name: "scammers.json", description: "📋 List of all reported scammers" },
    { name: "scammers.js", description: "⚙️ Scammer database manager code" },
    { name: "tips.js", description: "💡 100+ security tips" },
    { name: "bot.js", description: "🤖 Main bot code" },
    { name: "admin.js", description: "👑 Admin commands" },
    { name: "partner.js", description: "🤝 Partner system module" },
    { name: "ocr.js", description: "👁️ OCR module for reading screenshots" },
    { name: "partners.json", description: "🏪 Approved partners directory" },
    { name: "pendingPartners.json", description: "⏳ Pending partner registrations" },
    { name: "terms.json", description: "📖 Scam terms dictionary" },
    { name: "package.json", description: "📦 Dependencies list" }
];

// ========== ADMIN HELP MESSAGE ==========
function getAdminHelpMessage(partnerSystem, dailyTips, scamTerms) {
    return `
👑 *ADMIN COMMANDS*

*Partner Management:*
/approve [user_id] - Approve a partner
/reject [user_id] [reason] - Reject a partner
/verify [user_id] - Verify payment for featured partner
/find [name] - Find user by name or username
/pending - View all pending registrations

*Tip Management:*
/viewtips - View all tips
/viewtips list - List first 20 tips
/viewtips [number] - View specific tip
/addtip [text] - Add a new tip
/edittip [number] [text] - Edit a tip
/deletetip [number] - Delete a tip

*Database Management:*
/listscammers - View all reported scammers
/scammers - Same as /listscammers
/recent - View last 10 scammers
/download - Download backup files

*Stats:*
Approved partners: ${partnerSystem.getPartnersCount()}
Pending registrations: ${partnerSystem.getPendingCount()}
Total tips: ${dailyTips.length}
Total scam terms: ${Object.keys(scamTerms).length}
    `;
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

// ========== REGISTER ALL ADMIN COMMANDS ==========
function registerAdminCommands(bot, YOUR_ID, partnerSystem, dailyTips, scamTerms) {
    
    // Admin help command
    bot.command('adminhelp', (ctx) => {
        if (ctx.from.id !== YOUR_ID) {
            ctx.reply('❌ Admin only.');
            return;
        }
        ctx.reply(getAdminHelpMessage(partnerSystem, dailyTips, scamTerms), { parse_mode: 'Markdown' });
    });
    
    // Tip management
    registerTipCommands(bot, YOUR_ID, dailyTips);
    
    // Database management
    registerDatabaseCommands(bot, YOUR_ID);
    
    // Partner admin commands (passed through from partner.js)
    // These will be registered in bot.js since they need partnerSystem
    
    console.log('✅ Admin commands registered');
}

module.exports = { registerAdminCommands };