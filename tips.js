// Nigeria Scam Detector - Daily Tips Database
// 100 Security Tips for Nigerians
// Created by Joshua Giwa

const dailyTips = [
    "📚 *TODAY'S TIP*\n\nNever share your OTP with anyone. Banks will NEVER ask for it.",
    
    "📚 *TODAY'S TIP*\n\nIf someone promises to double your money in 24 hours, RUN. It's a scam.",
    
    "📚 *TODAY'S TIP*\n\nVerify urgent requests by CALLING the person back. Don't trust SMS or email.",
    
    "📚 *TODAY'S TIP*\n\nRomance scammers build trust for months before asking for money.",
    
    "📚 *TODAY'S TIP*\n\nLegitimate jobs never ask for payment to hire you.",
    
    "📚 *TODAY'S TIP*\n\nAlways /check any number before sending money or doing business.",
    
    "📚 *TODAY'S TIP*\n\nNo bank employee will ever call you for your PIN, OTP, or BVN.",
    
    "📚 *TODAY'S TIP*\n\nIf an investment sounds too good to be true, it is.",
    
    "📚 *TODAY'S TIP*\n\nScammers create urgency to stop you from thinking clearly.",
    
    "📚 *TODAY'S TIP*\n\nIf someone asks for your BVN over the phone, hang up immediately.",
    
    "📚 *TODAY'S TIP*\n\nFake loan apps ask for advance fees. Real loans deduct from disbursement.",
    
    "📚 *TODAY'S TIP*\n\nNever send money to someone you met online, no matter their story.",
    
    "📚 *TODAY'S TIP*\n\nScammers copy WhatsApp profiles. Call to verify before sending money.",
    
    "📚 *TODAY'S TIP*\n\nIf a deal is too good to be true, it's a trap. Walk away.",
    
    "📚 *TODAY'S TIP*\n\nEFCC will never call you to send money. Report such calls immediately.",
    
    "📚 *TODAY'S TIP*\n\nYour bank will never ask you to click a link via SMS. Type the URL yourself.",
    
    "📚 *TODAY'S TIP*\n\nScammers use fake caller IDs. Don't trust caller ID, call back officially.",
    
    "📚 *TODAY'S TIP*\n\nNo lottery or prize requires payment to claim winnings. It's a scam.",
    
    "📚 *TODAY'S TIP*\n\nBe careful of 'work from home' jobs asking for registration fees.",
    
    "📚 *TODAY'S TIP*\n\nGift card payment requests are always scams. No legitimate business asks for gift cards.",
    
    "📚 *TODAY'S TIP*\n\nIf someone rushes you to make a decision, pause and verify first.",
    
    "📚 *TODAY'S TIP*\n\nScammers target church members. Verify with your real pastor.",
    
    "📚 *TODAY'S TIP*\n\nDon't save your PIN as a contact. Scammers hack phones and check contacts.",
    
    "📚 *TODAY'S TIP*\n\nNever send your ATM card to anyone for 'upgrade' or 'verification'.",
    
    "📚 *TODAY'S TIP*\n\nIf someone says your account will be blocked, call your bank directly.",
    
    "📚 *TODAY'S TIP*\n\nScammers create fake Facebook profiles of your friends. Look closely.",
    
    "📚 *TODAY'S TIP*\n\nNo genuine business requires payment in Bitcoin or gift cards.",
    
    "📚 *TODAY'S TIP*\n\nIf you win something you didn't enter, it's 100% a scam.",
    
    "📚 *TODAY'S TIP*\n\nScammers pretend to be your child in trouble. Have a family code word.",
    
    "📚 *TODAY'S TIP*\n\nNever give your ATM PIN to 'bank officials' who call you.",
    
    "📚 *TODAY'S TIP*\n\nFake shipping companies ask for extra fees. Use only trusted couriers.",
    
    "📚 *TODAY'S TIP*\n\nIf someone claims to be from MTN/Glo/Airtel asking for recharge card PIN, it's a scam.",
    
    "📚 *TODAY'S TIP*\n\nScammers sell fake phones online. Insist on Pay on Delivery.",
    
    "📚 *TODAY'S TIP*\n\nNo one will send you free money. Anyone promising free money is lying.",
    
    "📚 *TODAY'S TIP*\n\nScammers use hacked accounts to ask friends for 'emergency loans'. Call them.",
    
    "📚 *TODAY'S TIP*\n\nNever click links in SMS claiming to be from your bank.",
    
    "📚 *TODAY'S TIP*\n\nFake POS agents swap your card. Watch your card at all times.",
    
    "📚 *TODAY'S TIP*\n\nIf someone asks for your OTP to 'verify' anything, it's a scam.",
    
    "📚 *TODAY'S TIP*\n\nScammers promise visas and travel abroad for fees. Use only official agents.",
    
    "📚 *TODAY'S TIP*\n\nNo real investment pays 20% monthly. That's mathematically impossible.",
    
    "📚 *TODAY'S TIP*\n\nScammers call saying your NIN will be deactivated. NIN never expires.",
    
    "📚 *TODAY'S TIP*\n\nFake charity appeals after disasters. Donate directly to known organizations.",
    
    "📚 *TODAY'S TIP*\n\nScammers send fake credit alerts. Always check your bank app balance.",
    
    "📚 *TODAY'S TIP*\n\nIf someone asks for money to release a larger sum, it's an advance fee fraud.",
    
    "📚 *TODAY'S TIP*\n\nScammers create fake investment groups on WhatsApp. Admin is the only real person.",
    
    "📚 *TODAY'S TIP*\n\nNever save your passwords in your browser on shared computers.",
    
    "📚 *TODAY'S TIP*\n\nUse two-factor authentication on your bank apps and email.",
    
    "📚 *TODAY'S TIP*\n\nScammers call pretending to be from 'Windows support'. Microsoft never calls you.",
    
    "📚 *TODAY'S TIP*\n\nFake rental properties ask for deposit before viewing. Never pay without seeing.",
    
    "📚 *TODAY'S TIP*\n\nIf someone says you've been 'selected' for a government grant you didn't apply for, it's a scam.",
    
    "📚 *TODAY'S TIP*\n\nScammers use fake job interviews via text only. Real jobs do video or in-person.",
    
    "📚 *TODAY'S TIP*\n\nNever give remote access to your phone or computer to a stranger.",
    
    "📚 *TODAY'S TIP*\n\nFake delivery companies ask for 'customs fees' on items you didn't order.",
    
    "📚 *TODAY'S TIP*\n\nScammers create fake betting sites. You'll never withdraw your winnings.",
    
    "📚 *TODAY'S TIP*\n\nIf a WhatsApp group promises daily profits for doing nothing, leave immediately.",
    
    "📚 *TODAY'S TIP*\n\nNever share your card expiry date and CVV together with anyone.",
    
    "📚 *TODAY'S TIP*\n\nScammers use AI voice cloning. If a family member calls asking for money urgently, hang up and call their real number.",
    
    "📚 *TODAY'S TIP*\n\nFake online stores take payment and never deliver. Check reviews before buying.",
    
    "📚 *TODAY'S TIP*\n\nIf someone asks you to download AnyDesk or TeamViewer to 'help' you, it's a scam.",
    
    "📚 *TODAY'S TIP*\n\nScammers send fake 'account upgrade' links. Always type bank URLs yourself.",
    
    "📚 *TODAY'S TIP*\n\nNo real business requires you to pay registration fees before paying you.",
    
    "📚 *TODAY'S TIP*\n\nScammers promise to 'clear' your name from blacklist for a fee. Only banks can do that.",
    
    "📚 *TODAY'S TIP*\n\nIf someone offers to 'flip' your cryptocurrency for profit, they will steal it.",
    
    "📚 *TODAY'S TIP*\n\nFake pregnancy scams: Someone claims you're the father and needs money. Demand DNA test first.",
    
    "📚 *TODAY'S TIP*\n\nNever send money to someone claiming to be a 'traditional healer' who can multiply your money.",
    
    "📚 *TODAY'S TIP*\n\nScammers sell 'spiritual protection' from scams. That's irony. Don't fall for it.",
    
    "📚 *TODAY'S TIP*\n\nFake loan apps access your contacts and shame you if you don't pay their illegal interest.",
    
    "📚 *TODAY'S TIP*\n\nIf someone calls claiming to be police and asks for money, ask for their station name and call back.",
    
    "📚 *TODAY'S TIP*\n\nScammers send messages that your 'NIN has been used for fraud'. It's a trick to scare you.",
    
    "📚 *TODAY'S TIP*\n\nNever send your international passport or ID card to anyone online.",
    
    "📚 *TODAY'S TIP*\n\nFake scholarship applications ask for 'processing fees'. Real scholarships don't charge.",
    
    "📚 *TODAY'S TIP*\n\nScammers post fake 'giveaway' posts asking you to share and send money for 'shipping'.",
    
    "📚 *TODAY'S TIP*\n\nIf someone you met online professes love quickly, be suspicious. Romance scammers rush.",
    
    "📚 *TODAY'S TIP*\n\nNever pay for a job, internship, or visa sponsorship. Legitimate opportunities pay you.",
    
    "📚 *TODAY'S TIP*\n\nScammers create fake NGO accounts to collect donations after tragedies.",
    
    "📚 *TODAY'S TIP*\n\nIf a message has bad grammar and urgent demands, it's likely a scam.",
    
    "📚 *TODAY'S TIP*\n\nNever respond to 'Your account has been suspended' emails. Check by calling your bank.",
    
    "📚 *TODAY'S TIP*\n\nScammers hack email accounts and send fake invoices. Always verify by phone.",
    
    "📚 *TODAY'S TIP*\n\nFake property agents show you pictures of houses that aren't for sale.",
    
    "📚 *TODAY'S TIP*\n\nIf someone asks for money for 'hospital bills' but won't tell you which hospital, it's a scam.",
    
    "📚 *TODAY'S TIP*\n\nNever send 'goodwill' or 'processing' fees to claim any prize or inheritance.",
    
    "📚 *TODAY'S TIP*\n\nScammers target people on dating apps. Move conversations to the app, not WhatsApp immediately.",
    
    "📚 *TODAY'S TIP*\n\nIf an investment promises 'guaranteed returns', that's illegal. All investments carry risk.",
    
    "📚 *TODAY'S TIP*\n\nScammers send fake 'You've won an iPhone' messages. You never win something you didn't enter.",
    
    "📚 *TODAY'S TIP*\n\nNever give your bank app login to anyone, even if they claim to be 'helping' you.",
    
    "📚 *TODAY'S TIP*\n\nScammers create fake profiles of celebrities asking for money. Celebrities don't DM fans for money.",
    
    "📚 *TODAY'S TIP*\n\nFake COVID-19 relief funds asked for personal info. No government asks for your bank PIN for relief.",
    
    "📚 *TODAY'S TIP*\n\nIf someone offers to buy your product but wants to overpay and you send the difference back, it's a scam.",
    
    "📚 *TODAY'S TIP*\n\nNever send money to someone claiming to be from 'Customs' asking for clearance fees on a package you didn't order.",
    
    "📚 *TODAY'S TIP*\n\nScammers pretend to be your boss via email asking for urgent transfers. Call your boss to verify.",
    
    "📚 *TODAY'S TIP*\n\nFake 'account verification' links steal your login details. Always type the website yourself.",
    
    "📚 *TODAY'S TIP*\n\nIf someone calls saying your relative has been in an accident and needs money, call your relative first.",
    
    "📚 *TODAY'S TIP*\n\nNever pay 'activation fees' for loans you applied for. Real loans deduct from what they give you.",
    
    "📚 *TODAY'S TIP*\n\nScammers send fake 'dividend' notifications. Your real dividends come through your bank or investment app.",
    
    "📚 *TODAY'S TIP*\n\nIf a message says 'click here to confirm your number or your account will be deleted', it's phishing.",
    
    "📚 *TODAY'S TIP*\n\nNever share your bank app one-time password with anyone, not even your spouse.",
    
    "📚 *TODAY'S TIP*\n\nScammers create fake payment screenshots. Always confirm money in your account before sending goods.",
    
    "📚 *TODAY'S TIP*\n\nIf someone offers to 'hack' someone's social media for a fee, they will take your money and disappear.",
    
    "📚 *TODAY'S TIP*\n\nFake 'military' or 'oil worker' profiles are common romance scams. They always need money to come home.",
    
    "📚 *TODAY'S TIP*\n\nNever send money to someone claiming to be stuck at an airport needing a ticket home.",
    
    "📚 *TODAY'S TIP*\n\nIf someone asks for your ATM card to 'upgrade' it, report them immediately.",
    
    "📚 *TODAY'S TIP*\n\nJoin our community for real-time scam alerts and support: https://t.me/+8JUqlJ-4SBdlZTM0"
];

// Export for use in bot.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dailyTips };
}