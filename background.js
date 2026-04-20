chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) { // close tab
        chrome.storage.local.get([`tab_for_${notificationId}`], (res) => {
            const tabId = res[`tab_for_${notificationId}`];
            if (tabId) chrome.tabs.remove(tabId);
            chrome.storage.local.remove([`tab_for_${notificationId}`]);
        });
    }
});

chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    chrome.storage.local.remove([`tab_for_${notificationId}`]);
});

// helper to get storage as a promise
function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
async function updateOpenPhish() {
    try {
        const res = await fetch("https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt");
        const text = await res.text();

        const urls = text.split("\n").filter(Boolean);

        await chrome.storage.local.set({ openPhishList: urls });

        console.log("OpenPhish updated:", urls.length);
    } catch (err) {
        console.error("Failed to fetch OpenPhish:", err);
    }
}
updateOpenPhish();
setInterval(updateOpenPhish, 12 * 60 * 60 * 1000); // every 12h
async function checkVisualSafety(screenshot, pageData) {
    const data = await getStorage(['gemini_api_key']);
    const userApiKey = data.gemini_api_key;

    if (!userApiKey) return;

    chrome.storage.local.remove(['lastVerdict']);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userApiKey}`;
    const prompt = {
        contents: [{
            parts: [
                { text: `You are a cybersecurity expert. Analyze this screenshot and metadata: ${JSON.stringify(pageData)}. 
                Identify if this site visually mimics a famous brand but has a suspicious URL.
                Return ONLY JSON: {"status": "SAFE" or "DANGER", "rating": 1-10, "reason": "short explanation in English"}` 
                },
                { inline_data: { mime_type: "image/png", data: screenshot.split(',')[1] } }
            ]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prompt)
        });

        const result = await response.json();
        
        if (result.candidates && result.candidates[0]) {
            const aiText = result.candidates[0].content.parts[0].text;
            const cleanText = aiText.replace(/```json|```/g, "").trim();
            const verdict = JSON.parse(cleanText);

            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (!tabs[0]) return;
                const currentTabId = tabs[0].id;
                const currentHostname = new URL(tabs[0].url).hostname;

                const verdictWithMeta = { 
                    ...verdict, 
                    tabId: currentTabId, 
                    hostname: currentHostname 
                };

                chrome.storage.local.set({ lastVerdict: verdictWithMeta }, () => {
                    chrome.runtime.sendMessage({ 
                        action: "updatepopup", 
                        ...verdictWithMeta 
                    }).catch(() => {}); 
                });

                if (verdict.status === "DANGER" && verdict.rating >= 6) {
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icon128.png",
                        title: `BRAND IMPOSTOR DETECTED (${verdict.rating}/10)`,
                        message: verdict.reason,
                        buttons: [{ title: "CLOSE DANGEROUS TAB" }],
                        priority: 2
                    }, (notificationId) => {
                        chrome.storage.local.set({ [`tab_for_${notificationId}`]: currentTabId });
                    });

                    chrome.tabs.sendMessage(currentTabId, {
                        action: "forceBlock",
                        reason: verdict.reason,
                        rating: verdict.rating
                    });
                }
            });
        }
    } catch (error) {
        console.error("Jester Visual Analysis Error:", error);
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "getTabId") {
        sendResponse({ tabId: sender.tab.id});
    }
});