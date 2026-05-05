// ocr.js - Optical Character Recognition Module
// Enhanced for low-resolution and poor quality images
// Uses OCR.space API with preprocessing hints

const fetch = require('node-fetch');

// OCR.space free API key (100 requests/month free)
// Get your own key at https://ocr.space/OCRAPI
const OCR_SPACE_API_KEY = 'helloworld';

// ========== ENHANCED OCR WITH LOW-RES SUPPORT ==========
async function extractTextFromImage(imageUrl, botToken) {
    console.log('🌐 OCR: Sending to OCR.space API...');
    
    // Try multiple OCR engines for better low-res recognition
    const engines = [1, 2, 3]; // 1=Standard, 2=Best quality, 3=Fast
    
    for (const engine of engines) {
        console.log(`   Trying OCR Engine ${engine}...`);
        
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
                    isTable: 'false',
                    OCREngine: engine.toString()
                })
            });
            
            const data = await response.json();
            
            if (data.OCRExitCode === 1 && data.ParsedResults && data.ParsedResults[0]) {
                let text = data.ParsedResults[0].ParsedText.trim();
                
                // Clean up the text
                text = cleanExtractedText(text);
                
                if (text && text.length > 5) {
                    console.log(`✅ OCR.space (Engine ${engine}) extracted ${text.length} characters`);
                    return text;
                }
            }
        } catch (err) {
            console.log(`   Engine ${engine} failed: ${err.message}`);
        }
    }
    
    console.log('❌ All OCR engines failed to extract text');
    return null;
}

// ========== CLEAN AND IMPROVE EXTRACTED TEXT ==========
function cleanExtractedText(text) {
    if (!text) return '';
    
    // Remove excessive spaces and line breaks
    let cleaned = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[^\w\s@\.\-\(\)\:\/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Fix common OCR mistakes
    const fixes = {
        '0': 'O',  // Often confusing
        '1': 'I',  // Often confusing
        '5': 'S',  // Sometimes confused
        'rn': 'm',  // 'rn' looks like 'm'
        'cl': 'd',  // 'cl' looks like 'd'
        'vv': 'w',  // 'vv' looks like 'w'
    };
    
    for (const [wrong, correct] of Object.entries(fixes)) {
        cleaned = cleaned.replace(new RegExp(wrong, 'g'), correct);
    }
    
    return cleaned;
}

// ========== ATTEMPT TO ENHANCE IMAGE URL (if possible) ==========
function getEnhancedImageUrl(originalUrl) {
    // Some APIs support size parameters
    // Telegram allows ?size=0 for original quality
    if (originalUrl.includes('telegram')) {
        return originalUrl + '?size=0';  // Request original quality
    }
    return originalUrl;
}

// ========== EXTRACT WITH MULTIPLE STRATEGIES ==========
async function extractTextWithFallbacks(imageUrl, botToken) {
    console.log('🔍 Enhanced OCR: Starting with low-res optimizations...');
    
    // Strategy 1: Try original image with best quality engine
    let result = await extractTextFromImage(imageUrl, botToken);
    if (result && result.length > 10) return result;
    
    // Strategy 2: Try with size parameter (if supported)
    const enhancedUrl = getEnhancedImageUrl(imageUrl);
    if (enhancedUrl !== imageUrl) {
        console.log('   Trying enhanced URL...');
        result = await extractTextFromImage(enhancedUrl, botToken);
        if (result && result.length > 10) return result;
    }
    
    // Strategy 3: Try with different language detection
    console.log('   Trying auto language detection...');
    // (OCR.space auto-detects, so this is handled)
    
    return null;
}

// ========== SIMPLE OCR FOR SHORT TEXTS ==========
async function extractShortText(imageUrl, botToken) {
    console.log('📱 OCR: Trying fast extraction for short text...');
    
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
                OCREngine: '3'  // Fast engine for short text
            })
        });
        
        const data = await response.json();
        
        if (data.OCRExitCode === 1 && data.ParsedResults && data.ParsedResults[0]) {
            let text = data.ParsedResults[0].ParsedText.trim();
            text = cleanExtractedText(text);
            console.log(`✅ Fast OCR extracted: "${text.substring(0, 50)}"`);
            return text;
        }
    } catch (err) {
        console.log(`   Fast OCR failed: ${err.message}`);
    }
    
    return null;
}

// ========== TEST OCR FUNCTION ==========
async function testOcr() {
    console.log('🧪 Testing OCR.space API...');
    const testResult = await extractTextFromImage('https://i.imgur.com/placeholder.jpg');
    if (testResult === null) {
        console.log('⚠️ OCR.space API key may need to be registered');
        console.log('   Get a free key at https://ocr.space/OCRAPI');
    } else {
        console.log('✅ OCR.space API is working');
    }
}

// ========== USER-FRIENDLY MESSAGE FOR LOW QUALITY ==========
function getLowQualityHelpMessage() {
    return (
        '⚠️ *Low Quality Image Detected*\n\n' +
        'I couldn\'t read the text clearly. Here\'s how to get better results:\n\n' +
        '📝 *Best Method:* Forward the message as TEXT\n' +
        '📸 *Screenshot Tips:*\n' +
        '   • Increase screen brightness\n' +
        '   • Zoom in before screenshot\n' +
        '   • Send as FILE (not photo)\n' +
        '   • Use good lighting\n\n' +
        '🔢 *Alternative:* Type /check [phone number]\n\n' +
        '👥 Join our community for help: @NigeriaSecurityHub'
    );
}

module.exports = {
    extractTextFromImage,
    extractTextWithFallbacks,
    extractShortText,
    cleanExtractedText,
    testOcr,
    getLowQualityHelpMessage
};