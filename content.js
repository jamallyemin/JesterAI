const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
const languageMap = { 'az': 'Azerbaijani', 'en': 'English', 'ru': 'Russian', 'tr': 'Turkish' };
const targetLang = languageMap[userLang] || 'English';

const uiTranslations = {
    az: { title: "GİRİŞ QADAĞANDIR", threat: "TƏHLÜKƏ SƏVİYYƏSİ", analysis: "TƏHLÜKƏ ANALİZİ:", button: "TƏHLÜKƏSİZ YERƏ QAYIT" },
    en: { title: "ACCESS DENIED", threat: "THREAT LEVEL", analysis: "THREAT ANALYSIS:", button: "RETURN TO SAFETY" },
    ru: { title: "ДОСТУП ЗАПРЕЩЕН", threat: "УРОВЕНЬ УГРОЗЫ", analysis: "АНАЛИЗ УГРОЗЫ:", button: "ВЕРНУТЬСЯ В БЕЗОПАСНОСТЬ" },
    tr: { title: "ERİŞİM ENGELLENDİ", threat: "TEHDİT SEVİYESİ", analysis: "TEHDİT ANALİZİ:", button: "GÜVENLİĞE GERİ DÖN" }
};
const tl = uiTranslations[userLang] || uiTranslations.en;

let userApiKey = null;

function blockSite(reason, rating) {
    const host = (window.location.hostname || "Local File").replace(/^www\./, "");
    window.stop();

    // overlay
    const overlay = document.createElement("div");
    overlay.id = "jester-overlay";
    overlay.style = `
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: #000;
        color: #ff3e3e;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', sans-serif;
    `;

    overlay.innerHTML = `
        <div style="border:2px solid #ff3e3e; padding:40px; text-align:center; max-width:600px;">
            <h1>${tl.title}</h1>
            <p>${tl.threat}: ${rating}/10</p>
            <p>${reason}</p>
            <button id="goBack">← ${tl.button}</button>
            <button id="ignore">HOLD TO IGNORE</button>
        </div>
    `;
    (document.body || document.documentElement).appendChild(overlay);
    // back button
    document.getElementById("goBack").onclick = () => window.history.back();

    // hold2ignore button
    const ignoreBtn = document.getElementById("ignore");
    let holdTimer;
    let isHolding = false;
    ignoreBtn.disabled = false;

    ignoreBtn.onmousedown = () => {
        isHolding = true;
        ignoreBtn.textContent = "HOLDING...";

        holdTimer = setTimeout(() => {
            if (isHolding) {
                chrome.storage.local.get({ userWhitelist: [] }, (res) => {
                    const newList = Array.from(new Set([...res.userWhitelist, host]));
                    chrome.storage.local.set({ userWhitelist: newList }, () => location.reload());
                });
            }
        }, 2000);
    };

    ignoreBtn.onmouseup = ignoreBtn.onmouseleave = () => {
        clearTimeout(holdTimer);
        isHolding = false;
        ignoreBtn.textContent = "HOLD TO IGNORE";
    };
}

const whiteList = [
    "google.com", "youtube.com", "github.com", "linkedin.com",
    "stackoverflow.com", "instagram.com", "facebook.com", "netflix.com"
];

const dangerousPatterns = [
    /payp[a@]l/i,
    /g[o0]{2}gle/i,
    /faceb[o0]{2}k/i,
    /l[o0]g[-_]?in/i,
    /verif(y|ication)/i,
    /secure[-_]?update/i,
    /free[-_]?gift/i,
    /bit\.ly/i,
    /t\.co/i,
    /xn--/i 
];

const checkRegex = (url) => dangerousPatterns.some(pattern => pattern.test(url));

const isSuspiciousURL = checkRegex(window.location.href);
if (isSuspiciousURL) {
    console.warn("Jester AI: High-risk URL pattern detected. Escalating scan priority.");
}



chrome.storage.local.get({userWhitelist: [], isJesterActivated: true, gemini_api_key: null}, (result) => {    
    const userList = result.userWhitelist;
    const isActive = result.isJesterActivated
    const currentHost = window.location.hostname;
    userApiKey = result.gemini_api_key ? atob(result.gemini_api_key) : null;
    
    if (!isActive) {
        console.log("Jester AI: System is in STANDBY mode. Skipping all checks.");
        return;
    }

    const matchesDomain = (host, domain) =>
        host === domain || host.endsWith("." + domain);

    const isSafe =
        whiteList.some(site => matchesDomain(currentHost, site)) ||
        userList.some(site => matchesDomain(currentHost, site));

    if (isSafe) {
    console.log("Jester AI: Trusted site detected. Skipping scan.");

    chrome.runtime.sendMessage({ action: "getTabId" }, (response) => {
        chrome.storage.local.set({
            lastVerdict: {
                status: "SAFE",
                reason: "Verified trusted domain (Jester Whitelist).",
                rating: 0,
                tabId: response?.tabId,
                hostname: window.location.hostname
            }
        });
    });
    return; 
} else {
    if (!userApiKey) {
    console.error("Jester AI: API Key is missing! Please set it in options");
    chrome.runtime.sendMessage({
        action: "updatepopup",
        status: "OFFLINE",
        reason: "Please set your API Key in Settings (⋮) to start protection."
    });
    return;
};
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    const pageText = document.body.innerText.toLowerCase();
    const brandHints = ["google", "paypal", "facebook", "microsoft"];

    const detectedBrand = brandHints.find(b => pageText.includes(b));
    const hostname = window.location.hostname.toLowerCase();

    const brandDomainMap = {
        google: "google.com",
        paypal: "paypal.com",
        facebook: "facebook.com",
        microsoft: "microsoft.com"
    };

    const expectedDomain = detectedBrand ? brandDomainMap[detectedBrand] : null;
    const domainMismatch = expectedDomain
        ? !matchesDomain(hostname, expectedDomain)
        : false;
        const headers = Array.from(document.querySelectorAll('h1, h2'))
            .map(el => el.innerText.trim())
            .filter(Boolean);
        const buttons = Array.from(document.querySelectorAll('button, a'))
            .map(el => el.innerText.trim())
            .filter(Boolean)
            .slice(0, 10);
    const data = {
        hasLogin: inputs.some(i => i.type === "password"),
        inputCount: inputs.length,
        textInputs: inputs.filter(i => i.type === "text" || i.type === "email").length,
        brandMention: detectedBrand || null,
        domainMismatch: domainMismatch || false,

        headers: headers.length ? headers : ["None"],
        buttons: buttons.length ? buttons : ["None"],

        url: window.location.href
    };

chrome.storage.local.get("openPhishList", (result) => {
    const list = result.openPhishList || [];
    const currentUrl = window.location.href;

    if (list.includes(currentUrl)) {
        blockSite("Known phishing site (OpenPhish)", 9);

        chrome.runtime.sendMessage({
            action: "updatepopup",
            status: "DANGER",
            reason: "Detected by OpenPhish database.",
            rating: 9
        });

        return;
    }

    const hasLogin = data.hasLogin;
    const suspicious = checkRegex(window.location.href);
    const looksFormHeavy = data.inputCount >= 2 || data.textInputs >= 2;

    if (!suspicious && !hasLogin && !looksFormHeavy) {
        checkSafety({ ...data, mode: "light" });
        return;
    }

    if (suspicious && hasLogin) {
        blockSite("Suspicious login page detected.", 7);

        chrome.runtime.sendMessage({
            action: "updatepopup",
            status: "DANGER",
            reason: "Suspicious login page detected.",
            rating: 7
        });

        return;
    }

checkSafety(data);
});
}
});

async function checkSafety(pageData) {
    function setQuarantine(active) {
        const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
        inputs.forEach(el => {
            if (active) {
                el.disabled = true;
                el.style.filter = 'grayscale(100%) opacity(0.5)';
                el.style.cursor = 'not-allowed';
                if (!el.dataset.oldPlaceholder) el.dataset.oldPlaceholder = el.placeholder || "";
                if ("placeholder" in el) el.placeholder = "Jester AI is scanning... Please wait.";
            } else{ 
                el.disabled = false;
                el.style.filter = '';
                el.style.cursor = '';
                el.placeholder = el.dataset.oldPlaceholder || "";
            }
        });
    }
    setQuarantine(true);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userApiKey}`;
        // instructions for the ai 
        const prompt = `You are a cybersecurity expert.

    Scan Mode: ${pageData.mode || "deep"}
    Brand Mentioned: ${pageData.brandMention || "None"}
    Analyze this website for phishing.

    URL: ${pageData.url}
    Headers: ${pageData.headers.join(", ")}
    Buttons: ${pageData.buttons.join(", ")}
    Domain Mismatch: ${pageData.domainMismatch}
    Login Form Present: ${pageData.hasLogin}
    Total Inputs: ${pageData.inputCount}
    Text Inputs: ${pageData.textInputs}

    Rules:
    - If Scan Mode is "light", be fast but cautious. Assume unknown = slightly suspicious.
    - If Scan Mode is "deep", be strict and detailed.
    - Multiple input fields increase suspicion
    - Pages asking for user data without clear purpose are suspicious
    - If a known brand is mentioned but URL does not match → HIGH RISK
    - If Domain Mismatch is true → HIGH RISK

    CRITICAL:
    - Login form + suspicious URL = HIGH RISK
    - Brand impersonation = HIGH RISK

    Respond ONLY JSON:
    {"status":"SAFE" or "DANGER","rating":1-10,"reason":"short explanation in ${targetLang}"}`;

    try { 
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
        });
        console.log("STATUS", response.status);

        const result = await response.json();

        setQuarantine(false);

        console.log("FULL RESPONSE:", result);
        if (result.error) {
            setQuarantine(false);
            console.error("Gemini API Error", result.error.message);

            chrome.runtime.sendMessage({
                action: "updatepopup",
                status: "ERROR",
                reason: "API Limit reached or Connection lost."
            });
            return;
        }
        // clean the response if ai adds a markdown
        if (!result.candidates || !result.candidates[0]) {
            throw new Error("Invalid AI response");
        }
        const airesponse = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!airesponse) {
            throw new Error("Empty or malformed AI response");
        }

        const jsonMatch = airesponse.match(/\{[\s\S]*\}/);
        const cleanresponse = jsonMatch
            ? jsonMatch[0]
            : airesponse.replace(/```json|```/g, "").trim();

        const verdict = JSON.parse(cleanresponse);

        console.log("Jester AI Verdict:", verdict);
        
        // save data
        chrome.runtime.sendMessage({ action: "getTabId" }, (res) => {
            chrome.storage.local.set({
                lastVerdict: {
                    status: verdict.status,
                    reason: verdict.reason,
                    rating: verdict.rating,
                    tabId: res?.tabId,
                    hostname: window.location.hostname
        }
    });
});
    if (verdict.status === "DANGER" && verdict.rating >= 4) {
            blockSite(verdict.reason, verdict.rating);
            chrome.runtime.sendMessage({ action: "showNotification", title: `Jester: THREAT ${verdict.rating}/10`, message: verdict.reason });
        } 
        else if (verdict.status === "SAFE") {
            chrome.runtime.sendMessage({ action: "captureAndAnalyze", pageData: pageData });
        }

        chrome.runtime.sendMessage({ action: "updatepopup", ...verdict });

    } catch (e) { 
        setQuarantine(false);
        console.error("Jester Error:", e);
        if (checkRegex(pageData.url) && pageData.hasLogin) {
            blockSite("Failed to verify page safety.", 6);
        }
    }
}
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "forceBlock") {
        console.log("Jester AI: Visual threat detected. Blocking site...");
        blockSite(message.reason, message.rating);
    }
});