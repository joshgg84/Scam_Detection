// detection.js - Scam Detection and Analysis Module
// Contains analyzeMessage function with context-aware detection
// Flags scam phrases, not innocent keywords

const fs = require('fs');
const linkModule = require('./links.js');
const { getAllScammers } = require('./scammers.js');

// ========== LOAD TERMS DATABASE ==========
let scamTerms = {};
const TERMS_FILE = 'terms.json';

function loadTerms() {
    try {
        if (fs.existsSync(TERMS_FILE)) {
            const data = fs.readFileSync(TERMS_FILE, 'utf8');
            scamTerms = JSON.parse(data);
            console.log(`📚 Loaded ${Object.keys(scamTerms).length} scam terms from terms.json`);
        } else {
            console.error('❌ terms.json not found!');
            scamTerms = {};
        }
    } catch (err) {
        console.error('Error loading terms.json:', err);
        scamTerms = {};
    }
}

function getTerm(term) {
    const lowerTerm = term.toLowerCase();
    if (scamTerms[lowerTerm]) return scamTerms[lowerTerm];
    for (const [key, value] of Object.entries(scamTerms)) {
        if (key.includes(lowerTerm) || lowerTerm.includes(key)) return value;
    }
    return null;
}

function getAllTermKeys() {
    return Object.keys(scamTerms);
}

function getCommonScams() {
    const commonKeys = ['phishing', '419', 'romance scam', 'fake alert', 'investment scam', 'job scam', 'loan scam', 'sim swap', 'otp scam', 'pig butchering'];
    return commonKeys.filter(key => scamTerms[key]);
}

// Load terms immediately
loadTerms();

// ========== HELPER FUNCTIONS ==========
function checkNumberInDatabase(phoneNumber) {
    const scammers = getAllScammers();
    const cleaned = phoneNumber.toString().replace(/\D/g, '');
    if (cleaned.length === 0) return false;
    return scammers.some(scammer => {
        const scammerCleaned = scammer.toString().replace(/\D/g, '');
        return scammerCleaned === cleaned;
    });
}

// ========== ENHANCED SCAM DETECTION (CONTEXT-AWARE) ==========
function analyzeMessage(text) {
    const alerts = [];
    let riskScore = 0;
    const lowerText = text.toLowerCase();

    // ========== SCAM PHRASES (HIGH CONFIDENCE) ==========
    const scamPhrases = [
        // Investment scams
        { phrase: 'double your money', points: 30, explanation: 'No legitimate investment doubles your money quickly. This is a scam.' },
        { phrase: 'double your investment', points: 30, explanation: 'No legitimate investment doubles your money quickly. This is a scam.' },
        { phrase: 'guaranteed profit', points: 30, explanation: 'No investment guarantees profit. This is a red flag.' },
        { phrase: 'guaranteed returns', points: 30, explanation: 'No investment guarantees returns. This is a scam tactic.' },
        { phrase: 'risk free investment', points: 25, explanation: 'All investments carry risk. "Risk-free" is a lie.' },
        { phrase: 'risk free profit', points: 25, explanation: 'No profit is risk-free. This is a scam promise.' },
        { phrase: '100% returns', points: 30, explanation: '100% returns promise is mathematically impossible in legitimate investments.' },
        { phrase: '100% profit', points: 30, explanation: 'No legitimate investment guarantees 100% profit.' },
        { phrase: 'get rich quick', points: 25, explanation: '"Get rich quick" schemes always fail. Real wealth takes time.' },
        { phrase: 'easy money', points: 25, explanation: 'Scammers promise easy money to lure you. Real money requires work.' },
        { phrase: 'make money fast', points: 20, explanation: 'Fast money promises are usually scams.' },
        { phrase: 'passive income', points: 10, explanation: 'Be cautious of "passive income" promises without a clear business model.' },
        
        // Forex/Crypto scam phrases (not the words alone)
        { phrase: 'forex guaranteed profit', points: 25, explanation: 'No forex trading strategy guarantees profit. This is a scam.' },
        { phrase: 'forex guaranteed returns', points: 25, explanation: 'Forex trading never guarantees returns. This is a scam.' },
        { phrase: 'crypto guaranteed returns', points: 25, explanation: 'Cryptocurrency investments do not guarantee returns. This is a scam.' },
        { phrase: 'forex risk free', points: 25, explanation: 'Forex trading always carries risk. "Risk-free forex" does not exist.' },
        { phrase: 'crypto risk free', points: 25, explanation: 'Crypto investments carry risk. "Risk-free crypto" is a scam.' },
        { phrase: 'crypto double your money', points: 30, explanation: 'No cryptocurrency investment doubles your money guaranteed.' },
        { phrase: 'trading signals guaranteed', points: 20, explanation: 'No trading signal service can guarantee wins.' },
        { phrase: 'forex signals guaranteed', points: 20, explanation: 'No forex signal service guarantees profit.' },
        
        // Urgency + investment
        { phrase: 'limited spots', points: 10, explanation: 'False scarcity to pressure you into quick decisions.' },
        { phrase: 'limited slots', points: 10, explanation: 'False scarcity tactic to rush your decision.' },
        { phrase: 'act now', points: 10, explanation: 'Urgency tactic to prevent you from thinking clearly.' },
        { phrase: 'don\'t miss out', points: 8, explanation: 'Scammers use FOMO to pressure you.' },
        
        // MLM/Pyramid scheme phrases
        { phrase: 'join my team', points: 10, explanation: 'MLM and pyramid schemes use "join my team" recruitment.' },
        { phrase: 'build your downline', points: 15, explanation: 'Pyramid schemes focus on building downlines, not selling products.' },
        { phrase: 'binary plan', points: 15, explanation: 'Binary compensation plans are common in scam MLMs.' },
        { phrase: 'matrix plan', points: 15, explanation: 'Matrix plans are often pyramid schemes in disguise.' },
        { phrase: 'unilevel plan', points: 10, explanation: 'Be cautious of MLM compensation plans.' },
        
        // Crypto scam phrases
        { phrase: 'cloud mining', points: 20, explanation: 'Cloud mining is often a scam. Most legitimate mining requires equipment.' },
        { phrase: 'crypto giveaway', points: 15, explanation: 'Crypto giveaways are almost always scams.' },
        { phrase: 'airdrop scam', points: 15, explanation: 'Fake airdrops are used to steal your wallet information.' },
        { phrase: 'liquidity mining', points: 15, explanation: 'Scam liquidity mining platforms steal your crypto.' },
        { phrase: 'pump and dump', points: 25, explanation: 'Pump and dump schemes are illegal. You will lose money.' },
        { phrase: 'crypto pump', points: 20, explanation: 'Crypto pump and dump groups are scams.' },
        
        // Banking/Account scams
        { phrase: 'verify your account', points: 15, explanation: 'Scammers pretend your account needs verification to steal login details.' },
        { phrase: 'account suspended', points: 15, explanation: 'Fake account suspension threats to make you panic and click.' },
        { phrase: 'deactivate your account', points: 15, explanation: 'Fake deactivation threats to scare you.' },
        { phrase: 'click here to verify', points: 15, explanation: 'Scammers hide malicious links behind "click here".' },
        { phrase: 'confirm your pin', points: 25, explanation: 'NEVER share your PIN with anyone.' },
        { phrase: 'update your billing', points: 15, explanation: 'Fake update requests to steal payment information.' },
        
        // Job scams
        { phrase: 'work from home', points: 10, explanation: 'Fake work-from-home jobs often ask for "registration fees".' },
        { phrase: 'data entry job', points: 8, explanation: 'Fake data entry jobs are common scams.' },
        { phrase: 'pay to apply', points: 20, explanation: 'Legitimate jobs never ask for payment to apply.' },
        { phrase: 'registration fee', points: 20, explanation: 'Real jobs don\'t charge registration fees.' },
        
        // Rental/Property scams
        { phrase: 'holding fee', points: 15, explanation: 'Fake landlords ask for holding fees on properties that don\'t exist.' },
        { phrase: 'deposit now', points: 10, explanation: 'Urgent deposit requests are often rental scams.' },
        { phrase: 'viewing fee', points: 15, explanation: 'Legitimate landlords don\'t charge viewing fees.' },
        
        // Romance scams
        { phrase: 'military deployment', points: 15, explanation: 'Common romance scam tactic: fake military member needs money.' },
        { phrase: 'overseas worker', points: 10, explanation: 'Scammers pretend to be overseas workers needing emergency funds.' },
        { phrase: 'sick relative', points: 10, explanation: 'Fake medical emergencies are common in romance scams.' }
    ];
    
    // ========== SENSITIVE INFO REQUESTS ==========
    const sensitiveRequests = [
        { word: 'pin', points: 30, explanation: 'Your PIN is the key to your account. NEVER share it.' },
        { word: 'otp', points: 30, explanation: 'OTP gives access to your account. NEVER share it.' },
        { word: 'bvn', points: 25, explanation: 'BVN is your biometric identity. Scammers use it to impersonate you.' },
        { word: 'cvv', points: 30, explanation: 'CVV allows online theft. NEVER share it.' },
        { word: 'seed phrase', points: 30, explanation: 'NEVER share your crypto seed phrase. Anyone asking is a scammer.' },
        { word: 'private key', points: 30, explanation: 'Your private key is like your bank password. Never share it.' },
        { word: 'recovery phrase', points: 30, explanation: 'Recovery phrase gives full access to your crypto wallet.' },
        { word: 'wallet address', points: 15, explanation: 'Be cautious sharing your wallet address with strangers.' },
        { word: 'login details', points: 20, explanation: 'Never share your login details with anyone.' },
        { word: 'password', points: 25, explanation: 'No legitimate service asks for your password via message.' },
        { word: 'card number', points: 25, explanation: 'Never share your full card number with anyone who contacts you.' },
        { word: 'nuban', points: 15, explanation: 'Your NUBAN account number can be used to target you.' }
    ];
    
    // ========== CHECK SCAM PHRASES ==========
    for (const phrase of scamPhrases) {
        if (lowerText.includes(phrase.phrase)) {
            alerts.push(`⚠️ "${phrase.phrase.toUpperCase()}" → ${phrase.explanation}`);
            riskScore += phrase.points;
        }
    }
    
    // ========== CHECK SENSITIVE INFO REQUESTS ==========
    for (const info of sensitiveRequests) {
        if (lowerText.includes(info.word)) {
            alerts.push(`🚨 "${info.word.toUpperCase()}" request → ${info.explanation}`);
            riskScore += info.points;
        }
    }
    
    // ========== CHECK FOR PHONE NUMBERS ==========
    const phoneMatch = text.match(/0[789][01]\d{8}/);
    if (phoneMatch) {
        const reported = checkNumberInDatabase(phoneMatch[0]);
        if (reported) {
            alerts.push(`🚨 ${phoneMatch[0]} is a REPORTED SCAMMER! DO NOT CALL or SEND MONEY.`);
            riskScore += 50;
        } else {
            alerts.push(`📞 Phone number found: ${phoneMatch[0]} → Be cautious if this number contacts you.`);
            riskScore += 5;
        }
    }
    
    // ========== CHECK FOR AMOUNTS (Money requests without "send money") ==========
    const amountMatch = text.match(/[\d,]+/g);
    if (amountMatch) {
        for (const amount of amountMatch) {
            const cleanAmount = amount.replace(/,/g, '');
            const amountNum = parseInt(cleanAmount);
            if (amountNum && amountNum >= 1000) {
                // Check if message contains both an amount AND a request word
                const requestWords = ['send', 'pay', 'deposit', 'transfer', 'send to', 'pay to', 'send me', 'pay me'];
                const hasRequest = requestWords.some(word => lowerText.includes(word));
                if (hasRequest) {
                    alerts.push(`💰 Money request detected: ${amount} → Scammers often ask for specific amounts to pressure you.`);
                    riskScore += 15;
                    break;
                }
            }
        }
    }
    
    // ========== CHECK FOR LINKS ==========
    if (lowerText.includes('http://') || lowerText.includes('https://')) {
        alerts.push(`🔗 Link detected → Could be phishing. DO NOT click suspicious links.`);
        riskScore += 15;
    }
    
    // ========== CHECK FOR URGENCY TACTICS ==========
    const urgencyWords = ['immediately', 'asap', 'right now', 'today only', 'now', 'urgent'];
    urgencyWords.forEach(word => {
        if (lowerText.includes(word)) {
            alerts.push(`⏰ False urgency tactic: "${word.toUpperCase()}" → Scammers rush you so you don't think clearly.`);
            riskScore += 8;
        }
    });
    
    // ========== CHECK FOR MONEY REQUESTS ==========
    const moneyPhrases = ['send money', 'transfer money', 'deposit', 'wire transfer', 'western union', 'send me', 'pay me', 'pay to', 'send to'];
    moneyPhrases.forEach(phrase => {
        if (lowerText.includes(phrase)) {
            alerts.push(`💰 Direct money request → Legitimate contacts don't ask for money via unsolicited messages.`);
            riskScore += 20;
        }
    });
    
    // ========== CHECK FOR "VERIFY" + "PAYMENT" combination ==========
    if (lowerText.includes('verify') && (lowerText.includes('payment') || lowerText.includes('pay'))) {
        alerts.push(`⚠️ "VERIFY" + "PAYMENT" combination → Scammers often ask for "verification payments" that don't exist.`);
        riskScore += 25;
    }
    
    // ========== DETERMINE RISK LEVEL ==========
    let riskLevel, emoji, recommendation;
    if (riskScore >= 40) {
        riskLevel = "HIGH";
        emoji = "🔴";
        recommendation = "❌ DO NOT RESPOND. DO NOT SEND MONEY. DO NOT INVEST.\n✅ Block the sender immediately.\n✅ Report the number: /report [number] [reason]\n✅ Do not click any links.";
    } else if (riskScore >= 20) {
        riskLevel = "MEDIUM";
        emoji = "🟡";
        recommendation = "⚠️ This message shows clear signs of a scam.\n✅ Verify the sender through an OFFICIAL channel.\n✅ Do not click any links.\n✅ Do not share personal information.";
    } else if (riskScore >= 10) {
        riskLevel = "LOW-MEDIUM";
        emoji = "🟠";
        recommendation = "⚠️ Some suspicious signs detected.\n✅ Be cautious.\n✅ Verify before responding.\n✅ When in doubt, /report the number.";
    } else {
        riskLevel = "LOW";
        emoji = "🟢";
        recommendation = "✅ No obvious scam indicators.\n⚠️ Still be cautious with unknown senders.\n⚠️ Never share personal information via message.";
    }
    
    return { riskLevel, emoji, riskScore, alerts, recommendation };
}

// ========== ANALYZE MESSAGE WITH LINK DETECTION ==========
async function analyzeMessageWithLinks(text, linkModule) {
    const analysis = analyzeMessage(text);
    
    // Extract and check links
    const links = linkModule.extractLinks(text);
    const linkWarnings = [];
    
    for (const link of links) {
        const reported = linkModule.checkLink(link);
        if (reported) {
            linkWarnings.push({
                type: 'reported',
                url: link,
                reason: reported.reason,
                riskLevel: reported.riskLevel
            });
            analysis.riskScore += 30;
            analysis.alerts.push(`🚨 REPORTED SCAM LINK: ${link} → ${reported.reason}`);
        } else {
            const linkAnalysis = linkModule.analyzeLink(link);
            if (linkAnalysis.riskScore >= 30) {
                linkWarnings.push({
                    type: 'suspicious',
                    url: link,
                    reasons: linkAnalysis.reasons.slice(0, 2)
                });
                analysis.riskScore += 15;
                analysis.alerts.push(`⚠️ Suspicious link detected → ${link}`);
            }
        }
    }
    
    // Re-evaluate risk level after links
    if (analysis.riskScore >= 40) {
        analysis.riskLevel = "HIGH";
        analysis.emoji = "🔴";
    } else if (analysis.riskScore >= 20) {
        analysis.riskLevel = "MEDIUM";
        analysis.emoji = "🟡";
    } else if (analysis.riskScore >= 10) {
        analysis.riskLevel = "LOW-MEDIUM";
        analysis.emoji = "🟠";
    }
    
    return { analysis, linkWarnings };
}

// ========== EDUCATION CONTENT ==========
const redFlagsContent = `🚩 *SCAM RED FLAGS*

URGENCY: "URGENT", "IMMEDIATELY", "ACT NOW"
MONEY: "SEND MONEY", "GIFT CARD", "BITCOIN", "PAY", "DEPOSIT"
INFO: "PIN", "OTP", "BVN", "CVV"
FAKE: "WINNING", "LOTTERY", "PRINCE"
INVESTMENT: "DOUBLE YOUR MONEY", "GUARANTEED RETURNS", "RISK FREE"
ACCOUNT: "RENT", "LEASE", "LINKEDIN"
JOBS: "WORK FROM HOME", "REGISTRATION FEE"

👥 Join our community: https://t.me/+8JUqlJ-4SBdlZTM0`;

const whatToDoContent = `🆘 *YOU'VE BEEN SCAMMED*

1. Contact your bank immediately
2. Save all evidence (screenshots, messages)
3. Report to EFCC: 08093322644
4. Report number to this bot: /report
5. Join our community for support: https://t.me/+8JUqlJ-4SBdlZTM0`;

// ========== EXPORTS ==========
module.exports = {
    analyzeMessage,
    analyzeMessageWithLinks,
    checkNumberInDatabase,
    getTerm,
    getAllTermKeys,
    getCommonScams,
    loadTerms,
    redFlagsContent,
    whatToDoContent,
    scamTerms
};