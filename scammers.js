// Nigeria Scam Detector - Scammer Database Manager
// Created by Joshua Giwa

const fs = require('fs');

// File path for storing scammers
const SCAMMERS_FILE = 'scammers.json';

// Load scammers from file
function loadScammers() {
    try {
        const data = fs.readFileSync(SCAMMERS_FILE, 'utf8');
        const scammers = JSON.parse(data);
        console.log(`📚 Loaded ${scammers.length} reported scammers`);
        return scammers;
    } catch (err) {
        console.log('📝 No scammers file yet, starting fresh');
        return [];
    }
}

// Save scammers to file
function saveScammers(scammers) {
    fs.writeFileSync(SCAMMERS_FILE, JSON.stringify(scammers, null, 2));
    console.log(`💾 Saved ${scammers.length} scammers to database`);
}

// Add a new scammer
function addScammer(phoneNumber, reason = 'Suspicious activity', reporter = 'unknown') {
    let scammers = loadScammers();
    
    // Check if already exists
    if (scammers.includes(phoneNumber)) {
        console.log(`⚠️ ${phoneNumber} already in database`);
        return { success: false, message: 'Number already reported' };
    }
    
    // Add new scammer
    scammers.push(phoneNumber);
    saveScammers(scammers);
    
    console.log(`🚨 New scammer added: ${phoneNumber} - Reason: ${reason} - Reported by: ${reporter}`);
    return { success: true, message: 'Scammer added', total: scammers.length };
}

// Check if a number is a reported scammer
function isScammer(phoneNumber) {
    const scammers = loadScammers();
    return scammers.includes(phoneNumber);
}

// Get all scammers
function getAllScammers() {
    return loadScammers();
}

// Get scammer count
function getScammerCount() {
    return loadScammers().length;
}

// Remove a scammer (if reported by mistake)
function removeScammer(phoneNumber) {
    let scammers = loadScammers();
    const index = scammers.indexOf(phoneNumber);
    
    if (index === -1) {
        return { success: false, message: 'Number not found in database' };
    }
    
    scammers.splice(index, 1);
    saveScammers(scammers);
    return { success: true, message: 'Scammer removed', total: scammers.length };
}

// Search scammers (partial match)
function searchScammers(searchTerm) {
    const scammers = loadScammers();
    const results = scammers.filter(num => num.includes(searchTerm));
    return results;
}

// Get first X scammers (for display)
function getRecentScammers(limit = 20) {
    const scammers = loadScammers();
    return scammers.slice(-limit).reverse(); // Most recent first
}

// Bulk add scammers
function bulkAddScammers(numbers, reason = 'Bulk import', reporter = 'admin') {
    let scammers = loadScammers();
    let added = 0;
    let duplicates = 0;
    
    for (let number of numbers) {
        if (!scammers.includes(number)) {
            scammers.push(number);
            added++;
        } else {
            duplicates++;
        }
    }
    
    saveScammers(scammers);
    console.log(`📦 Bulk import: ${added} added, ${duplicates} duplicates`);
    
    return {
        success: true,
        added: added,
        duplicates: duplicates,
        total: scammers.length
    };
}

// Export functions for use in bot.js
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
    bulkAddScammers
};