document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const reasonEl = document.getElementById('reason');
    const powerSwitch = document.getElementById('powerSwitch');
    const whiteListBtn = document.getElementById('whitelist-btn');

    const optionsTrigger = document.getElementById('options-trigger');
    const settingsPanel = document.getElementById('settings-panel');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');

    // toggle settings
    if (optionsTrigger) {
        optionsTrigger.addEventListener('click', () => {
            const isHidden = settingsPanel.style.display === 'none' || settingsPanel.style.display === '';
            settingsPanel.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                renderWhitelist();
                chrome.storage.local.get(['gemini_api_key'], (result) => {
                    if (result.gemini_api_key) apiKeyInput.value = result.gemini_api_key;
                });
            }
        });
    } 
       
    // save api key
    if (saveKeyBtn) {
        saveKeyBtn.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                const encodedKey = btoa(key);
                chrome.storage.local.set({ 'gemini_api_key': encodedKey }, () => {
                    saveKeyBtn.textContent = 'SAVED!';
                    saveKeyBtn.style.color = '#fff';
                    saveKeyBtn.style.backgroundColor = '#0de40d';
                    setTimeout(() => {
                        saveKeyBtn.textContent = 'SAVE CONFIG';
                        saveKeyBtn.style.color = '#0de40d';
                        saveKeyBtn.style.backgroundColor = '#111';
                        settingsPanel.style.display = 'none'; 
                    }, 1000); 
                });
            } else {
                alert("Please enter a valid API Key.");
            }
        });
    }

    // check scan for the current tab only
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs[0]) return;
        
        const currentTabId = tabs[0].id;
        const currentUrl = new URL(tabs[0].url).hostname;

        chrome.storage.local.get(['lastVerdict', 'isJesterActivated', 'userWhitelist'], (data) => {
            const isActive = data.isJesterActivated !== false;
            const whitelist = data.userWhitelist || [];
            
            if (powerSwitch) powerSwitch.checked = isActive;
            updatePowerUI(isActive, statusEl, reasonEl);

            if (whitelist.includes(currentUrl)) {
                updateUI({status: "SAFE", reason: "verified trusted domain (jester whitelist)."}, statusEl, reasonEl);
                if (whiteListBtn) whiteListBtn.innerText = "TRUSTED✓";
                return;
            }

            const isDataValid = data.lastVerdict && 
                               data.lastVerdict.tabId === currentTabId && 
                               data.lastVerdict.hostname === currentUrl;

            if (isActive && isDataValid) {
                updateUI(data.lastVerdict, statusEl, reasonEl);
            } else if (isActive) {
                statusEl.innerText = "ANALYZING...";
                statusEl.style.color = "#0de40d";
                reasonEl.innerText = "Jester is scanning this specific domain...";
                if (whiteListBtn) whiteListBtn.innerText = "TRUST THIS SITE?";
            }
        });
    });

    // update popup on message
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "updatepopup" && statusEl && reasonEl) {
            chrome.storage.local.get(['isJesterActivated'], (result) => {
                const activeNow = result.isJesterActivated !== false;
                if (activeNow) updateUI(message, statusEl, reasonEl);
            });
            sendResponse({ result: "success" });
        }
    });

    // trust site (whitelist)
    if (whiteListBtn) {
        whiteListBtn.addEventListener('click', () => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (!tabs[0]) return;
                let url = new URL(tabs[0].url).hostname;
                chrome.storage.local.get({userWhitelist: []}, (data) => {
                    let list = data.userWhitelist;
                    if (!list.includes(url)) {
                        list.push(url);
                        chrome.storage.local.set({userWhitelist: list}, () => {
                            whiteListBtn.innerText = "TRUSTED✓";
                            chrome.tabs.reload(tabs[0].id);
                        });
                    }
                });
            });
        });
    }
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
            });
        });
    }

    // jester on/off switch
    if (powerSwitch) {
        chrome.storage.local.get(['isJesterActivated'], (result) => {
            const isActive = result.isJesterActivated !== false;
            powerSwitch.checked = isActive;
            updatePowerUI(isActive, statusEl, reasonEl);
        });

        powerSwitch.addEventListener('change', () => {
            const newState = powerSwitch.checked;
            updatePowerUI(newState, statusEl, reasonEl);
            if (!newState) {
                chrome.storage.local.remove(['lastVerdict']);
                statusEl.innerText = "STANDBY";
                statusEl.style.color = "#555";
                reasonEl.innerText = "Jester AI is currently paused.";
            }
            chrome.storage.local.set({ isJesterActivated: newState }, () => {
                chrome.tabs.query({active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].id) chrome.tabs.reload(tabs[0].id);
                });
            });
        });
    }
});

// color :3
function updateUI(data, statusEl, reasonEl) {
    if (!statusEl || !reasonEl) return;
    statusEl.innerText = data.status;
    reasonEl.innerText = data.reason;
    statusEl.style.color = (data.status === "DANGER") ? "#ff3e3e" : "#0de40d";
}

// toggle ui
function updatePowerUI(isActive, statusEl, reasonEl) {
    if (!statusEl) return;
    const slider = document.querySelector('.slider');
    if (isActive) {
        statusEl.innerText = "ANALYZING...";
        statusEl.style.color = "#0de40d"; 
        if (slider) slider.style.backgroundColor = "#0de40d"; 
        if (reasonEl && reasonEl.innerText === "Jester AI is currently paused.") {
            reasonEl.innerText = "Waiting for Gemini analysis...";
        }
    } else {
        statusEl.innerText = "STANDBY";
        statusEl.style.color = "#555";
        if (slider) slider.style.backgroundColor = "#222"; 
        if (reasonEl) reasonEl.innerText = "Jester AI is currently paused.";
    }
}

// show whitelist items
function renderWhitelist() {
    const listContainer = document.getElementById('whitelist-items');
    if (!listContainer) return;

    chrome.storage.local.get({userWhitelist: []}, (data) => {
        listContainer.innerHTML = '';
        if (data.userWhitelist.length === 0) {
            listContainer.innerHTML = '<p style="color: #444; font-style: italic;">No domains added.</p>';
            return;
        }

        data.userWhitelist.forEach((domain, index) => {
            const item = document.createElement('div');
            item.style = "display:flex; justify-content:space-between; margin-bottom:5px; padding:3px; border-bottom:1px solid #222;";
            const displayDomain = domain || "Local File / No Domain";
            item.innerHTML = `
                <span style="color: #eee; font-size: 12px; font-family: 'Courier New', monospace;">${displayDomain}</span>
                <span class="remove-domain" data-index="${index}" style="color: #ff3e3e; cursor: pointer; font-weight: bold; margin-left: 10px;">[X]</span>
            `;
            listContainer.appendChild(item);
        });

        document.querySelectorAll('.remove-domain').forEach(btn => {
            btn.onclick = (e) => { 
                const idx = e.target.getAttribute('data-index');
                chrome.storage.local.get({userWhitelist: []}, (res) => {
                    const newList = [...res.userWhitelist];
                    newList.splice(idx, 1);
                    chrome.storage.local.set({userWhitelist: newList}, renderWhitelist);
                });
            };
        });
    });
}