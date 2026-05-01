// partner.js - Complete Partner System Module
// Creator: Joshua Giwa

const fs = require('fs');

// ========== FILE PATHS ==========
const PARTNERS_FILE = 'partners.json';
const PENDING_FILE = 'pendingPartners.json';
const CONVERSATION_FILE = 'conversationState.json';

// ========== DATA STORAGE ==========
let partners = [];
let pendingPartners = [];
let settings = {};
let conversationState = {};
let currentFeaturedIndex = 0;

// ========== LOAD/SAVE FUNCTIONS ==========
function loadPartners() {
    try {
        if (fs.existsSync(PARTNERS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PARTNERS_FILE, 'utf8'));
            partners = data.partners || [];
            settings = data.settings || {};
        } else {
            partners = [];
            settings = {
                totalPartners: 0,
                totalFeatured: 0,
                lastPartnerId: 0,
                featuredPriceWeek: 15000,
                featuredPriceMonth: 50000,
                currency: "₦",
                bankName: "Zenith Bank",
                accountName: "Joshua Giwa",
                accountNumber: "4268186069",
                categories: ["tech", "finance", "realestate", "legal", "services", "shop", "education", "healthcare", "automotive", "agriculture", "logistics", "hospitality", "other"]
            };
            savePartners();
        }
    } catch (err) { console.error('Error loading partners:', err); partners = []; }
}

function savePartners() {
    const data = { settings, partners };
    fs.writeFileSync(PARTNERS_FILE, JSON.stringify(data, null, 4));
}

function loadPending() {
    try {
        if (fs.existsSync(PENDING_FILE)) {
            const data = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
            pendingPartners = data.pending || [];
        } else {
            pendingPartners = [];
            savePending();
        }
    } catch (err) { console.error('Error loading pending:', err); pendingPartners = []; }
}

function savePending() {
    const data = { pending: pendingPartners };
    fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 4));
}

function loadConversationState() {
    try {
        if (fs.existsSync(CONVERSATION_FILE)) {
            conversationState = JSON.parse(fs.readFileSync(CONVERSATION_FILE, 'utf8'));
        } else {
            conversationState = {};
            saveConversationState();
        }
    } catch (err) { console.error('Error loading conversation state:', err); conversationState = {}; }
}

function saveConversationState() {
    fs.writeFileSync(CONVERSATION_FILE, JSON.stringify(conversationState, null, 4));
}

// ========== HELPER FUNCTIONS ==========
function getPartnerByUserId(userId) {
    return partners.find(p => p.userId === userId);
}

function getPendingByUserId(userId) {
    return pendingPartners.find(p => p.userId === userId);
}

function getUserConversation(userId) {
    if (!conversationState[userId]) {
        conversationState[userId] = { step: 'idle', data: {} };
    }
    return conversationState[userId];
}

function updateConversation(userId, step, data = {}) {
    conversationState[userId] = { step, data };
    saveConversationState();
}

function clearConversation(userId) {
    delete conversationState[userId];
    saveConversationState();
}

// ========== ROUND-ROBIN FOR FEATURED PARTNERS ==========
function getNextFeaturedPartner() {
    const featured = partners.filter(p => p.featured === true && p.status === 'approved');
    if (featured.length === 0) return null;
    const partner = featured[currentFeaturedIndex % featured.length];
    currentFeaturedIndex++;
    return partner;
}

// ========== CTA BUTTONS ==========
function getPartnerButtons(partner) {
    const buttons = [];
    if (partner.contactType === 'telegram' || partner.contactType === 'both') {
        let username = partner.contact;
        if (username.startsWith('@')) username = username.substring(1);
        buttons.push([{ text: '💬 Message Partner', url: `https://t.me/${username}` }]);
    }
    if (partner.contactType === 'phone' || partner.contactType === 'both') {
        let phone = partner.contact;
        if (partner.phoneNumber) phone = partner.phoneNumber;
        phone = phone.replace(/\D/g, '');
        buttons.push([{ text: '📞 Call Partner', url: `tel:${phone}` }]);
    }
    return buttons;
}

// ========== DISPLAY PARTNERS LIST ==========
function displayPartnersList(ctx) {
    try {
        let partnersList = [];
        if (fs.existsSync(PARTNERS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PARTNERS_FILE, 'utf8'));
            partnersList = data.partners || [];
        }
        
        if (partnersList.length === 0) {
            ctx.reply(`🤝 *NO PARTNERS YET*\n\nBe the first to register!\n\nType /partner to start.`, { parse_mode: 'Markdown' });
            return;
        }
        
        let message = `🤝 *OUR TRUSTED PARTNERS*\n\n`;
        const featured = partnersList.filter(p => p.featured === true);
        const normal = partnersList.filter(p => p.featured !== true);
        
        for (let p of featured) {
            message += `⭐ *${p.businessName}* (${p.category}) [FEATURED]\n`;
            if (p.description) message += `   ${p.description.substring(0, 80)}...\n`;
            message += `   📞 ${p.contact}\n\n`;
        }
        
        let count = 1;
        for (let p of normal) {
            message += `${count}. *${p.businessName}* (${p.category})\n`;
            if (p.description) message += `   ${p.description.substring(0, 80)}...\n`;
            message += `   📞 ${p.contact}\n\n`;
            count++;
        }
        
        message += `📊 *Total:* ${partnersList.length} partners\n\n`;
        message += `Type /partner to return to menu.`;
        
        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('Display partners error:', err);
        ctx.reply(`⚠️ Error loading partners. Try again later.`);
    }
}

// ========== MAIN PARTNER COMMAND HANDLER ==========
async function handlePartnerCommand(ctx, COMMUNITY_LINK, YOUR_ID, bot) {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    const args = text.split(' ');
    const mainCommand = args[1] ? args[1].toLowerCase() : '';
    
    // Handle "paid" command
    if (mainCommand === 'paid' && args[2]) {
        const amount = args[2];
        const pending = getPendingByUserId(userId);
        
        if (!pending) {
            ctx.reply(`❌ You don't have a pending registration. Type /partner to register first.`);
            return;
        }
        
        if (pending.status !== 'awaiting_payment') {
            ctx.reply(`❌ Your registration is already ${pending.status}. Type /partner status to check.`);
            return;
        }
        
        if (pending.plan === 'free') {
            ctx.reply(`❌ You registered for the FREE plan. No payment needed.`);
            return;
        }
        
        pending.paymentClaimed = true;
        pending.paymentAmount = parseInt(amount);
        pending.paymentDate = new Date().toISOString();
        pending.status = 'payment_pending_verification';
        savePending();
        
        await bot.telegram.sendMessage(YOUR_ID, `
💰 *PAYMENT CLAIMED*

User: @${ctx.from.username || userId} (ID: ${userId})
Business: ${pending.businessName}
Plan: ${pending.plan === 'week' ? 'Featured (1 week) - ₦15,000' : 'Featured (1 month) - ₦50,000'}
Amount claimed: ₦${amount}

Check your bank account.

If payment received: /verify ${userId}
If not received: ignore or /reject ${userId}
        `, { parse_mode: 'Markdown' });
        
        ctx.reply(`
✅ *PAYMENT RECORDED*

Thank you! Your business will receive:

⭐ Top position in /partners list
⭐ Appear in EVERY /check response
⭐ Mentioned in daily tips for ${pending.plan === 'week' ? '7 days' : '30 days'}
⭐ Priority support

⏳ Admin will verify your payment within 24 hours.

*Type /partner status anytime to check.*
        `, { parse_mode: 'Markdown' });
        return;
    }
    
    // Handle "status" command
    if (mainCommand === 'status') {
        const existingPartner = getPartnerByUserId(userId);
        const pending = getPendingByUserId(userId);
        
        if (existingPartner) {
            let message = `📋 *YOUR BUSINESS STATUS*\n\n`;
            message += `Business: *${existingPartner.businessName}*\n`;
            message += `Status: ✅ ACTIVE\n`;
            if (existingPartner.featured) {
                message += `Plan: Featured (${existingPartner.plan === 'week' ? '1 week' : '1 month'})\n`;
                message += `Featured until: ${existingPartner.featuredExpiry}\n`;
            } else {
                message += `Plan: Free\n`;
            }
            ctx.reply(message, { parse_mode: 'Markdown' });
            return;
        }
        
        if (pending) {
            let statusText = '';
            if (pending.status === 'pending_approval') statusText = '⏳ Pending admin approval';
            else if (pending.status === 'awaiting_payment') statusText = '💰 Awaiting payment';
            else if (pending.status === 'payment_pending_verification') statusText = '⏳ Payment received. Awaiting admin verification.';
            else statusText = pending.status;
            
            let message = `📋 *YOUR REGISTRATION STATUS*\n\n`;
            message += `Business: *${pending.businessName}*\n`;
            message += `Plan: ${pending.plan === 'free' ? 'Free' : (pending.plan === 'week' ? 'Featured (1 week) - ₦15,000' : 'Featured (1 month) - ₦50,000')}\n`;
            message += `Status: ${statusText}\n`;
            
            if (pending.status === 'awaiting_payment') {
                message += `\n*Payment Instructions:*\n`;
                message += `${settings.bankName}\n${settings.accountNumber}\n${settings.accountName}\n`;
                message += `Amount: ${pending.plan === 'week' ? `₦${settings.featuredPriceWeek}` : `₦${settings.featuredPriceMonth}`}\n\n`;
                message += `After sending money, type: /partner paid ${pending.plan === 'week' ? settings.featuredPriceWeek : settings.featuredPriceMonth}`;
            }
            
            ctx.reply(message, { parse_mode: 'Markdown' });
            return;
        }
        
        ctx.reply(`❌ You don't have a registration. Type /partner to register.`);
        return;
    }
    
    // Full partner menu system
    const conv = getUserConversation(userId);
    
    // IDLE STATE - First time user types /partner
    if (conv.step === 'idle') {
        updateConversation(userId, 'main_menu');
        ctx.reply(`
🤝 *PARTNER HUB*

Welcome to Nigeria Security Hub Partner Directory.

*What do you want to do?*

1️⃣ *View all partners*
2️⃣ *Search by category*
3️⃣ *Register my business*
4️⃣ *My status*

*Type 1, 2, 3, or 4:*
        `);
        return;
    }
    
    // MAIN MENU - User chose a number
    if (conv.step === 'main_menu') {
        const choice = ctx.message.text.trim();
        
        // OPTION 1: View all partners
        if (choice === '1') {
            clearConversation(userId);
            displayPartnersList(ctx);
            return;
        }
        
        // OPTION 2: Search by category
        if (choice === '2') {
            updateConversation(userId, 'search_category');
            ctx.reply(`
📂 *SEARCH BY CATEGORY*

*Categories:*
tech, finance, realestate, legal, services, shop, education, healthcare, automotive, agriculture, logistics, hospitality, other

*Type a category:*
            `);
            return;
        }
        
        // OPTION 3: Register my business
        if (choice === '3') {
            const existing = getPartnerByUserId(userId);
            if (existing) {
                ctx.reply(`✅ You already have a registered business: *${existing.businessName}*\n\nType /partner status to view.`, { parse_mode: 'Markdown' });
                clearConversation(userId);
                return;
            }
            updateConversation(userId, 'choose_plan');
            ctx.reply(`
📝 *Choose your plan:*

⭐ *FEATURED (1 week)* — ₦15,000
✅ Top of /partners list
✅ Appears in every /check response
✅ Mentioned in daily tips (7 days)

⭐ *FEATURED (1 month)* — ₦50,000
✅ Top of /partners list
✅ Appears in every /check response
✅ Mentioned in daily tips (30 days)

🟢 *FREE* — ₦0
✅ Basic listing in /partners

*Type A, B, or C:*
            `);
            return;
        }
        
        // OPTION 4: My status
        if (choice === '4') {
            clearConversation(userId);
            ctx.reply(`Type /partner status to check your registration status.`);
            return;
        }
        
        // Invalid choice
        ctx.reply(`❌ Invalid choice. Type 1, 2, 3, or 4.`);
        return;
    }
    
    // SEARCH CATEGORY
    if (conv.step === 'search_category') {
        const category = ctx.message.text.trim().toLowerCase();
        const valid = ['tech', 'finance', 'realestate', 'legal', 'services', 'shop', 'education', 'healthcare', 'automotive', 'agriculture', 'logistics', 'hospitality', 'other'];
        
        if (!valid.includes(category)) {
            ctx.reply(`❌ Invalid category. Try: tech, finance, realestate, legal, services, shop, education, healthcare, automotive, agriculture, logistics, hospitality, other`);
            return;
        }
        
        let partnersList = [];
        if (fs.existsSync(PARTNERS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PARTNERS_FILE, 'utf8'));
            partnersList = data.partners || [];
        }
        
        const filtered = partnersList.filter(p => p.category === category);
        
        if (filtered.length === 0) {
            ctx.reply(`🤝 No partners found in *${category}*.\n\nBe the first! Type /partner to register.`, { parse_mode: 'Markdown' });
        } else {
            let message = `🤝 *${category.toUpperCase()} PARTNERS (${filtered.length})*\n\n`;
            for (let p of filtered) {
                message += `🏪 *${p.businessName}*\n   📞 ${p.contact}\n\n`;
            }
            ctx.reply(message, { parse_mode: 'Markdown' });
        }
        clearConversation(userId);
        return;
    }
    
    // CHOOSE PLAN
    if (conv.step === 'choose_plan') {
        const choice = ctx.message.text.trim().toUpperCase();
        let plan, amount;
        if (choice === 'A') { plan = 'free'; amount = 0; }
        else if (choice === 'B') { plan = 'week'; amount = settings.featuredPriceWeek; }
        else if (choice === 'C') { plan = 'month'; amount = settings.featuredPriceMonth; }
        else {
            ctx.reply(`❌ Invalid. Type A, B, or C.`);
            return;
        }
        
        conv.data.plan = plan;
        conv.data.amount = amount;
        updateConversation(userId, 'choose_category', conv.data);
        ctx.reply(`
📂 *Category:*
tech, finance, realestate, legal, services, shop, education, healthcare, automotive, agriculture, logistics, hospitality, other

*Type a category:*
        `);
        return;
    }
    
    // CHOOSE CATEGORY
    if (conv.step === 'choose_category') {
        const category = ctx.message.text.trim().toLowerCase();
        const valid = ['tech', 'finance', 'realestate', 'legal', 'services', 'shop', 'education', 'healthcare', 'automotive', 'agriculture', 'logistics', 'hospitality', 'other'];
        
        if (!valid.includes(category)) {
            ctx.reply(`❌ Invalid. Try: tech, finance, realestate, legal, services, shop, education, healthcare, automotive, agriculture, logistics, hospitality, other`);
            return;
        }
        
        conv.data.category = category;
        updateConversation(userId, 'choose_name', conv.data);
        ctx.reply(`📝 *Business name?*`);
        return;
    }
    
    // CHOOSE NAME
    if (conv.step === 'choose_name') {
        conv.data.businessName = ctx.message.text.trim();
        updateConversation(userId, 'choose_description', conv.data);
        ctx.reply(`📝 *Short description (max 200 characters):*`);
        return;
    }
    
    // CHOOSE DESCRIPTION
    if (conv.step === 'choose_description') {
        let desc = ctx.message.text.trim();
        if (desc.length > 200) desc = desc.substring(0, 197) + '...';
        conv.data.description = desc;
        updateConversation(userId, 'choose_contact', conv.data);
        ctx.reply(`📞 *Contact info (Telegram username or phone number):*`);
        return;
    }
    
    // CHOOSE CONTACT
    if (conv.step === 'choose_contact') {
        conv.data.contact = ctx.message.text.trim();
        conv.data.contactType = 'telegram';
        updateConversation(userId, 'confirm_registration', conv.data);
        
        const data = conv.data;
        const review = `
✅ *REVIEW YOUR REGISTRATION*

Plan: ${data.plan === 'free' ? 'Free — ₦0' : (data.plan === 'week' ? `Featured (1 week) — ₦${settings.featuredPriceWeek}` : `Featured (1 month) — ₦${settings.featuredPriceMonth}`)}
Category: ${data.category}
Business: ${data.businessName}
Description: ${data.description}
Contact: ${data.contact}

*Confirm?* Yes / No
        `;
        
        ctx.reply(review, { parse_mode: 'Markdown' });
        return;
    }
    
    // CONFIRM REGISTRATION
    if (conv.step === 'confirm_registration') {
        const answer = ctx.message.text.trim().toLowerCase();
        if (answer === 'no') {
            clearConversation(userId);
            ctx.reply(`Registration cancelled. Type /partner to start over.`);
            return;
        }
        
        if (answer !== 'yes') {
            ctx.reply(`Please reply "Yes" or "No" to confirm.`);
            return;
        }
        
        const data = conv.data;
        
        if (getPartnerByUserId(userId) || getPendingByUserId(userId)) {
            ctx.reply(`❌ You already have a registration. Type /partner status to check.`);
            clearConversation(userId);
            return;
        }
        
        const newId = Date.now();
        const pendingRecord = {
            id: newId,
            userId: userId,
            username: ctx.from.username || ctx.from.first_name,
            businessName: data.businessName,
            category: data.category,
            description: data.description,
            contact: data.contact,
            contactType: data.contactType || 'telegram',
            plan: data.plan,
            amount: data.amount,
            status: data.plan === 'free' ? 'pending_approval' : 'awaiting_payment',
            paymentClaimed: false,
            dateSubmitted: new Date().toISOString()
        };
        
        pendingPartners.push(pendingRecord);
        savePending();
        clearConversation(userId);
        
        if (data.plan === 'free') {
            await bot.telegram.sendMessage(YOUR_ID, `
📋 *NEW FREE PARTNER REGISTRATION*

Business: ${data.businessName}
User: @${ctx.from.username || userId}
Category: ${data.category}
Contact: ${data.contact}

/approve ${userId} - Approve
/reject ${userId} - Reject
            `, { parse_mode: 'Markdown' });
            
            ctx.reply(`
✅ *REGISTRATION SUBMITTED!*

Plan: Free — ₦0

Your business has been submitted for admin approval.

You'll be notified when approved.

*Type /partner status anytime to check.*
            `);
        } else {
            ctx.reply(`
✅ *REGISTRATION SUBMITTED!*

Plan: ${data.plan === 'week' ? `Featured (1 week) — ₦${settings.featuredPriceWeek}` : `Featured (1 month) — ₦${settings.featuredPriceMonth}`}

*Payment Instructions:*
${settings.bankName}
${settings.accountNumber}
${settings.accountName}
Amount: ${data.plan === 'week' ? `₦${settings.featuredPriceWeek}` : `₦${settings.featuredPriceMonth}`}

*After sending money, type:*
/partner paid ${data.plan === 'week' ? settings.featuredPriceWeek : settings.featuredPriceMonth}

*Type /partner status anytime to check.*

⚠️ Your listing will go live within 24 hours of payment confirmation.
            `);
        }
        return;
    }
}

// ========== ADMIN COMMANDS ==========
async function handleApprove(ctx, bot, YOUR_ID) {
    if (ctx.from.id !== YOUR_ID) { ctx.reply('❌ Admin only.'); return; }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) { ctx.reply('Usage: /approve [user_id]'); return; }
    
    const userId = parseInt(args[1]);
    const pending = getPendingByUserId(userId);
    
    if (!pending) { ctx.reply(`❌ No pending registration found for user ${userId}`); return; }
    
    if (pending.status !== 'pending_approval' && pending.status !== 'payment_pending_verification') {
        ctx.reply(`❌ User status is ${pending.status}. Can only approve pending_approval or payment_pending_verification.`);
        return;
    }
    
    const newPartner = {
        id: pending.id,
        userId: pending.userId,
        username: pending.username,
        businessName: pending.businessName,
        category: pending.category,
        description: pending.description,
        contact: pending.contact,
        contactType: pending.contactType || 'telegram',
        verified: pending.plan !== 'free',
        featured: pending.plan !== 'free',
        featuredExpiry: pending.plan === 'week' ? new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0] : (pending.plan === 'month' ? new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] : null),
        plan: pending.plan,
        dateAdded: new Date().toISOString().split('T')[0],
        views: 0,
        paymentVerified: pending.plan !== 'free',
        status: 'approved'
    };
    
    partners.push(newPartner);
    savePartners();
    
    const index = pendingPartners.findIndex(p => p.userId === userId);
    if (index !== -1) pendingPartners.splice(index, 1);
    savePending();
    
    await bot.telegram.sendMessage(userId, `
✅ *CONGRATULATIONS!*

Your business *${pending.businessName}* has been APPROVED!

${pending.plan !== 'free' ? '⭐ Your business is now FEATURED!' : '📋 Your business is now visible in /partners list.'}

Type /partners to see your listing.
    `, { parse_mode: 'Markdown' });
    
    ctx.reply(`✅ Approved ${pending.businessName} (User: ${userId})`);
}

async function handleReject(ctx, bot, YOUR_ID) {
    if (ctx.from.id !== YOUR_ID) { ctx.reply('❌ Admin only.'); return; }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) { ctx.reply('Usage: /reject [user_id] [reason]'); return; }
    
    const userId = parseInt(args[1]);
    const reason = args.slice(2).join(' ') || 'Not specified';
    const pending = getPendingByUserId(userId);
    
    if (!pending) { ctx.reply(`❌ No pending registration found for user ${userId}`); return; }
    
    const businessName = pending.businessName;
    const index = pendingPartners.findIndex(p => p.userId === userId);
    if (index !== -1) pendingPartners.splice(index, 1);
    savePending();
    
    await bot.telegram.sendMessage(userId, `
❌ *REGISTRATION DECLINED*

Your business *${businessName}* was not approved.

Reason: ${reason}

Type /partner to start over.
    `, { parse_mode: 'Markdown' });
    
    ctx.reply(`✅ Rejected ${businessName} (User: ${userId})`);
}

async function handleVerify(ctx, bot, YOUR_ID) {
    if (ctx.from.id !== YOUR_ID) { ctx.reply('❌ Admin only.'); return; }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) { ctx.reply('Usage: /verify [user_id]'); return; }
    
    const userId = parseInt(args[1]);
    const pending = getPendingByUserId(userId);
    
    if (!pending) { ctx.reply(`❌ No pending registration for user ${userId}`); return; }
    
    if (pending.status !== 'payment_pending_verification') {
        ctx.reply(`❌ User status is ${pending.status}. Not awaiting payment verification.`);
        return;
    }
    
    const newPartner = {
        id: pending.id,
        userId: pending.userId,
        username: pending.username,
        businessName: pending.businessName,
        category: pending.category,
        description: pending.description,
        contact: pending.contact,
        contactType: pending.contactType || 'telegram',
        verified: true,
        featured: true,
        featuredExpiry: pending.plan === 'week' ? new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0] : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        plan: pending.plan,
        dateAdded: new Date().toISOString().split('T')[0],
        views: 0,
        paymentVerified: true,
        status: 'approved'
    };
    
    partners.push(newPartner);
    savePartners();
    
    const index = pendingPartners.findIndex(p => p.userId === userId);
    if (index !== -1) pendingPartners.splice(index, 1);
    savePending();
    
    await bot.telegram.sendMessage(userId, `
✅ *PAYMENT VERIFIED!*

Your business *${pending.businessName}* is now FULLY FEATURED!

⭐ Your listing will stay at the TOP of /partners until ${newPartner.featuredExpiry}.

Type /partners to see your listing.
    `, { parse_mode: 'Markdown' });
    
    ctx.reply(`✅ Verified payment for ${pending.businessName} (User: ${userId})`);
}

function handleFind(ctx, YOUR_ID) {
    if (ctx.from.id !== YOUR_ID) { ctx.reply('❌ Admin only.'); return; }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) { ctx.reply('Usage: /find [username or name]'); return; }
    
    const query = args.slice(1).join(' ').toLowerCase();
    let results = [];
    
    for (let p of pendingPartners) {
        if (p.username.toLowerCase().includes(query) || p.businessName.toLowerCase().includes(query)) {
            results.push({ type: 'Pending', ...p });
        }
    }
    
    for (let p of partners) {
        if (p.username.toLowerCase().includes(query) || p.businessName.toLowerCase().includes(query)) {
            results.push({ type: 'Approved', ...p });
        }
    }
    
    if (results.length === 0) {
        ctx.reply(`❌ No users found matching "${query}"`);
        return;
    }
    
    let message = `🔍 *SEARCH RESULTS for "${query}"*\n\n`;
    for (let r of results) {
        message += `📌 *${r.businessName}* (${r.type})\n`;
        message += `   User: ${r.username}\n`;
        message += `   ID: ${r.userId}\n`;
        message += `   Contact: ${r.contact}\n`;
        if (r.type === 'Pending') message += `   Status: ${r.status}\n`;
        message += `\n`;
    }
    
    ctx.reply(message, { parse_mode: 'Markdown' });
}

function handlePending(ctx, YOUR_ID) {
    if (ctx.from.id !== YOUR_ID) { ctx.reply('❌ Admin only.'); return; }
    
    if (pendingPartners.length === 0) {
        ctx.reply(`📋 No pending partner registrations.`);
        return;
    }
    
    let message = `⏳ *PENDING REGISTRATIONS (${pendingPartners.length})*\n\n`;
    for (let p of pendingPartners) {
        message += `📌 *${p.businessName}* (${p.category})\n`;
        message += `   User: ${p.username} (ID: ${p.userId})\n`;
        message += `   Plan: ${p.plan === 'free' ? 'Free' : (p.plan === 'week' ? `Featured 1 week - ₦${settings.featuredPriceWeek}` : `Featured 1 month - ₦${settings.featuredPriceMonth}`)}\n`;
        message += `   Status: ${p.status}\n`;
        if (p.status === 'payment_pending_verification') {
            message += `   💰 Payment claimed: ₦${p.paymentAmount}\n`;
        }
        message += `\n`;
    }
    
    message += `\n*Commands:*\n/approve [user_id]\n/reject [user_id] [reason]\n/verify [user_id]`;
    
    ctx.reply(message, { parse_mode: 'Markdown' });
}

// ========== PUBLIC PARTNERS COMMAND ==========
async function handlePartnersCommand(ctx, COMMUNITY_LINK) {
    displayPartnersList(ctx);
}

// ========== CALLBACK HANDLER ==========
async function handlePartnerCallback(ctx, COMMUNITY_LINK) {
    const data = ctx.callbackQuery.data;
    if (data === 'partner_register') {
        await ctx.answerCbQuery();
        await ctx.reply(`Type /partner to start the registration process.`);
    }
    ctx.answerCbQuery();
}

// ========== INITIALIZE ==========
function initPartnerSystem() {
    loadPartners();
    loadPending();
    loadConversationState();
    console.log(`📊 Partner System: ${partners.length} partners, ${pendingPartners.length} pending`);
}

// ========== EXPORTS ==========
module.exports = {
    initPartnerSystem,
    handlePartnerCommand,
    handlePartnersCommand,
    handlePartnerCallback,
    handleApprove,
    handleReject,
    handleVerify,
    handleFind,
    handlePending,
    getNextFeaturedPartner,
    getPartnerButtons,
    getPartnersCount: () => partners.length,
    getPendingCount: () => pendingPartners.length
};