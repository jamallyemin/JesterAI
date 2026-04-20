# 🃏 Jester AI — AI-Powered Phishing Detection

<p align="center">
  <img src="assets/banner.png" alt="Jester AI Banner" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-0de40d?style=flat-square&labelColor=111" />
  <img src="https://img.shields.io/badge/AI-Gemini%202.5%20Flash-0de40d?style=flat-square&labelColor=111" />
  <img src="https://img.shields.io/badge/Version-1.1-0de40d?style=flat-square&labelColor=111" />
  <img src="https://img.shields.io/badge/License-MIT-0de40d?style=flat-square&labelColor=111" />
</p>

> A neural defense Chrome extension that uses Google Gemini to scan web pages for phishing patterns in real time — blocking malicious sites before you even interact with them.

---

## 🔍 How It Works

Jester AI uses a **dual-layer detection architecture**:

**Layer 1 — DOM / Static Analysis** (`content.js`)
- Scans for suspicious URL patterns using regex
- Detects login forms, brand impersonation signals, and domain mismatches
- Checks against the **OpenPhish** live feed (updated every 12h)
- Quarantines form inputs while analysis runs

**Layer 2 — Visual / AI Analysis** (`background.js`)
- Sends scraped DOM metadata + a base64 screenshot to **Gemini 2.5 Flash**
- AI identifies brand impostors — sites that *look* like Google/PayPal but hosted on random domains
- Returns a JSON verdict with `status`, `rating` (1–10), and a plain-English `reason`

If the threat rating hits **4/10 or higher**, Jester injects a full-screen block page. Users can hold to override and whitelist the domain.

---

## ✨ Features

- 🤖 **Gemini 2.5 Flash** — free AI model via Google AI Studio
- 🛡️ **OpenPhish integration** — real-time blacklist synced every 12 hours
- 🌐 **Multilingual block page** — English, Azerbaijani, Russian, Turkish
- 🔑 **Bring your own API key** — decentralized, no shared quota
- ⚪ **Quarantine mode** — grays out inputs while scanning
- ✅ **User whitelist** — trust domains permanently
- 🔔 **Desktop notifications** for high-risk detections
- 🕹️ **On/Off toggle** — pause protection anytime

---

## 🚀 Installation

### Prerequisites
- Google Chrome (or any Chromium-based browser)
- A free [Google AI Studio](https://aistudio.google.com/app/apikey) API key

### Steps

1. **Clone the repo**
   ```bash
   git clone https://github.com/jamallyemin/jester-ai.git
   cd jester-ai
   ```

2. **Load into Chrome**
   - Navigate to `chrome://extensions`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked** → select the `jester-ai` folder

3. **Add your API key**
   - Click the Jester AI icon in your toolbar
   - Click the **⋮** menu in the popup header
   - Paste your Gemini API key → **SAVE CONFIG**

That's it. Jester will start scanning immediately.

---

## 📁 Project Structure

```
jester-ai/
├── manifest.json       # Chrome Extension config (MV3)
├── background.js       # Service worker — Gemini visual analysis, OpenPhish sync
├── content.js          # DOM scanner — regex, quarantine, block page injection
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic — state, whitelist, power toggle
├── options.js          # Standalone options page
├── prompts.json        # Structured AI prompt templates
├── icon128.png         # Extension icon
└── assets/
    └── banner.png
```

---

## ⚙️ Configuration

| Setting | Description |
|--------|-------------|
| API Key | Your personal Gemini key (stored encoded in `chrome.storage.local`) |
| Whitelist | Domains you've manually trusted — skips all scans |
| Power Switch | Temporarily disables Jester without uninstalling |

---

## 🧠 AI Prompt Logic

Jester sends structured prompts to Gemini that include:

- The full page URL
- Extracted `<h1>/<h2>` headers and button text
- Whether a login form is present
- Whether a known brand name appears on a mismatched domain
- Scan mode (`light` for low-risk pages, `deep` for suspicious ones)

Gemini responds **only in JSON**:
```json
{ "status": "DANGER", "rating": 8, "reason": "Page mimics PayPal login but is hosted on a random domain." }
```

---

## 🌍 Supported Languages

The block page UI is automatically localized based on the user's browser language:

| Language | Code |
|----------|------|
| English | `en` |
| Azerbaijani | `az` |
| Russian | `ru` |
| Turkish | `tr` |

---

## 🛠️ Built With

- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Google Gemini 2.5 Flash](https://ai.google.dev/)
- [OpenPhish Public Feed](https://openphish.com/)
- Vanilla JS — no build tools, no dependencies

---

## 📸 Screenshots

> Block page, popup UI, and quarantine mode screenshots coming soon.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT © [jamallyemin](https://github.com/jamallyemin)

---

<p align="center">
  <sub>Built with 🃏 by jamallyemin</sub>
</p>
