# Domain Date Checker

Paste a list of domains and see each domain's registration date, expiry date, days left and registrar.

**Live:** https://whois-check.vercel.app

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

## Deploy to Vercel

The project is connected to Vercel, so every push to `main` deploys automatically.

To deploy a fresh copy:

**Option A: Vercel website (no command line)**
1. Push this folder to a GitHub repository.
2. On vercel.com, choose **Add New → Project** and import the repository.
3. Leave all settings at their defaults (Framework Preset: Other) and click **Deploy**.

**Option B: Vercel CLI**
```bash
npm i -g vercel
cd Whois-Checker
vercel          # first deploy (preview)
vercel --prod   # production URL
```

## Files

- `index.html`: the page you use (all UI, translations and exports)
- `api/whois.js`: serverless function, `GET /api/whois?domain=example.com`

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
- **Cache time:** the `Cache-Control: s-maxage=3600` header in `api/whois.js` (seconds).

## Optional: restrict access

Anyone with the URL can use the app. To limit access, turn on
**Settings → Deployment Protection** in your Vercel project.
