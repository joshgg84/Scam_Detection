// detection.js - Scam Detection and Analysis Module
// Contains analyzeMessage function with detailed explanations

const linkModule = require('./links.js');
const { getAllScammers } = require('./scammers.js');

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

// ========== ENHANCED SCAM DETECTION WITH EXPLANATIONS ==========
function analyzeMessage(text) {
    const alerts = [];
    let riskScore = 0;
    const lowerText = text.toLowerCase();

    // Red flags with explanations
    const redFlags = [
        { word: 'urgent', points: 10, explanation: 'Scammers create FALSE URGENCY to make you act without thinking.' },
        { word: 'immediately', points: 10, explanation: 'Legitimate organizations don\'t demand immediate action via text.' },
        { word: 'verify account', points: 15, explanation: 'Scammers pretend your account needs verification to steal login details.' },
        { word: 'bank details', points: 20, explanation: 'NO bank will ask for your details via message.' },
        { word: 'winning', points: 15, explanation: 'You cannot win a prize you never entered.' },
        { word: 'prize', points: 15, explanation: 'Real prizes don\'t require payment or personal info via text.' },
        { word: 'lottery', points: 15, explanation: 'Lottery scams promise money to steal your information.' },
        { word: 'prince', points: 20, explanation: 'Classic "Nigerian Prince" scam - they need your help to transfer money.' },
        { word: 'activate your card', points: 20, explanation: 'Banks never ask you to activate cards via links in messages.' },
        { word: 'suspended account', points: 15, explanation: 'Fake account suspension threats to make you panic and click.' },
        { word: 'click here', points: 10, explanation: 'Scammers hide malicious links behind "click here".' },
        { word: 'update your profile', points: 10, explanation: 'Fake update requests to steal your login information.' },
        { word: 'confirm your pin', points: 25, explanation: 'NEVER share your PIN with anyone - not even "bank staff".' },
        { word: 'send money', points: 20, explanation: 'Direct money request from stranger = SCAM.' },
        { word: 'gift card', points: 20, explanation: 'Gift cards are for gifts, not payments. This is a scam.' },
        { word: 'bitcoin', points: 15, explanation: 'Scammers love cryptocurrency because it\'s hard to trace.' },
        { word: 'double your money', points: 25, explanation: 'No legitimate investment doubles your money quickly.' },
        { word: 'rent', points: 10, explanation: 'Account rental scams use your identity for fraud.' },
        { word: 'linkedin', points: 10, explanation: 'Fake LinkedIn accounts are used for employment scams.' },
        { word: 'facebook', points: 5, explanation: 'Social media account scams are common. Be cautious.' },
        { word: 'instagram', points: 5, explanation: 'Fake Instagram accounts are used for impersonation scams.' },
        { word: 'work from home', points: 15, explanation: 'Fake work-from-home jobs ask for "registration fees".' },
        { word: 'easy money', points: 20, explanation: 'If it sounds too easy, it\'s a trap.' },
        { word: 'bvn update', points: 25, explanation: 'NIMC/BVN updates NEVER happen via text message.' },
        { word: 'nin verification', points: 25, explanation: 'NIN verification is ONLY done on official government websites.' },
        { word: 'loan approval', points: 15, explanation: 'Fake loan approvals ask for advance fees before giving money.' },
        { word: 'processing fee', points: 20, explanation: 'Legitimate services deduct fees from what they give you, not upfront.' },
        { word: 'guaranteed returns', points: 25, explanation: 'No investment guarantees returns. This is a scam.' },
        { word: 'risk free', points: 20, explanation: 'Every investment carries risk. "Risk-free" is a lie.' },
        { word: 'deposit now', points: 15, explanation: 'Urgent deposit requests are often rental or property scams.' },
        { word: 'holding fee', points: 15, explanation: 'Fake landlords ask for holding fees on properties that don\'t exist.' }
    ];
    
    const sensitiveInfo = [
        { word: 'pin', points: 30, explanation: 'Your PIN is the key to your account. NEVER share it.' },
        { word: 'password', points: 30, explanation: 'No legitimate service asks for your password via message.' },
        { word: 'otp', points: 30, explanation: 'OTP means "One Time Password". Sharing it gives access to your account.' },
        { word: 'bvn', points: 25, explanation: 'BVN is your biometric identity. Scammers use it to impersonate you.' },
        { word: 'cvv', points: 30, explanation: 'CVV is the security code on your card. Sharing it allows online theft.' },
        { word: 'card number', points: 25, explanation: 'Never share your full card number with anyone who contacts you.' },
        { word: 'nuban', points: 20, explanation: 'Your NUBAN account number can be used to target you.' },
        { word: 'verification code', points: 30, explanation: 'Verification codes are like passwords - never share them.' },
        { word: 'passport', points: 20, explanation: 'Scammers use passport photos for identity theft.' },
        { word: 'driver license', points: 20, explanation: 'Driver\'s license photos can be used to create fake IDs.' },
        { word: 'nin', points: 25, explanation: 'NIN is your National Identity Number. Guard it carefully.' },
        { word: 'id card', points: 20, explanation: 'ID cards should never be sent to strangers online.' }
    ];

    // Check red flags
    redFlags.forEach(flag => {
        if (lowerText.includes(flag.word)) {
            alerts.push(`⚠️ "${flag.word.toUpperCase()}" → ${flag.explanation}`);
            riskScore += flag.points;
        }
    });

    // Check sensitive info requests
    sensitiveInfo.forEach(info => {
        if (lowerText.includes(info.word)) {
            alerts.push(`🚨 "${info.word.toUpperCase()}" request → ${info.explanation}`);
            riskScore += info.points;
        }
    });

    // Check for urgency tactics
    const urgencyWords = ['immediately', 'within 24 hours', 'asap', 'right now', 'today only', 'now'];
    urgencyWords.forEach(word => {
        if (lowerText.includes(word)) {
            const urgencyExplanations = {
                'immediately': 'Legitimate organizations give you time to think, not panic.',
                'within 24 hours': 'Scammers create fake deadlines to pressure you.',
                'asap': 'Urgency is a classic scam tactic to bypass your judgment.',
                'right now': 'No real emergency requires immediate action via text.'
            };
            alerts.push(`⏰ "False urgency" → ${urgencyExplanations[word] || 'Scammers rush you so you don\'t think clearly.'}`);
            riskScore += 10;
        }
    });

    // Check for phone numbers
    const phonePatterns = [/0[789][01]\d{8}/g];
    for (const pattern of phonePatterns) {
        const matches = text.match(pattern);
        if (matches) {
            for (const number of matches) {
                if (checkNumberInDatabase(number)) {
                    alerts.push(`🚨 ${number} → This number has been REPORTED as a scammer! DO NOT CALL or SEND MONEY.`);
                    riskScore += 50;
                } else {
                    alerts.push(`📞 Phone number found: ${number} → If this number contacts you, be cautious. You can /report it if it's a scam.`);
                    riskScore += 5;
                }
            }
        }
    }

    // Determine risk level and final recommendation
    let riskLevel, emoji, recommendation;
    if (riskScore >= 40) {
        riskLevel = "HIGH";
        emoji = "🔴";
        recommendation = "❌ DO NOT RESPOND. DO NOT CLICK LINKS. DO NOT SEND MONEY.\n✅ Block the sender immediately.\n✅ Report the number: /report [number] [reason]\n✅ Forward this message to EFCC if possible.";
    } else if (riskScore >= 20) {
        riskLevel = "MEDIUM";
        emoji = "🟡";
        recommendation = "⚠️ This message shows clear signs of a scam.\n✅ Verify the sender through an OFFICIAL channel (call their known number).\n✅ Do not click any links.\n✅ Do not share personal information.";
    } else if (riskScore >= 10) {
        riskLevel = "LOW-MEDIUM";
        emoji = "🟠";
        recommendation = "⚠️ Some suspicious signs detected.\n✅ Be cautious.\n✅ Verify before responding.\n✅ When in doubt, /report the number for others to check.";
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
        } else {
            const linkAnalysis = linkModule.analyzeLink(link);
            if (linkAnalysis.riskScore >= 30) {
                linkWarnings.push({
                    type: 'suspicious',
                    url: link,
                    reasons: linkAnalysis.reasons.slice(0, 2)
                });
                analysis.riskScore += 15;
                analysis.alerts.push(`⚠️ Link analysis → \`${link}\` is suspicious: ${linkAnalysis.reasons.slice(0, 2).join(', ')}`);
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

module.exports = {
    analyzeMessage,
    analyzeMessageWithLinks,
    checkNumberInDatabase
};