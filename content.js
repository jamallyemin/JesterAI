const languageMap = { 'az': 'Azerbaijani', 'en': 'English', 'ru': 'Russian', 'tr': 'Turkish' };

const uiTranslations = {
    az: { title: "GİRİŞ QADAĞANDIR", threat: "TƏHLÜKƏ SƏVİYYƏSİ", analysis: "TƏHLÜKƏ ANALİZİ:", button: "TƏHLÜKƏSİZ YERƏ QAYIT", holding: "SAXLAYIN...", ignore: "SAXLAYARAQ KEÇİN" },
    en: { title: "ACCESS DENIED",     threat: "THREAT LEVEL",       analysis: "THREAT ANALYSIS:",  button: "RETURN TO SAFETY",             holding: "HOLDING...",      ignore: "HOLD TO IGNORE" },
    ru: { title: "ДОСТУП ЗАПРЕЩЕН",   threat: "УРОВЕНЬ УГРОЗЫ",     analysis: "АНАЛИЗ УГРОЗЫ:",    button: "ВЕРНУТЬСЯ В БЕЗОПАСНОСТЬ",     holding: "УДЕРЖИВАЙТЕ...", ignore: "УДЕРЖИВАТЬ ДЛЯ ПРОПУСКА" },
    tr: { title: "ERİŞİM ENGELLENDİ", threat: "TEHDİT SEVİYESİ",    analysis: "TEHDİT ANALİZİ:",   button: "GÜVENLİĞE GERİ DÖN",          holding: "BEKLENIYOR...",  ignore: "TUTARAK GEÇ" }
};

let tl = null;
let targetLang = null;
let jesterSensitivity = 'medium';
let userApiKey = null;
let cachedTabId = null;

const sensitivityConfig = {
    low:    { blockRating: 7, suspiciousLoginBlock: false },
    medium: { blockRating: 4, suspiciousLoginBlock: true },
    high:   { blockRating: 3, suspiciousLoginBlock: true }
};

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

const checkRegex = (url) => dangerousPatterns.some(p => p.test(url));

const builtInWhiteList = [
    "google.com", "youtube.com", "github.com", "linkedin.com",
    "stackoverflow.com", "instagram.com", "facebook.com", "netflix.com"
];

const matchesDomain = (host, domain) => host === domain || host.endsWith("." + domain);

function blockSite(reason, rating) {
    const host = (window.location.hostname || "Local File").replace(/^www\./, "");
    window.stop();

    const overlay = document.createElement("div");
    overlay.id = "jester-overlay";
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: #000; color: #ff3e3e;
        z-index: 2147483647; display: flex;
        align-items: center; justify-content: center;
        font-family: 'Segoe UI', sans-serif;
    `;

    const container = document.createElement("div");
    container.style.cssText = "border:2px solid #ff3e3e; padding:40px; text-align:center; max-width:600px;";

    const title     = document.createElement("h1");
    title.textContent = tl.title;

    const threatLine = document.createElement("p");
    threatLine.textContent = `${tl.threat}: ${rating}/10`;

    const reasonLine = document.createElement("p");
    reasonLine.textContent = reason;

    const goBackBtn = document.createElement("button");
    goBackBtn.textContent = `← ${tl.button}`;

    const ignoreBtn = document.createElement("button");
    ignoreBtn.textContent = tl.ignore;

    container.append(title, threatLine, reasonLine, goBackBtn, ignoreBtn);
    overlay.appendChild(container);
    (document.body || document.documentElement).appendChild(overlay);

    goBackBtn.onclick = () => window.history.back();

    let holdTimer;
    let isHolding = false;

    ignoreBtn.onmousedown = () => {
        isHolding = true;
        ignoreBtn.textContent = tl.holding;
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
        ignoreBtn.textContent = tl.ignore;
    };
}

function getTabId() {
    return new Promise((resolve) => {
        if (cachedTabId !== null) { resolve(cachedTabId); return; }
        chrome.runtime.sendMessage({ action: "getTabId" }, (res) => {
            cachedTabId = res?.tabId ?? null;
            resolve(cachedTabId);
        });
    });
}

async function checkWayback(hostname) {
    try {
        const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(hostname)}&output=json&limit=1&fl=timestamp&from=19960101&fastLatest=true`;
        const earliest = await fetch(cdxUrl).then(r => r.json());

        const countUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(hostname)}/*&output=json&limit=1&fl=timestamp&matchType=domain`;
        const countRes = await fetch(
            `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(hostname)}/*&output=json&limit=0&matchType=domain`
        ).then(r => r.text());

        const count = parseInt(countRes.trim()) || 0;

        if (!earliest || earliest.length < 2) {
            return { status: 'never', hostname };
        }

        const raw = earliest[1][0];
        const year   = raw.slice(0, 4);
        const month  = raw.slice(4, 6);
        const day    = raw.slice(6, 8);
        const firstSeen = `${year}-${month}-${day}`;
        const firstDate = new Date(`${year}-${month}-${day}`);
        const daysOld = Math.floor((Date.now() - firstDate.getTime()) / 86400000);

        if (daysOld < 60) {
            return { status: 'new', days: daysOld, hostname };
        }

        return { status: 'ok', firstSeen, count, hostname };
    } catch (_) {
        return null;
    }
}

chrome.storage.local.get({
    userWhitelist: [],
    isJesterActivated: true,
    gemini_api_key: null,
    jesterSensitivity: 'medium',
    jesterLanguage: null
}, (result) => {
    const userList    = result.userWhitelist;
    const isActive    = result.isJesterActivated;
    const currentHost = window.location.hostname;
    userApiKey        = result.gemini_api_key ? atob(result.gemini_api_key) : null;
    jesterSensitivity = result.jesterSensitivity || 'medium';

    const browserLang  = (navigator.language || '').split('-')[0];
    const savedLang    = result.jesterLanguage;
    const resolvedLang = (savedLang && uiTranslations[savedLang])
        ? savedLang
        : (uiTranslations[browserLang] ? browserLang : 'en');

    tl         = uiTranslations[resolvedLang];
    targetLang = languageMap[resolvedLang] || 'English';

    if (!isActive) return;

    const isSuspiciousURL = checkRegex(window.location.href);

    const isSafe =
        builtInWhiteList.some(site => matchesDomain(currentHost, site)) ||
        userList.some(site => matchesDomain(currentHost, site));

    if (isSafe) {
        getTabId().then(tabId => {
            chrome.storage.local.set({
                lastVerdict: {
                    status: "SAFE",
                    reason: "Verified trusted domain (Jester Whitelist).",
                    rating: 0,
                    tabId,
                    hostname: window.location.hostname
                }
            });
        });
        return;
    }

    if (!userApiKey) {
        chrome.runtime.sendMessage({
            action: "updatepopup",
            status: "OFFLINE",
            reason: "Please set your API Key in Settings (⋮) to start protection."
        });
        return;
    }

    const inputs        = Array.from(document.querySelectorAll('input, textarea'));
    const pageText      = document.body.innerText.toLowerCase();
    const brandHints    = ["google", "paypal", "facebook", "microsoft"];
    const detectedBrand = brandHints.find(b => pageText.includes(b));
    const hostname      = window.location.hostname.toLowerCase();

    const brandDomainMap = {
        google: "google.com", paypal: "paypal.com",
        facebook: "facebook.com", microsoft: "microsoft.com"
    };

    const expectedDomain = detectedBrand ? brandDomainMap[detectedBrand] : null;
    const domainMismatch = expectedDomain ? !matchesDomain(hostname, expectedDomain) : false;

    const headers = Array.from(document.querySelectorAll('h1, h2'))
        .map(el => el.innerText.trim()).filter(Boolean);
    const buttons = Array.from(document.querySelectorAll('button, a'))
        .map(el => el.innerText.trim()).filter(Boolean).slice(0, 10);

    const data = {
        hasLogin:     inputs.some(i => i.type === "password"),
        inputCount:   inputs.length,
        textInputs:   inputs.filter(i => i.type === "text" || i.type === "email").length,
        brandMention: detectedBrand || null,
        domainMismatch: domainMismatch || false,
        headers: headers.length ? headers : ["None"],
        buttons: buttons.length ? buttons : ["None"],
        url: window.location.href
    };

    chrome.storage.local.get("openPhishList", (res) => {
        const list = res.openPhishList || [];
        const normalizedCurrent = window.location.href.split('?')[0].replace(/\/$/, '').toLowerCase();
        const isKnownPhish = list.some(entry => {
            const normalizedEntry = entry.split('?')[0].replace(/\/$/, '').toLowerCase();
            return normalizedCurrent.startsWith(normalizedEntry) || normalizedEntry.startsWith(normalizedCurrent);
        });

        if (isKnownPhish) {
            blockSite("Known phishing site (OpenPhish)", 9);
            chrome.runtime.sendMessage({
                action: "updatepopup",
                status: "DANGER",
                reason: "Detected by OpenPhish database.",
                rating: 9
            });
            return;
        }

        const hasLogin       = data.hasLogin;
        const suspicious     = checkRegex(window.location.href);
        const looksFormHeavy = data.inputCount >= 2 || data.textInputs >= 2;
        const cfg            = sensitivityConfig[jesterSensitivity] || sensitivityConfig.medium;

        if (!suspicious && !hasLogin && !looksFormHeavy) {
            checkSafety({ ...data, mode: "light" });
            return;
        }

        if (suspicious && hasLogin && cfg.suspiciousLoginBlock) {
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
            } else {
                el.disabled = false;
                el.style.filter = '';
                el.style.cursor = '';
                el.placeholder = el.dataset.oldPlaceholder || "";
            }
        });
    }
    setQuarantine(true);

    const cfg         = sensitivityConfig[jesterSensitivity] || sensitivityConfig.medium;
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    const prompt      = `You are a cybersecurity expert.

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
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': userApiKey },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
        });

        const result = await response.json();
        setQuarantine(false);

        if (result.error) {
            chrome.runtime.sendMessage({ action: "updatepopup", status: "ERROR", reason: "API Limit reached or Connection lost." });
            return;
        }

        if (!result.candidates || !result.candidates[0]) throw new Error("Invalid AI response");

        const airesponse = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!airesponse) throw new Error("Empty or malformed AI response");

        const jsonMatch    = airesponse.match(/\{[\s\S]*\}/);
        const cleanresponse = jsonMatch ? jsonMatch[0] : airesponse.replace(/```json|```/g, "").trim();
        const verdict      = JSON.parse(cleanresponse);

        getTabId().then(tabId => {
            chrome.storage.local.set({
                lastVerdict: {
                    status:   verdict.status,
                    reason:   verdict.reason,
                    rating:   verdict.rating,
                    tabId,
                    hostname: window.location.hostname
                }
            });
        });

        if (verdict.status === "DANGER" && verdict.rating >= cfg.blockRating) {
            blockSite(verdict.reason, verdict.rating);
            chrome.runtime.sendMessage({ action: "showNotification", title: `Jester: THREAT ${verdict.rating}/10`, message: verdict.reason });
        } else if (verdict.status === "SAFE") {
            chrome.runtime.sendMessage({ action: "captureAndAnalyze", pageData });
        }

        chrome.runtime.sendMessage({ action: "updatepopup", ...verdict });

        if (verdict.rating >= 5) {
            const wayback = await checkWayback(window.location.hostname);
            if (wayback) {
                chrome.storage.local.set({ lastWayback: wayback });
                chrome.runtime.sendMessage({ action: "updateWayback", ...wayback });
            }
        }

    } catch (e) {
        setQuarantine(false);
        if (checkRegex(pageData.url) && pageData.hasLogin && (sensitivityConfig[jesterSensitivity] || sensitivityConfig.medium).suspiciousLoginBlock) {
            blockSite("Failed to verify page safety.", 6);
        }
    }
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "forceBlock") {
        blockSite(message.reason, message.rating);
    }
});
