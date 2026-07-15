// scammers.js - Scammer Database Manager
// Unknown numbers: 1 report = scammer
// Trusted numbers (real.json): 3 unique users = scammer
// One user cannot report same number twice

const fs = require('fs');

const SCAMMERS_FILE = 'scammers.json';
const PENDING_FILE = 'pendingReports.json';
const REAL_FILE = 'real.json';
const USER_REPORTS_FILE = 'userReports.json';
const PLEAS_FILE = 'pleas.json';

// ========== NORMALIZE NIGERIAN PHONE NUMBERS ==========
function normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    let cleaned = phoneNumber.toString().replace(/\D/g, '');
    
    // Remove leading '234' (Nigeria country code) and replace with '0'
    if (cleaned.startsWith('234')) {
        cleaned = '0' + cleaned.slice(3);
    }
    
    // Remove leading '2340' or '2341' (some formats)
    if (cleaned.startsWith('2340') || cleaned.startsWith('2341')) {
        cleaned = '0' + cleaned.slice(3);
    }
    
    // If it's 10 digits, add leading 0
    if (cleaned.length === 10 && cleaned.match(/^[789][01]\d{8}$/)) {
        cleaned = '0' + cleaned;
    }
    
    // Check if it's a valid Nigerian number (11 digits starting with 0[789][01])
    if (cleaned.length === 11 && cleaned.match(/^0[789][01]\d{8}$/)) {
        return cleaned;
    }
    
    return null;
}

// ========== LOAD TRUSTED NUMBERS (REAL.JSON) ==========
function loadTrustedNumbers() {
    try {
        if (fs.existsSync(REAL_FILE)) {
            const data = JSON.parse(fs.readFileSync(REAL_FILE, 'utf8'));
            return data.numbers || [];
        }
    } catch (err) {
        console.error('Error loading real.json:', err);
    }
    return [];
}

function isTrustedNumber(phoneNumber) {
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) return false;
    
    const trusted = loadTrustedNumbers();
    return trusted.some(item => {
        const itemCleaned = normalizePhoneNumber(item.phone);
        return itemCleaned === cleaned;
    });
}

function getTrustedNumberInfo(phoneNumber) {
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) return null;
    
    const trusted = loadTrustedNumbers();
    return trusted.find(item => {
        const itemCleaned = normalizePhoneNumber(item.phone);
        return itemCleaned === cleaned;
    }) || null;
}

function searchTrustedNumbers(query) {
    const trusted = loadTrustedNumbers();
    const lowerQuery = query.toLowerCase();
    return trusted.filter(item => {
        const phoneMatch = item.phone && item.phone.includes(query);
        const nameMatch = item.name && item.name.toLowerCase().includes(lowerQuery);
        return phoneMatch || nameMatch;
    });
}

function addToTrustedList(phoneNumber, name, addedBy = 'admin') {
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) {
        return { success: false, message: 'Invalid phone number format' };
    }
    
    let trusted = loadTrustedNumbers();
    
    // Check if already exists
    if (trusted.some(item => normalizePhoneNumber(item.phone) === cleaned)) {
        return { success: false, message: `${cleaned} already in trusted list` };
    }
    
    // Add new entry
    trusted.push({
        phone: cleaned,
        name: name || 'Unknown',
        addedBy: addedBy,
        addedAt: new Date().toISOString()
    });
    
    fs.writeFileSync(REAL_FILE, JSON.stringify({
        numbers: trusted,
        description: "Numbers in this list require 3 unique reports before being marked as scammer",
        lastUpdated: new Date().toISOString(),
        totalTrusted: trusted.length
    }, null, 2));
    
    return { success: true, message: `${cleaned} (${name}) added to trusted list` };
}

function removeFromTrustedList(phoneNumber) {
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) {
        return { success: false, message: 'Invalid phone number format' };
    }
    
    let trusted = loadTrustedNumbers();
    const removed = trusted.find(item => normalizePhoneNumber(item.phone) === cleaned);
    
    if (!removed) {
        return { success: false, message: `${cleaned} not found in trusted list` };
    }
    
    const newTrusted = trusted.filter(item => normalizePhoneNumber(item.phone) !== cleaned);
    fs.writeFileSync(REAL_FILE, JSON.stringify({
        numbers: newTrusted,
        description: "Numbers in this list require 3 unique reports before being marked as scammer",
        lastUpdated: new Date().toISOString(),
        totalTrusted: newTrusted.length
    }, null, 2));
    
    return { success: true, message: `${cleaned} (${removed.name}) removed from trusted list` };
}

function listTrustedNumbers() {
    return loadTrustedNumbers();
}

// ========== LOAD SCAMMERS ==========
function loadScammers() {
    try {
        if (fs.existsSync(SCAMMERS_FILE)) {
            return JSON.parse(fs.readFileSync(SCAMMERS_FILE, 'utf8'));
        }
    } catch (err) {}
    return [];
}

function saveScammers(scammers) {
    fs.writeFileSync(SCAMMERS_FILE, JSON.stringify(scammers, null, 2));
}

// ========== LOAD PENDING REPORTS (FOR TRUSTED NUMBERS) ==========
function loadPending() {
    try {
        if (fs.existsSync(PENDING_FILE)) {
            return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
        }
    } catch (err) {}
    return [];
}

function savePending(pending) {
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));
}

// ========== TRACK USER REPORTS (TO PREVENT DUPLICATES) ==========
function loadUserReports() {
    try {
        if (fs.existsSync(USER_REPORTS_FILE)) {
            return JSON.parse(fs.readFileSync(USER_REPORTS_FILE, 'utf8'));
        }
    } catch (err) {}
    return {};
}

function saveUserReports(userReports) {
    fs.writeFileSync(USER_REPORTS_FILE, JSON.stringify(userReports, null, 2));
}

function hasUserReported(userId, phoneNumber) {
    const userReports = loadUserReports();
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) return false;
    return userReports[userId]?.includes(cleaned) || false;
}

function addUserReport(userId, phoneNumber) {
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) return false;
    
    const userReports = loadUserReports();
    
    if (!userReports[userId]) {
        userReports[userId] = [];
    }
    
    if (!userReports[userId].includes(cleaned)) {
        userReports[userId].push(cleaned);
        saveUserReports(userReports);
        return true;
    }
    return false;
}

function getUserReportStats(userId) {
    const userReports = loadUserReports();
    const reports = userReports[userId] || [];
    return {
        userId: userId,
        totalReports: reports.length,
        reportedNumbers: reports
    };
}

// ========== CHECK IF NUMBER IS SCAMMER ==========
function isScammer(phoneNumber) {
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) return false;
    
    const scammers = loadScammers();
    return scammers.includes(cleaned);
}

// ========== GET ALL SCAMMERS ==========
function getAllScammers() {
    return loadScammers();
}

// ========== GET SCAMMER COUNT ==========
function getScammerCount() {
    return loadScammers().length;
}

// ========== GET RECENT SCAMMERS ==========
function getRecentScammers(limit = 10) {
    const scammers = loadScammers();
    return scammers.slice(-limit).reverse();
}

// ========== GET PENDING REPORTS ==========
function getPendingReports() {
    return loadPending();
}

// ========== MANUALLY VERIFY PENDING NUMBER ==========
function manuallyVerifyScammer(phoneNumber) {
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) {
        return { success: false, message: 'Invalid phone number format' };
    }
    
    let pending = loadPending();
    let scammers = loadScammers();
    
    const report = pending.find(p => p.phoneNumber === cleaned);
    if (!report) {
        return { success: false, message: 'Number not found in pending reports' };
    }
    
    scammers.push(cleaned);
    saveScammers(scammers);
    
    pending = pending.filter(p => p.phoneNumber !== cleaned);
    savePending(pending);
    
    return { success: true, message: `${cleaned} manually verified as scammer`, total: scammers.length };
}

// ========== REJECT PENDING REPORT ==========
function rejectPendingReport(phoneNumber) {
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) {
        return { success: false, message: 'Invalid phone number format' };
    }
    
    let pending = loadPending();
    pending = pending.filter(p => p.phoneNumber !== cleaned);
    savePending(pending);
    return { success: true, message: `Report for ${cleaned} rejected` };
}

// ========== REPORT A NUMBER ==========
function reportNumber(phoneNumber, userId, reason) {
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) {
        return { 
            success: false, 
            message: '❌ Invalid phone number format. Please use a valid Nigerian number like 08012345678 or +2348012345678',
            status: 'invalid'
        };
    }
    
    const isTrusted = isTrustedNumber(cleaned);
    const trustedInfo = isTrusted ? getTrustedNumberInfo(cleaned) : null;
    
    // Check if user already reported this number
    if (hasUserReported(userId, cleaned)) {
        return { 
            success: false, 
            message: `❌ You have already reported ${cleaned}. One user, one vote.`,
            status: 'duplicate'
        };
    }
    
    // Check if already a scammer
    if (isScammer(cleaned)) {
        return { 
            success: false, 
            message: `⚠️ ${cleaned} is already a VERIFIED SCAMMER.`,
            status: 'verified'
        };
    }
    
    // For trusted numbers (in real.json): require 3 UNIQUE users
    if (isTrusted) {
        let pending = loadPending();
        let existing = pending.find(p => p.phoneNumber === cleaned);
        
        if (existing) {
            // Add this user's report
            existing.reportedBy.push(userId);
            existing.reportCount++;
            existing.reasons.push(reason);
            existing.lastReported = new Date().toISOString();
            
            // Add to user reports tracking
            addUserReport(userId, cleaned);
            
            if (existing.reportCount >= 3) {
                // Verified as scammer after 3 unique users
                let scammers = loadScammers();
                scammers.push(cleaned);
                saveScammers(scammers);
                
                pending = pending.filter(p => p.phoneNumber !== cleaned);
                savePending(pending);
                
                return {
                    success: true,
                    message: `🚨 ${cleaned} (${trustedInfo?.name || 'Trusted Number'}) has been VERIFIED as a SCAMMER after 3 unique reports!`,
                    status: 'verified',
                    total: scammers.length
                };
            }
            
            savePending(pending);
            
            return {
                success: true,
                message: `✅ ${cleaned} (${trustedInfo?.name || 'Trusted Number'}) reported. Need ${3 - existing.reportCount} more UNIQUE report(s) to verify.`,
                status: 'pending',
                reportCount: existing.reportCount
            };
        }
        
        // First report for trusted number
        pending.push({
            phoneNumber: cleaned,
            reportCount: 1,
            reportedBy: [userId],
            reasons: [reason],
            trustedName: trustedInfo?.name || null,
            firstReported: new Date().toISOString(),
            lastReported: new Date().toISOString()
        });
        savePending(pending);
        
        // Add to user reports tracking
        addUserReport(userId, cleaned);
        
        return {
            success: true,
            message: `✅ ${cleaned} (${trustedInfo?.name || 'Trusted Number'}) reported. This number is TRUSTED. Need 2 more UNIQUE reports to verify as scammer.`,
            status: 'pending',
            reportCount: 1
        };
    }
    
    // For untrusted numbers: immediate scammer
    let scammers = loadScammers();
    scammers.push(cleaned);
    saveScammers(scammers);
    
    // Add to user reports tracking
    addUserReport(userId, cleaned);
    
    return {
        success: true,
        message: `🚨 ${cleaned} is now marked as a SCAMMER! Thank you for reporting.`,
        status: 'verified',
        total: scammers.length
    };
}

// ========== PLEA SYSTEM ==========
function loadPleas() {
    try {
        if (fs.existsSync(PLEAS_FILE)) {
            return JSON.parse(fs.readFileSync(PLEAS_FILE, 'utf8'));
        }
    } catch (err) {}
    return { pleas: [], settings: { pendingExpiryDays: 30 } };
}

function savePleas(data) {
    fs.writeFileSync(PLEAS_FILE, JSON.stringify(data, null, 2));
}

function submitPlea(phoneNumber, userId, username, reason) {
    const cleaned = normalizePhoneNumber(phoneNumber);
    if (!cleaned) {
        return { 
            success: false, 
            message: '❌ Invalid phone number format. Please use a valid Nigerian number.',
            status: 'invalid'
        };
    }
    
    const scammers = loadScammers();
    
    // Check if number is actually a scammer
    if (!scammers.includes(cleaned)) {
        return { 
            success: false, 
            message: `❌ ${cleaned} is not in the scammers database. No plea needed.`,
            status: 'not_scammer'
        };
    }
    
    // Check if plea already exists
    const pleas = loadPleas();
    const existingPlea = pleas.pleas.find(p => p.phoneNumber === cleaned && p.status === 'pending');
    
    if (existingPlea) {
        return { 
            success: false, 
            message: `⏳ A plea for ${cleaned} is already pending admin review. Please wait.`,
            status: 'already_pending'
        };
    }
    
    // Check for previously rejected plea (30 day cooldown)
    const rejectedPlea = pleas.pleas.find(p => p.phoneNumber === cleaned && p.status === 'rejected');
    if (rejectedPlea) {
        const daysSinceRejection = (new Date() - new Date(rejectedPlea.reviewedAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceRejection < 30) {
            return {
                success: false,
                message: `❌ A plea for ${cleaned} was rejected on ${new Date(rejectedPlea.reviewedAt).toLocaleDateString()}. You can submit again after 30 days.`,
                status: 'cooldown'
            };
        }
    }
    
    // Submit new plea
    const newPlea = {
        id: Date.now(),
        phoneNumber: cleaned,
        userId: userId,
        username: username,
        reason: reason,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        adminNotes: null
    };
    
    pleas.pleas.push(newPlea);
    savePleas(pleas);
    
    return {
        success: true,
        message: `✅ Plea submitted for ${cleaned}. Admin will review your request. You will be notified when a decision is made.`,
        status: 'submitted',
        pleaId: newPlea.id
    };
}

function getPendingPleas() {
    const pleas = loadPleas();
    return pleas.pleas.filter(p => p.status === 'pending');
}

function getAllPleas() {
    const pleas = loadPleas();
    return pleas.pleas;
}

function approvePlea(pleaId, adminNotes = '') {
    const pleas = loadPleas();
    const pleaIndex = pleas.pleas.findIndex(p => p.id === pleaId);
    
    if (pleaIndex === -1) {
        return { success: false, message: 'Plea not found' };
    }
    
    const plea = pleas.pleas[pleaIndex];
    
    if (plea.status !== 'pending') {
        return { success: false, message: `Plea is already ${plea.status}` };
    }
    
    // Remove number from scammers.json
    let scammers = loadScammers();
    const cleaned = plea.phoneNumber;
    
    if (!scammers.includes(cleaned)) {
        return { success: false, message: 'Number not found in scammers database' };
    }
    
    scammers = scammers.filter(n => n !== cleaned);
    saveScammers(scammers);
    
    // Update plea status
    plea.status = 'approved';
    plea.reviewedAt = new Date().toISOString();
    plea.adminNotes = adminNotes;
    savePleas(pleas);
    
    return {
        success: true,
        message: `✅ Plea approved. ${cleaned} removed from scammers database.`,
        phoneNumber: cleaned,
        userId: plea.userId,
        username: plea.username
    };
}

function rejectPlea(pleaId, adminNotes = '') {
    const pleas = loadPleas();
    const pleaIndex = pleas.pleas.findIndex(p => p.id === pleaId);
    
    if (pleaIndex === -1) {
        return { success: false, message: 'Plea not found' };
    }
    
    const plea = pleas.pleas[pleaIndex];
    
    if (plea.status !== 'pending') {
        return { success: false, message: `Plea is already ${plea.status}` };
    }
    
    plea.status = 'rejected';
    plea.reviewedAt = new Date().toISOString();
    plea.adminNotes = adminNotes;
    savePleas(pleas);
    
    return {
        success: true,
        message: `❌ Plea rejected. ${plea.phoneNumber} remains in scammers database.`,
        phoneNumber: plea.phoneNumber,
        userId: plea.userId,
        username: plea.username,
        adminNotes: adminNotes
    };
}

// ========== EXPORTS ==========
module.exports = {
    // Core functions
    reportNumber,
    isScammer,
    getAllScammers,
    getScammerCount,
    getRecentScammers,
    
    // Phone number normalization
    normalizePhoneNumber,
    
    // Trusted numbers (real.json)
    isTrustedNumber,
    getTrustedNumberInfo,
    searchTrustedNumbers,
    addToTrustedList,
    removeFromTrustedList,
    listTrustedNumbers,
    
    // Pending reports
    getPendingReports,
    manuallyVerifyScammer,
    rejectPendingReport,
    loadPending,
    
    // User reports
    getUserReportStats,
    loadUserReports,
    hasUserReported,
    addUserReport,
    
    // Plea system
    submitPlea,
    getPendingPleas,
    getAllPleas,
    approvePlea,
    rejectPlea
};