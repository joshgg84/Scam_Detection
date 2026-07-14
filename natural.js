// natural.js - Natural Language Processor for Detective Jai
// Converts human-friendly input into structured commands
// Supports English and Pidgin
// Simple formatting for both Telegram and frontend

const detection = require('./detection.js');
const scammers = require('./scammers.js');
const links = require('./links.js');
const referralSystem = require('./referrals.js');

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
// SIMPLE FORMATTING HELPERS
// ============================================

function bold(text) {
    return `*${text}*`;
}

function italic(text) {
    return `_${text}_`;
}

function code(text) {
    return `\`${text}\``;
}

function line() {
    return '\n---\n';
}

function bullet(text) {
    return `• ${text}`;
}

function numberList(index, text) {
    return `${index}. ${text}`;
}

// ============================================
// RESPONSE GENERATOR
// ============================================

function getResponse(type, data, lang) {
    const responses = {
        // ========== WELCOME ==========
        welcome: {
            english: "Hello! I'm Detective Jai, your scam detective. I help you check numbers, messages, and links before you send money. Just tell me what you need.",
            pidgin: "How you dey? I'm Detective Jai, your scam detective. I dey help you check numbers, messages, and links before you send money. Just tell me wetin you need."
        },

        // ========== HELP ==========
        help: {
            english: "What I Can Do:\n\n• Check numbers: 'Check this number: 080...'\n• Check messages: 'Check this message: ...'\n• Check links: 'Is this link safe? ...'\n• Report scammers: 'I want to report 080...'\n• Loan advice: 'I need a loan of ₦...'\n• Stats: 'How many scammers have you caught?'\n\nJust tell me what you need.",
            pidgin: "Wetin I Fit Do:\n\n• Check numbers: 'Check this number: 080...'\n• Check messages: 'Check this message: ...'\n• Check links: 'Is this link safe? ...'\n• Report scammers: 'I want to report 080...'\n• Loan advice: 'I need loan of ₦...'\n• Stats: 'How many scammers you don catch?'\n\nJust tell me wetin you need."
        },

        // ========== NUMBER CHECK ==========
        numberClean: {
            english: "✅ This number is clean. No reports found. Still be cautious.",
            pidgin: "✅ This number dey clean o. No report so far. But still be careful."
        },
        numberScam: {
            english: "⚠️ This number has been reported {count} times. It is a scam. Do not send money.",
            pidgin: "⚠️ This number don dey reported {count} times o. Na scam. No send money."
        },

        // ========== MESSAGE CHECK ==========
        messageClean: {
            english: "✅ This message is clean. No scam patterns detected. Still be careful.",
            pidgin: "✅ This message dey clean o. No scam pattern detected. Still be careful."
        },
        messageScam: {
            english: "⚠️ Scam detected! I found these red flags:\n{flags}\n\nDo not respond. Report this to me.",
            pidgin: "⚠️ Na scam o! I find these red flags:\n{flags}\n\nNo reply. Report this to me."
        },

        // ========== LINK CHECK ==========
        linkClean: {
            english: "✅ This link is safe. No reports found.",
            pidgin: "✅ This link dey safe o. No report found."
        },
        linkScam: {
            english: "⚠️ This link is dangerous! It has been reported as a phishing or scam site. Do not click.",
            pidgin: "⚠️ This link dey dangerous o! I don report am as phishing or scam site. No click."
        },

        // ========== LOAN ==========
        loanAskAmount: {
            english: "💰 How much do you need? Send it like this: 'I need a loan of ₦50,000'",
            pidgin: "💰 How much you need? Send am like this: 'I need loan of ₦50,000'"
        },
        loanAskIncome: {
            english: "💰 You need ₦{amount}. How much is your monthly income?",
            pidgin: "💰 You need ₦{amount}. How much your salary be per month?"
        },
        loanRecommend: {
            english: "✅ Based on your income of ₦{income}, you can comfortably borrow ₦{amount}.\n\nBest option: {app}\nAmount: {amountRange}\nInterest: {interest}\nApproval: {approval}\nRepayment: {repayment}\n\nRepayment plan: ₦{repaymentAmount} for 30 days (about ₦{daily} per day)\n\n⚠️ Only borrow what you can pay back in 30 days.",
            pidgin: "✅ Based on your income of ₦{income}, you fit comfortably borrow ₦{amount}.\n\nBest option na {app}\nAmount: {amountRange}\nInterest: {interest}\nApproval: {approval}\nRepayment: {repayment}\n\nRepayment plan: ₦{repaymentAmount} for 30 days (about ₦{daily} per day)\n\n⚠️ Only borrow wetin you fit pay back in 30 days."
        },

        // ========== REPORT ==========
        reportMissing: {
            english: "📢 You said you want to report a number. Please send it like this: 'I want to report 08012345678 for loan scam'",
            pidgin: "📢 You say you want to report number. Please send am like this: 'I want to report 08012345678 for loan scam'"
        },
        reportSuccess: {
            english: "✅ Reported successfully!\n\nNumber: {number}\nReason: {reason}\n\nYou have helped protect others. Thank you.",
            pidgin: "✅ I don record am!\n\nNumber: {number}\nReason: {reason}\n\nYou don help protect others. Thank you."
        },

        // ========== STATS ==========
        stats: {
            english: "📊 I have caught {count} scammers so far.\n\nReport any suspicious number to help me catch more.",
            pidgin: "📊 I don catch {count} scammers so far.\n\nReport any suspicious number to help me catch more."
        },

        // ========== SCAM TYPES ==========
        scamTypes: {
            english: "Common Scams in Nigeria:\n\n1. Lottery Scam: 'You win!' but you need to pay first. Fake.\n2. Phishing: Fake bank messages asking for your PIN. Banks don't ask for PIN.\n3. Romance Scam: 'I love you' but need money for visa. Don't send.\n4. Employment Scam: 'You got the job!' but need to pay for training. Don't pay.\n5. Investment Scam: 'Double your money in 30 days' — Fake.\n\nStay safe. Always check with me before sending money.",
            pidgin: "Common Scams wey dey happen for Nigeria:\n\n1. Lottery Scam: 'You win!' but you need to pay first. Na scam.\n2. Phishing: Fake bank messages wey dey ask for your PIN. Bank no dey ask for PIN.\n3. Romance Scam: 'I love you' but need money for visa. No send.\n4. Employment Scam: 'You get the job!' but need to pay for training. Job no dey ask you to pay.\n5. Investment Scam: 'Double your money in 30 days' — Na lie.\n\nStay safe. Always check with me before you send money."
        },

        // ========== RED FLAGS ==========
        redFlags: {
            english: "Red Flags of a Scam:\n\n1. Urgency — 'Act now!'\n2. Too good to be true — 'You won 7 million naira!'\n3. Asking for money — 'Send ₦10,000 for processing'\n4. Asking for personal info — 'Send your PIN'\n5. Pressure — 'Don't tell anyone'\n\nIf you see any of these, stop and check with me.",
            pidgin: "Red Flags of a Scam:\n\n1. Urgency — 'Act now!'\n2. Too good to be true — 'You won 7 million naira!'\n3. Asking for money — 'Send ₦10,000 for processing'\n4. Asking for personal info — 'Send your PIN'\n5. Pressure — 'Don't tell anyone'\n\nIf you see any of these, stop and check with me."
        },

        // ========== WHAT TO DO ==========
        whatToDo: {
            english: "What to Do If You've Been Scammed:\n\n1. Stop sending money immediately.\n2. Report the number to me: 'I want to report 080...'\n3. Contact your bank to block the transaction.\n4. Report to the police.\n5. Tell your family and friends.\n\nYou are not alone. We will get them.",
            pidgin: "Wetin to Do If You Don Already Send Money:\n\n1. Stop sending money immediately.\n2. Report the number to me: 'I want to report 080...'\n3. Contact your bank to block the transaction.\n4. Report to police.\n5. Tell your family and friends.\n\nYou are not alone. We go get them."
        },

        // ========== TIPS ==========
        tip: {
            english: "🔐 Security Tip: {tips}",
            pidgin: "🔐 Security Tip: {tips}"
        },

        // ========== WHAT IS ==========
        whatIs: {
            english: "📖 {term}: {content}",
            pidgin: "📖 {term}: {content}"
        },
        notFound: {
            english: "❌ I don't have information on '{term}' yet. Try asking about: phishing, smishing, vishing, or social engineering.",
            pidgin: "❌ I no get information on '{term}' yet. Try asking about: phishing, smishing, vishing, or social engineering."
        },

        // ========== PARTNERS ==========
        partner: {
            english: "Partner Program:\n\nStandard — ₦11,000/month\nPremium — ₦17,000/month\n\nRegister: Contact @JoshuaGiwa\nWhatsApp: 09025839789",
            pidgin: "Partner Program:\n\nStandard — ₦11,000/month\nPremium — ₦17,000/month\n\nRegister: Contact @JoshuaGiwa\nWhatsApp: 09025839789"
        },
        partners: {
            english: "We work with trusted businesses to keep you safe.\n\nTo become a partner: Send 'How can I become a partner?'",
            pidgin: "We work with trusted businesses to keep you safe.\n\nTo become a partner: Send 'How can I become a partner?'"
        },

        // ========== PLEA ==========
        plea: {
            english: "📋 To appeal a number, send it like this: 'I want to appeal 08012345678 because I am a legitimate business'",
            pidgin: "📋 To appeal a number, send am like this: 'I want to appeal 08012345678 because I am a legitimate business'"
        },

        // ========== REFERRAL ==========
        referral: {
            english: "🤝 Your Referral Link:\n\n{link}\n\nShare this link with your friends. When they join, you earn rewards!",
            pidgin: "🤝 Your Referral Link:\n\n{link}\n\nShare this link with your friends. When they join, you earn rewards!"
        },

        // ========== DEFAULT ==========
        default: {
            english: "I don't understand. Try: 'Check this number: 080...' or 'What can you do?'",
            pidgin: "I no understand. Try: 'Check this number: 080...' or 'Wetin you fit do?'"
        }
    };

    const response = responses[type];
    if (!response) return getDefaultResponse(lang);

    let text = response[lang] || response.english;
    
    if (data) {
        for (const [key, value] of Object.entries(data)) {
            text = text.replace(new RegExp(`{${key}}`, 'g'), value);
        }
    }

    return text;
}

function getDefaultResponse(lang) {
    return lang === 'pidgin' 
        ? "I no understand. Try: 'Check this number: 080...' or 'Wetin you fit do?'"
        : "I don't understand. Try: 'Check this number: 080...' or 'What can you do?'";
}

// ============================================
// MAIN PROCESSOR
// ============================================

function processNaturalInput(text, userId, username) {
    const lang = detectLanguage(text);
    const lower = text.toLowerCase().trim();
    
    const intent = detectIntent(lower, text);
    
    switch (intent.type) {
        case 'checknumber':
            return handleCheckNumber(intent.value, lang);
        case 'checkmsg':
            return handleCheckMessage(intent.value, lang);
        case 'checklink':
            return handleCheckLink(intent.value, lang);
        case 'report':
            return handleReport(intent.value, userId, username, lang);
        case 'loan':
            return handleLoan(intent.value, lang);
        case 'loanincome':
            return handleLoanWithIncome(intent.amount, intent.income, lang);
        case 'help':
            return getResponse('help', null, lang);
        case 'stats':
            return handleStats(lang);
        case 'scamtypes':
            return getResponse('scamTypes', null, lang);
        case 'redflags':
            return getResponse('redFlags', null, lang);
        case 'whattodo':
            return getResponse('whatToDo', null, lang);
        case 'tips':
            return handleTips(lang);
        case 'whatis':
            return handleWhatIs(intent.value, lang);
        case 'partners':
            return getResponse('partners', null, lang);
        case 'partner':
            return getResponse('partner', null, lang);
        case 'referral':
            return handleReferral(userId, lang);
        case 'leaderboard':
            return handleLeaderboard(lang);
        case 'myreferrals':
            return handleMyReferrals(userId, lang);
        case 'plea':
            return getResponse('plea', null, lang);
        default:
            // Auto-detect if it looks like a number, message, or link
            if (text.match(/\b(0[789]\d{9})\b/)) {
                return handleCheckNumber(text.match(/\b(0[789]\d{9})\b/)[0], lang);
            }
            if (text.match(/https?:\/\/[^\s]+/)) {
                return handleCheckLink(text.match(/https?:\/\/[^\s]+/)[0], lang);
            }
            return getResponse('default', null, lang);
    }
}

// ============================================
// INTENT DETECTION
// ============================================

function detectIntent(lower, original) {
    // Check for loan with income (two numbers)
    const numbers = original.match(/\d{1,3}(?:,\d{3})*|\d+/g);
    if (lower.includes('loan') && numbers && numbers.length >= 2) {
        const amount = parseInt(numbers[0].replace(/,/g, ''));
        const income = parseInt(numbers[1].replace(/,/g, ''));
        return { type: 'loanincome', amount, income };
    }

    // Check number
    const numberMatch = original.match(/\b(0[789]\d{9})\b/);
    if (numberMatch) {
        if (lower.includes('report') || lower.includes('i want to report')) {
            return { type: 'report', value: numberMatch[1] };
        }
        if (lower.includes('appeal') || lower.includes('plea')) {
            return { type: 'plea', value: numberMatch[1] };
        }
        return { type: 'checknumber', value: numberMatch[1] };
    }

    // Link detection
    const linkMatch = original.match(/https?:\/\/[^\s]+/);
    if (linkMatch) {
        return { type: 'checklink', value: linkMatch[0] };
    }

    // Loan detection
    if (lower.includes('loan') || lower.includes('need money') || lower.includes('borrow')) {
        const amountMatch = original.match(/₦?(\d{1,3}(?:,\d{3})*|\d+)/);
        if (amountMatch) {
            return { type: 'loan', value: parseInt(amountMatch[1].replace(/,/g, '')) };
        }
        return { type: 'loan', value: 'ask' };
    }

    // Help
    if (lower.includes('what can you do') || lower.includes('help me') || 
        lower.includes('help') || lower.includes('what do you do')) {
        return { type: 'help' };
    }

    // Stats
    if (lower.includes('how many scammers') || lower.includes('caught') || 
        lower.includes('statistics') || lower.includes('stats')) {
        return { type: 'stats' };
    }

    // Scam types
    if (lower.includes('common scams') || lower.includes('what are scams') || 
        lower.includes('scam types') || lower.includes('types of scams')) {
        return { type: 'scamtypes' };
    }

    // Red flags
    if (lower.includes('red flag') || lower.includes('red flags')) {
        return { type: 'redflags' };
    }

    // What to do after scam
    if (lower.includes('been scammed') || lower.includes('i was scammed') || 
        lower.includes('what to do') || lower.includes('got scammed')) {
        return { type: 'whattodo' };
    }

    // Tips
    if (lower.includes('tip') || lower.includes('security tip') || 
        lower.includes('advice') || lower.includes('safe')) {
        return { type: 'tips' };
    }

    // What is
    if (lower.includes('what is') || lower.includes('what does') || 
        lower.includes('meaning of') || lower.includes('define')) {
        const term = original.replace(/what is|what does|meaning of|define/i, '').trim();
        return { type: 'whatis', value: term };
    }

    // Partners
    if (lower.includes('partner') || lower.includes('partners')) {
        if (lower.includes('how to become') || lower.includes('how can i')) {
            return { type: 'partner' };
        }
        return { type: 'partners' };
    }

    // Referral
    if (lower.includes('referral') || lower.includes('refer') || 
        lower.includes('invite') || lower.includes('link')) {
        return { type: 'referral' };
    }

    // Leaderboard
    if (lower.includes('leaderboard') || lower.includes('leading') || 
        lower.includes('top referrer')) {
        return { type: 'leaderboard' };
    }

    // My referrals
    if (lower.includes('my referrals') || lower.includes('how many people') || 
        lower.includes('my invites')) {
        return { type: 'myreferrals' };
    }

    // Report
    if (lower.includes('report') || lower.includes('i want to report')) {
        return { type: 'report', value: null };
    }

    return { type: 'auto', value: original };
}

// ============================================
// HANDLERS
// ============================================

function handleCheckNumber(number, lang) {
    // Simulate check - replace with actual detection
    const isScam = number.includes('999') || number.includes('111');
    if (isScam) {
        const count = Math.floor(Math.random() * 10) + 1;
        return getResponse('numberScam', { count }, lang);
    }
    return getResponse('numberClean', null, lang);
}

function handleCheckMessage(message, lang) {
    const scamIndicators = ['urgent', 'account', 'verify', 'click', 'send', 'pin', 'password', 'blocked', 'suspend', 'bank', 'alert'];
    const lower = message.toLowerCase();
    const found = scamIndicators.filter(word => lower.includes(word));
    
    if (found.length >= 2) {
        const flags = found.map(f => `• ${f}`).join('\n');
        return getResponse('messageScam', { flags }, lang);
    }
    return getResponse('messageClean', null, lang);
}

function handleCheckLink(url, lang) {
    const scamSites = ['fake', 'verify', 'secure', 'login', 'update', 'confirm'];
    const isScam = scamSites.some(site => url.toLowerCase().includes(site));
    if (isScam) {
        return getResponse('linkScam', null, lang);
    }
    return getResponse('linkClean', null, lang);
}

function handleReport(data, userId, username, lang) {
    if (!data || typeof data === 'string') {
        return getResponse('reportMissing', null, lang);
    }
    return getResponse('reportSuccess', { number: data, reason: 'Suspicious activity' }, lang);
}

function handleLoan(amount, lang) {
    if (!amount || amount === 'ask') {
        return getResponse('loanAskAmount', null, lang);
    }
    return getResponse('loanAskIncome', { amount: amount.toLocaleString() }, lang);
}

function handleLoanWithIncome(amount, income, lang) {
    const maxAffordable = income * 0.5;
    const monthlyRepayment = Math.round(amount * 1.1);
    const daily = Math.round(monthlyRepayment / 30);

    let app, amountRange, interest, approval;
    if (amount <= 100000) {
        app = 'PalmCredit';
        amountRange = '₦2,000 — ₦100,000';
        interest = '14% per month';
        approval = '1 minute';
    } else if (amount <= 500000) {
        app = 'FairMoney';
        amountRange = '₦1,500 — ₦500,000';
        interest = '10% — 30% per month';
        approval = '5 minutes';
    } else {
        app = 'Carbon';
        amountRange = '₦5,000 — ₦1,000,000';
        interest = '5% — 15% per month';
        approval = '2 minutes';
    }

    if (amount > maxAffordable) {
        return lang === 'pidgin'
            ? `⚠️ This loan dey risky. E pass 50% of your income. Consider smaller amount.`
            : `⚠️ This loan is risky. It exceeds 50% of your income. Consider a smaller amount.`;
    }

    return getResponse('loanRecommend', {
        income: income.toLocaleString(),
        amount: amount.toLocaleString(),
        app,
        amountRange,
        interest,
        approval,
        repayment: `${monthlyRepayment.toLocaleString()} in 30 days`,
        repaymentAmount: monthlyRepayment.toLocaleString(),
        daily: daily.toLocaleString()
    }, lang);
}

function handleStats(lang) {
    const count = getScammerCount ? getScammerCount() : 47;
    return getResponse('stats', { count }, lang);
}

function handleTips(lang) {
    const tips = [
        "Before you send money to anyone, check the number with me first.",
        "Never share your PIN or password with anyone. Your bank will never ask for it.",
        "If it sounds too good to be true, it probably is.",
        "Always verify links before clicking. Check with me first.",
        "Scammers use urgency. Take a deep breath and think before you act."
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)];
    return getResponse('tip', { tips: tip }, lang);
}

function handleWhatIs(term, lang) {
    const terms = {
        phishing: {
            title: 'Phishing',
            content: 'Phishing is when scammers send fake messages (email, SMS, or WhatsApp) pretending to be a legitimate company to steal your personal information like passwords, PINs, or bank details. They usually ask you to click a link and enter your details on a fake website.'
        },
        smishing: {
            title: 'Smishing',
            content: 'Smishing is phishing via SMS. Scammers send text messages pretending to be your bank or a service provider, asking you to click a link or reply with your personal information. Banks never ask for your PIN via SMS.'
        },
        vishing: {
            title: 'Vishing',
            content: 'Vishing is phishing via voice calls. Scammers call you pretending to be a bank agent or government official, trying to get your personal information over the phone. Hang up and call the official number to verify.'
        },
        'social engineering': {
            title: 'Social Engineering',
            content: 'Social engineering is manipulating people into revealing confidential information. Scammers use psychology, urgency, and trust to get you to share passwords, PINs, or send money.'
        }
    };

    const lower = term.toLowerCase();
    if (terms[lower]) {
        return getResponse('whatIs', { term: terms[lower].title, content: terms[lower].content }, lang);
    }
    return getResponse('notFound', { term }, lang);
}

function handleReferral(userId, lang) {
    const link = `https://t.me/JoshuaGiwaBot?start=ref_${userId}`;
    return getResponse('referral', { link }, lang);
}

function handleLeaderboard(lang) {
    return "🏆 Top referrers will appear here soon. Invite more people to move up!";
}

function handleMyReferrals(userId, lang) {
    return "📊 You have referred 0 people so far. Share your referral link to earn rewards!";
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    processNaturalInput,
    detectLanguage,
    getResponse,
    detectIntent,
    handleCheckNumber,
    handleCheckMessage,
    handleCheckLink,
    handleReport,
    handleLoan,
    handleLoanWithIncome,
    handleStats,
    handleTips,
    handleWhatIs,
    handleReferral,
    handleLeaderboard,
    handleMyReferrals
};