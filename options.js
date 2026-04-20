document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get({ gemini_api_key: null }, (result) => {
        if (result.gemini_api_key) {
            document.getElementById('api_key_input').value = atob(result.gemini_api_key);
        }
    });

    document.getElementById('saveBtn').addEventListener('click', saveSettings);
});

function saveSettings() {
    const inputKey = document.getElementById('api_key_input').value.trim();

    if (!inputKey) {
        alert("Please enter a valid API key.");
        return;
    }
    const encryptedKey = btoa(inputKey);
    chrome.storage.local.set({ gemini_api_key: encryptedKey }, () => {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = "Settings saved!";
            setTimeout(() => status.textContent = "", 2000);
        } else {
            alert("Settings saved!");
        }
    });
}