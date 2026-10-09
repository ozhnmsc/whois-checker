# Domain Date Checker

Paste a list of domains and see each domain's registration date, expiry date, days left and registrar. Results can be exported to CSV.

Lookups use RDAP, the structured successor to WHOIS. For TLDs without RDAP (such as some country-code domains), the app falls back to classic WHOIS on port 43.

## Deploy to Vercel

**Option A: Vercel website (no command line)**
1. Push this folder to a new GitHub repository.
2. On vercel.com, choose **Add New → Project** and import the repository.
3. Leave all settings at their defaults (Framework Preset: Other) and click **Deploy**.

**Option B: Vercel CLI**
```bash
npm i -g vercel
cd whois-checker
vercel          # first deploy (preview)
vercel --prod   # production URL
```

## Files
- `index.html`: the page you use
- `api/whois.js`: serverless function, `GET /api/whois?domain=example.com`

## Optional: restrict access
Anyone with the URL can use the app. To limit access, turn on
**Settings → Deployment Protection** in your Vercel project.
