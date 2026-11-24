// Tests for scripts/server-table.js, the README server-table generator.
//
// Offline: every fetch is a fake passed in by the test, and the last group
// reads only files committed to this repo. Run: node --test tests/

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  parseTsToolNames,
  renderBlocks,
  replaceBlocks,
  checkReadme,
  fetchToolLists,
  diffToolLists,
} = require("../scripts/server-table.js");

const ROOT = path.join(__dirname, "..");

// --- parseTsToolNames -------------------------------------------------------

const MULTI_LINE = `import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tools: Tool[] = [
  {
    name: "alpha_list",
    description: "Returns { rows, truncated: true } when cut. Use [brackets] freely.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "a property called name" },
        items: { type: "array", items: { name: "not_a_tool", type: "string" } },
      },
    },
  },
  // a comment with a brace { and name: "commented_out"
  {
    name: 'beta_get',
    description: 'single quotes with an escaped \\' quote and a } brace',
    inputSchema: { type: "object", properties: {} },
  },
  /* block comment { name: "also_commented" } */
  {
    description: \`template \${"with { braces }"} literal\`,
    name: "gamma_update",
    inputSchema: { type: "object", properties: {} },
  },
];
`;

const SINGLE_LINE = `export const tools: Tool[] = [
  { name: "one_tool", description: "x", inputSchema: { type: "object", properties: { name: { type: "string" } } } },
  { name: "two_tool", description: "y", inputSchema: { type: "object", properties: {} } },
];`;

test("parseTsToolNames reads multi-line tool objects and ignores nested names, strings and comments", () => {
  assert.deepEqual(parseTsToolNames(MULTI_LINE), ["alpha_list", "beta_get", "gamma_update"]);
});

test("parseTsToolNames reads one-line tool objects", () => {
  assert.deepEqual(parseTsToolNames(SINGLE_LINE), ["one_tool", "two_tool"]);
});

test("parseTsToolNames refuses a spread it cannot count", () => {
  const src = `export const tools: Tool[] = [\n  { name: "a" },\n  ...moreTools,\n];`;
  assert.throws(() => parseTsToolNames(src), /spread/);
});

test("parseTsToolNames refuses an element that is not an object literal", () => {
  const src = `export const tools: Tool[] = [\n  { name: "a" },\n  otherTool,\n];`;
  assert.throws(() => parseTsToolNames(src), /object literal/);
});

test("parseTsToolNames refuses a tool object without a name", () => {
  const src = `export const tools = [\n  { description: "nameless" },\n];`;
  assert.throws(() => parseTsToolNames(src), /no name/);
});

test("parseTsToolNames refuses a duplicate tool name", () => {
  const src = `export const tools = [{ name: "a" }, { name: "a" }];`;
  assert.throws(() => parseTsToolNames(src), /duplicate/);
});

test("parseTsToolNames refuses a file with no tools array", () => {
  assert.throws(() => parseTsToolNames(`export const other = [];`), /tools/);
});

// --- rendering and checking --------------------------------------------------

const SERVERS = {
  tokensPerTool: 400,
  servers: [
    {
      package: "mcp-alpha",
      registry: "npm",
      platform: "Alpha Ads",
      repo: "owner/mcp-alpha",
      tools: { path: "src/tools.ts" },
      setup: "docs/alpha.md",
      summary: "Alpha summary.",
    },
    {
      package: "mcp-beta",
      registry: "npm",
      platform: "Beta Analytics",
      repo: "owner/mcp-beta-repo",
      tools: { path: "src/tools.ts" },
      summary: "Beta summary.",
    },
    {
      package: "third-party-mcp",
      registry: "pypi",
      platform: "Gamma",
      repo: "someone/third-party-mcp",
      tools: null,
      notCountedReason: "third-party; its tool set depends on its own flags",
      summary: "Gamma summary.",
    },
  ],
  profiles: [
    { name: "Alpha only", servers: ["mcp-alpha"] },
    { name: "Alpha and Gamma", servers: ["mcp-alpha", "third-party-mcp"] },
    { name: "Everything", servers: "all" },
  ],
};

function toolList(version, commit, n, prefix = "t") {
  return { version, commit, source: "src/tools.ts", tools: Array.from({ length: n }, (_, i) => `${prefix}_${String(i).padStart(3, "0")}`) };
}

const LISTS = {
  "mcp-alpha": toolList("1.2.0", "a".repeat(40), 87),
  "mcp-beta": toolList("0.3.1", "b".repeat(40), 4),
};

function readmeWith(blocks) {
  return replaceBlocks(
    [
      "# Title",
      "",
      "<!-- server-table:start -->",
      "old",
      "<!-- server-table:end -->",
      "",
      "<!-- server-profiles:start -->",
      "old",
      "<!-- server-profiles:end -->",
      "",
    ].join("\n"),
    blocks,
  );
}

test("renderBlocks puts each server's counted tools and context cost in its row", () => {
  const { "server-table": table } = renderBlocks(SERVERS, LISTS);
  const rows = table.split("\n").filter((l) => l.startsWith("| ["));
  assert.equal(rows.length, 3);
  assert.match(rows[0], /\[mcp-alpha\]\(https:\/\/github\.com\/owner\/mcp-alpha\)/);
  assert.match(rows[0], /\| \[87\]\(https:\/\/github\.com\/owner\/mcp-alpha\/blob\/a{40}\/src\/tools\.ts\) \|/);
  assert.match(rows[0], /\| ~35K tokens \|/); // 87 x 400 = 34,800
  assert.match(rows[0], /`npm install mcp-alpha`/);
  assert.match(rows[0], /\| 1\.2\.0 \|/);
  assert.match(rows[0], /\[setup\]\(docs\/alpha\.md\)/);
  assert.match(rows[1], /\| \[4\]\(https:\/\/github\.com\/owner\/mcp-beta-repo\/blob\/b{40}\/src\/tools\.ts\) \|/);
  assert.match(rows[1], /\| ~2K tokens \|/); // 4 x 400 = 1,600
  assert.match(rows[1], /\[README\]\(https:\/\/github\.com\/owner\/mcp-beta-repo#readme\)/);
  assert.match(rows[2], /`pip install third-party-mcp`/);
  assert.match(rows[2], /\| not counted \| — \|/);
  assert.match(table, /\*\*91 tools\*\* across the 2 first-party servers/);
  assert.match(table, /third-party-mcp is not counted: third-party; its tool set depends on its own flags\./);
});

test("renderBlocks sums each profile once and flags members it cannot count", () => {
  const { "server-profiles": profiles } = renderBlocks(SERVERS, LISTS);
  const rows = profiles.split("\n").filter((l) => /^\| [A-Z]/.test(l) && !l.startsWith("| Profile"));
  assert.equal(rows.length, 3);
  assert.match(rows[0], /^\| Alpha only \| mcp-alpha \| ~35K tokens \|$/);
  assert.match(rows[1], /^\| Alpha and Gamma \| mcp-alpha \+ third-party-mcp \| ~35K tokens \+ third-party-mcp \|$/);
  // 91 x 400 = 36,400: rounded once, not 35K + 2K
  assert.match(rows[2], /^\| Everything \| all 3 servers \| ~36K tokens \+ third-party-mcp \|$/);
});

test("checkReadme passes when the README blocks match the tool lists", () => {
  const readme = readmeWith(renderBlocks(SERVERS, LISTS));
  assert.deepEqual(checkReadme(readme, SERVERS, LISTS), []);
});

test("checkReadme fails when the table's tool count disagrees with the tool list", () => {
  // The bug this exists for: a hand table said google-ads had 34 tools.
  const readme = readmeWith(renderBlocks(SERVERS, LISTS)).replace(
    /\| \[87\]\(([^)]+)\) \|/,
    "| [34]($1) |",
  );
  const problems = checkReadme(readme, SERVERS, LISTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /server-table/);
});

test("checkReadme fails when a tool list changes and the README was not regenerated", () => {
  const readme = readmeWith(renderBlocks(SERVERS, LISTS));
  const grown = { ...LISTS, "mcp-beta": toolList("0.4.0", "c".repeat(40), 5) };
  const problems = checkReadme(readme, SERVERS, grown);
  assert.ok(problems.some((p) => /server-table/.test(p)), problems.join("\n"));
});

test("checkReadme fails when a counted server has no tool list, or a tool list has no server", () => {
  const readme = readmeWith(renderBlocks(SERVERS, LISTS));
  const missing = { "mcp-alpha": LISTS["mcp-alpha"], "mcp-stray": LISTS["mcp-beta"] };
  const problems = checkReadme(readme, SERVERS, missing);
  assert.ok(problems.some((p) => /mcp-beta.*no tool list/.test(p)), problems.join("\n"));
  assert.ok(problems.some((p) => /mcp-stray/.test(p)), problems.join("\n"));
});

test("checkReadme fails when a generated block's markers are missing", () => {
  const problems = checkReadme("# no markers here\n", SERVERS, LISTS);
  assert.ok(problems.some((p) => /server-table.*marker/.test(p)), problems.join("\n"));
});

test("replaceBlocks keeps everything outside the markers", () => {
  const readme = readmeWith(renderBlocks(SERVERS, LISTS));
  assert.ok(readme.startsWith("# Title\n\n<!-- server-table:start -->\n"));
  assert.ok(readme.endsWith("<!-- server-profiles:end -->\n"));
  assert.ok(!readme.includes("\nold\n"));
});

// --- fetching ----------------------------------------------------------------

function fakeFetchers(npm, files) {
  const calls = [];
  return {
    calls,
    fetchJson: async (url) => {
      calls.push(url);
      if (!(url in npm)) throw new Error(`unexpected json fetch ${url}`);
      return npm[url];
    },
    fetchText: async (url) => {
      calls.push(url);
      if (!(url in files)) throw new Error(`unexpected text fetch ${url}`);
      return files[url];
    },
  };
}

const NPM_OK = {
  "https://registry.npmjs.org/mcp-alpha/latest": {
    version: "1.2.0",
    gitHead: "a".repeat(40),
    repository: { url: "git+https://github.com/owner/mcp-alpha.git" },
  },
  "https://registry.npmjs.org/mcp-beta/latest": {
    version: "0.3.1",
    gitHead: "b".repeat(40),
    repository: { url: "git+https://github.com/owner/mcp-beta-repo.git" },
  },
};

const FILES_OK = {
  [`https://raw.githubusercontent.com/owner/mcp-alpha/${"a".repeat(40)}/src/tools.ts`]: SINGLE_LINE,
  [`https://raw.githubusercontent.com/owner/mcp-beta-repo/${"b".repeat(40)}/src/tools.ts`]: MULTI_LINE,
};

test("fetchToolLists reads each counted server's tools at its latest npm release commit", async () => {
  const f = fakeFetchers(NPM_OK, FILES_OK);
  const lists = await fetchToolLists(SERVERS, f);
  assert.deepEqual(Object.keys(lists), ["mcp-alpha", "mcp-beta"]);
  assert.deepEqual(lists["mcp-alpha"], {
    version: "1.2.0",
    commit: "a".repeat(40),
    source: "src/tools.ts",
    tools: ["one_tool", "two_tool"],
  });
  assert.deepEqual(lists["mcp-beta"].tools, ["alpha_list", "beta_get", "gamma_update"]);
  assert.ok(!f.calls.some((u) => u.includes("third-party-mcp")), "an uncounted server is never fetched");
});

test("fetchToolLists refuses a release with no gitHead to pin the source to", async () => {
  const npm = { ...NPM_OK, "https://registry.npmjs.org/mcp-beta/latest": { version: "0.3.1" } };
  await assert.rejects(fetchToolLists(SERVERS, fakeFetchers(npm, FILES_OK)), /mcp-beta.*gitHead/);
});

test("fetchToolLists refuses a package whose npm repository is not the mapped repo", async () => {
  const npm = {
    ...NPM_OK,
    "https://registry.npmjs.org/mcp-beta/latest": {
      ...NPM_OK["https://registry.npmjs.org/mcp-beta/latest"],
      repository: { url: "git+https://github.com/elsewhere/mcp-beta.git" },
    },
  };
  await assert.rejects(fetchToolLists(SERVERS, fakeFetchers(npm, FILES_OK)), /mcp-beta.*elsewhere\/mcp-beta/);
});

test("diffToolLists names the server and the tools that changed", () => {
  const next = {
    ...LISTS,
    "mcp-beta": { ...LISTS["mcp-beta"], version: "0.4.0", tools: [...LISTS["mcp-beta"].tools.slice(1), "t_new"] },
  };
  const diff = diffToolLists(LISTS, next);
  assert.equal(diff.length, 1);
  assert.match(diff[0], /mcp-beta 0\.3\.1 -> 0\.4\.0/);
  assert.match(diff[0], /\+t_new/);
  assert.match(diff[0], /-t_000/);
  assert.deepEqual(diffToolLists(LISTS, LISTS), []);
});

// --- the committed files -----------------------------------------------------

test("the committed README matches servers.json and tool-lists.json", () => {
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const servers = JSON.parse(fs.readFileSync(path.join(ROOT, "servers.json"), "utf8"));
  const lists = JSON.parse(fs.readFileSync(path.join(ROOT, "tool-lists.json"), "utf8"));
  assert.deepEqual(checkReadme(readme, servers, lists), [], "run: npm run table:update");
});

test("servers.json lists the same packages as the registry check", () => {
  const servers = JSON.parse(fs.readFileSync(path.join(ROOT, "servers.json"), "utf8"));
  const src = fs.readFileSync(path.join(ROOT, "tests", "check-packages.js"), "utf8");
  const arr = (name) => [...src.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`, "s"))[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
  const of = (registry) => servers.servers.filter((s) => s.registry === registry).map((s) => s.package).sort();
  assert.deepEqual(of("npm"), arr("NPM_PACKAGES"));
  assert.deepEqual(of("pypi"), arr("PYPI_PACKAGES"));
});
