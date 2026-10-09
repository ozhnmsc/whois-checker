// Vercel serverless function: GET /api/whois?domain=example.com
// Tries RDAP first (structured JSON), then falls back to classic WHOIS on port 43
// for TLDs without RDAP (e.g. some ccTLDs like .tr).
import net from "node:net";

let bootstrapCache = null;

async function getRdapServer(tld) {
  if (!bootstrapCache) {
    const r = await fetch("https://data.iana.org/rdap/dns.json");
    bootstrapCache = await r.json();
  }
  for (const [tlds, urls] of bootstrapCache.services) {
    if (tlds.includes(tld)) return urls[0].replace(/\/?$/, "/");
  }
  return null;
}

function vcardName(entity) {
  const arr = entity?.vcardArray?.[1] || [];
  const fn = arr.find((x) => x[0] === "fn");
  return fn ? fn[3] : null;
}

async function viaRdap(domain) {
  const tld = domain.split(".").pop();
  const server = await getRdapServer(tld);
  if (!server) return null;

  const r = await fetch(`${server}domain/${domain}`, {
    headers: { accept: "application/rdap+json" },
  });
  if (r.status === 404) return { domain, registered: false, source: "RDAP" };
  if (!r.ok) throw new Error(`RDAP HTTP ${r.status}`);
  const d = await r.json();

  const ev = (name) => d.events?.find((e) => e.eventAction === name)?.eventDate || null;
  const registrar = d.entities?.find((e) => e.roles?.includes("registrar"));

  return {
    domain,
    registered: true,
    created: ev("registration"),
    updated: ev("last changed"),
    expires: ev("expiration"),
    registrar: vcardName(registrar),
    status: d.status || [],
    nameservers: (d.nameservers || []).map((n) => n.ldhName?.toLowerCase()),
    source: "RDAP",
  };
}

function whoisQuery(server, query, timeout = 8000) {
  return new Promise((resolve, reject) => {
    let data = "";
    const sock = net.connect(43, server, () => sock.write(query + "\r\n"));
    sock.setTimeout(timeout, () => { sock.destroy(); reject(new Error("WHOIS timeout")); });
    sock.on("data", (c) => (data += c.toString("utf8")));
    sock.on("end", () => resolve(data));
    sock.on("error", reject);
  });
}

// Patterns use [ \t]* (not \s*) after the colon so an empty "Label:" line
// never captures the following line. "\.*" allows dot leaders like
// "Created on..............: 2001-Aug-23." (.tr).
function pick(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

// Convert registry date strings to ISO so every browser can parse them.
// Returns the original string if it can't be parsed.
function toIso(s) {
  if (!s) return null;
  const clean = s.replace(/\s*\(.*\)$/, "").replace(/\.$/, "").trim();
  const m = clean.match(/^(\d{4})-([a-z]{3})-(\d{1,2})$/i); // 2001-Aug-23
  const d = m && MONTHS[m[2].toLowerCase()] !== undefined
    ? new Date(Date.UTC(+m[1], MONTHS[m[2].toLowerCase()], +m[3]))
    : new Date(clean);
  return isNaN(d) ? s : d.toISOString();
}

async function viaWhois(domain) {
  const tld = domain.split(".").pop();
  const iana = await whoisQuery("whois.iana.org", tld);
  const server = pick(iana, [/^whois:[ \t]*(\S+)/im]);
  if (!server) throw new Error("No WHOIS server for this TLD");

  const raw = await whoisQuery(server, domain);
  const notFound = /no match|not found|no data found|no entries found|status:\s*free|available/i.test(raw);
  const created = pick(raw, [
    /Creation Date\.*:[ \t]*(.+)/i, /Created On\.*:[ \t]*(.+)/i, /Created\.*:[ \t]*(.+)/i,
    /Registered on\.*:[ \t]*(.+)/i, /Registration Time\.*:[ \t]*(.+)/i, /registered\.*:[ \t]*(.+)/i,
  ]);
  if (notFound && !created) return { domain, registered: false, source: `WHOIS (${server})` };

  return {
    domain,
    registered: true,
    created: toIso(created),
    updated: toIso(pick(raw, [
      /Updated Date\.*:[ \t]*(.+)/i, /Last Updated\.*:[ \t]*(.+)/i, /changed\.*:[ \t]*(.+)/i,
    ])),
    expires: toIso(pick(raw, [
      /Registry Expiry Date\.*:[ \t]*(.+)/i, /Expiration Date\.*:[ \t]*(.+)/i, /Expires On\.*:[ \t]*(.+)/i,
      /Expires\.*:[ \t]*(.+)/i, /Expiry date\.*:[ \t]*(.+)/i, /paid-till\.*:[ \t]*(.+)/i,
    ])),
    registrar: pick(raw, [/Registrar\.*:[ \t]*(.+)/i, /Organization Name[ \t]*:[ \t]*(.+)/i]),
    status: [],
    nameservers: [],
    source: `WHOIS (${server})`,
    raw: raw.slice(0, 4000),
  };
}

function normalize(input) {
  let d = String(input || "").trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : null;
}

export default async function handler(req, res) {
  const domain = normalize(req.query.domain);
  if (!domain) return res.status(400).json({ error: "Invalid domain" });

  try {
    let result = null;
    try { result = await viaRdap(domain); } catch { /* fall through */ }
    if (!result) result = await viaWhois(domain);
    res.setHeader("Cache-Control", "s-maxage=3600");
    return res.status(200).json(result);
  } catch (e) {
    return res.status(200).json({ domain, error: e.message });
  }
}
