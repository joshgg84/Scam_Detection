// ocr.js - Optical Character Recognition Module
// Extracts text from images for scam detection
// Tries Tesseract.js first, falls back to OCR.space API if needed

const Tesseract = require('tesseract.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// ========== CONFIGURATION ==========
// OCR.space free API key (100 requests/month free)
// Replace with your own key if you need more: https://ocr.space/OCRAPI
const OCR_SPACE_API_KEY = 'helloworld';
const USE_TESSERACT_FIRST = true; // Set to false to use API directly

// ========== DOWNLOAD IMAGE FROM TELEGRAM ==========
async function downloadImage(fileUrl, botToken) {
    try {
        const response = await fetch(fileUrl);
        const buffer = await response.buffer();
        const tempPath = path.join('/tmp', `ocr_${Date.now()}.jpg`);
        fs.writeFileSync(tempPath, buffer);
        return tempPath;
    } catch (err) {
        console.error('Download error:', err);
        return null;
    }
}

// ========== METHOD 1: TESSERACT.JS (Local, Free, Slow) ==========
async function extractWithTesseract(imagePath) {
    console.log('📷 OCR: Trying Tesseract...');
    
    return new Promise((resolve) => {
        Tesseract.recognize(imagePath, 'eng', {
            logger: (m) => {
                // Silent mode - uncomment to see progress
                // if (m.status === 'recognizing text') console.log(`Progress: ${Math.round(m.progress * 100)}%`);
            }
        })
        .then(result => {
            const text = result.data.text.trim();
            if (text && text.length > 10) {
                console.log(`✅ Tesseract extracted ${text.length} characters`);
                resolve(text);
            } else {
                console.log('⚠️ Tesseract extracted too little text, trying API...');
                resolve(null);
            }
        })
        .catch(err => {
            console.error('❌ Tesseract error:', err.message);
            resolve(null);
        })
        .finally(() => {
            // Clean up temp file
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        });
    });
}

// ========== METHOD 2: OCR.SPACE API (Online, Free tier, Fast) ==========
async function extractWithOcrSpace(imageUrl) {
    console.log('🌐 OCR: Trying OCR.space API...');
    
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
                OCREngine: '2'  // 2 = best quality
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

// ========== MAIN FUNCTION: EXTRACT TEXT FROM IMAGE URL ==========
async function extractTextFromImage(imageUrl, botToken) {
    console.log('🔍 OCR: Starting extraction...');
    
    let extractedText = null;
    
    if (USE_TESSERACT_FIRST) {
        // Download image first (Tesseract needs local file)
        const imagePath = await downloadImage(imageUrl, botToken);
        if (imagePath) {
            extractedText = await extractWithTesseract(imagePath);
        }
    }
    
    // If Tesseract failed or returned no text, try API
    if (!extractedText || extractedText.length < 10) {
        extractedText = await extractWithOcrSpace(imageUrl);
    }
    
    if (extractedText && extractedText.length > 5) {
        // Clean up the text
        extractedText = extractedText
            .replace(/[^\w\s@\.\-\(\)]/g, ' ')  // Remove weird characters
            .replace(/\s+/g, ' ')                // Fix multiple spaces
            .trim();
        
        console.log(`📝 Final extracted text: ${extractedText.substring(0, 100)}...`);
        return extractedText;
    }
    
    console.log('❌ OCR: No text could be extracted');
    return null;
}

// ========== SIMPLE VERSION: EXTRACT FROM BASE64 OR BUFFER ==========
async function extractTextFromBuffer(imageBuffer) {
    console.log('🔍 OCR: Processing image buffer...');
    
    return new Promise((resolve) => {
        Tesseract.recognize(imageBuffer, 'eng')
            .then(result => {
                const text = result.data.text.trim();
                if (text && text.length > 5) {
                    console.log(`✅ Tesseract extracted ${text.length} characters from buffer`);
                    resolve(text);
                } else {
                    resolve(null);
                }
            })
            .catch(err => {
                console.error('❌ Tesseract buffer error:', err.message);
                resolve(null);
            });
    });
}

// ========== CHECK IF OCR IS AVAILABLE ==========
async function testOcr() {
    console.log('🧪 Testing OCR...');
    
    // Test Tesseract
    try {
        const version = await Tesseract.recognize(Buffer.from('test'), 'eng');
        console.log('✅ Tesseract is working');
    } catch (err) {
        console.log('⚠️ Tesseract not available:', err.message);
    }
    
    // Test OCR.space API key
    const testResult = await extractWithOcrSpace('https://i.imgur.com/placeholder.jpg');
    if (testResult === null) {
        console.log('⚠️ OCR.space API may have rate limits or invalid key');
    } else {
        console.log('✅ OCR.space API is working');
    }
}

// ========== EXPORTS ==========
module.exports = {
    extractTextFromImage,
    extractTextFromBuffer,
    testOcr
};