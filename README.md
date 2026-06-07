# Summora Chrome Extension

A Manifest V3 Chrome extension that saves the URL of the tab you're viewing to [Summora](https://github.com/kenshin579/summora) with one click.

## Features

- Click the toolbar icon to see the current tab's title and URL, then hit **Save** to register it with the Summora backend (`POST /api/articles`).
- URLs are normalized before saving — tracking params (`utm_*`, `si`, `fbclid`, `gclid`) are stripped, and YouTube links (`youtu.be`, `/shorts`, `/embed`, `music`/`m.youtube`) are converted to canonical `watch?v=` URLs.
- Non-`http`/`https` pages (e.g. `chrome://`) disable the save button.
- On success, an **Open in web app** link is shown.
- The backend base URL can be changed on the options page (stored in `chrome.storage.sync`).
- UI is localized (English / Korean) via Chrome's `chrome.i18n`, following the browser's UI language. English is the fallback (`default_locale`).

## Layout

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest (`activeTab`, `storage`, `default_locale: en`) |
| `popup.html` / `popup.js` | Popup UI · save action |
| `options.html` / `options.js` | Backend base URL settings |
| `src/url.js` | URL normalization / savable check |
| `src/api.js` | base URL load/save, `saveArticle` fetch (returns error codes) |
| `src/i18n.js` | `chrome.i18n` helpers (`t`, `applyI18n`) |
| `_locales/` | `en` / `ko` message catalogs |
| `icons/` | 16 / 48 / 128 icons |

The default backend is `https://summora.advenoh.pe.kr`; for local development, switch it to `http://localhost:8080` on the options page.

## Install (developer mode)

1. Open `chrome://extensions` → enable **Developer mode** (top right)
2. Click **Load unpacked** → select this repository folder
3. Use the Summora toolbar icon to save the current tab

> To save to a local backend, start the server with `make up` in the [`summora`](https://github.com/kenshin579/summora) repo, then set the base URL to `http://localhost:8080` in the extension options.

## Testing

```bash
npm install
npm test     # vitest (src/url.test.js, src/api.test.js, src/i18n.test.js)
```

## Related

- [`summora`](https://github.com/kenshin579/summora) — backend API + web app (summaries, tags, highlights)
