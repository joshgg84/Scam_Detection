// natural.js - Natural Language Processor for Detective Jai
// Converts human-friendly input into structured commands
// Supports English and Pidgin
// Uses detection.js for scam analysis

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
// SPONSOR MESSAGE
// ============================================

function getSponsorMessage() {
    return `\n\n🤝 *SPONSORED BY*\n\n*Standard* — ₦11,000/month\n*Premium* — ₦17,000/month\n\n📲 Contact: @JoshuaGiwa\n💬 WhatsApp: 09025839789`;
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
            english: "✅ This number is clean. No reports found.",
            pidgin: "✅ This number dey clean o. No report so far."
        },
        numberScam: {
            english: "🚨 This number has been reported {count} times! It is a scam. DO NOT send money.",
            pidgin: "🚨 This number don dey reported {count} times o! Na scam. NO send money."
        },

        // ========== MESSAGE CHECK ==========
        messageAnalysis: {
            english: "🔍 *MESSAGE ANALYSIS*\n\n{analysis}\n\n📊 *Risk Score:* {score}%\n\n{recommendation}",
            pidgin: "🔍 *MESSAGE ANALYSIS*\n\n{analysis}\n\n📊 *Risk Score:* {score}%\n\n{recommendation}"
        },

        // ========== LINK CHECK ==========
        linkAnalysis: {
            english: "🔍 *LINK ANALYSIS*\n\n{analysis}\n\n📊 *Risk Score:* {score}%\n\n{recommendation}",
            pidgin: "🔍 *LINK ANALYSIS*\n\n{analysis}\n\n📊 *Risk Score:* {score}%\n\n{recommendation}"
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
            english: "🚩 *SCAM RED FLAGS*\n\n{flags}",
            pidgin: "🚩 *SCAM RED FLAGS*\n\n{flags}"
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

    // Check message detection (MUST come before generic checks)
    if (lower.includes('check this message') || 
        lower.includes('check message') ||
        lower.includes('checkmsg') ||
        lower.includes('analyze this message') ||
        lower.includes('analyze message') ||
        lower.includes('check this text') ||
        lower.includes('check text')) {
        // Extract the message after the prefix
        let messageText = original;
        const prefixes = ['check this message:', 'check message:', 'checkmsg', 'analyze this message:', 'check this text:', 'check text:'];
        for (const prefix of prefixes) {
            if (lower.includes(prefix)) {
                const parts = original.toLowerCase().split(prefix);
                if (parts.length > 1) {
                    messageText = original.substring(original.toLowerCase().indexOf(prefix) + prefix.length).trim();
                    break;
                }
            }
        }
        return { type: 'checkmsg', value: messageText };
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
// HANDLERS (Using detection.js)
// ============================================

function handleCheckNumber(number, lang) {
    const reported = detection.checkNumberInDatabase ? detection.checkNumberInDatabase(number) : false;
    let response;
    
    if (reported) {
        const count = Math.floor(Math.random() * 10) + 1;
        response = getResponse('numberScam', { count }, lang);
    } else {
        response = getResponse('numberClean', null, lang);
    }
    
    return response + getSponsorMessage();
}

function handleCheckMessage(message, lang) {
    // Use detection.js for comprehensive analysis
    const analysis = detection.analyzeMessage(message);
    
    // Build alerts summary
    let alertsSummary = '';
    if (analysis.alerts && analysis.alerts.length > 0) {
        alertsSummary = analysis.alerts.slice(0, 5).map(a => `• ${a}`).join('\n');
    } else {
        alertsSummary = '✅ No scam indicators found.';
    }
    
    // Get risk level emoji
    const riskEmoji = analysis.emoji || '🟢';
    const riskScore = analysis.riskScore || 0;
    
    let response = getResponse('messageAnalysis', {
        analysis: alertsSummary,
        score: riskScore,
        recommendation: analysis.recommendation || 'Stay cautious.'
    }, lang);
    
    // Add risk level header
    const riskHeader = `*${analysis.emoji} RISK LEVEL: ${analysis.riskLevel || 'LOW'}*\n\n`;
    response = riskHeader + response;
    
    return response + getSponsorMessage();
}

function handleCheckLink(url, lang) {
    // Check if link is reported
    const reported = links.checkLink ? links.checkLink(url) : null;
    
    let analysisText = '';
    let riskScore = 0;
    let recommendation = '';
    
    if (reported) {
        analysisText = `🚨 This link has been REPORTED as a scam!\nReason: ${reported.reason || 'Suspicious activity'}`;
        riskScore = 80;
        recommendation = '❌ DO NOT click this link. Block and report the sender.';
    } else {
        // Analyze the link
        const linkAnalysis = links.analyzeLink ? links.analyzeLink(url) : null;
        if (linkAnalysis && linkAnalysis.riskScore >= 30) {
            analysisText = `⚠️ Suspicious link detected.\nReasons: ${(linkAnalysis.reasons || ['Suspicious pattern']).slice(0, 2).join(', ')}`;
            riskScore = linkAnalysis.riskScore || 30;
            recommendation = '⚠️ Be careful. Verify the URL before clicking.';
        } else {
            analysisText = '✅ No immediate red flags detected.';
            riskScore = 10;
            recommendation = '⚠️ Still verify the URL before clicking.';
        }
    }
    
    let response = getResponse('linkAnalysis', {
        analysis: analysisText,
        score: riskScore,
        recommendation: recommendation
    }, lang);
    
    // Add risk level
    const riskLevel = riskScore >= 60 ? '🔴 HIGH' : riskScore >= 30 ? '🟡 MEDIUM' : '🟢 LOW';
    response = `*${riskLevel} RISK*\n\n` + response;
    
    return response + getSponsorMessage();
}

function handleReport(data, userId, username, lang) {
    if (!data || typeof data === 'string') {
        return getResponse('reportMissing', null, lang);
    }
    const reason = data.reason || 'Suspicious activity';
    return getResponse('reportSuccess', { number: data.number, reason: reason }, lang);
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
        app = 'Carbon (formerly Paylater)';
        amountRange = '₦2,000 - ₦100,000';
        interest = '5-10% monthly';
        approval = 'Instant (5 mins)';
        repayment = 'Up to 30 days';
    } else if (amount <= 500000) {
        app = 'FairMoney';
        amountRange = '₦2,000 - ₦500,000';
        interest = '5-15% monthly';
        approval = 'Instant (10 mins)';
        repayment = 'Up to 60 days';
    } else if (amount <= 1000000) {
        app = 'Aella Credit';
        amountRange = '₦1,000 - ₦1,000,000';
        interest = '3-6% monthly';
        approval = '24-48 hours';
        repayment = 'Up to 90 days';
    } else {
        app = 'Sterling Bank';
        amountRange = '₦500,000 - ₦5,000,000';
        interest = '2-4% monthly';
        approval = '3-7 days';
        repayment = 'Up to 180 days';
    }

    const data = {
        amount: amount.toLocaleString(),
        income: income.toLocaleString(),
        app,
        amountRange,
        interest,
        approval,
        repayment,
        repaymentAmount: monthlyRepayment.toLocaleString(),
        daily: daily.toLocaleString()
    };

    return getResponse('loanRecommend', data, lang);
}

function handleStats(lang) {
    const count = scammers.getScammerCount ? scammers.getScammerCount() : 47;
    return getResponse('stats', { count }, lang);
}

function handleTips(lang) {
    const tips = [
        'Never share your PIN or OTP with anyone.',
        'Verify before you trust. Always double-check.',
        'Report suspicious numbers to help protect others.',
        'Don\'t click on links from unknown senders.',
        'If it sounds too good to be true, it probably is.'
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    return getResponse('tip', { tips: randomTip }, lang);
}

function handleWhatIs(term, lang) {
    // Check detection.js terms first
    const termInfo = detection.getTerm ? detection.getTerm(term) : null;
    if (termInfo) {
        return getResponse('whatIs', { term, content: termInfo }, lang);
    }
    
    const terms = {
        'phishing': 'A scam where criminals pretend to be legitimate companies to steal your personal information.',
        'smishing': 'Phishing via SMS text messages.',
        'vishing': 'Phishing via phone calls.',
        'social engineering': 'Manipulating people into revealing confidential information.',
        'sim swap': 'When a scammer tricks your mobile network into transferring your number to their SIM.',
        'investment scam': 'A scheme promising high returns that are actually non-existent.',
        'romance scam': 'When someone pretends to be in love with you to get money.'
    };

    const content = terms[term.toLowerCase()];
    if (content) {
        return getResponse('whatIs', { term, content }, lang);
    }
    return getResponse('notFound', { term }, lang);
}

function handleReferral(userId, lang) {
    const link = `https://t.me/joshuagiwabot?start=ref_${userId}`;
    return getResponse('referral', { link }, lang);
}

function handleLeaderboard(lang) {
    return "🏆 *LEADERBOARD*\n\n1. @user1 - 15 referrals\n2. @user2 - 12 referrals\n3. @user3 - 10 referrals\n\nInvite more friends to earn rewards!";
}

function handleMyReferrals(userId, lang) {
    return "📊 *YOUR REFERRALS*\n\nYou've referred 5 people so far.\n\nKeep sharing your link to earn more rewards!";
}

function handleRedFlags(lang) {
    const flags = detection.redFlagsContent || `🚩 *SCAM RED FLAGS*

URGENCY: "URGENT", "IMMEDIATELY", "ACT NOW"
MONEY: "SEND MONEY", "GIFT CARD", "BITCOIN", "PAY", "DEPOSIT"
INFO: "PIN", "OTP", "BVN", "CVV"
FAKE: "WINNING", "LOTTERY", "PRINCE"
INVESTMENT: "DOUBLE YOUR MONEY", "GUARANTEED RETURNS", "RISK FREE"
ACCOUNT: "RENT", "LEASE", "LINKEDIN"
JOBS: "WORK FROM HOME", "REGISTRATION FEE"

👥 Join our community for support.`;
    
    return getResponse('redFlags', { flags }, lang);
}

// ============================================
// MAIN PROCESSOR
// ============================================

function processNaturalInput(text, userId, username) {
    const lang = detectLanguage(text);
    const lower = text.toLowerCase().trim();
    
    const intent = detectIntent(lower, text);
    
    console.log(`🧠 Intent: ${intent.type}, Language: ${lang}`);
    
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
            return handleRedFlags(lang);
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
            const phoneMatch = text.match(/\b(0[789]\d{9})\b/);
            if (phoneMatch) {
                return handleCheckNumber(phoneMatch[0], lang);
            }
            const linkMatch = text.match(/https?:\/\/[^\s]+/);
            if (linkMatch) {
                return handleCheckLink(linkMatch[0], lang);
            }
            return getResponse('default', null, lang);
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    detectLanguage,
    detectIntent,
    getResponse,
    processNaturalInput,
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
    handleMyReferrals,
    handleRedFlags,
    getSponsorMessage
};