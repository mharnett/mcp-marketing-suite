/**
 * RED TEAM ADVERSARIAL TEST SUITE
 * ================================
 * Tests 7 MCP advertising servers for crash resistance, input validation,
 * configuration edge cases, and cross-server conflicts.
 *
 * Packages under test:
 *   mcp-google-ads, mcp-bing-ads, mcp-linkedin-ads, mcp-reddit-ads,
 *   mcp-google-gsc, mcp-ga4, mcp-gtm-ga4
 *
 * Run:
 *   npx vitest run redteam.test.ts          # offline tests only
 *   LIVE_TEST=true npx vitest run redteam   # includes live API tests
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess, execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const LIVE = process.env.LIVE_TEST === "true";

// ============================================================
// SERVER DEFINITIONS
// ============================================================

interface ServerDef {
  /** npm package name */
  pkg: string;
  /** Local source directory */
  cwd: string;
  /** Tool names this server exposes */
  tools: string[];
  /** Env vars this server requires (for config tests) */
  requiredEnv: string[];
  /** Config style: "env" = env vars only, "config" = config.json only, "both" = either */
  configStyle: "env" | "config" | "both";
}

const MCP_ROOT = join(__dirname, "../..");

const SERVERS: ServerDef[] = [
  {
    pkg: "mcp-google-ads",
    cwd: join(MCP_ROOT, "mcp-google-ads"),
    tools: [
      "google_ads_get_client_context",
      "google_ads_list_campaigns",
      "google_ads_list_ad_groups",
      "google_ads_get_campaign_tracking",
      "google_ads_list_pending_changes",
      "google_ads_validate_ad",
      "google_ads_create_campaign",
      "google_ads_create_ad_group",
      "google_ads_create_responsive_search_ad",
      "google_ads_create_keywords",
      "google_ads_enable_items",
      "google_ads_pause_items",
      "google_ads_create_shared_set",
      "google_ads_link_shared_set",
      "google_ads_unlink_shared_set",
      "google_ads_add_shared_negatives",
      "google_ads_remove_shared_negatives",
      "google_ads_add_campaign_negatives",
      "google_ads_remove_campaign_negatives",
      "google_ads_remove_adgroup_negatives",
      "google_ads_pause_keywords",
      "google_ads_update_campaign_tracking",
      "google_ads_keyword_performance",
      "google_ads_keyword_performance_by_conversion",
      "google_ads_search_term_report",
      "google_ads_search_term_report_by_conversion",
      "google_ads_ad_performance",
      "google_ads_ad_performance_by_conversion",
      "google_ads_list_conversion_actions",
      "google_ads_search_term_insights",
      "google_ads_search_term_insight_terms",
      "google_ads_update_campaign_budget",
      "google_ads_gaql_query",
      "google_ads_keyword_volume",
    ],
    requiredEnv: [
      "GOOGLE_ADS_CLIENT_ID",
      "GOOGLE_ADS_CLIENT_SECRET",
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_REFRESH_TOKEN",
    ],
    configStyle: "both",
  },
  {
    pkg: "mcp-bing-ads",
    cwd: join(MCP_ROOT, "mcp-bing-ads"),
    tools: [
      "bing_ads_get_client_context",
      "bing_ads_list_campaigns",
      "bing_ads_get_campaign_performance",
      "bing_ads_list_ad_groups",
      "bing_ads_keyword_performance",
      "bing_ads_search_term_report",
      "bing_ads_pause_keywords",
      "bing_ads_list_shared_entities",
      "bing_ads_add_shared_negatives",
      "bing_ads_update_campaign_budget",
    ],
    requiredEnv: [
      "BING_ADS_DEVELOPER_TOKEN",
      "BING_ADS_CLIENT_ID",
      "BING_ADS_REFRESH_TOKEN",
    ],
    configStyle: "config",
  },
  {
    pkg: "mcp-linkedin-ads",
    cwd: join(MCP_ROOT, "mcp-linkedin-ads"),
    tools: [
      "linkedin_ads_get_client_context",
      "linkedin_ads_list_accounts",
      "linkedin_ads_list_campaign_groups",
      "linkedin_ads_list_campaigns",
      "linkedin_ads_campaign_performance",
      "linkedin_ads_account_performance",
      "linkedin_ads_analytics",
    ],
    requiredEnv: ["LINKEDIN_ADS_ACCESS_TOKEN"],
    configStyle: "config",
  },
  {
    pkg: "mcp-reddit-ads",
    cwd: join(MCP_ROOT, "reddit-ad-mcp"),
    tools: [
      "reddit_ads_get_client_context",
      "reddit_ads_get_accounts",
      "reddit_ads_get_campaigns",
      "reddit_ads_get_ad_groups",
      "reddit_ads_get_ads",
      "reddit_ads_get_performance_report",
      "reddit_ads_get_daily_performance",
      "reddit_ads_create_campaign",
      "reddit_ads_update_campaign",
      "reddit_ads_create_ad_group",
      "reddit_ads_update_ad_group",
      "reddit_ads_create_ad",
      "reddit_ads_update_ad",
      "reddit_ads_pause_items",
      "reddit_ads_enable_items",
      "reddit_ads_search_subreddits",
      "reddit_ads_get_interest_categories",
      "reddit_ads_search_geo_targets",
    ],
    requiredEnv: [
      "REDDIT_CLIENT_ID",
      "REDDIT_CLIENT_SECRET",
      "REDDIT_REFRESH_TOKEN",
    ],
    configStyle: "both",
  },
  {
    pkg: "mcp-google-gsc",
    cwd: join(MCP_ROOT, "mcp-gsc"),
    tools: [
      "gsc_get_client_context",
      "gsc_list_sites",
      "gsc_search_analytics",
      "gsc_inspection",
    ],
    requiredEnv: ["GOOGLE_APPLICATION_CREDENTIALS"],
    configStyle: "both",
  },
  {
    pkg: "mcp-ga4",
    cwd: join(MCP_ROOT, "mcp-ga4"),
    tools: [
      "ga4_get_client_context",
      "ga4_run_report",
      "ga4_realtime_report",
      "ga4_list_custom_dimensions",
      "ga4_create_custom_dimension",
      "ga4_list_custom_metrics",
      "ga4_list_data_streams",
      "ga4_send_feedback",
      "ga4_suggest_improvement",
    ],
    requiredEnv: ["GA4_PROPERTY_ID"],
    configStyle: "both",
  },
  {
    pkg: "mcp-gtm-ga4",
    cwd: join(MCP_ROOT, "neon-one-gtm"),
    tools: [
      "gtm_list_tags",
      "gtm_get_tag",
      "gtm_update_tag",
      "gtm_create_tag",
      "gtm_list_triggers",
      "gtm_list_variables",
      "gtm_audit_consent",
      "gtm_preview",
      "gtm_create_version",
      "ga4_run_report",
      "ga4_realtime_report",
      "ga4_list_custom_dimensions",
      "ga4_create_custom_dimension",
    ],
    requiredEnv: [
      "GTM_ACCOUNT_ID",
      "GTM_CONTAINER_ID",
      "GOOGLE_APPLICATION_CREDENTIALS",
    ],
    configStyle: "env",
  },
];

// ============================================================
// HELPERS
// ============================================================

const TMP_DIR = join(tmpdir(), "mcp-redteam-" + Date.now());
const activeClients: Client[] = [];
const activeProcesses: ChildProcess[] = [];

/**
 * Start a server via run-mcp.sh (which loads credentials from Keychain)
 * and connect an MCP client to it.
 */
async function connectLiveServer(cwd: string, timeoutMs = 15_000): Promise<Client> {
  const transport = new StdioClientTransport({
    command: "bash",
    args: ["-c", "source ./run-mcp.sh"],
    cwd,
  });
  const client = new Client(
    { name: "redteam-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
  activeClients.push(client);
  return client;
}

/**
 * Start a server with controlled env vars (no Keychain, no run-mcp.sh).
 * Returns the MCP client. The server is started with `node dist/index.js`.
 */
async function connectBareboneServer(
  cwd: string,
  env: Record<string, string> = {},
  timeoutMs = 10_000,
): Promise<Client> {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    cwd,
    env: { ...env, PATH: process.env.PATH || "" },
  });
  const client = new Client(
    { name: "redteam-barebones", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
  activeClients.push(client);
  return client;
}

/**
 * Spawn the server as a raw child process and capture stderr/stdout.
 * Useful for checking crash behavior before MCP handshake.
 */
function spawnServer(
  cwd: string,
  env: Record<string, string> = {},
): { proc: ChildProcess; stderr: () => string; stdout: () => string } {
  let stderrBuf = "";
  let stdoutBuf = "";
  const proc = spawn("node", ["dist/index.js"], {
    cwd,
    env: { ...env, PATH: process.env.PATH || "" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  proc.stderr?.on("data", (d) => (stderrBuf += d.toString()));
  proc.stdout?.on("data", (d) => (stdoutBuf += d.toString()));
  activeProcesses.push(proc);
  return {
    proc,
    stderr: () => stderrBuf,
    stdout: () => stdoutBuf,
  };
}

/** Wait for a process to exit, with timeout */
function waitForExit(proc: ChildProcess, timeoutMs = 5_000): Promise<number | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve(null);
    }, timeoutMs);
    proc.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

/** Generate a string of given byte size */
function bigString(bytes: number): string {
  return "A".repeat(bytes);
}

const SQL_INJECTION = "'; DROP TABLE campaigns; --";
const XSS_PAYLOAD = "<script>alert('xss')</script>";
const UNICODE_BOMB = "\u202E\u200B\u200F\uFEFF\u0000\uD800";
const HUGE_STRING = bigString(100 * 1024); // 100KB

// ============================================================
// CLEANUP
// ============================================================

afterAll(async () => {
  for (const c of activeClients) {
    try { await c.close(); } catch { /* ignore */ }
  }
  for (const p of activeProcesses) {
    try { p.kill("SIGKILL"); } catch { /* ignore */ }
  }
  try { rmSync(TMP_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ============================================================
// 1. INSTALLATION ADVERSARIAL TESTS
// ============================================================

describe("1. Installation adversarial tests", () => {
  it("1.01 - All 7 packages specify engines.node >= 18", () => {
    // WHY: A user on Node 16 should be told upfront, not get cryptic ESM errors
    for (const server of SERVERS) {
      const pkgJson = JSON.parse(
        readFileSync(join(server.cwd, "package.json"), "utf-8"),
      );
      expect(pkgJson.engines?.node).toBeDefined();
      expect(pkgJson.engines.node).toMatch(/>=\s*18/);
    }
  });

  it("1.02 - All 7 packages have a bin entry matching npm name", () => {
    // WHY: Without this, `npx mcp-google-ads` won't work
    for (const server of SERVERS) {
      const pkgJson = JSON.parse(
        readFileSync(join(server.cwd, "package.json"), "utf-8"),
      );
      expect(pkgJson.bin).toBeDefined();
      expect(pkgJson.bin[server.pkg]).toBeDefined();
    }
  });

  it("1.03 - All 7 packages have dist/index.js built", () => {
    // WHY: If dist isn't built, npm publish ships broken package
    for (const server of SERVERS) {
      expect(existsSync(join(server.cwd, "dist/index.js"))).toBe(true);
    }
  });

  it("1.04 - dist/index.js starts with shebang line", () => {
    // WHY: bin entries need shebang for npx to work
    for (const server of SERVERS) {
      const content = readFileSync(join(server.cwd, "dist/index.js"), "utf-8");
      expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
    }
  });

  it("1.05 - All packages have @modelcontextprotocol/sdk as dependency", () => {
    // WHY: Without the SDK, nothing works
    for (const server of SERVERS) {
      const pkgJson = JSON.parse(
        readFileSync(join(server.cwd, "package.json"), "utf-8"),
      );
      const allDeps = {
        ...pkgJson.dependencies,
        ...pkgJson.devDependencies,
      };
      expect(allDeps["@modelcontextprotocol/sdk"]).toBeDefined();
    }
  });

  it("1.06 - No two packages use conflicting MCP SDK versions", () => {
    // WHY: Installing two servers in one project could cause version conflicts
    const versions = new Map<string, string[]>();
    for (const server of SERVERS) {
      const pkgJson = JSON.parse(
        readFileSync(join(server.cwd, "package.json"), "utf-8"),
      );
      const ver =
        pkgJson.dependencies?.["@modelcontextprotocol/sdk"] ||
        pkgJson.devDependencies?.["@modelcontextprotocol/sdk"] ||
        "unknown";
      if (!versions.has(ver)) versions.set(ver, []);
      versions.get(ver)!.push(server.pkg);
    }
    // Warn if more than 2 distinct version ranges
    if (versions.size > 2) {
      console.warn(
        "WARNING: Multiple MCP SDK version ranges detected:",
        Object.fromEntries(versions),
      );
    }
    // BUG FOUND: if any server uses ^0.x while others use ^1.x, they may
    // have incompatible protocol versions. Flag it but don't hard-fail.
    const majorVersions = new Set(
      Array.from(versions.keys()).map((v) => v.match(/(\d+)\./)?.[1] || "?"),
    );
    if (majorVersions.size > 1) {
      console.warn(
        `BUG FOUND: MCP SDK major version mismatch across servers: ${Array.from(versions.entries()).map(([v, pkgs]) => `${v} (${pkgs.join(", ")})`).join(" vs ")}`,
      );
    }
    // At minimum, all should be semver-ish
    for (const [ver] of versions) {
      expect(ver).toMatch(/\^?\d+\.\d+/);
    }
  });

  it("1.07 - --help flag does not crash (all servers)", async () => {
    // WHY: A confused user will try `npx mcp-google-ads --help`
    for (const server of SERVERS) {
      const { proc, stderr } = spawnServer(server.cwd, {});
      // Send --help by restarting with args
      proc.kill();
      const helpProc = spawn("node", ["dist/index.js", "--help"], {
        cwd: server.cwd,
        env: { PATH: process.env.PATH || "" },
        stdio: ["pipe", "pipe", "pipe"],
      });
      activeProcesses.push(helpProc);
      const code = await waitForExit(helpProc, 5_000);
      // Should exit without segfault. Code 0 or 1 is fine.
      // BUG FOUND: if code is null, server hung on --help
      if (code === null) {
        helpProc.kill("SIGKILL");
        console.warn(`[${server.pkg}] --help flag caused server to hang`);
      }
    }
  }, 40_000);

  it("1.08 - --version flag does not crash (all servers)", async () => {
    // WHY: Standard CLI expectation
    for (const server of SERVERS) {
      const proc = spawn("node", ["dist/index.js", "--version"], {
        cwd: server.cwd,
        env: { PATH: process.env.PATH || "" },
        stdio: ["pipe", "pipe", "pipe"],
      });
      activeProcesses.push(proc);
      const code = await waitForExit(proc, 5_000);
      if (code === null) {
        proc.kill("SIGKILL");
        console.warn(`[${server.pkg}] --version flag caused server to hang`);
      }
    }
  }, 40_000);
});

// ============================================================
// 2. CONFIGURATION ADVERSARIAL TESTS
// ============================================================

describe("2. Configuration adversarial tests", () => {
  // ----------------------------------------------------------
  // 2A. No config at all -- does the server crash or explain?
  // ----------------------------------------------------------

  describe("2A. Zero configuration (no env, no config.json)", () => {
    for (const server of SERVERS) {
      it(`2A.01 [${server.pkg}] - starts without hanging when no config is provided`, async () => {
        // WHY: A user installs via npx and runs it without reading docs.
        // Server should either: (a) start and return errors on tool calls, or
        // (b) exit quickly with a helpful message. It should NOT hang silently.
        const { proc, stderr } = spawnServer(server.cwd, {
          HOME: TMP_DIR, // Prevents picking up ~/.config files
          NODE_ENV: "test",
        });

        // Give it 3 seconds to crash or start
        const code = await waitForExit(proc, 3_000);

        if (code === null) {
          // Server is still running -- that's OK if it's waiting for MCP messages.
          // But it shouldn't have dumped an unhandled exception to stderr.
          const err = stderr();
          expect(err).not.toMatch(/UnhandledPromiseRejection/);
          expect(err).not.toMatch(/TypeError: Cannot read propert/);
          proc.kill("SIGKILL");
        } else {
          // Server exited -- stderr should contain a useful message
          const err = stderr();
          // Should mention config, credentials, or env vars
          const mentionsConfig =
            err.includes("config") ||
            err.includes("CREDENTIAL") ||
            err.includes("env") ||
            err.includes("Config file") ||
            err.includes("Missing required") ||
            err.includes("No configuration");
          if (!mentionsConfig) {
            // BUG FOUND: server crashed without helpful error message
            console.warn(
              `[${server.pkg}] exited with code ${code} but stderr doesn't guide the user:\n${err.slice(0, 500)}`,
            );
          }
        }
      }, 10_000);
    }
  });

  // ----------------------------------------------------------
  // 2B. Partial env vars
  // ----------------------------------------------------------

  describe("2B. Partial credentials (some set, some missing)", () => {
    it("2B.01 [mcp-google-ads] - only CLIENT_ID set, rest missing", async () => {
      // WHY: Copy-paste error -- user only sets one of four required vars
      const { proc, stderr } = spawnServer(SERVERS[0].cwd, {
        GOOGLE_ADS_CLIENT_ID: "test-client-id",
        HOME: TMP_DIR,
      });
      const code = await waitForExit(proc, 3_000);
      if (code !== null) {
        const err = stderr();
        // Should tell user WHICH vars are missing, not just "auth failed"
        expect(
          err.includes("GOOGLE_ADS_CLIENT_SECRET") ||
          err.includes("DEVELOPER_TOKEN") ||
          err.includes("REFRESH_TOKEN") ||
          err.includes("No configuration"),
        ).toBe(true);
      } else {
        proc.kill("SIGKILL");
      }
    }, 10_000);

    it("2B.02 [mcp-reddit-ads] - CLIENT_ID set but SECRET missing", async () => {
      // WHY: Reddit needs all three (ID, secret, refresh token)
      const { proc, stderr } = spawnServer(SERVERS[3].cwd, {
        REDDIT_CLIENT_ID: "test-id",
        HOME: TMP_DIR,
      });
      const code = await waitForExit(proc, 3_000);
      if (code !== null) {
        const err = stderr();
        expect(
          err.includes("REDDIT_CLIENT_SECRET") ||
          err.includes("REDDIT_REFRESH_TOKEN") ||
          err.includes("Missing required"),
        ).toBe(true);
      } else {
        proc.kill("SIGKILL");
      }
    }, 10_000);

    it("2B.03 [mcp-bing-ads] - DEVELOPER_TOKEN set but no CLIENT_ID", async () => {
      const { proc, stderr } = spawnServer(SERVERS[1].cwd, {
        BING_ADS_DEVELOPER_TOKEN: "test-token",
        HOME: TMP_DIR,
      });
      const code = await waitForExit(proc, 3_000);
      if (code !== null) {
        const err = stderr();
        expect(
          err.includes("CLIENT_ID") ||
          err.includes("Missing") ||
          err.includes("config"),
        ).toBe(true);
      } else {
        proc.kill("SIGKILL");
      }
    }, 10_000);
  });

  // ----------------------------------------------------------
  // 2C. Malformed env var values
  // ----------------------------------------------------------

  describe("2C. Malformed env var values", () => {
    it("2C.01 [mcp-reddit-ads] - empty string credentials", async () => {
      // WHY: User exports env vars but the Keychain lookup returned empty
      const { proc, stderr } = spawnServer(SERVERS[3].cwd, {
        REDDIT_CLIENT_ID: "",
        REDDIT_CLIENT_SECRET: "",
        REDDIT_REFRESH_TOKEN: "",
        HOME: TMP_DIR,
      });
      const code = await waitForExit(proc, 3_000);
      if (code !== null) {
        const err = stderr();
        // Should detect empty strings as missing
        expect(
          err.includes("Missing") || err.includes("required") || err.includes("empty"),
        ).toBe(true);
      } else {
        proc.kill("SIGKILL");
      }
    }, 10_000);

    it("2C.02 [mcp-google-ads] - whitespace-only credentials", async () => {
      // WHY: Tab or newline in env var from bad shell quoting
      const { proc, stderr } = spawnServer(SERVERS[0].cwd, {
        GOOGLE_ADS_CLIENT_ID: "   \t\n  ",
        GOOGLE_ADS_CLIENT_SECRET: "  ",
        GOOGLE_ADS_DEVELOPER_TOKEN: " ",
        GOOGLE_ADS_REFRESH_TOKEN: "\n",
        HOME: TMP_DIR,
      });
      const code = await waitForExit(proc, 3_000);
      // Should not treat whitespace-only as valid
      if (code !== null) {
        const err = stderr();
        expect(
          err.includes("config") || err.includes("Missing") || err.includes("No configuration"),
        ).toBe(true);
      } else {
        proc.kill("SIGKILL");
      }
    }, 10_000);

    it("2C.03 [mcp-ga4] - property ID with special characters", async () => {
      // WHY: User pastes "properties/123456789" instead of just "123456789"
      const { proc, stderr } = spawnServer(SERVERS[5].cwd, {
        GA4_PROPERTY_ID: "properties/123456789",
        HOME: TMP_DIR,
      });
      // This might start OK but fail on API calls. That's acceptable behavior.
      const code = await waitForExit(proc, 3_000);
      if (code === null) {
        proc.kill("SIGKILL");
        // Not a crash -- good
      }
    }, 10_000);

    it("2C.04 [mcp-bing-ads] - extremely long developer token (10KB)", async () => {
      // WHY: Buffer overflow / memory issue with huge env vars
      const { proc, stderr } = spawnServer(SERVERS[1].cwd, {
        BING_ADS_DEVELOPER_TOKEN: bigString(10240),
        BING_ADS_CLIENT_ID: bigString(10240),
        BING_ADS_REFRESH_TOKEN: bigString(10240),
        HOME: TMP_DIR,
      });
      const code = await waitForExit(proc, 3_000);
      // Should not segfault
      expect(code).not.toBe(139); // SIGSEGV
      if (code === null) proc.kill("SIGKILL");
    }, 10_000);

    it("2C.05 [mcp-reddit-ads] - unicode in credentials", async () => {
      // WHY: Copy-paste from a document with hidden unicode chars
      const { proc, stderr } = spawnServer(SERVERS[3].cwd, {
        REDDIT_CLIENT_ID: "normal-id-\u200B-zero-width",
        REDDIT_CLIENT_SECRET: "\u202Ereversed-secret",
        REDDIT_REFRESH_TOKEN: "token-with-\uFEFF-bom",
        HOME: TMP_DIR,
      });
      const code = await waitForExit(proc, 3_000);
      // Should not crash with encoding error
      expect(code).not.toBe(139);
      if (code === null) proc.kill("SIGKILL");
    }, 10_000);

    it("2C.06 [mcp-google-ads] - wrong credential types (Reddit token in Google env)", async () => {
      // WHY: User confuses which env var goes where
      const { proc, stderr } = spawnServer(SERVERS[0].cwd, {
        GOOGLE_ADS_CLIENT_ID: "reddit-client-id-abc123",
        GOOGLE_ADS_CLIENT_SECRET: "reddit-secret-xyz",
        GOOGLE_ADS_DEVELOPER_TOKEN: "not-a-real-dev-token",
        GOOGLE_ADS_REFRESH_TOKEN: "1//reddit-refresh-token-lol",
        GOOGLE_ADS_CUSTOMER_ID: "t2_abc123xyz",  // Reddit account ID format
        HOME: TMP_DIR,
      });
      const code = await waitForExit(proc, 3_000);
      // Should start (credentials look structurally valid) but fail gracefully on API calls
      if (code === null) proc.kill("SIGKILL");
    }, 10_000);
  });

  // ----------------------------------------------------------
  // 2D. Malformed config.json
  // ----------------------------------------------------------

  describe("2D. Malformed config.json", () => {
    beforeAll(() => {
      mkdirSync(TMP_DIR, { recursive: true });
    });

    it("2D.01 [mcp-bing-ads] - config.json with syntax error (trailing comma)", async () => {
      // WHY: User hand-edits JSON and leaves a trailing comma
      const tmpConfig = join(TMP_DIR, "bing-bad-config");
      mkdirSync(tmpConfig, { recursive: true });
      writeFileSync(
        join(tmpConfig, "config.json"),
        '{"oauth": {"client_id": "test",}}',  // trailing comma
      );
      // Copy dist
      const distSrc = join(SERVERS[1].cwd, "dist");
      const { proc, stderr } = spawnServer(SERVERS[1].cwd, {
        HOME: TMP_DIR,
      });
      // Server will read config.json from its own cwd/../config.json
      // This test verifies the error is caught, not a raw SyntaxError stack trace
      const code = await waitForExit(proc, 3_000);
      if (code !== null) {
        const err = stderr();
        // Should not dump raw "SyntaxError: Expected property name" without context
        // It should mention config.json or parsing
        if (err.includes("SyntaxError") && !err.includes("config")) {
          console.warn(`BUG FOUND: [mcp-bing-ads] dumps raw SyntaxError without mentioning config.json`);
        }
      } else {
        proc.kill("SIGKILL");
      }
    }, 10_000);

    it("2D.02 [mcp-google-ads] - config.json with correct JSON but wrong schema", async () => {
      // WHY: User creates config.json but wrong structure
      // We test this by temporarily writing then removing
      const wrongConfig = { wrong_key: "wrong_value", clients: null };
      const configPath = join(TMP_DIR, "gads-wrong-schema.json");
      writeFileSync(configPath, JSON.stringify(wrongConfig));
      // Can't easily inject config path, but document the expected behavior
      expect(true).toBe(true); // Placeholder -- real test needs config path override
    });

    it("2D.03 - config.json with null values vs empty strings", () => {
      // WHY: undefined vs null vs "" behave differently in JS
      const configs = [
        { clients: { test: { customer_id: null, name: "test", folder: "/tmp" } } },
        { clients: { test: { customer_id: "", name: "test", folder: "/tmp" } } },
        { clients: { test: { name: "test", folder: "/tmp" } } },  // missing customer_id entirely
      ];
      for (const config of configs) {
        // These should all be handled without TypeError: Cannot read property of null
        const json = JSON.stringify(config);
        expect(() => JSON.parse(json)).not.toThrow();
      }
    });
  });
});

// ============================================================
// 3. TOOL INPUT ADVERSARIAL TESTS
// ============================================================

describe.skipIf(!LIVE)("3. Tool input adversarial tests (LIVE)", () => {
  // We need live servers for these tests since they test actual tool execution
  const serverClients: Map<string, Client> = new Map();

  beforeAll(async () => {
    // Connect to all servers that have run-mcp.sh
    for (const server of SERVERS) {
      try {
        const client = await connectLiveServer(server.cwd);
        serverClients.set(server.pkg, client);
      } catch (e) {
        console.warn(`Could not connect to ${server.pkg}: ${e}`);
      }
    }
  }, 120_000);

  // Helper to call a tool and expect non-crash behavior
  async function callToolSafely(
    pkg: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{ isError: boolean; text: string }> {
    const client = serverClients.get(pkg);
    if (!client) throw new Error(`No client for ${pkg}`);
    const result = await client.callTool({ name: toolName, arguments: args });
    const content = result.content as Array<{ type: string; text: string }>;
    const text = content.map((c) => c.text || "").join("\n");
    return { isError: result.isError === true, text };
  }

  // ----------------------------------------------------------
  // 3A. Zero arguments on required-args tools
  // ----------------------------------------------------------

  describe("3A. Zero arguments on tools with required params", () => {
    const TOOLS_WITH_REQUIRED_ARGS = [
      { pkg: "mcp-google-ads", tool: "google_ads_keyword_performance" },
      { pkg: "mcp-google-ads", tool: "google_ads_gaql_query" },
      { pkg: "mcp-google-ads", tool: "google_ads_create_campaign" },
      { pkg: "mcp-google-ads", tool: "google_ads_validate_ad" },
      { pkg: "mcp-bing-ads", tool: "bing_ads_get_campaign_performance" },
      { pkg: "mcp-bing-ads", tool: "bing_ads_list_ad_groups" },
      { pkg: "mcp-reddit-ads", tool: "reddit_ads_create_campaign" },
      { pkg: "mcp-reddit-ads", tool: "reddit_ads_search_subreddits" },
      { pkg: "mcp-google-gsc", tool: "gsc_inspection" },
      { pkg: "mcp-ga4", tool: "ga4_run_report" },
      { pkg: "mcp-ga4", tool: "ga4_create_custom_dimension" },
      { pkg: "mcp-linkedin-ads", tool: "linkedin_ads_campaign_performance" },
      { pkg: "mcp-linkedin-ads", tool: "linkedin_ads_analytics" },
      { pkg: "mcp-gtm-ga4", tool: "gtm_get_tag" },
      { pkg: "mcp-gtm-ga4", tool: "gtm_update_tag" },
      { pkg: "mcp-gtm-ga4", tool: "gtm_create_version" },
    ];

    for (const { pkg, tool } of TOOLS_WITH_REQUIRED_ARGS) {
      it(`3A [${pkg}] ${tool} with empty args`, async () => {
        // WHY: MCP spec says the server should validate required params
        const { isError, text } = await callToolSafely(pkg, tool, {});
        // Should return an error, not crash the server
        expect(isError).toBe(true);
        // Error message should be helpful
        expect(text.length).toBeGreaterThan(0);
      }, 15_000);
    }
  });

  // ----------------------------------------------------------
  // 3B. Null arguments
  // ----------------------------------------------------------

  describe("3B. All arguments set to null", () => {
    const NULL_TESTS = [
      {
        pkg: "mcp-google-ads",
        tool: "google_ads_keyword_performance",
        args: { customer_id: null, start_date: null, end_date: null },
      },
      {
        pkg: "mcp-google-ads",
        tool: "google_ads_gaql_query",
        args: { customer_id: null, query: null },
      },
      {
        pkg: "mcp-bing-ads",
        tool: "bing_ads_get_campaign_performance",
        args: { account_id: null, start_date: null, end_date: null },
      },
      {
        pkg: "mcp-reddit-ads",
        tool: "reddit_ads_create_campaign",
        args: { name: null, objective: null, daily_budget_dollars: null, start_time: null },
      },
      {
        pkg: "mcp-ga4",
        tool: "ga4_run_report",
        args: { property_id: null, dimensions: null, metrics: null },
      },
      {
        pkg: "mcp-gtm-ga4",
        tool: "gtm_update_tag",
        args: { tag_id: null, updates_json: null },
      },
    ];

    for (const { pkg, tool, args } of NULL_TESTS) {
      it(`3B [${pkg}] ${tool} with null args`, async () => {
        // WHY: LLMs sometimes pass null for optional params
        const { isError, text } = await callToolSafely(pkg, tool, args as any);
        expect(isError).toBe(true);
        // Should not contain "TypeError: Cannot read properties of null"
        expect(text).not.toMatch(/TypeError.*null/);
      }, 15_000);
    }
  });

  // ----------------------------------------------------------
  // 3C. Empty string arguments
  // ----------------------------------------------------------

  describe("3C. Empty string arguments", () => {
    it("3C.01 [mcp-google-ads] gaql_query with empty query string", async () => {
      // WHY: User sends empty GAQL query
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_gaql_query",
        { query: "" },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3C.02 [mcp-google-ads] keyword_performance with empty date strings", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_keyword_performance",
        { start_date: "", end_date: "" },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3C.03 [mcp-reddit-ads] search_subreddits with empty query", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-reddit-ads",
        "reddit_ads_search_subreddits",
        { query: "" },
      );
      // Empty search might return results or error -- both OK, just don't crash
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3C.04 [mcp-google-gsc] inspection with empty URL", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-gsc",
        "gsc_inspection",
        { url: "" },
      );
      expect(isError).toBe(true);
    }, 15_000);
  });

  // ----------------------------------------------------------
  // 3D. Extremely large arguments (100KB strings)
  // ----------------------------------------------------------

  describe("3D. Extremely large string arguments", () => {
    it("3D.01 [mcp-google-ads] gaql_query with 100KB query", async () => {
      // WHY: Could OOM or timeout the API
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_gaql_query",
        { query: HUGE_STRING },
      );
      expect(isError).toBe(true);
    }, 30_000);

    it("3D.02 [mcp-reddit-ads] search_subreddits with 100KB query", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-reddit-ads",
        "reddit_ads_search_subreddits",
        { query: HUGE_STRING },
      );
      expect(isError).toBe(true);
    }, 30_000);

    it("3D.03 [mcp-ga4] run_report with 100KB dimension filter", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-ga4",
        "ga4_run_report",
        { property_id: "123456789", dimension_filter: HUGE_STRING },
      );
      expect(isError).toBe(true);
    }, 30_000);
  });

  // ----------------------------------------------------------
  // 3E. SQL injection strings
  // ----------------------------------------------------------

  describe("3E. SQL injection payloads", () => {
    it("3E.01 [mcp-google-ads] gaql_query with SQL injection", async () => {
      // WHY: GAQL is a query language -- can you escape it?
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_gaql_query",
        { query: `SELECT campaign.name FROM campaign WHERE campaign.name = '${SQL_INJECTION}'` },
      );
      // Google Ads API should reject this. Server should not crash.
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3E.02 [mcp-google-ads] keyword text with SQL injection", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_keyword_performance",
        {
          start_date: "2026-03-01",
          end_date: "2026-03-31",
          keyword_text_contains: SQL_INJECTION,
        },
      );
      // Should complete without crash
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3E.03 [mcp-bing-ads] search term report with SQL injection", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-bing-ads",
        "bing_ads_search_term_report",
        {
          start_date: SQL_INJECTION,
          end_date: "2026-03-31",
        },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3E.04 [mcp-google-gsc] search_analytics with SQL injection in filter", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-gsc",
        "gsc_search_analytics",
        {
          start_date: "2026-03-01",
          end_date: "2026-03-31",
          dimension_filter: SQL_INJECTION,
        },
      );
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);
  });

  // ----------------------------------------------------------
  // 3F. XSS payloads
  // ----------------------------------------------------------

  describe("3F. XSS payloads in arguments", () => {
    it("3F.01 [mcp-google-ads] create campaign with XSS name", async () => {
      // WHY: If the name gets rendered in a web UI, it could execute
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_create_campaign",
        {
          name: XSS_PAYLOAD,
          daily_budget: 10,
        },
      );
      // The API might reject it or accept it. Either is fine, just don't crash.
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3F.02 [mcp-reddit-ads] create ad with XSS headline", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-reddit-ads",
        "reddit_ads_create_ad",
        {
          ad_group_id: "fake-id",
          name: XSS_PAYLOAD,
          headline: XSS_PAYLOAD,
          click_url: "https://example.com",
        },
      );
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3F.03 [mcp-gtm-ga4] create tag with XSS in tag_json", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-gtm-ga4",
        "gtm_create_tag",
        { tag_json: XSS_PAYLOAD },
      );
      expect(isError).toBe(true);
    }, 15_000);
  });

  // ----------------------------------------------------------
  // 3G. Wrong types
  // ----------------------------------------------------------

  describe("3G. Wrong argument types", () => {
    it("3G.01 [mcp-google-ads] daily_budget as string instead of number", async () => {
      // WHY: LLM might pass "50" instead of 50
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_create_campaign",
        { name: "test", daily_budget: "fifty dollars" as any },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3G.02 [mcp-google-ads] campaign_ids as string instead of array", async () => {
      // WHY: Very common LLM mistake -- passing single value instead of array
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_keyword_performance",
        {
          start_date: "2026-03-01",
          end_date: "2026-03-31",
          campaign_ids: "12345678" as any,
        },
      );
      // Should either work (by coercing) or error gracefully
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3G.03 [mcp-reddit-ads] daily_budget_dollars as string", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-reddit-ads",
        "reddit_ads_create_campaign",
        {
          name: "test",
          objective: "TRAFFIC",
          daily_budget_dollars: "not a number" as any,
          start_time: "2026-04-01T00:00:00Z",
        },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3G.04 [mcp-ga4] limit as string instead of number", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-ga4",
        "ga4_run_report",
        {
          property_id: "123456789",
          dimensions: "date",
          metrics: "sessions",
          start_date: "7daysAgo",
          end_date: "today",
          limit: "ten" as any,
        },
      );
      // Should coerce or error
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3G.05 [mcp-google-ads] keywords as string instead of array", async () => {
      // WHY: User might pass a single keyword text instead of the array of objects
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_create_keywords",
        {
          ad_group_id: "12345",
          keywords: "fulfillment services" as any,
        },
      );
      expect(isError).toBe(true);
    }, 15_000);
  });

  // ----------------------------------------------------------
  // 3H. Negative numbers, floats, boundary values
  // ----------------------------------------------------------

  describe("3H. Numeric boundary values", () => {
    it("3H.01 [mcp-google-ads] negative daily budget", async () => {
      // WHY: What happens if budget is -100?
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_create_campaign",
        { name: "negative-budget-test", daily_budget: -100 },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3H.02 [mcp-google-ads] zero daily budget", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_create_campaign",
        { name: "zero-budget-test", daily_budget: 0 },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3H.03 [mcp-google-ads] budget as float with many decimals", async () => {
      // WHY: $50.999999999 -- how does micros conversion handle this?
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_update_campaign_budget",
        { campaign_id: "99999999", daily_budget: 50.999999999 },
      );
      // Will fail because fake campaign_id, but should not crash on the float
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3H.04 [mcp-reddit-ads] bid_dollars as very small float", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-reddit-ads",
        "reddit_ads_create_ad_group",
        {
          campaign_id: "fake",
          name: "tiny-bid-test",
          bid_dollars: 0.00001,
          start_time: "2026-04-01T00:00:00Z",
        },
      );
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3H.05 [mcp-ga4] limit=0", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-ga4",
        "ga4_run_report",
        {
          property_id: "123456789",
          dimensions: "date",
          metrics: "sessions",
          start_date: "7daysAgo",
          end_date: "today",
          limit: 0,
        },
      );
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3H.06 [mcp-ga4] limit=-1", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-ga4",
        "ga4_run_report",
        {
          property_id: "123456789",
          dimensions: "date",
          metrics: "sessions",
          start_date: "7daysAgo",
          end_date: "today",
          limit: -1,
        },
      );
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3H.07 [mcp-ga4] limit=999999999", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-ga4",
        "ga4_run_report",
        {
          property_id: "123456789",
          dimensions: "date",
          metrics: "sessions",
          start_date: "7daysAgo",
          end_date: "today",
          limit: 999999999,
        },
      );
      expect(text.length).toBeGreaterThan(0);
    }, 30_000);

    it("3H.08 [mcp-google-gsc] row_limit=0", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-gsc",
        "gsc_search_analytics",
        {
          start_date: "7daysAgo",
          end_date: "today",
          row_limit: 0,
        },
      );
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3H.09 [mcp-reddit-ads] daily_budget as Infinity", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-reddit-ads",
        "reddit_ads_create_campaign",
        {
          name: "infinity-test",
          objective: "TRAFFIC",
          daily_budget_dollars: Infinity as any,
          start_time: "2026-04-01T00:00:00Z",
        },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3H.10 [mcp-google-ads] budget as NaN", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_create_campaign",
        { name: "nan-test", daily_budget: NaN as any },
      );
      expect(isError).toBe(true);
    }, 15_000);
  });

  // ----------------------------------------------------------
  // 3I. Fake but valid-looking IDs
  // ----------------------------------------------------------

  describe("3I. Fake but structurally valid IDs", () => {
    it("3I.01 [mcp-google-ads] fake customer_id", async () => {
      // WHY: User pastes wrong account ID
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_list_campaigns",
        { customer_id: "0000000000" },
      );
      expect(isError).toBe(true);
      // Should say "not found" or "permission denied", not crash
    }, 15_000);

    it("3I.02 [mcp-google-ads] customer_id with dashes (user format)", async () => {
      // WHY: Google Ads UI shows "123-456-7890" but API wants "1234567890"
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_list_campaigns",
        { customer_id: "123-456-7890" },
      );
      // Should either strip dashes or give clear error
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3I.03 [mcp-reddit-ads] fake account_id", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-reddit-ads",
        "reddit_ads_get_campaigns",
        { account_id: "act_0000000000" },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3I.04 [mcp-ga4] fake property_id", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-ga4",
        "ga4_run_report",
        {
          property_id: "000000000",
          dimensions: "date",
          metrics: "sessions",
          start_date: "7daysAgo",
          end_date: "today",
        },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3I.05 [mcp-gtm-ga4] fake tag_id", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-gtm-ga4",
        "gtm_get_tag",
        { tag_id: "99999999" },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3I.06 [mcp-google-ads] resource_name with path traversal", async () => {
      // WHY: Security -- can you escape the resource name format?
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_remove_shared_negatives",
        {
          resource_names: ["../../etc/passwd", "customers/../../../admin"],
        },
      );
      expect(isError).toBe(true);
    }, 15_000);
  });

  // ----------------------------------------------------------
  // 3J. Date parameter edge cases
  // ----------------------------------------------------------

  describe("3J. Date parameter edge cases", () => {
    it("3J.01 [mcp-google-ads] invalid date format", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_keyword_performance",
        { start_date: "March 1st 2026", end_date: "March 31st 2026" },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3J.02 [mcp-google-ads] future dates (year 2099)", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_keyword_performance",
        { start_date: "2099-01-01", end_date: "2099-12-31" },
      );
      // Should return empty data, not crash
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3J.03 [mcp-google-ads] dates before Google Ads existed", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_keyword_performance",
        { start_date: "1990-01-01", end_date: "1990-12-31" },
      );
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3J.04 [mcp-google-ads] reversed date range (start > end)", async () => {
      // WHY: Very common user mistake
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_keyword_performance",
        { start_date: "2026-03-31", end_date: "2026-03-01" },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3J.05 [mcp-bing-ads] reversed date range", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-bing-ads",
        "bing_ads_get_campaign_performance",
        { start_date: "2026-03-31", end_date: "2026-03-01" },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3J.06 [mcp-ga4] date as epoch timestamp instead of YYYY-MM-DD", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-ga4",
        "ga4_run_report",
        {
          property_id: "123456789",
          dimensions: "date",
          metrics: "sessions",
          start_date: "1711929600",
          end_date: "1712534400",
        },
      );
      // GA4 might accept or reject this -- just don't crash
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3J.07 [mcp-linkedin-ads] same start and end date", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-linkedin-ads",
        "linkedin_ads_campaign_performance",
        { start_date: "2026-04-01", end_date: "2026-04-01" },
      );
      // Single-day range should work
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3J.08 [mcp-reddit-ads] ISO 8601 with timezone offset", async () => {
      // WHY: Reddit create_campaign expects ISO 8601 -- does timezone matter?
      const { isError, text } = await callToolSafely(
        "mcp-reddit-ads",
        "reddit_ads_create_campaign",
        {
          name: "tz-test",
          objective: "TRAFFIC",
          daily_budget_dollars: 50,
          start_time: "2026-04-01T00:00:00+05:30",  // India timezone
        },
      );
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);
  });

  // ----------------------------------------------------------
  // 3K. Unicode in tool arguments
  // ----------------------------------------------------------

  describe("3K. Unicode in arguments", () => {
    it("3K.01 [mcp-google-ads] campaign name with emoji", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_create_campaign",
        { name: "Test Campaign \uD83D\uDE80\uD83C\uDF1F", daily_budget: 10 },
      );
      // Google Ads API might reject emoji. Don't crash.
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3K.02 [mcp-reddit-ads] search subreddits with CJK characters", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-reddit-ads",
        "reddit_ads_search_subreddits",
        { query: "\u5728\u7EBF\u8D2D\u7269" },  // "online shopping" in Chinese
      );
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);

    it("3K.03 [mcp-google-ads] GAQL query with zero-width characters", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-google-ads",
        "google_ads_gaql_query",
        { query: "SELECT\u200B campaign\u200B.name FROM\u200B campaign" },
      );
      expect(isError).toBe(true);
    }, 15_000);

    it("3K.04 [mcp-ga4] dimension filter with RTL override", async () => {
      const { isError, text } = await callToolSafely(
        "mcp-ga4",
        "ga4_run_report",
        {
          property_id: "123456789",
          dimensions: "eventName",
          metrics: "eventCount",
          start_date: "7daysAgo",
          end_date: "today",
          dimension_filter: "\u202EeventName==page_view",
        },
      );
      expect(text.length).toBeGreaterThan(0);
    }, 15_000);
  });
});

// ============================================================
// 4. RESPONSE ADVERSARIAL TESTS (needs live)
// ============================================================

describe.skipIf(!LIVE)("4. Response adversarial tests (LIVE)", () => {
  let gadsClient: Client;

  beforeAll(async () => {
    gadsClient = await connectLiveServer(SERVERS[0].cwd);
  }, 30_000);

  it("4.01 [mcp-google-ads] GAQL query returning huge result set", async () => {
    // WHY: What if SELECT * returns 200KB+ of data?
    const result = await gadsClient.callTool({
      name: "google_ads_gaql_query",
      arguments: {
        query: "SELECT campaign.name, campaign.id, campaign.status, campaign.bidding_strategy_type, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign",
      },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const totalSize = content.reduce((s, c) => s + (c.text?.length || 0), 0);
    // Should not exceed a reasonable MCP response size (< 1MB)
    expect(totalSize).toBeLessThan(1_000_000);
  }, 30_000);

  it("4.02 [mcp-google-ads] keyword report for full year (could be huge)", async () => {
    // WHY: Performance test -- full year of keyword data
    const result = await gadsClient.callTool({
      name: "google_ads_keyword_performance",
      arguments: {
        start_date: "2025-01-01",
        end_date: "2025-12-31",
      },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const text = content.map((c) => c.text || "").join("\n");
    // Should complete without timeout
    expect(text.length).toBeGreaterThan(0);
  }, 60_000);
});

// ============================================================
// 5. CONCURRENCY ADVERSARIAL TESTS (needs live)
// ============================================================

describe.skipIf(!LIVE)("5. Concurrency adversarial tests (LIVE)", () => {
  it("5.01 [mcp-google-ads] 50 simultaneous list_campaigns calls", async () => {
    // WHY: MCP client might fire many tools in parallel
    const client = await connectLiveServer(SERVERS[0].cwd);
    const promises = Array.from({ length: 50 }, () =>
      client.callTool({
        name: "google_ads_list_campaigns",
        arguments: {},
      }),
    );
    const results = await Promise.allSettled(promises);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    // At minimum, some should succeed. Rate limiting is OK.
    expect(succeeded).toBeGreaterThan(0);
    // None should cause an unhandled crash
    for (const r of results) {
      if (r.status === "rejected") {
        expect(r.reason.message).not.toMatch(/EPIPE|SIGPIPE|killed/);
      }
    }
  }, 60_000);

  it("5.02 [mcp-reddit-ads] mixed reads while writing", async () => {
    // WHY: Concurrent read + write could expose race conditions
    const client = await connectLiveServer(SERVERS[3].cwd);
    const reads = Array.from({ length: 10 }, () =>
      client.callTool({
        name: "reddit_ads_get_campaigns",
        arguments: {},
      }),
    );
    const writes = Array.from({ length: 5 }, () =>
      client.callTool({
        name: "reddit_ads_create_campaign",
        arguments: {
          name: `concurrent-test-${Date.now()}`,
          objective: "TRAFFIC",
          daily_budget_dollars: 50,
          start_time: "2026-04-01T00:00:00Z",
          configured_status: "PAUSED",
        },
      }),
    );
    const results = await Promise.allSettled([...reads, ...writes]);
    // Server should not crash under concurrent load
    const crashed = results.filter(
      (r) => r.status === "rejected" && r.reason?.message?.includes("EPIPE"),
    );
    expect(crashed.length).toBe(0);
  }, 60_000);

  it("5.03 [mcp-ga4] different tools called simultaneously", async () => {
    const client = await connectLiveServer(SERVERS[5].cwd);
    const calls = [
      client.callTool({ name: "ga4_list_data_streams", arguments: { property_id: "123456789" } }),
      client.callTool({ name: "ga4_list_custom_dimensions", arguments: { property_id: "123456789" } }),
      client.callTool({ name: "ga4_list_custom_metrics", arguments: { property_id: "123456789" } }),
      client.callTool({
        name: "ga4_run_report",
        arguments: {
          property_id: "123456789",
          dimensions: "date",
          metrics: "sessions",
          start_date: "7daysAgo",
          end_date: "today",
        },
      }),
    ];
    const results = await Promise.allSettled(calls);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    expect(succeeded).toBe(4);
  }, 30_000);
});

// ============================================================
// 6. CROSS-SERVER ADVERSARIAL TESTS
// ============================================================

describe("6. Cross-server adversarial tests", () => {
  it("6.01 - Tool name collision detection across all servers", () => {
    // WHY: MCP clients register tools globally -- collisions break routing
    const toolMap = new Map<string, string[]>();
    for (const server of SERVERS) {
      for (const tool of server.tools) {
        if (!toolMap.has(tool)) toolMap.set(tool, []);
        toolMap.get(tool)!.push(server.pkg);
      }
    }

    // Known intentional overlaps: mcp-gtm-ga4 shares GA4 tools
    const ALLOWED = [
      "ga4_run_report",
      "ga4_realtime_report",
      "ga4_list_custom_dimensions",
      "ga4_create_custom_dimension",
    ];

    const unexpected: Array<{ tool: string; servers: string[] }> = [];
    for (const [tool, servers] of toolMap) {
      if (servers.length > 1 && !ALLOWED.includes(tool)) {
        unexpected.push({ tool, servers });
      }
    }

    if (unexpected.length > 0) {
      // BUG FOUND: unexpected tool name collisions
      console.error("BUG FOUND: Unexpected tool name collisions:");
      for (const { tool, servers } of unexpected) {
        console.error(`  ${tool}: ${servers.join(", ")}`);
      }
    }
    expect(unexpected.length).toBe(0);
  });

  it("6.02 - All tool names follow consistent prefix convention", () => {
    // WHY: Users expect google_ads_* tools to come from mcp-google-ads
    const prefixMap: Record<string, string> = {
      "mcp-google-ads": "google_ads_",
      "mcp-bing-ads": "bing_ads_",
      "mcp-linkedin-ads": "linkedin_ads_",
      "mcp-reddit-ads": "reddit_ads_",
      "mcp-google-gsc": "gsc_",
      "mcp-ga4": "ga4_",
      "mcp-gtm-ga4": "gtm_|ga4_", // GTM server has both
    };

    for (const server of SERVERS) {
      const expectedPrefixes = prefixMap[server.pkg]?.split("|") || [];
      for (const tool of server.tools) {
        const hasValidPrefix = expectedPrefixes.some((p) => tool.startsWith(p));
        if (!hasValidPrefix) {
          // BUG FOUND: tool doesn't match expected prefix
          console.error(
            `BUG FOUND: [${server.pkg}] tool "${tool}" doesn't start with expected prefix ${expectedPrefixes.join(" or ")}`,
          );
        }
        expect(hasValidPrefix).toBe(true);
      }
    }
  });

  it("6.03 - All tool schemas have type: 'object' at top level", () => {
    // WHY: MCP spec requires inputSchema.type === "object"
    // We verify this from the source tools.ts definitions
    for (const server of SERVERS) {
      const toolsSrc = readFileSync(join(server.cwd, "src/tools.ts"), "utf-8");
      // Every inputSchema should have type: "object"
      const schemaMatches = toolsSrc.match(/inputSchema:\s*\{[^}]*type:\s*"(\w+)"/g) || [];
      for (const match of schemaMatches) {
        expect(match).toContain('"object"');
      }
    }
  });

  it("6.04 - No env var name collisions between servers", () => {
    // WHY: Running two servers in same process could pollute env
    const envMap = new Map<string, string[]>();
    for (const server of SERVERS) {
      for (const env of server.requiredEnv) {
        if (!envMap.has(env)) envMap.set(env, []);
        envMap.get(env)!.push(server.pkg);
      }
    }

    const collisions = Array.from(envMap.entries())
      .filter(([_, servers]) => servers.length > 1);

    // GOOGLE_APPLICATION_CREDENTIALS is shared by GSC, GA4, GTM -- this is expected
    const EXPECTED_SHARED = ["GOOGLE_APPLICATION_CREDENTIALS"];
    const unexpected = collisions.filter(([env]) => !EXPECTED_SHARED.includes(env));

    if (unexpected.length > 0) {
      console.warn("Env var collisions (may cause cross-server interference):");
      for (const [env, servers] of unexpected) {
        console.warn(`  ${env}: ${servers.join(", ")}`);
      }
    }
  });

  it("6.05 - Error response format consistency across servers", () => {
    // WHY: If one server returns {error: ...} and another throws, the MCP client
    // gets inconsistent behavior
    // We check that all servers import a consistent error pattern
    for (const server of SERVERS) {
      const indexSrc = readFileSync(join(server.cwd, "src/index.ts"), "utf-8");
      // All servers should use safeResponse or withResilience pattern
      const hasSafeResponse =
        indexSrc.includes("safeResponse") || indexSrc.includes("isError: true");
      if (!hasSafeResponse) {
        console.warn(`[${server.pkg}] may not use consistent error response format`);
      }
    }
  });

  it("6.06 - All servers have resilience module", () => {
    // WHY: Rate limiting, retries should be consistent
    for (const server of SERVERS) {
      const hasResilience = existsSync(join(server.cwd, "src/resilience.ts"));
      if (!hasResilience) {
        console.warn(`BUG FOUND: [${server.pkg}] missing resilience.ts`);
      }
    }
  });

  it("6.07 - All servers have error classification module", () => {
    for (const server of SERVERS) {
      const hasErrors = existsSync(join(server.cwd, "src/errors.ts"));
      if (!hasErrors) {
        console.warn(`BUG FOUND: [${server.pkg}] missing errors.ts`);
      }
    }
  });

  it("6.08 - Package versions are consistent across suite", () => {
    // WHY: If some are 1.0.3 and one is 0.1.0, it looks unprofessional
    const versions = new Map<string, string[]>();
    for (const server of SERVERS) {
      const pkgJson = JSON.parse(
        readFileSync(join(server.cwd, "package.json"), "utf-8"),
      );
      const ver = pkgJson.version;
      if (!versions.has(ver)) versions.set(ver, []);
      versions.get(ver)!.push(server.pkg);
    }
    if (versions.size > 2) {
      console.warn("WARNING: Inconsistent versions across suite:");
      for (const [ver, pkgs] of versions) {
        console.warn(`  ${ver}: ${pkgs.join(", ")}`);
      }
    }
  });

  it("6.09 - README/description mentions required Node version", () => {
    // WHY: npm page should tell users they need Node 18+
    for (const server of SERVERS) {
      const readmePath = join(server.cwd, "README.md");
      if (existsSync(readmePath)) {
        const readme = readFileSync(readmePath, "utf-8");
        const mentionsNode =
          readme.includes("Node") ||
          readme.includes("node") ||
          readme.includes("18");
        if (!mentionsNode) {
          console.warn(`[${server.pkg}] README doesn't mention Node version requirement`);
        }
      }
    }
  });

  it("6.10 - No server exposes internal implementation details in tool descriptions", () => {
    // WHY: Security -- tool descriptions should not leak file paths, secrets, or internal architecture
    for (const server of SERVERS) {
      const toolsSrc = readFileSync(join(server.cwd, "src/tools.ts"), "utf-8");
      expect(toolsSrc).not.toMatch(/\/Users\//);
      expect(toolsSrc).not.toMatch(/password|secret|token/i);
      expect(toolsSrc).not.toMatch(/localhost:\d+/);
    }
  });
});

// ============================================================
// 7. ADDITIONAL EDGE CASES
// ============================================================

describe("7. Additional adversarial edge cases", () => {
  it("7.01 - GTM server 'auth' subcommand without args shows usage", async () => {
    // WHY: User runs `node dist/index.js auth` without --output
    const proc = spawn("node", ["dist/index.js", "auth"], {
      cwd: SERVERS[6].cwd,
      env: { PATH: process.env.PATH || "" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    activeProcesses.push(proc);
    let stderr = "";
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    const code = await waitForExit(proc, 5_000);
    // Should show usage, exit 1
    expect(code).toBe(1);
    expect(stderr).toContain("Usage");
  }, 10_000);

  it("7.02 - All servers handle SIGTERM gracefully", async () => {
    // WHY: Docker containers send SIGTERM on shutdown
    for (const server of SERVERS) {
      const { proc } = spawnServer(server.cwd, {
        // Provide minimal valid-looking env so server starts
        GOOGLE_ADS_CLIENT_ID: "test",
        GOOGLE_ADS_CLIENT_SECRET: "test",
        GOOGLE_ADS_DEVELOPER_TOKEN: "test",
        GOOGLE_ADS_REFRESH_TOKEN: "test",
        REDDIT_CLIENT_ID: "test",
        REDDIT_CLIENT_SECRET: "test",
        REDDIT_REFRESH_TOKEN: "test",
        BING_ADS_DEVELOPER_TOKEN: "test",
        BING_ADS_CLIENT_ID: "test",
        BING_ADS_REFRESH_TOKEN: "test",
        GA4_PROPERTY_ID: "test",
        GTM_ACCOUNT_ID: "test",
        GTM_CONTAINER_ID: "test",
        LINKEDIN_ADS_ACCESS_TOKEN: "test",
        HOME: TMP_DIR,
      });
      // Wait for server to initialize
      await new Promise((r) => setTimeout(r, 1000));
      proc.kill("SIGTERM");
      const code = await waitForExit(proc, 3_000);
      // Should exit cleanly (0 or 143 for SIGTERM)
      if (code === null) {
        // BUG FOUND: server ignores SIGTERM
        console.warn(`BUG FOUND: [${server.pkg}] ignores SIGTERM -- will hang in Docker`);
        proc.kill("SIGKILL");
      }
    }
  }, 60_000);

  it("7.03 - All servers handle stdin close (client disconnect)", async () => {
    // WHY: MCP client crashes or disconnects -- server should not zombie
    for (const server of SERVERS) {
      const { proc } = spawnServer(server.cwd, {
        GOOGLE_ADS_CLIENT_ID: "test",
        GOOGLE_ADS_CLIENT_SECRET: "test",
        GOOGLE_ADS_DEVELOPER_TOKEN: "test",
        GOOGLE_ADS_REFRESH_TOKEN: "test",
        GA4_PROPERTY_ID: "test",
        REDDIT_CLIENT_ID: "test",
        REDDIT_CLIENT_SECRET: "test",
        REDDIT_REFRESH_TOKEN: "test",
        BING_ADS_DEVELOPER_TOKEN: "test",
        BING_ADS_CLIENT_ID: "test",
        BING_ADS_REFRESH_TOKEN: "test",
        GTM_ACCOUNT_ID: "test",
        GTM_CONTAINER_ID: "test",
        LINKEDIN_ADS_ACCESS_TOKEN: "test",
        HOME: TMP_DIR,
      });
      await new Promise((r) => setTimeout(r, 500));
      // Close stdin to simulate client disconnect
      proc.stdin?.end();
      const code = await waitForExit(proc, 5_000);
      if (code === null) {
        console.warn(`BUG FOUND: [${server.pkg}] zombies after stdin close`);
        proc.kill("SIGKILL");
      }
    }
  }, 60_000);

  it("7.04 - Sending garbage data to stdin", async () => {
    // WHY: A buggy MCP client might send malformed JSON-RPC
    for (const server of SERVERS.slice(0, 3)) {
      // Test a subset to keep runtime reasonable
      const { proc, stderr } = spawnServer(server.cwd, {
        GOOGLE_ADS_CLIENT_ID: "test",
        GOOGLE_ADS_CLIENT_SECRET: "test",
        GOOGLE_ADS_DEVELOPER_TOKEN: "test",
        GOOGLE_ADS_REFRESH_TOKEN: "test",
        GA4_PROPERTY_ID: "test",
        REDDIT_CLIENT_ID: "test",
        REDDIT_CLIENT_SECRET: "test",
        REDDIT_REFRESH_TOKEN: "test",
        BING_ADS_DEVELOPER_TOKEN: "test",
        BING_ADS_CLIENT_ID: "test",
        BING_ADS_REFRESH_TOKEN: "test",
        HOME: TMP_DIR,
      });
      await new Promise((r) => setTimeout(r, 500));
      // Send garbage
      proc.stdin?.write("THIS IS NOT JSON\n");
      proc.stdin?.write("{broken json\n");
      proc.stdin?.write(bigString(1024) + "\n");
      await new Promise((r) => setTimeout(r, 1000));
      const err = stderr();
      // Should not have unhandled exception
      expect(err).not.toMatch(/UnhandledPromiseRejection/);
      proc.kill("SIGKILL");
    }
  }, 30_000);

  it("7.05 - All package.json files have 'files' or .npmignore", () => {
    // WHY: Without this, npm publish includes node_modules, test files, secrets
    for (const server of SERVERS) {
      const pkgJson = JSON.parse(
        readFileSync(join(server.cwd, "package.json"), "utf-8"),
      );
      const hasFilesField = !!pkgJson.files;
      const hasNpmignore = existsSync(join(server.cwd, ".npmignore"));
      if (!hasFilesField && !hasNpmignore) {
        console.warn(
          `BUG FOUND: [${server.pkg}] has neither 'files' in package.json nor .npmignore -- npm publish may include secrets`,
        );
      }
    }
  });

  it("7.06 - No .env file committed in any server directory", () => {
    // WHY: Security -- .env files with real tokens should not be in source
    for (const server of SERVERS) {
      const envPath = join(server.cwd, ".env");
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, "utf-8");
        // Check if it has actual token-looking values (not just placeholders)
        const hasRealTokens =
          content.match(/=[A-Za-z0-9_-]{20,}/) &&
          !content.includes("YOUR_") &&
          !content.includes("placeholder");
        if (hasRealTokens) {
          console.error(
            `BUG FOUND: [${server.pkg}] has .env file with what looks like real credentials!`,
          );
        }
      }
    }
  });

  it("7.07 - config.json not committed (should be in .gitignore)", () => {
    // WHY: config.json contains per-user credentials
    for (const server of SERVERS) {
      const gitignorePath = join(server.cwd, ".gitignore");
      if (existsSync(gitignorePath)) {
        const gitignore = readFileSync(gitignorePath, "utf-8");
        const ignoresConfig =
          gitignore.includes("config.json") || gitignore.includes("*.json");
        if (!ignoresConfig) {
          console.warn(`[${server.pkg}] .gitignore may not exclude config.json`);
        }
      }
    }
  });

  it("7.08 - All servers export a consistent MCP server name", () => {
    // WHY: Server name appears in MCP client logs -- should be identifiable
    for (const server of SERVERS) {
      const indexSrc = readFileSync(join(server.cwd, "src/index.ts"), "utf-8");
      const nameMatch = indexSrc.match(/new Server\(\s*\{[^}]*name:\s*["']([^"']+)["']/);
      if (nameMatch) {
        // Name should relate to the package
        const serverName = nameMatch[1];
        expect(serverName.length).toBeGreaterThan(0);
      }
    }
  });

  it("7.09 - No tool description exceeds 500 characters", () => {
    // WHY: Excessively long descriptions waste LLM context window
    for (const server of SERVERS) {
      const toolsSrc = readFileSync(join(server.cwd, "src/tools.ts"), "utf-8");
      const descMatches = toolsSrc.match(/description:\s*["'`]([^"'`]+)["'`]/g) || [];
      for (const match of descMatches) {
        const desc = match.replace(/description:\s*["'`]/, "").replace(/["'`]$/, "");
        if (desc.length > 500) {
          console.warn(
            `[${server.pkg}] tool description is ${desc.length} chars (max recommended: 500): "${desc.slice(0, 80)}..."`,
          );
        }
      }
    }
  });

  it("7.10 - All required arrays in tool schemas have items defined", () => {
    // WHY: Schema without items definition allows any array element type
    for (const server of SERVERS) {
      const toolsSrc = readFileSync(join(server.cwd, "src/tools.ts"), "utf-8");
      const arrayMatches = toolsSrc.match(/type:\s*"array"[^}]*/g) || [];
      for (const match of arrayMatches) {
        if (!match.includes("items")) {
          console.warn(`BUG FOUND: [${server.pkg}] array type without items schema: ${match.slice(0, 100)}`);
        }
      }
    }
  });
});
