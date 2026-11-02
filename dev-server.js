// Local development server (npm run dev). A small stand-in for Vercel:
// serves index.html and runs the handlers in api/ with Vercel-style req.query,
// res.status() and res.json(). Not used in production.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = import.meta.dirname;
const port = Number(process.env.PORT || 3000);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.slice(5).replace(/[^\w-]/g, "");
      const mod = await import(pathToFileURL(path.join(root, "api", `${name}.js`)).href);
      req.query = Object.fromEntries(url.searchParams);
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); return res; };
      return await mod.default(req, res);
    }
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const full = path.join(root, file);
    if (!full.startsWith(root + path.sep) || file.split("/").some((p) => p.startsWith("."))) throw Object.assign(new Error(), { code: "ENOENT" });
    const body = await fs.readFile(full);
    res.setHeader("Content-Type", file.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream");
    res.end(body);
  } catch (e) {
    const notFound = e.code === "ENOENT" || e.code === "ERR_MODULE_NOT_FOUND";
    res.statusCode = notFound ? 404 : 500;
    res.end(notFound ? "Not found" : String(e));
  }
}).listen(port, "localhost", () => console.log(`Whois Checker running at http://localhost:${port}`));
