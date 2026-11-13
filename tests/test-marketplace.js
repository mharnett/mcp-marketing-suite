#!/usr/bin/env node
// Verifies .claude-plugin/marketplace.json: one plugin per npm server, each
// plugin directory carries an .mcp.json that launches the right package via
// npx, and every environment variable setup.sh documents for that server is
// passed through. Exit 0 = consistent. Exit 1 = drift.
//
// Offline and read-only: reads local files only.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MARKETPLACE = path.join(ROOT, ".claude-plugin", "marketplace.json");
const SETUP_SH = fs.readFileSync(path.join(ROOT, "setup.sh"), "utf8");

// plugin name -> npm package. The Python Meta server is not here: it has no
// npx launcher, so it is not offered as a plugin.
const EXPECTED = {
  "google-ads": "mcp-google-ads",
  "bing-ads": "mcp-bing-ads",
  "linkedin-ads": "mcp-linkedin-ads",
  "reddit-ads": "mcp-reddit-ads",
  ga4: "mcp-ga4",
  gsc: "mcp-google-gsc",
  "gtm-ga4": "mcp-gtm-ga4",
};

const failures = [];
const fail = (m) => failures.push(m);

// env var names setup.sh documents for a server key such as "google-ads"
function setupEnvKeys(serverKey) {
  const re = new RegExp(`"${serverKey}": \\{[\\s\\S]*?"env": \\{([\\s\\S]*?)\\}`);
  const m = SETUP_SH.match(re);
  if (!m) return null;
  return [...m[1].matchAll(/"([A-Z0-9_]+)":/g)].map((x) => x[1]).sort();
}

if (!fs.existsSync(MARKETPLACE)) {
  fail(`missing ${path.relative(ROOT, MARKETPLACE)}`);
} else {
  let mk;
  try {
    mk = JSON.parse(fs.readFileSync(MARKETPLACE, "utf8"));
  } catch (e) {
    fail(`marketplace.json is not valid JSON: ${e.message}`);
  }
  if (mk) {
    if (!mk.name) fail("marketplace.json: missing name");
    if (!mk.owner || !mk.owner.name) fail("marketplace.json: missing owner.name");
    if (!Array.isArray(mk.plugins)) fail("marketplace.json: plugins is not an array");
    const plugins = Array.isArray(mk.plugins) ? mk.plugins : [];
    const names = plugins.map((p) => p.name).sort();
    const want = Object.keys(EXPECTED).sort();
    if (JSON.stringify(names) !== JSON.stringify(want)) {
      fail(`plugin set differs: got [${names}] want [${want}]`);
    }
    for (const p of plugins) {
      if (!p.description) fail(`${p.name}: missing description`);
      if (typeof p.source !== "string" || !p.source.startsWith("./") || p.source.includes("..")) {
        fail(`${p.name}: source must be a relative ./ path, got ${JSON.stringify(p.source)}`);
        continue;
      }
      const dir = path.join(ROOT, p.source);
      const mcpPath = path.join(dir, ".mcp.json");
      if (!fs.existsSync(mcpPath)) {
        fail(`${p.name}: ${p.source}/.mcp.json missing`);
        continue;
      }
      const mcp = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
      const servers = mcp.mcpServers || mcp;
      const entries = Object.entries(servers);
      if (entries.length !== 1) {
        fail(`${p.name}: expected exactly one server, got ${entries.length}`);
        continue;
      }
      const [, srv] = entries[0];
      const pkg = EXPECTED[p.name];
      if (srv.command !== "npx" || JSON.stringify(srv.args) !== JSON.stringify(["-y", pkg])) {
        fail(`${p.name}: must launch \`npx -y ${pkg}\`, got ${srv.command} ${JSON.stringify(srv.args)}`);
      }
      const keys = Object.keys(srv.env || {}).sort();
      const documented = setupEnvKeys(p.name);
      if (!documented) fail(`${p.name}: setup.sh documents no env block`);
      else if (JSON.stringify(keys) !== JSON.stringify(documented)) {
        fail(`${p.name}: env [${keys}] != setup.sh [${documented}]`);
      }
      for (const [k, v] of Object.entries(srv.env || {})) {
        if (v !== `\${${k}}`) fail(`${p.name}: ${k} must be "\${${k}}" so no secret is stored in the file`);
      }
    }
  }
}

if (failures.length) {
  console.error("marketplace check FAILED:\n  - " + failures.join("\n  - "));
  process.exit(1);
}
console.log(`marketplace check passed (${Object.keys(EXPECTED).length} plugins)`);
