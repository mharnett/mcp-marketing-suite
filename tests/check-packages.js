#!/usr/bin/env node
// Verifies all suite packages are published and reachable on their registries.
// Exit 0 = all present. Exit 1 = one or more missing or unreachable.

const https = require("https");

const NPM_PACKAGES = [
  "mcp-google-ads",
  "mcp-bing-ads",
  "mcp-linkedin-ads",
  "mcp-ga4",
  "mcp-google-gsc",
];

const PYPI_PACKAGES = ["meta-ads-mcp"];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "mcp-marketing-suite-tests/1.0" } }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      })
      .on("error", reject);
  });
}

async function checkNpm(pkg) {
  const url = `https://registry.npmjs.org/${pkg}/latest`;
  const { status, body } = await fetch(url);
  if (status !== 200) return { pkg, registry: "npm", ok: false, detail: `HTTP ${status}` };
  const { version } = JSON.parse(body);
  return { pkg, registry: "npm", ok: true, version };
}

async function checkPypi(pkg) {
  const url = `https://pypi.org/pypi/${pkg}/json`;
  const { status, body } = await fetch(url);
  if (status !== 200) return { pkg, registry: "pypi", ok: false, detail: `HTTP ${status}` };
  const { info } = JSON.parse(body);
  return { pkg, registry: "pypi", ok: true, version: info.version };
}

async function main() {
  const checks = [
    ...NPM_PACKAGES.map(checkNpm),
    ...PYPI_PACKAGES.map(checkPypi),
  ];

  const results = await Promise.all(checks);

  let failures = 0;
  for (const r of results) {
    if (r.ok) {
      console.log(`  ✓  ${r.registry.padEnd(4)}  ${r.pkg}@${r.version}`);
    } else {
      console.log(`  ✗  ${r.registry.padEnd(4)}  ${r.pkg}  — ${r.detail}`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} package(s) failed registry check.`);
    process.exit(1);
  } else {
    console.log(`\nAll ${results.length} packages verified.`);
  }
}

main().catch((err) => {
  console.error("Registry check error:", err.message);
  process.exit(1);
});
