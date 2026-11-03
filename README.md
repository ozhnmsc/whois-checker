# Domain Date Checker

Paste a list of domains and see each domain's registration date, expiry date, days left and registrar.

**Live:** https://whois-checker-production.up.railway.app

## Features

- **Bulk lookup:** up to 50 domains per check (one per line, or separated by commas/spaces).
  Duplicates are removed, and URLs such as `https://www.example.com/page` are cleaned up automatically.
- **RDAP with WHOIS fallback:** lookups use RDAP, the structured successor to WHOIS, with the
  registry's server found through IANA's public list. For extensions without RDAP, such as `.tr`
  (TRABİS), the app falls back to classic WHOIS on port 43.
- **Query timestamp (audit trail):** every result records when the registry was actually queried.
  Lookups are cached for up to an hour, and cached results keep their original time.
- **Excel and CSV export:** buttons under the results table.
  - Excel: real date and number cells, headers in the current language, filters on the header row,
    query time in local time with the UTC offset in the header.
  - CSV: English headers, query time in UTC (ISO 8601), easy to load into other tools.
- **English / Turkish:** EN | TR switch. Defaults to Turkish when the browser language is Turkish,
  and remembers the visitor's choice.
- **Light / dark mode:** ☀ | ☾ switch. Follows the system setting until the visitor picks one,
  then remembers it.
- **Sortable table:** click any column header to sort; click again to reverse.
- An "About the data" note on the page explains where the data comes from.

## Run locally

```bash
npm run dev
```

Open http://localhost:3000. To use another port: `PORT=4000 npm run dev`.
The server restarts by itself when files in `api/` change, and changes to `index.html` show up on a
normal browser refresh. It only accepts connections from this computer.
No `npm install` is needed: the project has no dependencies.

## Deploy to Railway

The project is connected to Railway, so every push to `main` deploys automatically.

To deploy a fresh copy:
1. On railway.com, choose **New Project → Deploy from GitHub repo** and pick this repository.
2. Railway runs `npm start` (the Node server in `server.js`, listening on Railway's `PORT`).
3. Open the service → **Settings → Networking → Generate Domain** to get a public URL.

## Files

- `index.html`: the page you use (all UI, translations and exports)
- `api/whois.js`: lookup handler, `GET /api/whois?domain=example.com`
- `server.js`: Node server that serves the page and the API (`npm run dev` locally, `npm start` on Railway)

### API response

```json
{
  "domain": "example.com",
  "registered": true,
  "created": "1995-08-14T04:00:00Z",
  "updated": "2026-08-14T08:01:43Z",
  "expires": "2027-08-13T04:00:00Z",
  "registrar": "RESERVED-Internet Assigned Numbers Authority",
  "status": ["client delete prohibited"],
  "nameservers": ["elliott.ns.cloudflare.com"],
  "source": "RDAP",
  "queriedAt": "2026-10-09T08:27:08.434Z"
}
```

Unregistered domains return `"registered": false`. Failed lookups return an `error` message.
WHOIS results also include the first 4,000 characters of the raw response in `raw`.

## Settings

- **Domain limit:** `MAX_DOMAINS` in `index.html` (default 50).
- **Cache time:** `CACHE_MS` in `api/whois.js` (default one hour). The cache is in memory, so it
  empties when the server restarts or redeploys.

## Optional: restrict access

Anyone with the URL can use the app. Railway has no built-in password protection, so to limit
access you would need to add a login check to `server.js` (for example HTTP basic auth with the
password stored in a Railway variable).
