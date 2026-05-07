// links.js - Link/URL Scam Detection Module
// Manages reported scam links and checks URLs

const fs = require('fs');

const LINKS_FILE = 'links.json';

// ========== LOAD LINKS DATABASE ==========
function loadLinks() {
    try {
        if (fs.existsSync(LINKS_FILE)) {
            const data = JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
            return data;
        } else {
            const defaultData = {
                settings: { totalReportedLinks: 0, lastLinkId: 0, dateCreated: new Date().toISOString().split('T')[0] },
                reportedLinks: [],
                whitelist: [
                    "gtbank.com", "zenithbank.com", "firstbank.com", "accessbankplc.com",
                    "ubagroup.com", "fidelitybank.ng", "sterling.ng", "unionbankng.com",
                    "polarisbanklimited.com", "ecobank.com", "wemabank.com", "providusbank.com",
                    "titanbank.ng", "alatin.xyz", "waec.org.ng", "neco.gov.ng", "nairaland.com",
                    "facebook.com", "instagram.com", "whatsapp.com", "telegram.org",
                    "google.com", "youtube.com", "x.com", "twitter.com", "tiktok.com"
                ],
                suspiciousKeywords: [
                    "verify", "update", "confirm", "secure", "account", "login", "signin",
                    "password", "reset", "claim", "prize", "winning", "lottery", "grant",
                    "loan", "approval", "bvn", "nin", "cbn", "bank", "alert", "payment"
                ]
            };
            saveLinks(defaultData);
            return defaultData;
        }
    } catch (err) {
        console.error('Error loading links:', err);
        return { reportedLinks: [], whitelist: [], suspiciousKeywords: [], settings: {} };
    }
}

function saveLinks(data) {
    try {
        fs.writeFileSync(LINKS_FILE, JSON.stringify(data, null, 2));
        console.log(`💾 Saved ${data.reportedLinks.length} reported links`);
    } catch (err) {
        console.error('Error saving links:', err);
    }
}

// ========== EXTRACT LINKS FROM TEXT ==========
function extractLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|ng|net|org|xyz|online|tech|site|club|live|app|info|biz)(\/[^\s]*)?)/gi;
    const matches = text.match(urlRegex);
    if (!matches) return [];
    
    // Clean and normalize links
    return matches.map(link => {
        let cleanLink = link.toLowerCase();
        if (!cleanLink.startsWith('http')) {
            cleanLink = 'https://' + cleanLink;
        }
        return cleanLink;
    });
}

// ========== EXTRACT DOMAIN FROM URL ==========
function extractDomain(url) {
    try {
        let domain = url.toLowerCase();
        domain = domain.replace(/^https?:\/\//, '');
        domain = domain.replace(/^www\./, '');
        domain = domain.split('/')[0];
        return domain;
    } catch (err) {
        return url;
    }
}

// ========== CHECK IF DOMAIN IS WHITELISTED ==========
function isWhitelisted(domain, whitelist) {
    return whitelist.some(white => domain.includes(white) || white.includes(domain));
}

// ========== CHECK LINK AGAINST REPORTED SCAM LINKS ==========
function checkLink(link) {
    const data = loadLinks();
    const domain = extractDomain(link);
    
    // Check exact match
    let found = data.reportedLinks.find(l => l.url === link || l.domain === domain);
    if (found) return found;
    
    // Check partial match
    found = data.reportedLinks.find(l => domain.includes(l.domain) || l.domain.includes(domain));
    return found || null;
}

// ========== CHECK ALL LINKS IN TEXT ==========
function checkAllLinks(text) {
    const links = extractLinks(text);
    const results = [];
    
    for (const link of links) {
        const domain = extractDomain(link);
        const data = loadLinks();
        
        const isWhite = isWhitelisted(domain, data.whitelist);
        const isReported = checkLink(link);
        
        results.push({
            url: link,
            domain: domain,
            isWhitelisted: isWhite,
            isReported: !!isReported,
            reportData: isReported
        });
    }
    
    return results;
}

// ========== ANALYZE LINK SUSPICIOUSNESS ==========
function analyzeLink(link) {
    const data = loadLinks();
    const domain = extractDomain(link);
    let riskScore = 0;
    let reasons = [];
    
    // Check if reported
    const reported = checkLink(link);
    if (reported) {
        riskScore += 70;
        reasons.push(`🚨 This link is a REPORTED SCAM: ${reported.reason}`);
    }
    
    // Check whitelist
    if (isWhitelisted(domain, data.whitelist)) {
        riskScore -= 30;
        reasons.push(`✅ Domain is whitelisted (trusted site)`);
    }
    
    // Check suspicious keywords
    for (const keyword of data.suspiciousKeywords) {
        if (link.toLowerCase().includes(keyword)) {
            riskScore += 15;
            reasons.push(`⚠️ Contains suspicious word: "${keyword}"`);
            break;
        }
    }
    
    // Check for suspicious TLDs
    const suspiciousTLDs = ['.xyz', '.top', '.club', '.online', '.site', '.info', '.biz', '.click', '.link'];
    for (const tld of suspiciousTLDs) {
        if (domain.endsWith(tld)) {
            riskScore += 20;
            reasons.push(`⚠️ Suspicious domain extension: ${tld}`);
            break;
        }
    }
    
    // Check for numbers in domain (fake bank sites often have numbers)
    if (/\d/.test(domain)) {
        riskScore += 10;
        reasons.push(`⚠️ Domain contains numbers (common in fake sites)`);
    }
    
    // Check for misspelled bank names
    const bankNames = ['gtbank', 'zenith', 'firstbank', 'access', 'uba', 'fidelity', 'sterling', 'unionbank', 'polaris', 'ecobank', 'wema'];
    for (const bank of bankNames) {
        if (domain.includes(bank) && !domain.includes(bank + '.com')) {
            riskScore += 25;
            reasons.push(`⚠️ Possible bank impersonation: "${bank}"`);
            break;
        }
    }
    
    return { riskScore, reasons, isReported: !!reported, reportedData: reported };
}

// ========== REPORT A SCAM LINK ==========
function reportLink(url, reason, reportedBy) {
    const data = loadLinks();
    const domain = extractDomain(url);
    
    // Check if already reported
    const existing = data.reportedLinks.find(l => l.url === url || l.domain === domain);
    if (existing) {
        return { success: false, message: 'Link already reported', existing: existing };
    }
    
    // Determine risk level
    let riskLevel = 'HIGH';
    const analysis = analyzeLink(url);
    if (analysis.riskScore >= 50) riskLevel = 'CRITICAL';
    else if (analysis.riskScore >= 30) riskLevel = 'HIGH';
    else riskLevel = 'MEDIUM';
    
    const newLink = {
        id: data.settings.lastLinkId + 1,
        url: url,
        domain: domain,
        reason: reason,
        reportedBy: reportedBy,
        dateReported: new Date().toISOString().split('T')[0],
        riskLevel: riskLevel
    };
    
    data.reportedLinks.push(newLink);
    data.settings.totalReportedLinks = data.reportedLinks.length;
    data.settings.lastLinkId = newLink.id;
    saveLinks(data);
    
    console.log(`🔗 New scam link reported: ${url} - Reason: ${reason}`);
    return { success: true, message: 'Link reported successfully', total: data.reportedLinks.length };
}

// ========== GET ALL REPORTED LINKS ==========
function getAllReportedLinks() {
    const data = loadLinks();
    return data.reportedLinks;
}

// ========== GET RECENT LINKS ==========
function getRecentLinks(limit = 10) {
    const data = loadLinks();
    return data.reportedLinks.slice(-limit).reverse();
}

// ========== GET LINK COUNT ==========
function getReportedLinkCount() {
    const data = loadLinks();
    return data.reportedLinks.length;
}

// ========== ADD TO WHITELIST (ADMIN) ==========
function addToWhitelist(domain) {
    const data = loadLinks();
    if (!data.whitelist.includes(domain)) {
        data.whitelist.push(domain);
        saveLinks(data);
        return { success: true, message: `Added ${domain} to whitelist` };
    }
    return { success: false, message: 'Domain already in whitelist' };
}

// ========== REMOVE FROM WHITELIST (ADMIN) ==========
function removeFromWhitelist(domain) {
    const data = loadLinks();
    const index = data.whitelist.indexOf(domain);
    if (index !== -1) {
        data.whitelist.splice(index, 1);
        saveLinks(data);
        return { success: true, message: `Removed ${domain} from whitelist` };
    }
    return { success: false, message: 'Domain not found in whitelist' };
}

// ========== DELETE REPORTED LINK (ADMIN) ==========
function deleteReportedLink(linkId) {
    const data = loadLinks();
    const index = data.reportedLinks.findIndex(l => l.id === linkId);
    if (index !== -1) {
        const removed = data.reportedLinks.splice(index, 1);
        saveLinks(data);
        return { success: true, message: `Deleted reported link: ${removed[0].url}` };
    }
    return { success: false, message: 'Link not found' };
}

module.exports = {
    checkLink,
    checkAllLinks,
    analyzeLink,
    reportLink,
    extractLinks,
    extractDomain,
    getAllReportedLinks,
    getRecentLinks,
    getReportedLinkCount,
    addToWhitelist,
    removeFromWhitelist,
    deleteReportedLink,
    loadLinks,
    saveLinks
};