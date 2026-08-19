#!/usr/bin/env node
// Verifies the three places that enumerate "which servers this suite ships"
// agree with each other:
//   1. README.md's "The Suite" table (the human-facing source of truth)
//   2. tests/check-packages.js's NPM_PACKAGES / PYPI_PACKAGES (the registry
//      existence check)
//   3. setup.sh's npm install loop (the one-shot installer)
//
// These three lists are maintained by hand in three different file formats.
// Each one looks correct read in isolation — the bug only shows up when you
// check that they actually agree. A server added to the README table with no
// matching entry in check-packages.js silently stops being verified; a
// server missing from setup.sh's install loop silently stops being
// installed. Exit 0 = all three agree. Exit 1 = drift detected.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const README_PATH = path.join(ROOT, "README.md");
const CHECK_PACKAGES_PATH = path.join(ROOT, "tests", "check-packages.js");
const SETUP_SH_PATH = path.join(ROOT, "setup.sh");

// Hand-picked anchor: the exact suite as of this task's spec. If this list
// itself needs to change, that's a deliberate suite change, not drift.
const EXPECTED_NPM_PACKAGES = [
  "mcp-google-ads",
  "mcp-bing-ads",
  "mcp-linkedin-ads",
  "mcp-reddit-ads",
  "mcp-ga4",
  "mcp-google-gsc",
  "mcp-gtm-ga4",
];
const EXPECTED_PYPI_PACKAGES = ["meta-ads-mcp"];

function readmeInstallCommands(readme) {
  const npm = [...readme.matchAll(/`npm install (mcp-[a-z0-9-]+)`/g)].map((m) => m[1]);
  const pip = [...readme.matchAll(/`pip install ([a-z0-9-]+)`/g)].map((m) => m[1]);
  return { npm, pip };
}

function checkPackagesArray(source, varName) {
  const re = new RegExp(`const ${varName} = \\[([^\\]]*)\\]`, "s");
  const match = source.match(re);
  if (!match) throw new Error(`Could not find ${varName} in check-packages.js`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function setupShNpmPackages(source) {
  const match = source.match(/for pkg in ([a-z0-9 -]+); do/);
  if (!match) throw new Error("Could not find npm install loop in setup.sh");
  return match[1].trim().split(/\s+/);
}

function sorted(arr) {
  return [...arr].sort();
}

let failures = 0;
function assertSameMembers(label, actual, expected) {
  const a = sorted(actual);
  const e = sorted(expected);
  const ok = a.length === e.length && a.every((v, i) => v === e[i]);
  if (ok) {
    console.log(`  ✓  ${label}`);
  } else {
    console.log(`  ✗  ${label}`);
    console.log(`       expected: ${JSON.stringify(e)}`);
    console.log(`       actual:   ${JSON.stringify(a)}`);
    failures++;
  }
}

const readme = fs.readFileSync(README_PATH, "utf8");
const checkPackagesSrc = fs.readFileSync(CHECK_PACKAGES_PATH, "utf8");
const setupShSrc = fs.readFileSync(SETUP_SH_PATH, "utf8");

const { npm: readmeNpm, pip: readmePip } = readmeInstallCommands(readme);
const scriptNpm = checkPackagesArray(checkPackagesSrc, "NPM_PACKAGES");
const scriptPypi = checkPackagesArray(checkPackagesSrc, "PYPI_PACKAGES");
const setupNpm = setupShNpmPackages(setupShSrc);

console.log("");
console.log("Suite manifest sync (README ↔ check-packages.js ↔ setup.sh)");
console.log("─".repeat(60));

// Anchors: README itself must list exactly the expected suite.
assertSameMembers("README table lists the expected 7 npm packages", readmeNpm, EXPECTED_NPM_PACKAGES);
assertSameMembers("README table lists the expected PyPI package", readmePip, EXPECTED_PYPI_PACKAGES);

// Joins: the two mirrors must agree with the README, not just look plausible on their own.
assertSameMembers("check-packages.js NPM_PACKAGES matches README", scriptNpm, readmeNpm);
assertSameMembers("check-packages.js PYPI_PACKAGES matches README", scriptPypi, readmePip);
assertSameMembers("setup.sh install loop matches README's npm packages", setupNpm, readmeNpm);

console.log("");
if (failures > 0) {
  console.error(`${failures} manifest mismatch(es) found.`);
  process.exit(1);
} else {
  console.log("All manifests agree.");
}
