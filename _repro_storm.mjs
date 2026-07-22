import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { SignJWT } from "jose";
import "dotenv/config";

const LOG = "/tmp/claude-1000/-home-omar-xsingularity-client-progress-xsingularity/b0d02fbe-93a8-46ea-b514-3576bff38e0e/scratchpad/repro.step.log";
const step = (m) => { appendFileSync(LOG, m + "\n"); };
appendFileSync(LOG, "\n===== run " + new Date().toISOString() + " =====\n");
process.on("uncaughtException", (e) => { step("UNCAUGHT " + (e.stack || e)); process.exit(9); });
process.on("unhandledRejection", (e) => { step("UNHANDLED " + (e?.stack || e)); process.exit(9); });
step("secret set? " + !!process.env.SESSION_SECRET + " user? " + process.env.ADMIN_USERNAME);

const BASE = "http://localhost:3000";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
const username = process.env.ADMIN_USERNAME;

const token = await new SignJWT({ admin: true, username })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1d")
  .sign(secret);

// Chrome is launched separately (Bash background) on port 9231; we just connect.
step("connecting to existing chrome on 9231");

async function getJSON(path) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://localhost:9231${path}`);
      return await r.json();
    } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  throw new Error("chrome devtools not reachable");
}

step("chrome spawned, fetching targets");
const targets = await getJSON("/json/list");
step("targets: " + JSON.stringify(targets.map((t) => t.type)));
let page = targets.find((t) => t.type === "page");
step("page ws: " + (page && page.webSocketDebuggerUrl));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = (e) => rej(new Error("ws error")); });
step("ws open");

let id = 0;
const pending = new Map();
function send(method, params = {}) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((res) => pending.set(mid, res));
}

const requests = [];
const consoleMsgs = [];
const exceptions = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); return; }
  if (msg.method === "Network.requestWillBeSent") {
    const u = msg.params.request.url;
    requests.push({ url: u, t: Date.now() });
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    consoleMsgs.push(msg.params.type + ": " + (msg.params.args || []).map((a) => a.value ?? a.description ?? "").join(" "));
  }
  if (msg.method === "Log.entryAdded") {
    consoleMsgs.push("LOG " + msg.params.entry.level + ": " + msg.params.entry.text);
  }
  if (msg.method === "Runtime.exceptionThrown") {
    exceptions.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  }
};

await send("Network.enable");
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");

// Set admin cookie, load /admin, then HARD REFRESH (what the user does).
await send("Network.setCookie", {
  name: "admin_session", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax",
});
step("initial navigate /admin");
await send("Page.navigate", { url: `${BASE}/admin` });
await new Promise((r) => setTimeout(r, 6000));

// reset counters, then HARD RELOAD and observe
requests.length = 0;
consoleMsgs.length = 0;
exceptions.length = 0;
const start = Date.now();
step("HARD RELOAD /admin");
await send("Page.reload", { ignoreCache: true });

await new Promise((r) => setTimeout(r, 18000));

// tally
const byPath = {};
for (const r of requests) {
  const p = new URL(r.url).pathname + (r.url.includes("_rsc") ? " [rsc]" : "");
  byPath[p] = (byPath[p] || 0) + 1;
}
console.log("=== request counts over 12s ===");
for (const [p, n] of Object.entries(byPath).sort((a, b) => b[1] - a[1])) {
  console.log(String(n).padStart(4), p);
}
console.log("total requests:", requests.length);
console.log("\n=== timeline of /admin doc/rsc requests (first 50) ===");
requests.filter((r) => new URL(r.url).pathname === "/admin").slice(0, 50)
  .forEach((r) => console.log(`+${r.t - start}ms`, r.url));
console.log("\n=== console (last 25) ===");
consoleMsgs.slice(-25).forEach((m) => console.log(m));
console.log("\n=== exceptions ===");
exceptions.forEach((e) => console.log(e));

process.exit(0);
