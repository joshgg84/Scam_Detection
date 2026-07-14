// natural.js - Natural Language Processor for Detective Jai
// Converts human-friendly input into structured commands
// Supports English and Pidgin

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
        'you dey', 'i dey', 'we dey', 'dem dey'
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
// RESPONSE GENERATOR
// ============================================

function getResponse(type, data, lang) {
    const responses = {
        welcome: {
            english: "Hello! I'm Detective Jai, your scam detective. I help you check numbers, messages, and links before you send money. Just tell me what you need.",
            pidgin: "How you dey? I'm Detective Jai, your scam detective. I dey help you check numbers, messages, and links before you send money. Just tell me wetin you need."
        },
        help: {
            english: "📚 *What I Can Do*\n\n🔹 Check numbers: 'Check this number: 080...'\n🔹 Check messages: 'Check this message: ...'\n🔹 Check links: 'Is this link safe? ...'\n🔹 Report scammers: 'I want to report 080...'\n🔹 Loan advice: 'I need a loan of ₦...'\n🔹 Stats: 'How many scammers have you caught?'\n\nJust tell me what you need.",
            pidgin: "📚 *Wetin I Fit Do*\n\n🔹 Check numbers: 'Check this number: 080...'\n🔹 Check messages: 'Check this message: ...'\n🔹 Check links: 'Is this link safe? ...'\n🔹 Report scammers: 'I want to report 080...'\n🔹 Loan advice: 'I need loan of ₦...'\n🔹 Stats: 'How many scammers you don catch?'\n\nJust tell me wetin you need."
        },
        numberClean: {
            english: "✅ *This number dey clean o.* No reports found. Still be cautious.",
            pidgin: "✅ *This number dey clean o.* No report so far. But still be careful."
        },
        numberScam: {
            english: "⚠️ *This number don dey reported {count} times o.* Na scam. Abeg no send money.",
            pidgin: "⚠️ *This number don dey reported {count} times o.* Na scam. Abeg no send money."
        },
        messageScam: {
            english: "⚠️ *Scam detected!*\n\nI found these red flags:\n{flags}\n\nDo not respond. Report this to me.",
            pidgin: "⚠️ *Na scam o!*\n\nI find these red flags:\n{flags}\n\nNo reply. Report this to me."
        },
        messageClean: {
            english: "✅ *This message dey clean o.* No scam patterns detected. Still be careful.",
            pidgin: "✅ *This message dey clean o.* No scam pattern detected. Still be careful."
        },
        loanAskAmount: {
            english: "💰 *Loan Advisor*\n\nHow much do you need? Send it like this:\n*\"I need a loan of ₦50,000\"*",
            pidgin: "💰 *Loan Advisor*\n\nHow much you need? Send am like this:\n*\"I need loan of ₦50,000\"*"
        },
        loanAskIncome: {
            english: "💰 *Loan Advisor*\n\nYou need ₦{amount}. How much is your monthly income?",
            pidgin: "💰 *Loan Advisor*\n\nYou need ₦{amount}. How much your salary be per month?"
        },
        loanRecommend: {
            english: "💰 *Loan Recommendation*\n\n✅ Based on your income of ₦{income}, you fit comfortably borrow ₦{amount}.\n\n📌 *Best option: {app}*\n   • Amount: {amountRange}\n   • Interest: {interest}\n   • Approval: {approval}\n   • Repayment: {repayment}\n\n📌 *Repayment plan:* ₦{repaymentAmount} for 30 days (about ₦{daily} per day)\n\n⚠️ Only borrow what you fit pay back in 30 days. No let debt shack you.",
            pidgin: "💰 *Loan Recommendation*\n\n✅ Based on your income of ₦{income}, you fit comfortably borrow ₦{amount}.\n\n📌 *Best option na {app}*\n   • Amount: {amountRange}\n   • Interest: {interest}\n   • Approval: {approval}\n   • Repayment: {repayment}\n\n📌 *Repayment plan:* ₦{repaymentAmount} for 30 days (about ₦{daily} per day)\n\n⚠️ Only borrow wetin you fit pay back in 30 days. No let debt shack you."
        },
        reportSuccess: {
            english: "✅ *Reported successfully!*\n\n📌 Number: {number}\n📌 Reason: {reason}\n\nYou don help protect others. Thank you my brother.",
            pidgin: "✅ *I don record am!*\n\n📌 Number: {number}\n📌 Reason: {reason}\n\nYou don help protect others. Thank you my brother."
        },
        reportMissing: {
            english: "📢 *Report Scammer*\n\nYou said you want to report a number. Please send it like this:\n*\"I want to report 08012345678 for loan scam\"*",
            pidgin: "📢 *Report Scammer*\n\nYou say you want to report number. Please send am like this:\n*\"I want to report 08012345678 for loan scam\"*"
        },
        stats: {
            english: "📊 *Statistics*\n\nI have caught **{count}** scammers so far.\n\nReport any suspicious number to help me catch more.",
            pidgin: "📊 *Statistics*\n\nI don catch **{count}** scammers so far.\n\nReport any suspicious number to help me catch more."
        },
        scamTypes: {
            english: "📚 *Common Scams in Nigeria*\n\n🔹 *Lottery Scam*: 'You win!' but you need to pay first. Na scam.\n🔹 *Phishing*: Fake bank messages asking for your PIN. Bank no dey ask for PIN.\n🔹 *Romance Scam*: 'I love you' but need money for visa. No send.\n🔹 *Employment Scam*: 'You get the job!' but need to pay for training. No pay.\n🔹 *Investment Scam*: 'Double your money in 30 days' — Na lie.\n\nStay safe. Always check with me before sending money.",
            pidgin: "📚 *Common Scams wey dey happen for Nigeria*\n\n🔹 *Lottery Scam*: 'You win!' but you need to pay first. Na scam.\n🔹 *Phishing*: Fake bank messages wey dey ask for your PIN. Bank no dey ask for PIN.\n🔹 *Romance Scam*: 'I love you' but need money for visa. No send.\n🔹 *Employment Scam*: 'You get the job!' but need to pay for training. Job no dey ask you to pay.\n🔹 *Investment Scam*: 'Double your money in 30 days' — Na lie.\n\nStay safe. Always check with me before you send money."
        },
        redFlags: {
            english: "🚩 *Red Flags of a Scam*\n\n1. Urgency — 'Act now!'\n2. Too good to be true — 'You won 7 million naira!'\n3. Asking for money — 'Send ₦10,000 for processing'\n4. Asking for personal info — 'Send your PIN'\n5. Pressure — 'Don't tell anyone'\n\nIf you see any of these, stop and check with me.",
            pidgin: "🚩 *Red Flags of a Scam*\n\n1. Urgency — 'Act now!'\n2. Too good to be true — 'You won 7 million naira!'\n3. Asking for money — 'Send ₦10,000 for processing'\n4. Asking for personal info — 'Send your PIN'\n5. Pressure — 'Don't tell anyone'\n\nIf you see any of these, stop and check with me."
        },
        whatToDo: {
            english: "📝 *What to Do If You've Been Scammed*\n\n1. Stop sending money immediately.\n2. Report the number to me: 'I want to report 080...'\n3. Contact your bank to block the transaction.\n4. Report to the police.\n5. Tell your family and friends.\n\nYou are not alone. We will get them.",
            pidgin: "📝 *Wetin to Do If You Don Already Send Money*\n\n1. Stop sending money immediately.\n2. Report the number to me: 'I want to report 080...'\n3. Contact your bank to block the transaction.\n4. Report to police.\n5. Tell your family and friends.\n\nYou are not alone. We go get them."
        },
        tip: {
            english: "🔐 *Security Tip*\n\n{tips}",
            pidgin: "🔐 *Security Tip*\n\n{tips}"
        },
        whatIs: {
            english: "📖 *{term}*\n\n{content}",
            pidgin: "📖 *{term}*\n\n{content}"
        },
        notFound: {
            english: "❌ I don't have information on '{term}' yet. Try asking about: phishing, smishing, vishing, or social engineering.",
            pidgin: "❌ I no get information on '{term}' yet. Try asking about: phishing, smishing, vishing, or social engineering."
        },
        partner: {
            english: "🤝 *Partner Program*\n\n*Standard* — ₦11,000/month\n*Premium* — ₦17,000/month\n\nRegister: Contact @JoshuaGiwa\nWhatsApp: 09025839789",
            pidgin: "🤝 *Partner Program*\n\n*Standard* — ₦11,000/month\n*Premium* — ₦17,000/month\n\nRegister: Contact @JoshuaGiwa\nWhatsApp: 09025839789"
        },
        partners: {
            english: "🤝 *Partners Directory*\n\nWe work with trusted businesses to keep you safe.\n\nTo become a partner: Send 'How can I become a partner?'",
            pidgin: "🤝 *Partners Directory*\n\nWe work with trusted businesses to keep you safe.\n\nTo become a partner: Send 'How can I become a partner?'"
        },
        default: {
            english: "I don't understand. Try: 'Check this number: 080...' or 'What can you do?'",
            pidgin: "I no understand. Try: 'Check this number: 080...' or 'Wetin you fit do?'"
        }
    };

    const response = responses[type];
    if (!response) return responses.default[lang] || responses.default.english;

    let text = response[lang] || response.english;
    
    // Replace placeholders
    if (data) {
        for (const [key, value] of Object.entries(data)) {
            text = text.replace(new RegExp(`{${key}}`, 'g'), value);
        }
    }

    return text;
}

// ============================================
// MAIN PROCESSOR
// ============================================

function processNaturalInput(text, userId, username) {
    const lang = detectLanguage(text);
    const lower = text.toLowerCase().trim();
    
    // Detect intent
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
            return handlePlea(intent.value, userId, username, lang);
        default:
            return getResponse('default', null, lang);
    }
}

// ============================================
// INTENT DETECTION
// ============================================

function detectIntent(lower, original) {
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
    const result = detection.checkNumber(number);
    if (result.includes('scam') || result.includes('reported')) {
        const count = result.match(/\d+/)?.[0] || 'unknown';
        return getResponse('numberScam', { count }, lang);
    }
    return getResponse('numberClean', null, lang);
}

function handleCheckMessage(message, lang) {
    const result = detection.checkMessage(message);
    if (result.includes('scam') || result.includes('red flag')) {
        const flags = result.split('\n').slice(1).join('\n');
        return getResponse('messageScam', { flags }, lang);
    }
    return getResponse('messageClean', null, lang);
}

function handleCheckLink(url, lang) {
    const result = links.checkLink(url);
    return result;
}

function handleReport(data, userId, username, lang) {
    if (!data || typeof data === 'string') {
        return getResponse('reportMissing', null, lang);
    }
    const result = scammers.reportNumber(data, 'Suspicious activity', userId, username);
    return getResponse('reportSuccess', { number: data, reason: 'Suspicious activity' }, lang);
}

function handleLoan(amount, lang) {
    if (!amount || amount === 'ask') {
        return getResponse('loanAskAmount', null, lang);
    }
    return getResponse('loanAskIncome', { amount: amount.toLocaleString() }, lang);
}

function handleLoanWithIncome(amount, income, lang) {
    // Calculate recommendation
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

    return getResponse('loanRecommend', {
        income: income.toLocaleString(),
        amount: amount.toLocaleString(),
        app,
        amountRange,
        interest,
        approval,
        repaymentAmount: monthlyRepayment.toLocaleString(),
        daily: daily.toLocaleString()
    }, lang);
}

function handleStats(lang) {
    const count = scammers.getScammerCount();
    return getResponse('stats', { count }, lang);
}

function handleTips(lang) {
    const tips = [
        "🔐 Before you send money to anyone, check the number with me first.",
        "🔐 Never share your PIN or password with anyone. Your bank will never ask for it.",
        "🔐 If it sounds too good to be true, it probably is.",
        "🔐 Always verify links before clicking. Check with me first.",
        "🔐 Scammers use urgency. Take a deep breath and think before you act."
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)];
    return getResponse('tip', { tips: tip }, lang);
}

function handleWhatIs(term, lang) {
    if (!term) {
        return getResponse('whatIs', { term: '...', content: 'Tell me what you want to know: "What is phishing?"' }, lang);
    }
    const result = detection.getTerm(term);
    if (result) {
        return getResponse('whatIs', { term: result.title, content: result.content }, lang);
    }
    return getResponse('notFound', { term }, lang);
}

function handleReferral(userId, lang) {
    const link = referralSystem.getReferralLink(userId);
    return `🤝 *Your Referral Link*\n\n${link}\n\nShare this link with your friends. When they join, you earn rewards!`;
}

function handleLeaderboard(lang) {
    return referralSystem.getLeaderboard();
}

function handleMyReferrals(userId, lang) {
    return referralSystem.getMyReferrals(userId);
}

function handlePlea(data, userId, username, lang) {
    return getResponse('plea', null, lang);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    processNaturalInput,
    detectLanguage,
    getResponse,
    detectIntent,
    handleLoanWithIncome
};