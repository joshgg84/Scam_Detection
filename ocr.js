// ocr.js - Optical Character Recognition Module
// Uses OCR.space API (no system dependencies required)

const fetch = require('node-fetch');

// OCR.space free API key (100 requests/month free)
// Get your own key at https://ocr.space/OCRAPI
const OCR_SPACE_API_KEY = 'helloworld';

// ========== EXTRACT TEXT FROM IMAGE URL USING OCR.SPACE ==========
async function extractTextFromImage(imageUrl, botToken) {
    console.log('🌐 OCR: Sending to OCR.space API...');
    
    try {
        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'apikey': OCR_SPACE_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                url: imageUrl,
                language: 'eng',
                isOverlayRequired: 'false',
                detectOrientation: 'true',
                scale: 'true',
                OCREngine: '2'
            })
        });
        
        const data = await response.json();
        
        if (data.OCRExitCode === 1 && data.ParsedResults && data.ParsedResults[0]) {
            const text = data.ParsedResults[0].ParsedText.trim();
            console.log(`✅ OCR.space extracted ${text.length} characters`);
            return text;
        } else {
            console.log(`⚠️ OCR.space error: ${data.ErrorMessage || 'Unknown error'}`);
            return null;
        }
    } catch (err) {
        console.error('❌ OCR.space API error:', err.message);
        return null;
    }
}

// ========== TEST OCR FUNCTION ==========
async function testOcr() {
    console.log('🧪 Testing OCR.space API...');
    const testResult = await extractTextFromImage('https://i.imgur.com/placeholder.jpg');
    if (testResult === null) {
        console.log('⚠️ OCR.space API key may need to be registered');
    } else {
        console.log('✅ OCR.space API is working');
    }
}

module.exports = {
    extractTextFromImage,
    testOcr
};