// Nigeria Scam Detector - Scammer Database Manager
// Created by Joshua Giwa

const fs = require('fs');

// File path for storing scammers - using your actual filename
const SCAMMERS_FILE = 'scammers.json';  // ← Your actual filename

// ========== LOAD SCAMMERS FROM FILE ==========
function loadScammers() {
    try {
        if (!fs.existsSync(SCAMMERS_FILE)) {
            console.log('📝 No scammers file found, creating new one...');
            saveScammers([]);
            return [];
        }
        
        const data = fs.readFileSync(SCAMMERS_FILE, 'utf8');
        const scammers = JSON.parse(data);
        
        if (!Array.isArray(scammers)) {
            console.log('⚠️ Invalid scammers file format, resetting...');
            saveScammers([]);
            return [];
        }
        
        console.log(`📚 Loaded ${scammers.length} reported scammers from ${SCAMMERS_FILE}`);
        return scammers;
    } catch (err) {
        console.error('❌ Error loading scammers:', err.message);
        return [];
    }
}

// ========== SAVE SCAMMERS TO FILE ==========
function saveScammers(scammers) {
    try {
        if (!Array.isArray(scammers)) {
            scammers = [];
        }
        
        const uniqueScammers = [...new Set(scammers)];
        if (uniqueScammers.length !== scammers.length) {
            console.log(`⚠️ Removed ${scammers.length - uniqueScammers.length} duplicates before saving`);
        }
        
        fs.writeFileSync(SCAMMERS_FILE, JSON.stringify(uniqueScammers, null, 2));
        console.log(`💾 Saved ${uniqueScammers.length} scammers to ${SCAMMERS_FILE}`);
        return uniqueScammers.length;
    } catch (err) {
        console.error('❌ Error saving scammers:', err.message);
        return 0;
    }
}

// ========== ADD A NEW SCAMMER ==========
function addScammer(phoneNumber, reason = 'Suspicious activity', reporter = 'unknown') {
    const cleanedNumber = phoneNumber.toString().replace(/\D/g, '');
    
    if (!cleanedNumber || cleanedNumber.length < 8) {
        console.log(`⚠️ Invalid phone number: ${phoneNumber}`);
        return { success: false, message: 'Invalid phone number format' };
    }
    
    let scammers = loadScammers();
    
    if (scammers.includes(cleanedNumber)) {
        console.log(`⚠️ ${cleanedNumber} already in database`);
        return { success: false, message: 'Number already reported', total: scammers.length };
    }
    
    scammers.push(cleanedNumber);
    const total = saveScammers(scammers);
    
    console.log(`🚨 New scammer added: ${cleanedNumber} - Reason: ${reason} - Reported by: ${reporter}`);
    return { success: true, message: 'Scammer added successfully', total: total };
}

// ========== CHECK IF NUMBER IS A SCAMMER ==========
function isScammer(phoneNumber) {
    const cleanedNumber = phoneNumber.toString().replace(/\D/g, '');
    const scammers = loadScammers();
    return scammers.includes(cleanedNumber);
}

// ========== GET ALL SCAMMERS ==========
function getAllScammers() {
    return loadScammers();
}

// ========== GET SCAMMER COUNT ==========
function getScammerCount() {
    return loadScammers().length;
}

// ========== REMOVE A SCAMMER ==========
function removeScammer(phoneNumber) {
    const cleanedNumber = phoneNumber.toString().replace(/\D/g, '');
    let scammers = loadScammers();
    const index = scammers.indexOf(cleanedNumber);
    
    if (index === -1) {
        return { success: false, message: 'Number not found in database' };
    }
    
    scammers.splice(index, 1);
    saveScammers(scammers);
    console.log(`🗑️ Removed scammer: ${cleanedNumber}`);
    return { success: true, message: 'Scammer removed', total: scammers.length };
}

// ========== SEARCH SCAMMERS ==========
function searchScammers(searchTerm) {
    const cleanedSearch = searchTerm.toString().replace(/\D/g, '');
    const scammers = loadScammers();
    const results = scammers.filter(num => num.includes(cleanedSearch));
    return results;
}

// ========== GET RECENT SCAMMERS ==========
function getRecentScammers(limit = 20) {
    const scammers = loadScammers();
    return scammers.slice(-limit).reverse();
}

// ========== GET FIRST SCAMMERS ==========
function getFirstScammers(limit = 20) {
    const scammers = loadScammers();
    return scammers.slice(0, limit);
}

// ========== BULK ADD SCAMMERS ==========
function bulkAddScammers(numbers, reason = 'Bulk import', reporter = 'admin') {
    let scammers = loadScammers();
    let added = 0;
    let duplicates = 0;
    let invalid = 0;
    
    for (let number of numbers) {
        const cleanedNumber = number.toString().replace(/\D/g, '');
        
        if (!cleanedNumber || cleanedNumber.length < 8) {
            invalid++;
            continue;
        }
        
        if (!scammers.includes(cleanedNumber)) {
            scammers.push(cleanedNumber);
            added++;
        } else {
            duplicates++;
        }
    }
    
    saveScammers(scammers);
    console.log(`📦 Bulk import: ${added} added, ${duplicates} duplicates, ${invalid} invalid`);
    
    return {
        success: true,
        added: added,
        duplicates: duplicates,
        invalid: invalid,
        total: scammers.length
    };
}

// ========== EXPORT ALL FUNCTIONS ==========
module.exports = {
    loadScammers,
    saveScammers,
    addScammer,
    isScammer,
    getAllScammers,
    getScammerCount,
    removeScammer,
    searchScammers,
    getRecentScammers,
    getFirstScammers,
    bulkAddScammers
};