<div align="center">
  <img src="icon128.png" width="90" />
  <h1>Jester AI</h1>
  <p>AI-powered phishing detection for Chrome</p>

  <p>
    <img src="https://img.shields.io/badge/Manifest-V3-00ff88?style=flat-square&labelColor=111" />
    <img src="https://img.shields.io/badge/AI-Gemini%202.5%20Flash-00ff88?style=flat-square&labelColor=111" />
    <img src="https://img.shields.io/badge/Version-1.2-00ff88?style=flat-square&labelColor=111" />
    <img src="https://img.shields.io/badge/License-MIT-00ff88?style=flat-square&labelColor=111" />
  </p>

  <p>
    <a href="https://chromewebstore.google.com/detail/jester-ai/bojbcacchglklklhhahjohmpffkdoolp">Chrome Web Store</a> ·
    <a href="https://www.youtube.com/watch?v=XP2o6ucFMFQ">Demo</a> ·
    <a href="https://jamallyemin.github.io/JesterAI/privacy-policy.html">Privacy Policy</a> ·
    <a href="https://jamallyemin.github.io/JesterAI/welcome.html">Welcome Page</a>
  </p>
</div>

---

Jester AI is a Chrome extension that scans every page you visit for phishing attempts using Google Gemini. It blocks malicious sites before you interact with them — no manual checking, no pop-up fatigue.

## How it works

Detection runs in two layers on every page load.

**Layer 1 — Static analysis** (`content.js`) checks the URL against regex patterns for known phishing signals, detects login forms and brand impersonation, and cross-references the page against the OpenPhish live feed which is synced every 12 hours. Form inputs are quarantined during scanning to prevent premature submission.

**Layer 2 — AI analysis** (`background.js`) sends DOM metadata to Gemini 2.5 Flash. The model checks whether the page visually mimics a known brand on a mismatched domain and returns a JSON verdict with a status, a 1–10 threat rating, and a short reason.

If the rating hits 4/10 or above, Jester injects a full-screen block page. You can hold the ignore button for 2 seconds to override and whitelist the domain.

## Features

- Gemini 2.5 Flash for real-time AI threat analysis
- OpenPhish integration — 50,000+ known phishing URLs, updated every 12h
- Three sensitivity levels (Low / Medium / High) with different block thresholds
- Multilingual block page — English, Azerbaijani, Russian, Turkish
- Quarantine mode — disables form inputs while scanning
- User whitelist — permanently trust a domain with a 2-second hold
- Desktop notifications for high-risk detections
- Bring your own API key — no shared quota, no central server
- On/Off toggle to pause protection without uninstalling

## Installation

**From the Chrome Web Store** (recommended)

[Install Jester AI](https://chromewebstore.google.com/detail/jester-ai/bojbcacchglklklhhahjohmpffkdoolp)

**Manual / developer mode**

You'll need a free [Gemini API key](https://aistudio.google.com/app/apikey) from Google AI Studio.

```bash
git clone https://github.com/jamallyemin/JesterAI.git
cd JesterAI
```

Then go to `chrome://extensions`, enable Developer Mode, click **Load unpacked**, and select the folder. After loading, click the extension icon → ⋮ → paste your API key → Save.

## Project structure

```
JesterAI/
├── manifest.json         # MV3 config
├── background.js         # Service worker — Gemini calls, OpenPhish sync
├── content.js            # DOM scanner — quarantine, block page, regex checks
├── popup.html/js         # Extension popup
├── options.js            # Settings page
├── welcome.html          # Shown on first install
├── privacy-policy.html   # Hosted at jamallyemin.github.io/JesterAI
├── prompts.json          # AI prompt templates
└── icon128.png
```

## Configuration

| Setting | Description |
|---|---|
| API Key | Your Gemini key, Base64-encoded in `chrome.storage.local` |
| Sensitivity | Controls the block rating threshold and login-form behavior |
| Whitelist | Domains that skip all scanning |
| Language | Auto-detected from browser, or set manually |
| Power switch | Disables scanning without uninstalling |

## AI prompt structure

Each request to Gemini includes the page URL, extracted headings and button labels, whether a login form is present, whether a known brand appears on a mismatched domain, and the scan mode (`light` for ordinary pages, `deep` for suspicious ones).

The model is instructed to respond only in JSON:

```json
{
  "status": "DANGER",
  "rating": 8,
  "reason": "Page mimics PayPal login but is hosted on a random domain."
}
```

## Built with

- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Google Gemini 2.5 Flash](https://ai.google.dev/)
- [OpenPhish](https://openphish.com/)
- Vanilla JS — no build tools, no dependencies

## Contributing

PRs are welcome. For anything significant, open an issue first.

## License

MIT © [jamallyemin](https://github.com/jamallyemin)
