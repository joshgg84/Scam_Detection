// partner.js - Core Partner System Module
// Data management, helpers, and exports only

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
let currentSponsorIndex = 0;

// ========== PRICING PLANS ==========
const PLANS = {
    standard: {
        name: "Standard Partner",
        price: { month: 11000, quarter: 30000, half: 60000 },
        trialWeeks: 3,
        features: [
            "📞 Business contact details in /partners",
            "🏪 Partner badge in listings",
            "⭐ Featured in daily security tips",
            "✅ Verified status"
        ]
    },
    premium: {
        name: "Premium Partner",
        price: { month: 17000, quarter: 50000, half: 100000 },
        trialWeeks: 1,
        features: [
            "📞 Business contact details in /partners",
            "🏪 Partner badge in listings",
            "⭐ Featured in daily security tips",
            "✅ Verified status",
            "🎯 Business spotlight in Telegram group",
            "📢 Sponsorship message in /check responses"
        ]
    }
};

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

function getPartnersByCategory(category) {
    if (category === 'all') return partners;
    return partners.filter(p => p.category.toLowerCase() === category.toLowerCase());
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

// ========== FOR DAILY TIPS - GET SPONSOR MESSAGE ==========
function getDailyTipSponsorMessage() {
    const premiumSponsors = partners.filter(p => p.tier === 'premium' && p.status === 'approved' && p.featured === true);
    if (premiumSponsors.length === 0) return null;
    const sponsor = premiumSponsors[currentSponsorIndex % premiumSponsors.length];
    currentSponsorIndex++;
    if (sponsor.sponsorshipMessage) {
        return `\n\n📢 *Sponsor:* ${sponsor.sponsorshipMessage}\n📞 Contact: ${sponsor.contact}`;
    }
    return `\n\n📢 *Sponsored by:* ${sponsor.businessName}\n📞 Contact: ${sponsor.contact}`;
}

// ========== FOR /CHECK - GET SPONSOR MESSAGE ==========
function getCheckSponsorMessage() {
    const sponsor = getNextFeaturedPartner();
    if (!sponsor) return null;
    if (sponsor.tier === 'premium' && sponsor.sponsorshipMessage) {
        return {
            businessName: sponsor.businessName,
            message: sponsor.sponsorshipMessage,
            contact: sponsor.contact
        };
    } else if (sponsor.tier === 'premium') {
        return {
            businessName: sponsor.businessName,
            message: `Trusted partner for secure transactions.`,
            contact: sponsor.contact
        };
    }
    return null;
}

function resetFeaturedIndex() {
    currentFeaturedIndex = 0;
    currentSponsorIndex = 0;
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
    if (partner.website) {
        buttons.push([{ text: '🌐 Visit Website', url: partner.website }]);
    }
    return buttons;
}

// ========== PUBLIC PARTNERS COMMAND ==========
async function handlePartnersCommand(ctx, COMMUNITY_LINK) {
    try {
        let partnersList = [];
        if (fs.existsSync('partners.json')) {
            const data = JSON.parse(fs.readFileSync('partners.json', 'utf8'));
            partnersList = data.partners || [];
        }
        
        if (partnersList.length === 0) {
            ctx.reply(`🤝 *NO PARTNERS YET*\n\nBe the first to register your business!\n\nType /partner to register.\n\n👥 Join our community: ${COMMUNITY_LINK}`, { parse_mode: 'Markdown' });
            return;
        }
        
        let message = `🤝 *OUR TRUSTED PARTNERS*\n\n`;
        const premium = partnersList.filter(p => p.tier === 'premium' && p.featured === true);
        const standard = partnersList.filter(p => p.tier === 'standard' && p.featured === true);
        const normal = partnersList.filter(p => p.featured !== true);
        
        for (let p of premium) {
            message += `💎 *${p.businessName}* (${p.category}) [PREMIUM]\n`;
            if (p.description) message += `   ${p.description.substring(0, 80)}...\n`;
            message += `   📞 ${p.contact}\n\n`;
        }
        
        for (let p of standard) {
            message += `⭐ *${p.businessName}* (${p.category}) [STANDARD]\n`;
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
        message += `💎 *Premium* - Sponsorship in tips & /check\n`;
        message += `⭐ *Standard* - Featured in daily tips\n\n`;
        message += `📞 *Want to become a partner?* Type /partner\n`;
        message += `👥 ${COMMUNITY_LINK}`;
        
        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('Partners command error:', err);
        ctx.reply(`⚠️ Error loading partners. Admin notified.\n\n👥 ${COMMUNITY_LINK}`);
    }
}

// ========== HANDLE CALLBACK QUERIES ==========
async function handlePartnerCallback(ctx, COMMUNITY_LINK) {
    const data = ctx.callbackQuery.data;
    if (data === 'partner_register') {
        await ctx.answerCbQuery();
        await ctx.reply(`Type /partner to start the registration process.`);
        return;
    }
    ctx.answerCbQuery();
}

// ========== INITIALIZE MODULE ==========
function initPartnerSystem() {
    loadPartners();
    loadPending();
    loadConversationState();
    console.log(`📊 Partner System: ${partners.length} partners, ${pendingPartners.length} pending`);
    console.log(`   Standard: ₦11k/month | Premium: ₦17k/month`);
    console.log(`   Free trials: Standard 3 weeks, Premium 1 week`);
}

// ========== EXPORTS ==========
module.exports = {
    initPartnerSystem,
    handlePartnersCommand,
    handlePartnerCallback,
    getPartnerButtons,
    getNextFeaturedPartner,
    getDailyTipSponsorMessage,
    getCheckSponsorMessage,
    resetFeaturedIndex,
    getPartnerByUserId,
    getPendingByUserId,
    getPartnersByCategory,
    getUserConversation,
    updateConversation,
    clearConversation,
    loadPartners,
    savePartners,
    loadPending,
    savePending,
    loadConversationState,
    saveConversationState,
    partners,
    pendingPartners,
    settings,
    PLANS,
    getPartnersCount: () => partners.length,
    getPendingCount: () => pendingPartners.length
};