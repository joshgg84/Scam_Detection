// natural.js - Natural Language Processor for Detective Jai
// Converts natural language to commands and uses detection.js
// LAZY LOADING VERSION - Modules load only when needed

// ============================================
// LIGHTWEIGHT IMPORTS (always loaded)
// ============================================

const path = require('path'); // Lightweight, keep

// ============================================
// LAZY LOADING SYSTEM
// ============================================

let detection = null;
let linkModule = null;
let referralSystem = null;
let partnerSystem = null;
let fs = null;
let scammers = null;
let normalizePhoneNumberFn = null;

function lazyLoadModules() {
    if (!detection) {
        console.log('⏳ Lazy loading heavy modules...');
        const startTime = Date.now();
        
        detection = require('./detection.js');
        linkModule = require('./links.js');
        referralSystem = require('./referrals.js');
        partnerSystem = require('./partner.js');
        fs = require('fs');
        scammers = require('./scammers.js');
        
        // Store normalizePhoneNumber function reference
        normalizePhoneNumberFn = detection.normalizePhoneNumber || function(num) { return num; };
        
        console.log(`✅ Modules loaded in ${Date.now() - startTime}ms`);
    }
    return { 
        detection, 
        linkModule, 
        referralSystem, 
        partnerSystem, 
        fs, 
        scammers,
        normalizePhoneNumber: normalizePhoneNumberFn 
    };
}

// ============================================
// LANGUAGE DETECTION (Lightweight)
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
// LOAD PARTNERS FROM partners.json (Lazy)
// ============================================

const PARTNERS_FILE = path.join(__dirname, 'partners.json');

function loadPartners() {
    const modules = lazyLoadModules();
    try {
        if (modules.fs.existsSync(PARTNERS_FILE)) {
            const data = modules.fs.readFileSync(PARTNERS_FILE, 'utf8');
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
// DETECTION HANDLERS (Lazy Load)
// ============================================

function handleCheckNumber(phoneNumber) {
    const modules = lazyLoadModules();
    
    if (!phoneNumber) {
        return `📞 *Check Phone Number*\n\nType a valid Nigerian phone number like 08012345678 or +234 703 193 9715.`;
    }
    
    const result = modules.detection.checkNumberWithName(phoneNumber);
    if (!result.success) {
        return `📞 *Check Phone Number*\n\n${result.error}`;
    }
    
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
    
    return response;
}

function handleCheckMessage(messageText) {
    const modules = lazyLoadModules();
    
    if (!messageText || messageText.length < 3) {
        return `📝 *Check Message*\n\nSend me a suspicious message to analyze.\n\nExample: "URGENT: Your account will be closed"`;
    }
    
    const analysis = modules.detection.analyzeMessage(messageText);
    let response = `${analysis.emoji} *${analysis.riskLevel} RISK* (Score: ${analysis.riskScore})\n\n`;
    response += `*📝 Message:*\n${messageText.substring(0, 300)}${messageText.length > 300 ? '...' : ''}\n\n`;
    
    if (analysis.alerts && analysis.alerts.length > 0) {
        response += `*🔍 WHY THIS IS SUSPICIOUS:*\n${analysis.alerts.slice(0, 5).join('\n')}\n\n`;
    }
    
    response += `*✅ WHAT YOU SHOULD DO:*\n${analysis.recommendation}\n\n`;
    
    const supportMessage = modules.partnerSystem.getRandomPartnerSupportMessage();
    response += `${supportMessage}`;
    
    return response;
}

function handleCheckLink(url) {
    const modules = lazyLoadModules();
    
    if (!url) return `🔗 *Check Link*\n\nSend me a link to check.\n\nExample: https://suspicious-site.com`;
    
    const reported = modules.linkModule.checkLink(url);
    const analysis = modules.linkModule.analyzeLink(url);
    
    if (reported) {
        return `🚨 *SCAM LINK DETECTED!*\n\nURL: ${url}\nReason: ${reported.reason}\n❌ DO NOT CLICK!`;
    } else if (analysis.riskScore >= 30) {
        return `🟡 *SUSPICIOUS LINK*\n\nRisk Score: ${analysis.riskScore}/100\n${analysis.reasons.slice(0, 3).join('\n')}\n⚠️ Be very careful.`;
    } else {
        return `🟢 *LINK APPEARS SAFE*\n\nNo scam reports for this link.\n⚠️ Still be cautious.`;
    }
}

function handleReport(phoneNumber, userId, username) {
    const modules = lazyLoadModules();
    
    if (!phoneNumber) {
        return `📢 *Report Scammer*\n\nType the phone number to report.\n\nExample: "report 08012345678 fake loan scam"`;
    }
    
    const reason = 'Reported via natural language';
    const result = modules.scammers.reportNumber(phoneNumber, userId || 'web_user', reason);
    
    return result.message;
}

function handlePlea(phoneNumber, userId, username) {
    const modules = lazyLoadModules();
    
    if (!phoneNumber) {
        return `📝 *Plea Command*\n\nIf your number was wrongly flagged as a scammer, send me the number.\n\nExample: "plea 08012345678 I am a legitimate business"`;
    }
    
    if (!modules.scammers.isScammer(phoneNumber)) {
        return `✅ ${phoneNumber} is not in the scammers database. No plea needed.`;
    }
    
    return `📋 *Plea Submitted*\n\nYour plea for ${phoneNumber} has been submitted. Admin will review it.\n\nYou will be notified when a decision is made.`;
}

function handleLoan(amount) {
    if (amount === 'ask' || !amount) {
        return `💰 *Loan Scam Detector*\n\nShare the loan message you received. I'll tell you if it's a scam.\n\n*Red flags:*\n❌ Asking for advance fees\n❌ No credit check\n❌ Guaranteed approval\n❌ Unregistered lenders`;
    }
    
    return `💰 *Loan Scam Alert*\n\nIf someone is asking for ₦${amount} upfront for a loan, that's a SCAM.\n\n✅ Real loans deduct fees from the amount you receive.\n❌ Fake loans ask you to pay before they "release" the money.\n\n📢 Never pay to receive a loan.`;
}

function handleHelp() {
    return `📚 *WHAT I CAN DO*\n\n🔍 Check phone numbers: "check 08012345678"\n🔍 Analyze messages: "check this message: ..."\n🔍 Check links: "check link: https://..."\n📢 Report scammers: "report 08012345678"\n📝 Plea: "plea 08012345678"\n📚 Learn scams: "what is phishing"\n📊 Stats: "how many scammers"\n🤝 Partners: "show partners"\n\nJust type naturally and I'll understand!`;
}

function handleStats() {
    const modules = lazyLoadModules();
    const count = modules.scammers.getScammerCount();
    return `📊 *STATS*\n\n🔍 Scammers reported: ${count}\n🆓 Free forever\n🇳🇬 Protecting Nigerians`;
}

function handleScamTypes() {
    return `📚 *COMMON SCAMS*\n\n1. *Fake Bank Alerts* 🏦\n2. *Employment Scams* 💼\n3. *Romance Scams* 💔\n4. *Investment Scams* 📈\n5. *Phishing Links* 🔗\n6. *Loan Scams* 💰\n7. *Property Scams* 🏠\n\nType "what is [scam]" to learn more.`;
}

function handleRedFlags() {
    return `🚩 *SCAM RED FLAGS*\n\n⚠️ URGENT, IMMEDIATELY, ACT NOW\n⚠️ SEND MONEY, GIFT CARD, BITCOIN\n⚠️ PIN, OTP, BVN, CVV\n⚠️ WINNING, LOTTERY, PRINCE\n⚠️ DOUBLE YOUR MONEY, GUARANTEED RETURNS\n⚠️ WORK FROM HOME, REGISTRATION FEE\n\nIf you see these, be suspicious!`;
}

function handleWhatToDo() {
    return `🆘 *YOU'VE BEEN SCAMMED*\n\n1. Contact your bank immediately\n2. Save all evidence (screenshots)\n3. Report to EFCC: 08093322644\n4. Report number to me: "report 08012345678"\n5. Join our community for support\n\nYou're not alone. 🇳🇬`;
}

function handleTips() {
    const tips = [
        "Never share your OTP with anyone.",
        "If someone promises to double your money, RUN.",
        "Verify urgent requests by CALLING the person back.",
        "Legitimate jobs never ask for payment to hire you.",
        "No bank employee will ask for your PIN or BVN.",
        "If it sounds too good to be true, it is.",
        "Gift card requests are always scams.",
        "Scammers create urgency to stop you from thinking clearly."
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    return `💡 *SECURITY TIP*\n\n${randomTip}`;
}

function handleWhatIs(term) {
    if (!term) {
        return `📖 *What Is*\n\nType "what is phishing" or "what is 419" to learn about scams.`;
    }
    
    const terms = {
        'phishing': '🎣 *Phishing*\n\nFake messages pretending to be from banks or companies to steal your login details. Never click suspicious links.',
        '419': '📜 *419 Scam*\n\nAlso called "Nigerian Prince" scam. Someone promises you millions if you pay a small fee first. It\'s always a scam.',
        'romance scam': '💔 *Romance Scam*\n\nSomeone pretends to love you, builds trust, then asks for money. They never meet you in person.',
        'fake alert': '🏦 *Fake Alert*\n\nA fake bank credit alert SMS. Always check your bank app balance, not just SMS.',
        'sim swap': '📱 *SIM Swap Scam*\n\nScammer convinces your network provider to transfer your number to their SIM card to access your bank accounts.',
        'loan scam': '💰 *Loan Scam*\n\nFake lenders who ask for upfront fees. Real loans deduct fees from the amount you receive.',
        'employment scam': '💼 *Employment Scam*\n\nFake job offers that ask for registration fees. Real jobs pay you, not the other way around.',
        'investment scam': '📈 *Investment Scam*\n\nPromises of unrealistically high returns. If it sounds too good to be true, it is.',
        'property scam': '🏠 *Property Scam*\n\nFake property listings asking for deposit before viewing. Never pay without seeing the property first.',
        'gift card scam': '🎁 *Gift Card Scam*\n\nScammers asking for gift cards as payment. This is always a scam.'
    };
    
    const lowerTerm = term.toLowerCase();
    for (const [key, value] of Object.entries(terms)) {
        if (lowerTerm.includes(key) || key.includes(lowerTerm)) {
            return value;
        }
    }
    
    return `❌ *"${term}" not found.*\n\nTry: phishing, 419, romance scam, fake alert, sim swap, loan scam, employment scam, investment scam, property scam, gift card scam`;
}

function handlePartners() {
    const partners = getFeaturedPartners();
    if (partners.length === 0) {
        return `🤝 *NO PARTNERS YET*\n\nBe the first to advertise with Detective Jai!\n\nContact @JoshuaGiwa to become a partner.`;
    }
    
    let message = `🤝 *OUR PARTNERS*\n\n`;
    for (const p of partners) {
        message += `🏪 *${p.businessName}* (${p.category})\n`;
        message += `📞 ${p.contact || p.phoneNumber || 'Contact available'}\n\n`;
    }
    message += `💬 *Become a partner:* Contact @JoshuaGiwa`;
    return message;
}

function handlePartnerProgram() {
    return `🤝 *PARTNER PROGRAM*\n\n*Standard Partner* - ₦11,000/month\n✅ Business contact in /partners\n✅ "⭐ Standard Partner" badge\n✅ Featured in daily tips\n✅ FREE 3-week trial\n\n*Premium Partner* - ₦17,000/month\n✅ Everything in Standard\n✅ "💎 Premium Partner" badge\n✅ Sponsorship in /check responses\n✅ FREE 1-week trial\n\n📲 Register: Contact @JoshuaGiwa\n💬 WhatsApp: 09025839789`;
}

function handleReferral(userId) {
    const modules = lazyLoadModules();
    const referralLink = `https://t.me/JoshuaGiwaBot?start=ref_${userId}`;
    return `🤝 *YOUR REFERRAL LINK*\n\nShare this link with friends:\n\`${referralLink}\`\n\nWhen they join, you get credit!\n\n🏆 Top inviters get recognized.`;
}

function handleLeaderboard() {
    const modules = lazyLoadModules();
    // This will call the actual leaderboard function
    return `🏆 *LEADERBOARD*\n\nNo one has invited anyone yet. Be the first!\n\nShare your referral link to climb the leaderboard.`;
}

function handleMyReferrals(userId) {
    return `📊 *YOUR REFERRALS*\n\nYou haven't invited anyone yet.\n\nShare your referral link to get started!`;
}

function handleWelcome() {
    const greetings = [
        `👋 *Hello! I'm Detective Jai.*\n\nI help you detect scams before you lose money.\n\n🔍 Try: "check 08012345678"\n📝 Try: "check this message: URGENT..."\n🔗 Try: "check link: https://..."\n\nJust type naturally. I'll understand!`,
        `👋 *Hey there!*\n\nI'm your scam detector. Just tell me what you want.\n\nExamples:\n• "check 08012345678"\n• "analyze this message: ..."\n• "report 08012345678"\n• "what is phishing"`,
        `🕵️ *Detective Jai here!*\n\nGot a suspicious number? Message? Link? Just tell me!\n\nI speak English and Pidgin. Type naturally.`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
}

function handleDefault() {
    return `🤔 *I didn't quite understand that.*\n\nTry:\n• "check 08012345678"\n• "analyze this message: ..."\n• "what is phishing"\n• "help"\n\nType naturally — I'll do my best to understand!`;
}

// ============================================
// MAIN PROCESSOR
// ============================================

function processNaturalInput(text, userId, username) {
    const lang = detectLanguage(text);
    const lower = text.toLowerCase().trim();
    
    // ========== CHECK FOR COMMANDS ==========
    
    // Check number - accepts +234 703 193 9715, 08012345678, etc.
    const numberMatch = text.match(/(\+234[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{4}|0[789][01]\d{8})/);
    if (numberMatch) {
        const rawNumber = numberMatch[0];
        // Use lazy loaded normalize function
        const modules = lazyLoadModules();
        const normalizeFn = modules.detection.normalizePhoneNumber || function(num) { return num.replace(/\D/g, ''); };
        const cleaned = normalizeFn(rawNumber);
        if (cleaned) {
            if (lower.includes('report') || lower.includes('i want to report')) {
                return handleReport(cleaned, userId, username);
            }
            if (lower.includes('appeal') || lower.includes('plea')) {
                return handlePlea(cleaned, userId, username);
            }
            return handleCheckNumber(cleaned);
        }
    }

    // Check link
    const linkMatch = text.match(/https?:\/\/[^\s]+/);
    if (linkMatch) {
        return handleCheckLink(linkMatch[0]);
    }

    // Check message (text analysis)
    if (lower.includes('check this message') || 
        lower.includes('check message') ||
        lower.includes('checkmsg') ||
        lower.includes('analyze this message') ||
        lower.includes('analyze message') ||
        lower.includes('check this text') ||
        lower.includes('check text')) {
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
        if (messageText === text) {
            // If no prefix found, try to extract after "check"
            const checkIndex = lower.indexOf('check');
            if (checkIndex !== -1) {
                messageText = text.substring(checkIndex + 5).trim();
            }
        }
        return handleCheckMessage(messageText);
    }

    // Loan
    if (lower.includes('loan') || lower.includes('need money') || lower.includes('borrow')) {
        const amountMatch = text.match(/₦?(\d{1,3}(?:,\d{3})*|\d+)/);
        if (amountMatch) {
            const amount = parseInt(amountMatch[1].replace(/,/g, ''));
            return handleLoan(amount);
        }
        return handleLoan('ask');
    }

    // Help
    if (lower.includes('what can you do') || lower.includes('help me') || 
        lower.includes('help') || lower.includes('what do you do') ||
        lower.includes('how to use')) {
        return handleHelp();
    }

    // Stats
    if (lower.includes('how many scammers') || lower.includes('caught') || 
        lower.includes('statistics') || lower.includes('stats') ||
        lower.includes('total scammers')) {
        return handleStats();
    }

    // Scam types
    if (lower.includes('common scams') || lower.includes('what are scams') || 
        lower.includes('scam types') || lower.includes('types of scams') ||
        lower.includes('list scams')) {
        return handleScamTypes();
    }

    // Red flags
    if (lower.includes('red flag') || lower.includes('red flags') ||
        lower.includes('warning signs')) {
        return handleRedFlags();
    }

    // What to do after scam
    if (lower.includes('been scammed') || lower.includes('i was scammed') || 
        lower.includes('what to do') || lower.includes('got scammed') ||
        lower.includes('i got scammed')) {
        return handleWhatToDo();
    }

    // Tips
    if (lower.includes('tip') || lower.includes('security tip') || 
        lower.includes('advice') || lower.includes('safe') ||
        lower.includes('give me a tip')) {
        return handleTips();
    }

    // What is
    if (lower.includes('what is') || lower.includes('what does') || 
        lower.includes('meaning of') || lower.includes('define') ||
        lower.includes('what are')) {
        const term = text.replace(/what is|what does|meaning of|define|what are/i, '').trim();
        return handleWhatIs(term);
    }

    // Partners
    if (lower.includes('partner') || lower.includes('partners')) {
        if (lower.includes('how to become') || lower.includes('how can i') || 
            lower.includes('become a partner') || lower.includes('partner program') ||
            lower.includes('advertise')) {
            return handlePartnerProgram();
        }
        return handlePartners();
    }

    // Referral
    if (lower.includes('referral') || lower.includes('refer') || 
        lower.includes('invite') || lower.includes('link') ||
        lower.includes('my referral')) {
        return handleReferral(userId);
    }

    // Leaderboard
    if (lower.includes('leaderboard') || lower.includes('leading') || 
        lower.includes('top referrer') || lower.includes('ranking')) {
        return handleLeaderboard();
    }

    // My referrals
    if (lower.includes('my referrals') || lower.includes('how many people') || 
        lower.includes('my invites') || lower.includes('my refer')) {
        return handleMyReferrals(userId);
    }

    // Greeting
    if (lower.match(/^(hi|hello|hey|good morning|good afternoon|good evening|how are you|sup|what's up|yo|alright)/)) {
        return handleWelcome();
    }

    // Default - check if it's a message to analyze (only if long enough)
    if (text.length > 10 && !lower.includes('/')) {
        return handleCheckMessage(text);
    }

    return handleDefault();
}

// ============================================
// PIDGIN TRANSLATIONS
// ============================================

function getPidginResponse(englishResponse) {
    const translations = {
        '🚨 *ALERT!*': '🚨 *WAHALA!*',
        '⚠️ *CLEAR*': '⚠️ *KLEAR*',
        'is a REPORTED SCAMMER': 'na SCAMMER wey people don report',
        'has no reports': 'no report yet',
        'Do not send money': 'No send money',
        'Block immediately': 'Block am immediately',
        'Still be cautious': 'Still dey careful',
        'Thank you for your testimonial': 'Thank you for your testimony',
        'God bless you': 'God bless you',
        'Help Others Stay Safe': 'Help others stay safe',
        'TRUSTED NUMBER': 'TRUSTED NUMBER',
        'SUSPICIOUS': 'SUSPICIOUS',
        'RISK': 'RISK'
    };
    
    let pidgin = englishResponse;
    for (const [english, pidginText] of Object.entries(translations)) {
        pidgin = pidgin.replace(new RegExp(english, 'g'), pidginText);
    }
    return pidgin;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    detectLanguage,
    processNaturalInput,
    getSponsorMessage,
    loadPartners,
    getFeaturedPartners,
    getPidginResponse,
    handleCheckNumber,
    handleCheckMessage,
    handleCheckLink,
    handleReport,
    handlePlea,
    handleLoan,
    handleHelp,
    handleStats,
    handleScamTypes,
    handleRedFlags,
    handleWhatToDo,
    handleTips,
    handleWhatIs,
    handlePartners,
    handlePartnerProgram,
    handleReferral,
    handleLeaderboard,
    handleMyReferrals,
    handleWelcome,
    handleDefault,
    // Export lazy load function for debugging
    lazyLoadModules
};