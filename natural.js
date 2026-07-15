// natural.js - Natural Language Processor for Detective Jai
// Converts natural language to commands and uses detection.js

const detection = require('./detection.js');
const fs = require('fs');
const path = require('path');

// ============================================
// LANGUAGE DETECTION
// ============================================

function detectLanguage(text) {
    const pidginPatterns = [
        'how you dey', 'wetin', 'na', 'abeg', 'oya', 'ehen',
        'my brother', 'no wahala', 'dey', 'you go', 'i go',
        'make i', 'o', 'na so', 'chai', 'e dey', 'shey',
        'abeg', 'oya', 'na wa', 'which kind', 'how far',
        'you dey', 'i dey', 'we dey', 'dem dey', 'dey o',
        'shey', 'na you', 'i no', 'you no', 'am'
    ];

    const lower = text.toLowerCase();
    let pidginScore = 0;

    for (const pattern of pidginPatterns) {
        if (lower.includes(pattern)) {
            pidginScore++;
        }
    }

    return pidginScore >= 2 ? 'pidgin' : 'english';
}

// ============================================
// LOAD PARTNERS FROM partners.json
// ============================================

const PARTNERS_FILE = path.join(__dirname, 'partners.json');

function loadPartners() {
    try {
        if (fs.existsSync(PARTNERS_FILE)) {
            const data = fs.readFileSync(PARTNERS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.partners || [];
        }
    } catch (err) {
        console.error('Error loading partners.json:', err);
    }
    return [];
}

function getFeaturedPartners() {
    const partners = loadPartners();
    return partners.filter(p => p.status === 'approved' && p.verified === true && p.featured === true);
}

// ============================================
// GET SPONSOR MESSAGE (from partners.json)
// ============================================

function getSponsorMessage() {
    const featured = getFeaturedPartners();
    
    if (featured.length === 0) {
        return `\n\n🤝 *BECOME A PARTNER*\n\nPromote your business to 10,000+ users!\n\n📌 Standard — ₦11,000/month\n🌟 Premium — ₦17,000/month\n\n📲 Contact: @JoshuaGiwa\n💬 WhatsApp: 09025839789`;
    }
    
    let message = '\n\n🤝 *OUR PARTNERS*\n\n';
    
    for (const partner of featured) {
        message += `🏪 *${partner.businessName}*\n`;
        message += `📍 ${partner.description || partner.category}\n`;
        if (partner.phoneNumber) {
            message += `📞 ${partner.phoneNumber}\n`;
        }
        if (partner.location) {
            message += `📍 ${partner.location}\n`;
        }
        if (partner.website) {
            message += `🌐 ${partner.website}\n`;
        }
        message += `📲 ${partner.contact || partner.username}\n\n`;
    }
    
    message += `💬 *Become a partner:* Contact @JoshuaGiwa\n`;
    message += `💳 Zenith Bank: 4268186069 (Joshua Giwa)`;
    
    return message;
}

// ============================================
// MAIN PROCESSOR - Uses detection.js
// ============================================

function processNaturalInput(text, userId, username) {
    const lang = detectLanguage(text);
    const lower = text.toLowerCase().trim();
    
    // ========== CHECK FOR COMMANDS ==========
    
    // Check number
    const numberMatch = text.match(/\b(0[789]\d{9})\b/);
    if (numberMatch) {
        const number = numberMatch[0];
        if (lower.includes('report') || lower.includes('i want to report')) {
            return detection.handleReport(number, userId, username);
        }
        if (lower.includes('appeal') || lower.includes('plea')) {
            return detection.handlePlea(number, userId, username);
        }
        return detection.handleCheckNumber(number);
    }

    // Check link
    const linkMatch = text.match(/https?:\/\/[^\s]+/);
    if (linkMatch) {
        return detection.handleCheckLink(linkMatch[0]);
    }

    // Check message (text analysis)
    if (lower.includes('check this message') || 
        lower.includes('check message') ||
        lower.includes('checkmsg') ||
        lower.includes('analyze this message') ||
        lower.includes('analyze message') ||
        lower.includes('check this text') ||
        lower.includes('check text')) {
        // Extract the message after the prefix
        let messageText = text;
        const prefixes = ['check this message:', 'check message:', 'checkmsg', 'analyze this message:', 'check this text:', 'check text:'];
        for (const prefix of prefixes) {
            if (lower.includes(prefix)) {
                const parts = text.toLowerCase().split(prefix);
                if (parts.length > 1) {
                    messageText = text.substring(text.toLowerCase().indexOf(prefix) + prefix.length).trim();
                    break;
                }
            }
        }
        return detection.handleCheckMessage(messageText);
    }

    // Loan
    if (lower.includes('loan') || lower.includes('need money') || lower.includes('borrow')) {
        const amountMatch = text.match(/₦?(\d{1,3}(?:,\d{3})*|\d+)/);
        if (amountMatch) {
            const amount = parseInt(amountMatch[1].replace(/,/g, ''));
            return detection.handleLoan(amount);
        }
        return detection.handleLoan('ask');
    }

    // Help
    if (lower.includes('what can you do') || lower.includes('help me') || 
        lower.includes('help') || lower.includes('what do you do')) {
        return detection.handleHelp();
    }

    // Stats
    if (lower.includes('how many scammers') || lower.includes('caught') || 
        lower.includes('statistics') || lower.includes('stats')) {
        return detection.handleStats();
    }

    // Scam types
    if (lower.includes('common scams') || lower.includes('what are scams') || 
        lower.includes('scam types') || lower.includes('types of scams')) {
        return detection.handleScamTypes();
    }

    // Red flags
    if (lower.includes('red flag') || lower.includes('red flags')) {
        return detection.handleRedFlags();
    }

    // What to do after scam
    if (lower.includes('been scammed') || lower.includes('i was scammed') || 
        lower.includes('what to do') || lower.includes('got scammed')) {
        return detection.handleWhatToDo();
    }

    // Tips
    if (lower.includes('tip') || lower.includes('security tip') || 
        lower.includes('advice') || lower.includes('safe')) {
        return detection.handleTips();
    }

    // What is
    if (lower.includes('what is') || lower.includes('what does') || 
        lower.includes('meaning of') || lower.includes('define')) {
        const term = text.replace(/what is|what does|meaning of|define/i, '').trim();
        return detection.handleWhatIs(term);
    }

    // Partners
    if (lower.includes('partner') || lower.includes('partners')) {
        if (lower.includes('how to become') || lower.includes('how can i') || 
            lower.includes('become a partner') || lower.includes('partner program')) {
            return detection.handlePartnerProgram();
        }
        return detection.handlePartners();
    }

    // Referral
    if (lower.includes('referral') || lower.includes('refer') || 
        lower.includes('invite') || lower.includes('link')) {
        return detection.handleReferral(userId);
    }

    // Leaderboard
    if (lower.includes('leaderboard') || lower.includes('leading') || 
        lower.includes('top referrer')) {
        return detection.handleLeaderboard();
    }

    // My referrals
    if (lower.includes('my referrals') || lower.includes('how many people') || 
        lower.includes('my invites')) {
        return detection.handleMyReferrals(userId);
    }

    // Greeting
    if (lower.match(/^(hi|hello|hey|good morning|good afternoon|good evening|how are you|sup|what's up)/)) {
        return detection.handleWelcome();
    }

    // Default - check if it's a message to analyze
    if (text.length > 10) {
        return detection.handleCheckMessage(text);
    }

    return detection.handleDefault();
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    detectLanguage,
    processNaturalInput,
    getSponsorMessage,
    loadPartners,
    getFeaturedPartners
};