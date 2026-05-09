// referrals.js - Complete Referral System Module
// Handles: Referral tracking, leaderboard, share buttons, automated group posts

const fs = require('fs');

// ========== CONFIGURATION ==========
const REFERRALS_FILE = 'referrals.json';
const COMMUNITY_LINK = "https://t.me/+8JUqlJ-4SBdlZTM0";
const BOT_USERNAME = "@JoshuaGiwaBot";
const GROUP_ID = -1003513272328; // Your group ID

// Leaderboard post times (Nigeria time)
const LEADERBOARD_POST_TIMES = [
    { hour: 10, minute: 0 },  // 10:00 AM
    { hour: 14, minute: 0 },  // 2:00 PM
    { hour: 18, minute: 0 }   // 6:00 PM
];

// ========== LOAD/SAVE REFERRALS ==========
function loadReferrals() {
    try {
        if (fs.existsSync(REFERRALS_FILE)) {
            const data = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8'));
            return data;
        }
    } catch (err) {
        console.error('Error loading referrals:', err);
    }
    
    return {
        totalReferrals: 0,
        users: {},
        lastLeaderboardPost: null,
        lastUpdated: new Date().toISOString()
    };
}

function saveReferrals(data) {
    try {
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(REFERRALS_FILE, JSON.stringify(data, null, 2));
        console.log(`💾 Saved referral data: ${data.totalReferrals} total referrals`);
        return true;
    } catch (err) {
        console.error('Error saving referrals:', err);
        return false;
    }
}

// ========== TRACK A NEW REFERRAL ==========
function trackReferral(referrerId, newUserId, newUsername) {
    const data = loadReferrals();
    
    if (!data.users[referrerId]) {
        data.users[referrerId] = {
            name: '',
            invites: 0,
            firstInvite: new Date().toISOString()
        };
    }
    
    if (newUsername && !data.users[referrerId].name) {
        data.users[referrerId].name = newUsername.startsWith('@') ? newUsername : `@${newUsername}`;
    }
    
    data.users[referrerId].invites += 1;
    data.totalReferrals += 1;
    
    saveReferrals(data);
    console.log(`📊 Referral tracked: ${referrerId} invited ${newUserId} (Total: ${data.users[referrerId].invites})`);
    
    return {
        success: true,
        referrerInvites: data.users[referrerId].invites,
        totalReferrals: data.totalReferrals
    };
}

// ========== UPDATE USERNAME FOR LEADERBOARD ==========
function updateReferrerName(userId, username) {
    const data = loadReferrals();
    
    if (data.users[userId] && !data.users[userId].name) {
        data.users[userId].name = username.startsWith('@') ? username : `@${username}`;
        saveReferrals(data);
        return true;
    }
    return false;
}

// ========== GET REFERRAL STATS FOR A USER ==========
function getUserReferralStats(userId) {
    const data = loadReferrals();
    const userStats = data.users[userId];
    
    return {
        invites: userStats?.invites || 0,
        rank: getReferrerRank(userId),
        totalReferrals: data.totalReferrals
    };
}

// ========== GET REFERRER RANK ==========
function getReferrerRank(userId) {
    const data = loadReferrals();
    const sorted = Object.entries(data.users)
        .sort((a, b) => b[1].invites - a[1].invites)
        .map(([id]) => id);
    
    const rank = sorted.indexOf(userId.toString()) + 1;
    return rank > 0 ? rank : null;
}

// ========== GET TOP INVITERS (LEADERBOARD) ==========
function getTopInviters(limit = 10) {
    const data = loadReferrals();
    
    const topUsers = Object.entries(data.users)
        .map(([id, info]) => ({
            userId: id,
            name: info.name || `User ${id.slice(-4)}`,
            invites: info.invites
        }))
        .sort((a, b) => b.invites - a.invites)
        .slice(0, limit);
    
    return topUsers;
}

// ========== GENERATE REFERRAL LINK ==========
function getReferralLink(userId) {
    return `https://t.me/JoshuaGiwaBot?start=ref_${userId}`;
}

// ========== GENERATE SHARE BUTTONS ==========
function getShareButtons(userId) {
    const referralLink = getReferralLink(userId);
    const whatsappText = `🚨 *FREE SCAM DETECTOR* 🚨%0A%0ACheck any phone number or suspicious message before sending money.%0A%0A👉 Join here: ${referralLink}%0A%0A👥 Security group: ${COMMUNITY_LINK}`;
    
    return {
        inline_keyboard: [
            [
                { text: "📱 Share on WhatsApp", url: `https://wa.me/?text=${whatsappText}` },
                { text: "📋 Copy Link", callback_data: `copy_ref_${userId}` }
            ],
            [
                { text: "🔗 Share on Telegram", url: `https://t.me/share/url?url=${referralLink}&text=🚨 Free scam detector bot! Check any phone number or suspicious message.` },
                { text: "👥 Copy Group Link", callback_data: "copy_group" }
            ],
            [
                { text: "🏆 Leaderboard", callback_data: "show_leaderboard" },
                { text: "📊 My Stats", callback_data: `my_stats_${userId}` }
            ]
        ]
    };
}

// ========== GET SIMPLE SHARE BUTTONS (FOR /CHECK) ==========
function getSimpleShareButtons(userId) {
    const referralLink = getReferralLink(userId);
    const whatsappText = `🚨 *FREE SCAM DETECTOR* 🚨%0A%0ACheck any phone number or suspicious message before sending money.%0A%0A👉 Join here: ${referralLink}%0A%0A👥 Security group: ${COMMUNITY_LINK}`;
    
    return {
        inline_keyboard: [
            [
                { text: "📱 Share on WhatsApp", url: `https://wa.me/?text=${whatsappText}` },
                { text: "📋 Copy Link", callback_data: `copy_ref_${userId}` }
            ],
            [
                { text: "🏆 Leaderboard", callback_data: "show_leaderboard" }
            ]
        ]
    };
}

// ========== FORMAT LEADERBOARD MESSAGE ==========
function getLeaderboardMessage() {
    const topUsers = getTopInviters(10);
    const data = loadReferrals();
    
    if (topUsers.length === 0 || data.totalReferrals === 0) {
        return {
            message: `🏆 *LEADERBOARD* 🏆\n\nNo referrals yet. Be the first to invite friends!\n\nShare your referral link using /referral or /check.\n\n👑 Top inviters will be recognized here.`,
            hasData: false
        };
    }
    
    let message = `🏆 *TOP INVITERS* 🏆\n\n`;
    message += `📊 Total referrals: ${data.totalReferrals}\n\n`;
    
    for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const medal = i === 0 ? "👑" : (i === 1 ? "🥈" : (i === 2 ? "🥉" : `${i+1}.`));
        message += `${medal} *${user.name}* — ${user.invites} invite${user.invites !== 1 ? 's' : ''}\n`;
    }
    
    message += `\n🤝 Share your referral link to climb the leaderboard!\nType /referral to get your link.`;
    
    return { message, hasData: true };
}

// ========== FORMAT LEADERBOARD FOR GROUP POST ==========
function getLeaderboardForGroup() {
    const topUsers = getTopInviters(10);
    const data = loadReferrals();
    
    if (topUsers.length === 0 || data.totalReferrals === 0) {
        return {
            message: `🏆 *LEADERBOARD UPDATE* 🏆\n\nNo referrals yet. Be the first to invite friends!\n\nShare your referral link using /referral.\n\n👑 Top inviters will be recognized here.\n\n👉 @JoshuaGiwaBot`,
            hasData: false
        };
    }
    
    let message = `🏆 *LEADERBOARD UPDATE* 🏆\n\n`;
    message += `📊 Total referrals: ${data.totalReferrals}\n\n`;
    
    for (let i = 0; i < Math.min(5, topUsers.length); i++) {
        const user = topUsers[i];
        const medal = i === 0 ? "👑" : (i === 1 ? "🥈" : (i === 2 ? "🥉" : `${i+1}.`));
        message += `${medal} *${user.name}* — ${user.invites} invite${user.invites !== 1 ? 's' : ''}\n`;
    }
    
    if (topUsers.length > 5) {
        message += `\n...and ${topUsers.length - 5} more. Type /leaderboard to see full list.\n`;
    }
    
    message += `\n🤝 Invite friends to climb the leaderboard!\nGet your link: /referral\n\n🛡️ Protect others from scams: @JoshuaGiwaBot`;
    
    return { message, hasData: true };
}

// ========== FORMAT USER STATS MESSAGE ==========
function getUserStatsMessage(userId, username) {
    const stats = getUserReferralStats(userId);
    const referralLink = getReferralLink(userId);
    const rankText = stats.rank ? `#${stats.rank}` : 'Not ranked yet';
    
    let message = `📊 *YOUR REFERRAL STATS*\n\n`;
    message += `👤 *${username || 'You'}*\n`;
    message += `📨 People you invited: *${stats.invites}*\n`;
    message += `🏆 Your rank: *${rankText}*\n`;
    message += `📊 Total referrals in group: *${stats.totalReferrals}*\n\n`;
    message += `*Your referral link:*\n\`${referralLink}\`\n\n`;
    message += `Share this link. When friends join, you get credit!\n`;
    message += `👑 Top inviters get recognized in the group.`;
    
    return message;
}

// ========== ADD REFERRAL SECTION TO CHECK RESULT ==========
function addReferralSectionToCheck(resultText, userId, riskScore) {
    const referralLink = getReferralLink(userId);
    const whatsappText = `🚨 *FREE SCAM DETECTOR* 🚨%0A%0ACheck any phone number or suspicious message before sending money.%0A%0A👉 Join here: ${referralLink}%0A%0A👥 Security group: ${COMMUNITY_LINK}`;
    
    const referralSection = `
🤝 *HELP OTHERS STAY SAFE*

Share this bot with friends and family.

👇 *INVITE NOW*
    `;
    
    const buttons = {
        inline_keyboard: [
            [
                { text: "📱 Share on WhatsApp", url: `https://wa.me/?text=${whatsappText}` },
                { text: "📋 Copy Link", callback_data: `copy_ref_${userId}` }
            ],
            [
                { text: "🏆 Leaderboard", callback_data: "show_leaderboard" },
                { text: "📊 My Stats", callback_data: `my_stats_${userId}` }
            ]
        ]
    };
    
    return {
        fullText: resultText + referralSection,
        buttons: buttons
    };
}

// ========== HANDLE REFERRAL START ==========
async function handleReferralStart(ctx, referrerId, newUserId, newUsername) {
    const result = trackReferral(referrerId, newUserId, newUsername);
    
    const welcomeMessage = `
🎉 *WELCOME!* 🎉

You joined via a friend's referral.

You now have access to:
✅ Free scam number checker
✅ Suspicious message analyzer
✅ Screenshot scam detection
✅ Link checker

*Start with:* /check 08012345678

👥 Join our community: ${COMMUNITY_LINK}

🇳🇬 Stay safe. Verify first.
    `;
    
    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
    
    try {
        const referrerStats = getUserReferralStats(referrerId);
        await ctx.telegram.sendMessage(referrerId, `
🎉 *Someone joined using your referral link!*

📊 You have now invited *${referrerStats.invites}* people.

Keep sharing your link: /referral

👑 Check the leaderboard: /leaderboard
        `, { parse_mode: 'Markdown' });
    } catch (err) {
        console.log(`Could not notify referrer ${referrerId}: ${err.message}`);
    }
    
    return result;
}

// ========== POST LEADERBOARD TO GROUP ==========
async function postLeaderboardToGroup(bot) {
    try {
        const { message, hasData } = getLeaderboardForGroup();
        
        const buttons = {
            inline_keyboard: [
                [{ text: "🤝 Get Your Referral Link", url: "https://t.me/JoshuaGiwaBot?start=referral" }],
                [{ text: "🏆 View Full Leaderboard", callback_data: "show_leaderboard" }]
            ]
        };
        
        await bot.telegram.sendMessage(GROUP_ID, message, {
            parse_mode: 'Markdown',
            reply_markup: hasData ? buttons : null
        });
        
        console.log(`📢 Leaderboard posted to group at ${new Date().toLocaleString()}`);
        
        // Update last post time
        const data = loadReferrals();
        data.lastLeaderboardPost = new Date().toISOString();
        saveReferrals(data);
        
    } catch (err) {
        console.error(`❌ Failed to post leaderboard to group: ${err.message}`);
    }
}

// ========== SCHEDULE LEADERBOARD POSTS ==========
function startLeaderboardScheduler(bot) {
    console.log('⏰ Leaderboard scheduler started - will post 3 times daily (10am, 2pm, 6pm Nigeria time)');
    
    function checkAndPost() {
        const now = new Date();
        const nigeriaTime = new Date(now.getTime() + 3600000); // UTC+1
        const currentHour = nigeriaTime.getUTCHours();
        const currentMinute = nigeriaTime.getUTCMinutes();
        
        for (const postTime of LEADERBOARD_POST_TIMES) {
            if (currentHour === postTime.hour && currentMinute === postTime.minute) {
                // Check if already posted this hour
                const data = loadReferrals();
                const lastPost = data.lastLeaderboardPost ? new Date(data.lastLeaderboardPost) : null;
                
                if (lastPost) {
                    const lastPostHour = new Date(lastPost.getTime() + 3600000).getUTCHours();
                    if (lastPostHour === currentHour) {
                        return; // Already posted this hour
                    }
                }
                
                postLeaderboardToGroup(bot);
                break;
            }
        }
    }
    
    // Check every minute
    setInterval(checkAndPost, 60 * 1000);
}

// ========== COMMAND HANDLERS ==========
async function handleReferralCommand(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const stats = getUserReferralStats(userId);
    const referralLink = getReferralLink(userId);
    const buttons = getShareButtons(userId);
    
    let message = `🤝 *YOUR REFERRAL LINK*\n\n`;
    message += `👥 People you've invited: *${stats.invites}*\n`;
    message += `🏆 Your rank: *${stats.rank ? `#${stats.rank}` : 'Not ranked'}*\n`;
    message += `📊 Total referrals: *${stats.totalReferrals}*\n\n`;
    message += `*Your unique link:*\n\`${referralLink}\`\n\n`;
    message += `Share this link. When friends join, you get credit!\n`;
    message += `👑 Top inviters are recognized in the group.\n\n`;
    message += `👇 *SHARE NOW*`;
    
    await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: buttons
    });
}

async function handleLeaderboardCommand(ctx) {
    const { message, hasData } = getLeaderboardMessage();
    
    const buttons = {
        inline_keyboard: [
            [{ text: "📊 My Stats", callback_data: `my_stats_${ctx.from.id}` }],
            [{ text: "🤝 Get My Referral Link", callback_data: "get_referral_link" }]
        ]
    };
    
    await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: hasData ? buttons : null
    });
}

async function handleMyReferralsCommand(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const message = getUserStatsMessage(userId, username);
    const buttons = getShareButtons(userId);
    
    await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: buttons
    });
}

// ========== CALLBACK HANDLERS ==========
async function handleReferralCallback(ctx) {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    
    if (data === "show_leaderboard") {
        const { message, hasData } = getLeaderboardMessage();
        await ctx.answerCbQuery();
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: hasData ? {
                inline_keyboard: [
                    [{ text: "📊 My Stats", callback_data: `my_stats_${userId}` }],
                    [{ text: "🤝 Get My Link", callback_data: "get_referral_link" }]
                ]
            } : null
        });
        return;
    }
    
    if (data === "get_referral_link") {
        const referralLink = getReferralLink(userId);
        const buttons = getShareButtons(userId);
        await ctx.answerCbQuery();
        await ctx.editMessageText(`🤝 *Your Referral Link*\n\n\`${referralLink}\`\n\nShare this link with friends!\n\n👇 *SHARE NOW*`, {
            parse_mode: 'Markdown',
            reply_markup: buttons
        });
        return;
    }
    
    if (data.startsWith("my_stats_")) {
        const targetUserId = data.split("_")[2];
        const username = ctx.from.username || ctx.from.first_name;
        const message = getUserStatsMessage(targetUserId, username);
        const buttons = getShareButtons(targetUserId);
        await ctx.answerCbQuery();
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: buttons
        });
        return;
    }
    
    if (data.startsWith("copy_ref_")) {
        const targetUserId = data.split("_")[2];
        const referralLink = getReferralLink(targetUserId);
        await ctx.answerCbQuery(`Link copied! Share it with friends.`, { show_alert: false });
        await ctx.reply(`✅ *Referral link copied!*\n\nShare:\n\`${referralLink}\``, { parse_mode: 'Markdown' });
        return;
    }
    
    if (data === "copy_group") {
        await ctx.answerCbQuery(`Group link copied!`, { show_alert: false });
        await ctx.reply(`✅ *Group link copied!*\n\nShare: ${COMMUNITY_LINK}`);
        return;
    }
}

// ========== EXPORTS ==========
module.exports = {
    // Core functions
    loadReferrals,
    saveReferrals,
    trackReferral,
    updateReferrerName,
    getUserReferralStats,
    getTopInviters,
    getReferralLink,
    
    // Message formatters
    getLeaderboardMessage,
    getLeaderboardForGroup,
    getUserStatsMessage,
    getShareButtons,
    getSimpleShareButtons,
    addReferralSectionToCheck,
    
    // Scheduler
    startLeaderboardScheduler,
    postLeaderboardToGroup,
    
    // Command handlers
    handleReferralCommand,
    handleLeaderboardCommand,
    handleMyReferralsCommand,
    handleReferralStart,
    
    // Callback handlers
    handleReferralCallback
};