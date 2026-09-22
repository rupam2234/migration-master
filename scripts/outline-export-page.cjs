const fs = require("node:fs");
const path = require("node:path");
const p = path.join("src", "app", "dashboard", "[projects]", "export", "[resources]", "page.tsx");
const raw = fs.readFileSync(p, "utf8");
const lines = raw.split(/\r?\n/);
console.log("total lines:", lines.length);
console.log("--- head ---");
lines.slice(0, 70).forEach((l, i) => console.log((i + 1) + ": " + l));
console.log("--- fn markers ---");
lines.forEach((l, i) => {
  if (/^(function|export |const .* =|  (const|async function|function) )/.test(l) && l.trim().length < 120)
    console.log((i + 1) + ": " + l.trim().slice(0, 110));
});
