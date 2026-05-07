// partnerCommands.js - Partner System Commands
// Handles: /partner registration flow, /approve, /reject, /verify, /find, /pending

const fs = require('fs');
const core = require('./partner.js');

// ========== CONTACT INFO ==========
const CONTACT = {
    whatsapp: "09025839789",
    telegram: "@JoshuaGiwa"
};

// ========== REGISTER PARTNER COMMAND HANDLER ==========
async function handlePartnerCommand(ctx, COMMUNITY_LINK, YOUR_ID, bot) {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    const args = text.split(' ');
    const mainCommand = args[1] ? args[1].toLowerCase() : '';
    
    // Handle "paid" command
    if (mainCommand === 'paid' && args[2]) {
        const amount = parseInt(args[2]);
        const pending = core.getPendingByUserId(userId);
        
        if (!pending) {
            ctx.reply(`❌ You don't have a pending registration. Type /partner to register first.`);
            return;
        }
        
        if (pending.status !== 'awaiting_payment') {
            ctx.reply(`❌ Your registration is already ${pending.status}. Type /partner status to check.`);
            return;
        }
        
        if (pending.plan === 'standard_trial' || pending.plan === 'premium_trial') {
            pending.status = 'payment_pending_verification';
            pending.paymentVerified = true;
            pending.isTrial = true;
            core.savePending();
            
            ctx.reply(`
✅ *FREE TRIAL ACTIVATED!*

Your ${pending.tier === 'standard' ? 'Standard' : 'Premium'} Partner free trial has been activated.

Trial expires in ${pending.tier === 'standard' ? '3 weeks' : '1 week'}.

Admin will activate your listing shortly.
            `);
            
            await bot.telegram.sendMessage(YOUR_ID, `
🎁 *FREE TRIAL ACTIVATED*

User: @${ctx.from.username || userId}
Business: ${pending.businessName}
Tier: ${pending.tier.toUpperCase()} (${pending.tier === 'standard' ? '3 weeks' : '1 week'} trial)

/approve ${userId} - Approve trial partner
            `, { parse_mode: 'Markdown' });
            return;
        }
        
        pending.paymentClaimed = true;
        pending.paymentAmount = amount;
        pending.paymentDate = new Date().toISOString();
        pending.status = 'payment_pending_verification';
        core.savePending();
        
        await bot.telegram.sendMessage(YOUR_ID, `
💰 *PAYMENT CLAIMED*

User: @${ctx.from.username || userId} (ID: ${userId})
Business: ${pending.businessName}
Tier: ${pending.tier.toUpperCase()}
Plan: ${pending.plan}
Amount claimed: ₦${amount}

Check your bank account.

If payment received: /verify ${userId}
If not received: ignore or /reject ${userId}
        `, { parse_mode: 'Markdown' });
        
        ctx.reply(`
✅ *PAYMENT RECORDED*

Thank you! Your ${pending.tier === 'standard' ? 'Standard' : 'Premium'} Partner benefits will activate within 24 hours.

⏳ Admin will verify your payment.

*Type /partner status anytime to check.*
        `, { parse_mode: 'Markdown' });
        return;
    }
    
    // Handle "status" command
    if (mainCommand === 'status') {
        const existingPartner = core.getPartnerByUserId(userId);
        const pending = core.getPendingByUserId(userId);
        
        if (existingPartner) {
            let message = `📋 *YOUR BUSINESS STATUS*\n\n`;
            message += `Business: *${existingPartner.businessName}*\n`;
            message += `Status: ✅ ACTIVE\n`;
            message += `Tier: *${existingPartner.tier === 'standard' ? 'Standard Partner' : 'Premium Partner'}*\n`;
            if (existingPartner.featured) {
                message += `Featured until: ${existingPartner.featuredExpiry}\n`;
                if (existingPartner.tier === 'premium') {
                    message += `📢 Your sponsorship message appears in daily tips.\n`;
                }
            }
            if (existingPartner.isTrial) {
                message += `\n⚠️ *FREE TRIAL* - Expires: ${existingPartner.featuredExpiry}`;
            }
            ctx.reply(message, { parse_mode: 'Markdown' });
            return;
        }
        
        if (pending) {
            let statusText = '';
            if (pending.status === 'pending_approval') statusText = '⏳ Pending admin approval';
            else if (pending.status === 'awaiting_payment') statusText = '💰 Awaiting payment';
            else if (pending.status === 'payment_pending_verification') statusText = '⏳ Awaiting admin verification';
            else statusText = pending.status;
            
            let message = `📋 *YOUR REGISTRATION STATUS*\n\n`;
            message += `Business: *${pending.businessName}*\n`;
            message += `Tier: *${pending.tier === 'standard' ? 'Standard Partner' : 'Premium Partner'}*\n`;
            message += `Plan: ${pending.plan === 'standard_trial' ? 'Free Trial (3 weeks)' : (pending.plan === 'premium_trial' ? 'Free Trial (1 week)' : pending.plan)}\n`;
            message += `Status: ${statusText}\n`;
            
            if (pending.status === 'awaiting_payment' && !pending.plan.includes('trial')) {
                const planPrice = core.PLANS[pending.tier].price[pending.plan];
                message += `\n*Payment Instructions:*\n`;
                message += `Zenith Bank\n4268186069\nJoshua Giwa\n`;
                message += `Amount: ₦${planPrice}\n\n`;
                message += `After sending money, type: /partner paid ${planPrice}`;
            }
            
            ctx.reply(message, { parse_mode: 'Markdown' });
            return;
        }
        
        ctx.reply(`❌ You don't have a registration. Type /partner to register.`);
        return;
    }
    
    // Full partner menu system
    const conv = core.getUserConversation(userId);
    
    if (conv.step === 'idle') {
        core.updateConversation(userId, 'main_menu');
        ctx.reply(`
🤝 *PARTNER PROGRAM*

Partner with Nigeria's fastest-growing scam detection network.

*Standard Partner* (₦11,000/month)
✅ Business contact in /partners
✅ Partner badge
✅ Featured in daily tips

*Premium Partner* (₦17,000/month)
✅ Everything in Standard
✅ Business spotlight in group
✅ Sponsorship message in /check responses

*Free Trials Available:*
• Standard: 3 weeks free
• Premium: 1 week free

*What do you want to do?*

1️⃣ *View all partners*
2️⃣ *Register my business*
3️⃣ *My status*

*Type 1, 2, or 3:*
        `);
        return;
    }
    
    if (conv.step === 'main_menu') {
        const choiceRaw = ctx.message.text.trim();
        const choiceNum = parseInt(choiceRaw);
        
        if (choiceNum === 1) {
            core.clearConversation(userId);
            await core.handlePartnersCommand(ctx, COMMUNITY_LINK);
            return;
        }
        
        if (choiceNum === 2) {
            const existing = core.getPartnerByUserId(userId);
            if (existing) {
                ctx.reply(`✅ You already have a registered business: *${existing.businessName}*\n\nType /partner status to view.`, { parse_mode: 'Markdown' });
                core.clearConversation(userId);
                return;
            }
            core.updateConversation(userId, 'choose_tier');
            ctx.reply(`
📝 *Choose your partnership tier:*

💎 *PREMIUM PARTNER* - ₦17,000/month
✅ Everything in Standard
✅ Business spotlight in group
✅ Sponsorship message in /check responses
✅ FREE 1-week trial available

⭐ *STANDARD PARTNER* - ₦11,000/month
✅ Business contact in /partners
✅ Partner badge
✅ Featured in daily tips
✅ FREE 3-week trial available

*Type:* PREMIUM or STANDARD
        `);
            return;
        }
        
        if (choiceNum === 3) {
            core.clearConversation(userId);
            ctx.reply(`Type /partner status to check your registration status.`);
            return;
        }
        
        ctx.reply(`❌ Invalid choice. Type 1, 2, or 3.`);
        return;
    }
    
    if (conv.step === 'choose_tier') {
        const choice = ctx.message.text.trim().toLowerCase();
        let tier;
        if (choice === 'premium') tier = 'premium';
        else if (choice === 'standard') tier = 'standard';
        else {
            ctx.reply(`❌ Invalid. Type PREMIUM or STANDARD.`);
            return;
        }
        
        conv.data.tier = tier;
        core.updateConversation(userId, 'choose_plan', conv.data);
        
        if (tier === 'premium') {
            ctx.reply(`
💎 *PREMIUM PARTNER PLANS*

Choose your payment plan:

1) *1 month* - ₦17,000
2) *3 months* - ₦50,000 (save ₦1,000)
3) *6 months* - ₦100,000 (save ₦2,000)
4) *Free trial* - 1 week free

*Type: 1, 2, 3, or 4*
            `);
        } else {
            ctx.reply(`
⭐ *STANDARD PARTNER PLANS*

Choose your payment plan:

1) *1 month* - ₦11,000
2) *3 months* - ₦30,000 (save ₦3,000)
3) *6 months* - ₦60,000 (save ₦6,000)
4) *Free trial* - 3 weeks free

*Type: 1, 2, 3, or 4*
            `);
        }
        return;
    }
    
    if (conv.step === 'choose_plan') {
        const choice = ctx.message.text.trim();
        const tier = conv.data.tier;
        let plan, amount;
        
        if (choice === '1') { plan = 'month'; amount = core.PLANS[tier].price.month; }
        else if (choice === '2') { plan = 'quarter'; amount = core.PLANS[tier].price.quarter; }
        else if (choice === '3') { plan = 'half'; amount = core.PLANS[tier].price.half; }
        else if (choice === '4') { plan = `${tier}_trial`; amount = 0; }
        else {
            ctx.reply(`❌ Invalid. Type 1, 2, 3, or 4.`);
            return;
        }
        
        conv.data.plan = plan;
        conv.data.amount = amount;
        core.updateConversation(userId, 'choose_category', conv.data);
        ctx.reply(`
📂 *Category:*
tech | finance | realestate | legal | services | shop | education | healthcare | automotive | agriculture | logistics | hospitality | other

*Type a category:*
        `);
        return;
    }
    
    if (conv.step === 'choose_category') {
        const category = ctx.message.text.trim().toLowerCase();
        const valid = ['tech', 'finance', 'realestate', 'legal', 'services', 'shop', 'education', 'healthcare', 'automotive', 'agriculture', 'logistics', 'hospitality', 'other'];
        
        if (!valid.includes(category)) {
            ctx.reply(`❌ Invalid. Try: ${valid.join(', ')}`);
            return;
        }
        
        conv.data.category = category;
        core.updateConversation(userId, 'choose_name', conv.data);
        ctx.reply(`📝 *Business name?*`);
        return;
    }
    
    if (conv.step === 'choose_name') {
        conv.data.businessName = ctx.message.text.trim();
        core.updateConversation(userId, 'choose_description', conv.data);
        ctx.reply(`📝 *Short description (max 200 characters):*`);
        return;
    }
    
    if (conv.step === 'choose_description') {
        let desc = ctx.message.text.trim();
        if (desc.length > 200) desc = desc.substring(0, 197) + '...';
        conv.data.description = desc;
        core.updateConversation(userId, 'choose_contact', conv.data);
        ctx.reply(`📞 *Contact info (Telegram username or phone number):*`);
        return;
    }
    
    if (conv.step === 'choose_contact') {
        conv.data.contact = ctx.message.text.trim();
        core.updateConversation(userId, 'choose_sponsorship', conv.data);
        ctx.reply(`
📢 *Sponsorship Message (for Premium partners only)*

This message will appear in daily security tips and /check responses.

Example: "Stay safe with [Business Name] - [Your service]"

*Type your sponsorship message (max 100 characters):*
(If Standard partner, type SKIP)
        `);
        return;
    }
    
    if (conv.step === 'choose_sponsorship') {
        let sponsorshipMsg = ctx.message.text.trim();
        if (sponsorshipMsg.toUpperCase() === 'SKIP') sponsorshipMsg = null;
        
        conv.data.sponsorshipMessage = sponsorshipMsg;
        core.updateConversation(userId, 'confirm_registration', conv.data);
        
        const data = conv.data;
        const isTrial = data.plan.includes('trial');
        const amountText = isTrial ? 'FREE TRIAL' : `₦${data.amount}`;
        
        let review = `
✅ *REVIEW YOUR REGISTRATION*

Tier: ${data.tier === 'premium' ? '💎 PREMIUM' : '⭐ STANDARD'}
Plan: ${data.plan} - ${amountText}
Category: ${data.category}
Business: ${data.businessName}
Description: ${data.description}
Contact: ${data.contact}
`;

        if (data.sponsorshipMessage) {
            review += `Sponsorship: "${data.sponsorshipMessage}"\n`;
        }
        
        review += `\n*Confirm?* Yes / No`;
        
        ctx.reply(review, { parse_mode: 'Markdown' });
        return;
    }
    
    if (conv.step === 'confirm_registration') {
        const answer = ctx.message.text.trim().toLowerCase();
        if (answer === 'no') {
            core.clearConversation(userId);
            ctx.reply(`Registration cancelled. Type /partner to start over.`);
            return;
        }
        
        if (answer !== 'yes') {
            ctx.reply(`Please reply "Yes" or "No" to confirm.`);
            return;
        }
        
        const data = conv.data;
        
        if (core.getPartnerByUserId(userId) || core.getPendingByUserId(userId)) {
            ctx.reply(`❌ You already have a registration. Type /partner status to check.`);
            core.clearConversation(userId);
            return;
        }
        
        const isTrial = data.plan.includes('trial');
        
        const newId = Date.now();
        const pendingRecord = {
            id: newId,
            userId: userId,
            username: ctx.from.username || ctx.from.first_name,
            businessName: data.businessName,
            category: data.category,
            description: data.description,
            contact: data.contact,
            contactType: 'telegram',
            sponsorshipMessage: data.sponsorshipMessage || null,
            tier: data.tier,
            plan: data.plan,
            amount: data.amount,
            isTrial: isTrial,
            status: isTrial ? 'pending_approval' : 'awaiting_payment',
            paymentClaimed: false,
            dateSubmitted: new Date().toISOString()
        };
        
        core.pendingPartners.push(pendingRecord);
        core.savePending();
        core.clearConversation(userId);
        
        if (isTrial) {
            await bot.telegram.sendMessage(YOUR_ID, `
🎁 *NEW ${data.tier.toUpperCase()} TRIAL REGISTRATION*

Business: ${data.businessName}
User: @${ctx.from.username || userId}
Category: ${data.category}
Trial: ${data.tier === 'standard' ? '3 weeks' : '1 week'}

/approve ${userId} - Approve trial partner
/reject ${userId} - Reject
            `, { parse_mode: 'Markdown' });
            
            ctx.reply(`
✅ *FREE TRIAL SUBMITTED!*

Your ${data.tier === 'standard' ? 'Standard' : 'Premium'} Partner free trial (${data.tier === 'standard' ? '3 weeks' : '1 week'}) has been submitted for admin approval.

You'll be notified when activated.

*Type /partner status anytime to check.*
            `);
        } else {
            const planPrice = core.PLANS[data.tier].price[data.plan];
            ctx.reply(`
✅ *REGISTRATION SUBMITTED!*

Tier: ${data.tier === 'premium' ? 'Premium Partner' : 'Standard Partner'}
Plan: ${data.plan} - ₦${planPrice}

*Payment Instructions:*
Zenith Bank
4268186069
Joshua Giwa
Amount: ₦${planPrice}

*After sending money, type:*
/partner paid ${planPrice}

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
    const pending = core.getPendingByUserId(userId);
    
    if (!pending) { ctx.reply(`❌ No pending registration found for user ${userId}`); return; }
    
    const isTrial = pending.isTrial;
    const durationWeeks = isTrial ? (pending.tier === 'standard' ? 3 : 1) : (pending.plan === 'month' ? 4 : (pending.plan === 'quarter' ? 12 : 24));
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (durationWeeks * 7));
    
    const newPartner = {
        id: pending.id,
        userId: pending.userId,
        username: pending.username,
        businessName: pending.businessName,
        category: pending.category,
        description: pending.description,
        contact: pending.contact,
        contactType: pending.contactType || 'telegram',
        sponsorshipMessage: pending.sponsorshipMessage || null,
        tier: pending.tier,
        plan: pending.plan,
        isTrial: isTrial,
        featured: true,
        featuredExpiry: expiryDate.toISOString().split('T')[0],
        dateAdded: new Date().toISOString().split('T')[0],
        views: 0,
        paymentVerified: !isTrial,
        status: 'approved'
    };
    
    core.partners.push(newPartner);
    core.settings.totalPartners = core.partners.length;
    core.savePartners();
    
    const index = core.pendingPartners.findIndex(p => p.userId === userId);
    if (index !== -1) core.pendingPartners.splice(index, 1);
    core.savePending();
    
    await bot.telegram.sendMessage(userId, `
✅ *CONGRATULATIONS!*

Your business *${pending.businessName}* has been APPROVED as a ${pending.tier === 'premium' ? 'PREMIUM PARTNER' : 'STANDARD PARTNER'}!

${isTrial ? `🎁 Your FREE TRIAL is active for ${pending.tier === 'standard' ? '3 weeks' : '1 week'}.` : 'Thank you for your payment!'}

⭐ Your business is now FEATURED in /partners.
${pending.tier === 'premium' ? '📢 Your sponsorship message will appear in daily tips and /check responses.' : ''}

Thank you for supporting Nigeria Security Hub!

Type /partners to see your listing.
    `, { parse_mode: 'Markdown' });
    
    ctx.reply(`✅ Approved ${pending.businessName} (${pending.tier.toUpperCase()}) - User: ${userId}`);
}

async function handleReject(ctx, bot, YOUR_ID) {
    if (ctx.from.id !== YOUR_ID) { ctx.reply('❌ Admin only.'); return; }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) { ctx.reply('Usage: /reject [user_id] [reason]'); return; }
    
    const userId = parseInt(args[1]);
    const reason = args.slice(2).join(' ') || 'Not specified';
    const pending = core.getPendingByUserId(userId);
    
    if (!pending) { ctx.reply(`❌ No pending registration found for user ${userId}`); return; }
    
    const businessName = pending.businessName;
    const index = core.pendingPartners.findIndex(p => p.userId === userId);
    if (index !== -1) core.pendingPartners.splice(index, 1);
    core.savePending();
    
    await bot.telegram.sendMessage(userId, `
❌ *REGISTRATION DECLINED*

Your business *${businessName}* was not approved.

Reason: ${reason}

You can reapply anytime with corrected information.

Type /partner to start over.
    `, { parse_mode: 'Markdown' });
    
    ctx.reply(`✅ Rejected ${businessName} (User: ${userId}) - Reason: ${reason}`);
}

async function handleVerify(ctx, bot, YOUR_ID) {
    if (ctx.from.id !== YOUR_ID) { ctx.reply('❌ Admin only.'); return; }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) { ctx.reply('Usage: /verify [user_id]'); return; }
    
    const userId = parseInt(args[1]);
    const pending = core.getPendingByUserId(userId);
    
    if (!pending) { ctx.reply(`❌ No pending registration for user ${userId}`); return; }
    
    if (pending.status !== 'payment_pending_verification') {
        ctx.reply(`❌ User status is ${pending.status}. Not awaiting payment verification.`);
        return;
    }
    
    const durationWeeks = pending.plan === 'month' ? 4 : (pending.plan === 'quarter' ? 12 : 24);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (durationWeeks * 7));
    
    const newPartner = {
        id: pending.id,
        userId: pending.userId,
        username: pending.username,
        businessName: pending.businessName,
        category: pending.category,
        description: pending.description,
        contact: pending.contact,
        contactType: pending.contactType || 'telegram',
        sponsorshipMessage: pending.sponsorshipMessage || null,
        tier: pending.tier,
        plan: pending.plan,
        isTrial: false,
        featured: true,
        featuredExpiry: expiryDate.toISOString().split('T')[0],
        dateAdded: new Date().toISOString().split('T')[0],
        views: 0,
        paymentVerified: true,
        status: 'approved'
    };
    
    core.partners.push(newPartner);
    core.settings.totalPartners = core.partners.length;
    core.savePartners();
    
    const index = core.pendingPartners.findIndex(p => p.userId === userId);
    if (index !== -1) core.pendingPartners.splice(index, 1);
    core.savePending();
    
    await bot.telegram.sendMessage(userId, `
✅ *PAYMENT VERIFIED!*

Your business *${pending.businessName}* is now a FULLY ACTIVE ${pending.tier === 'premium' ? 'PREMIUM' : 'STANDARD'} PARTNER!

⭐ Your listing will stay at the TOP of /partners until ${newPartner.featuredExpiry}.
${pending.tier === 'premium' ? '📢 Your sponsorship message will appear in daily tips and /check responses.' : ''}

Thank you for supporting Nigeria Security Hub!

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
    
    for (let p of core.pendingPartners) {
        if (p.username.toLowerCase().includes(query) || p.businessName.toLowerCase().includes(query)) {
            results.push({ type: 'Pending', ...p });
        }
    }
    
    for (let p of core.partners) {
        if (p.username.toLowerCase().includes(query) || p.businessName.toLowerCase().includes(query)) {
            results.push({ type: 'Approved', tier: p.tier, ...p });
        }
    }
    
    if (results.length === 0) {
        ctx.reply(`❌ No users found matching "${query}"`);
        return;
    }
    
    let message = `🔍 *SEARCH RESULTS for "${query}"*\n\n`;
    for (let r of results) {
        message += `📌 *${r.businessName}* (${r.type})${r.tier ? ` - ${r.tier.toUpperCase()}` : ''}\n`;
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
    
    if (core.pendingPartners.length === 0) {
        ctx.reply(`📋 No pending partner registrations.`);
        return;
    }
    
    let message = `⏳ *PENDING REGISTRATIONS (${core.pendingPartners.length})*\n\n`;
    for (let p of core.pendingPartners) {
        message += `📌 *${p.businessName}* (${p.category})\n`;
        message += `   User: ${p.username} (ID: ${p.userId})\n`;
        message += `   Contact: ${p.contact}\n`;
        message += `   Tier: ${p.tier === 'premium' ? 'PREMIUM' : 'STANDARD'}\n`;
        message += `   Plan: ${p.plan}${p.isTrial ? ' (FREE TRIAL)' : ''}\n`;
        message += `   Status: ${p.status}\n`;
        if (p.status === 'payment_pending_verification') {
            message += `   💰 Payment claimed: ₦${p.paymentAmount}\n`;
        }
        message += `\n`;
    }
    
    message += `\n*Commands:*\n/approve [user_id]\n/reject [user_id] [reason]\n/verify [user_id] (for paid)`;
    
    ctx.reply(message, { parse_mode: 'Markdown' });
}

// ========== EXPORTS ==========
module.exports = {
    handlePartnerCommand,
    handleApprove,
    handleReject,
    handleVerify,
    handleFind,
    handlePending
};