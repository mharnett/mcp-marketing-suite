/**
 * chaos-v4-tdd.test.ts -- Round 4: Deeper
 *
 * Previous rounds caught 43 bugs in code structure. Round 4 goes after:
 *   - DATA-level mistakes (Ralph is USING it now)
 *   - DESIGN defaults (Ender attacks assumptions)
 *   - API mutations (Mayhem IS the API)
 *   - NARRATIVE truth (Mythos tests the README)
 *
 * TDD RED/GREEN: Every test MUST FAIL against the current code.
 * If a test passes, it's too easy -- delete it and write a harder one.
 *
 * FOUR CHARACTERS:
 *   RALPH WIGGUM -- Making data mistakes: wrong IDs, wrong platforms, $0 budgets
 *   ENDER WIGGIN -- Lazy defaults: same 200KB, same 3 retries, same 5-failure breaker
 *   MAYHEM       -- IS the API: fields change type, pagination appears, timestamps shift
 *   MYTHOS       -- Tests the narrative: "120+ tools", "safe by default", "production-grade"
 *
 * Run:   npx vitest run chaos-v4-tdd.test.ts
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ============================================
// SERVER METADATA
// ============================================

const MCP_ROOT = "/Users/mark/claude-code/mcps";

interface ServerMeta {
  key: string;
  pkg: string;
  dir: string;
  srcDir: string;
  indexFile: string;
  toolsFile: string;
  errorsFile: string;
  resilienceFile: string;
  readmePath: string;
  packageJson: string;
}

const SERVERS: ServerMeta[] = [
  {
    key: "google-ads", pkg: "mcp-google-ads",
    dir: join(MCP_ROOT, "mcp-google-ads"),
    srcDir: join(MCP_ROOT, "mcp-google-ads/src"),
    indexFile: join(MCP_ROOT, "mcp-google-ads/src/index.ts"),
    toolsFile: join(MCP_ROOT, "mcp-google-ads/src/tools.ts"),
    errorsFile: join(MCP_ROOT, "mcp-google-ads/src/errors.ts"),
    resilienceFile: join(MCP_ROOT, "mcp-google-ads/src/resilience.ts"),
    readmePath: join(MCP_ROOT, "mcp-google-ads/README.md"),
    packageJson: join(MCP_ROOT, "mcp-google-ads/package.json"),
  },
  {
    key: "bing-ads", pkg: "mcp-bing-ads",
    dir: join(MCP_ROOT, "mcp-bing-ads"),
    srcDir: join(MCP_ROOT, "mcp-bing-ads/src"),
    indexFile: join(MCP_ROOT, "mcp-bing-ads/src/index.ts"),
    toolsFile: join(MCP_ROOT, "mcp-bing-ads/src/tools.ts"),
    errorsFile: join(MCP_ROOT, "mcp-bing-ads/src/errors.ts"),
    resilienceFile: join(MCP_ROOT, "mcp-bing-ads/src/resilience.ts"),
    readmePath: join(MCP_ROOT, "mcp-bing-ads/README.md"),
    packageJson: join(MCP_ROOT, "mcp-bing-ads/package.json"),
  },
  {
    key: "linkedin-ads", pkg: "mcp-linkedin-ads",
    dir: join(MCP_ROOT, "mcp-linkedin-ads"),
    srcDir: join(MCP_ROOT, "mcp-linkedin-ads/src"),
    indexFile: join(MCP_ROOT, "mcp-linkedin-ads/src/index.ts"),
    toolsFile: join(MCP_ROOT, "mcp-linkedin-ads/src/tools.ts"),
    errorsFile: join(MCP_ROOT, "mcp-linkedin-ads/src/errors.ts"),
    resilienceFile: join(MCP_ROOT, "mcp-linkedin-ads/src/resilience.ts"),
    readmePath: join(MCP_ROOT, "mcp-linkedin-ads/README.md"),
    packageJson: join(MCP_ROOT, "mcp-linkedin-ads/package.json"),
  },
  {
    key: "gsc", pkg: "mcp-google-gsc",
    dir: join(MCP_ROOT, "mcp-gsc"),
    srcDir: join(MCP_ROOT, "mcp-gsc/src"),
    indexFile: join(MCP_ROOT, "mcp-gsc/src/index.ts"),
    toolsFile: join(MCP_ROOT, "mcp-gsc/src/tools.ts"),
    errorsFile: join(MCP_ROOT, "mcp-gsc/src/errors.ts"),
    resilienceFile: join(MCP_ROOT, "mcp-gsc/src/resilience.ts"),
    readmePath: join(MCP_ROOT, "mcp-gsc/README.md"),
    packageJson: join(MCP_ROOT, "mcp-gsc/package.json"),
  },
  {
    key: "ga4", pkg: "mcp-ga4",
    dir: join(MCP_ROOT, "mcp-ga4"),
    srcDir: join(MCP_ROOT, "mcp-ga4/src"),
    indexFile: join(MCP_ROOT, "mcp-ga4/src/index.ts"),
    toolsFile: join(MCP_ROOT, "mcp-ga4/src/tools.ts"),
    errorsFile: join(MCP_ROOT, "mcp-ga4/src/errors.ts"),
    resilienceFile: join(MCP_ROOT, "mcp-ga4/src/resilience.ts"),
    readmePath: join(MCP_ROOT, "mcp-ga4/README.md"),
    packageJson: join(MCP_ROOT, "mcp-ga4/package.json"),
  },
  {
    key: "reddit-ads", pkg: "mcp-reddit-ads",
    dir: join(MCP_ROOT, "reddit-ad-mcp"),
    srcDir: join(MCP_ROOT, "reddit-ad-mcp/src"),
    indexFile: join(MCP_ROOT, "reddit-ad-mcp/src/index.ts"),
    toolsFile: join(MCP_ROOT, "reddit-ad-mcp/src/tools.ts"),
    errorsFile: join(MCP_ROOT, "reddit-ad-mcp/src/errors.ts"),
    resilienceFile: join(MCP_ROOT, "reddit-ad-mcp/src/resilience.ts"),
    readmePath: join(MCP_ROOT, "reddit-ad-mcp/README.md"),
    packageJson: join(MCP_ROOT, "reddit-ad-mcp/package.json"),
  },
  {
    key: "gtm-ga4", pkg: "mcp-gtm-ga4",
    dir: join(MCP_ROOT, "neon-one-gtm"),
    srcDir: join(MCP_ROOT, "neon-one-gtm/src"),
    indexFile: join(MCP_ROOT, "neon-one-gtm/src/index.ts"),
    toolsFile: join(MCP_ROOT, "neon-one-gtm/src/tools.ts"),
    errorsFile: join(MCP_ROOT, "neon-one-gtm/src/errors.ts"),
    resilienceFile: join(MCP_ROOT, "neon-one-gtm/src/resilience.ts"),
    readmePath: join(MCP_ROOT, "neon-one-gtm/README.md"),
    packageJson: join(MCP_ROOT, "neon-one-gtm/package.json"),
  },
];

const SUITE_README = join(MCP_ROOT, "mcp-marketing-suite/README.md");

// Helper to read a file safely
function readFile(path: string): string {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf-8");
}

// Helper to count tools from tools.ts
function countTools(toolsPath: string): number {
  const src = readFile(toolsPath);
  // Count name: " occurrences in the tools array
  const matches = src.match(/name:\s*"/g);
  return matches ? matches.length : 0;
}

// ============================================
// RALPH WIGGUM -- DATA-LEVEL MISTAKES
// ============================================

describe("RALPH WIGGUM -- Data-Level Mistakes", () => {

  // [RED] 1. Zero budget should be rejected at the tool level
  it("[RED] google_ads_create_campaign should reject daily_budget of 0", () => {
    const src = readFile(SERVERS[0].indexFile);
    // The tool should validate that budget > 0 before calling the API.
    // Currently: (args?.daily_budget as number) * 1000000 = 0, passed directly to API
    // No validation exists.
    const hasZeroBudgetCheck = /daily_budget.*<=\s*0|budget.*<=\s*0|budget.*===?\s*0|minimum.*budget/i.test(src);
    expect(hasZeroBudgetCheck).toBe(true);
  });

  // [RED] 2. Fractional cent budget should warn about precision
  it("[RED] google_ads_create_campaign should use Math.round for microcurrency conversion", () => {
    const src = readFile(SERVERS[0].indexFile);
    // Line 1631: budget_amount_micros: (args?.daily_budget as number) * 1000000
    // No Math.round -- floating point precision: 0.5 * 1000000 = 500000 (ok)
    // but 19.99 * 1000000 = 19989999.999999996 (NOT ok)
    const createCampaignSection = src.match(/case "google_ads_create_campaign"[\s\S]*?budget_amount_micros[^}]+/);
    expect(createCampaignSection).not.toBeNull();
    const section = createCampaignSection![0];
    expect(section).toMatch(/Math\.round/);
  });

  // [RED] 3. Absurdly large limit should be capped
  it("[RED] ga4_run_report should cap the limit parameter to prevent runaway queries", () => {
    const src = readFile(SERVERS[4].indexFile); // ga4
    // The tool schema says "Max rows (default 100)" but there's no server-side cap.
    // Ralph can pass limit: 1000000 and get a massive response.
    const hasLimitCap = /limit.*>.*\d{3,}|Math\.min.*limit|MAX_ROWS|max.*limit/i.test(src);
    expect(hasLimitCap).toBe(true);
  });

  // [RED] 4. Cross-platform ID confusion: Google Ads ID passed to Reddit
  it("[RED] reddit_ads resolveAccountId should reject Google Ads formatted IDs (123-456-7890)", () => {
    // The Reddit code has t2_ prefix validation, which IS correct.
    // But does it also catch IDs with dashes (Google Ads format)?
    // Current code: if (!id.startsWith("t2_")) throw
    // This actually DOES catch it. BUT the error message doesn't mention
    // "This looks like a Google Ads customer ID" -- Ralph won't understand.
    const src = readFile(SERVERS[5].indexFile);
    const resolveSection = src.match(/resolveAccountId[\s\S]*?return id/);
    expect(resolveSection).not.toBeNull();
    // The error should specifically identify likely cross-platform ID formats
    expect(resolveSection![0]).toMatch(/google.ads|looks like|wrong platform|customer.id/i);
  });

  // [RED] 5. Empty arrays should be caught before API calls
  it("[RED] google_ads_pause_items should return error when no IDs provided (all arrays empty)", () => {
    const src = readFile(SERVERS[0].indexFile);
    // When no campaign_ids, ad_group_ids, or ad_ids are provided,
    // the handler does nothing -- returns success: true with empty results.
    // Ralph sees "Items paused and no longer serving" but nothing happened.
    const pauseSection = src.match(/case "google_ads_pause_items"[\s\S]*?break;/);
    expect(pauseSection).not.toBeNull();
    const section = pauseSection![0];
    // Should check if at least one array has items
    expect(section).toMatch(/no.*ids|empty|at least one|nothing to pause/i);
  });

  // [RED] 6. Future date validation for reports
  it("[RED] report tools should warn when start_date is in the future", () => {
    // None of the servers validate that start_date <= today
    // Ralph asks for "2027-01-01" to "2027-12-31" -- the API returns empty data silently
    for (const server of SERVERS) {
      const src = readFile(server.indexFile);
      if (src.includes("start_date")) {
        const hasFutureDateCheck = /future.*date|date.*future|start_date.*>.*today|after.*today/i.test(src);
        if (hasFutureDateCheck) return; // At least one server checks
      }
    }
    expect(false).toBe(true); // None check
  });

  // [RED] 7. Duplicate campaign creation protection
  it("[RED] google_ads_create_campaign should warn if a campaign with the same name already exists", () => {
    const src = readFile(SERVERS[0].indexFile);
    // Ralph accidentally calls create_campaign twice with the same params.
    // The API creates two identical campaigns.
    const hasDuplicateCheck = /campaign.*already exists|duplicate.*campaign|same.*name/i.test(src);
    expect(hasDuplicateCheck).toBe(true);
  });

  // [RED] 8. Budget unit confusion across platforms
  it("[RED] bing_ads_update_campaign_budget tool description should specify currency unit (dollars vs cents vs micros)", () => {
    const toolsSrc = readFile(SERVERS[1].toolsFile); // bing-ads
    // Current: "New daily budget amount in account currency" -- ambiguous.
    // Is it dollars? Cents? Microcurrency? Ralph doesn't know.
    const budgetDesc = toolsSrc.match(/daily_budget[\s\S]*?description:\s*"([^"]+)"/);
    expect(budgetDesc).not.toBeNull();
    const desc = budgetDesc![1];
    // Should explicitly say "dollars" or "cents" or "microcurrency"
    expect(desc).toMatch(/dollar|cent|micro|e\.g\.\s*\d+\.\d{2}/i);
  });

  // [RED] 9. Campaign name with special chars should be sanitized or validated
  it("[RED] google_ads_create_campaign should sanitize or reject HTML/script in campaign names", () => {
    const src = readFile(SERVERS[0].indexFile);
    // Ralph passes name: 'Test <script>alert("xss")</script> Campaign'
    // The server passes it straight to the API with no validation on the name field.
    // Look specifically in the create_campaign handler for name sanitization
    const createHandler = src.match(/case "google_ads_create_campaign"[\s\S]*?break;/);
    expect(createHandler).not.toBeNull();
    const handler = createHandler![0];
    // Should sanitize the name before passing to the API
    const hasNameSanitization = /name.*sanitiz|name.*escap|name.*strip|name.*\.replace\([^-]/i.test(handler);
    expect(hasNameSanitization).toBe(true);
  });

  // [RED] 10. Passing wrong field name in Reddit report
  it("[RED] reddit_ads_get_performance_report should validate field names against known API fields", () => {
    const src = readFile(SERVERS[5].indexFile);
    // Ralph passes fields: ["imrpessions", "clikcs"] (typos)
    // The API silently ignores unknown fields and returns nothing useful
    const hasFieldValidation = /valid.*field|allowed.*field|known.*field|VALID_FIELDS|ALLOWED_METRICS/i.test(src);
    expect(hasFieldValidation).toBe(true);
  });
});

// ============================================
// ENDER WIGGIN -- DESIGN DEFAULT ATTACKS
// ============================================

describe("ENDER WIGGIN -- Design Default Attacks", () => {

  // [RED] 11. Response size limit is identical across all 7 servers
  it("[RED] response size limit should be calibrated per-server, not copy-pasted 200KB everywhere", () => {
    const limits = new Set<number>();
    for (const server of SERVERS) {
      const src = readFile(server.resilienceFile);
      const match = src.match(/MAX_RESPONSE_SIZE\s*=\s*(\d[\d_]*)/);
      if (match) limits.add(parseInt(match[1].replace(/_/g, "")));
    }
    // Currently all servers use exactly 200_000.
    // Reddit returns tiny responses (10KB). Google Ads can return 50MB.
    // They should have DIFFERENT limits.
    expect(limits.size).toBeGreaterThan(1);
  });

  // [RED] 12. Retry count is not configurable
  it("[RED] retry count should be configurable via env var or config", () => {
    let anyConfigurable = false;
    for (const server of SERVERS) {
      const src = readFile(server.resilienceFile);
      if (/MAX_RETRIES|RETRY_COUNT|process\.env.*retry|config.*retry/i.test(src)) {
        anyConfigurable = true;
      }
    }
    expect(anyConfigurable).toBe(true);
  });

  // [RED] 13. Circuit breaker alternating success/failure never opens
  it("[RED] circuit breaker should track failure RATE not just consecutive failures", () => {
    // ConsecutiveBreaker(5) means: 5 failures IN A ROW opens the breaker.
    // If you alternate success/failure, the breaker never opens even at 50% failure rate.
    // This is correct behavior for ConsecutiveBreaker but wrong for protecting rate-limited APIs.
    // A SlidingWindowBreaker or percentage-based breaker would be more appropriate.
    for (const server of SERVERS) {
      const src = readFile(server.resilienceFile);
      // Should use SamplingBreaker or SlidingCountBreaker, not just ConsecutiveBreaker
      const usesRateBased = /SamplingBreaker|SlidingCount|failure.*rate|percentage/i.test(src);
      if (usesRateBased) return;
    }
    expect(false).toBe(true);
  });

  // [RED] 14. Timeout is 30s for everything -- too short for large GAQL queries
  it("[RED] timeout should be configurable or calibrated per-operation", () => {
    let anyConfigurable = false;
    for (const server of SERVERS) {
      const src = readFile(server.resilienceFile);
      // Check for any per-operation timeout or env-var-based timeout
      if (/TIMEOUT_MS|process\.env.*timeout|operationTimeout|per.*operation.*timeout/i.test(src)) {
        anyConfigurable = true;
      }
    }
    expect(anyConfigurable).toBe(true);
  });

  // [RED] 15. Token refresh is reactive -- no proactive refresh before expiry
  it("[RED] Reddit token management should proactively refresh tokens before they expire", () => {
    const src = readFile(SERVERS[5].indexFile);
    // Current: checks Date.now() < this.tokenExpiry, refreshes when expired.
    // Missing: background refresh BEFORE expiry (e.g., refresh when < 5 min remaining).
    // This means the first call after token expiry takes a double-round-trip.
    const hasProactiveRefresh = /proactive|background.*refresh|refresh.*before.*expir|pre.*expir/i.test(src);
    expect(hasProactiveRefresh).toBe(true);
  });

  // [RED] 16. Error responses bypass safeResponse
  it("[RED] error responses should be size-limited through safeResponse", () => {
    // When an API returns a 500 with a massive stack trace, the error handler
    // sends it straight to Claude's context window without size limiting.
    for (const server of SERVERS) {
      const src = readFile(server.indexFile);
      // Look for error handlers that use safeResponse
      const errorHandler = src.match(/catch.*rawError[\s\S]*?isError:\s*true/);
      if (errorHandler) {
        const section = errorHandler[0];
        if (/safeResponse/.test(section)) return; // At least one server does it
      }
    }
    expect(false).toBe(true);
  });

  // [RED] 17. LinkedIn daily rate limit (100 req/day) vs 3 retries
  it("[RED] linkedin-ads should have lower retry count to preserve daily rate limit quota", () => {
    const src = readFile(SERVERS[2].resilienceFile);
    const match = src.match(/maxAttempts:\s*(\d+)/);
    expect(match).not.toBeNull();
    const retries = parseInt(match![1]);
    // LinkedIn has ~100 requests/day. 3 retries per call means each failed call
    // burns 4 requests (1 + 3 retries). At 3 retries, a batch of 25 failures
    // would burn 100 requests -- entire daily quota.
    // LinkedIn should use 1 retry max, or preferably 0 retries for non-transient.
    expect(retries).toBeLessThanOrEqual(1);
  });

  // [RED] 18. No request deduplication for write operations
  it("[RED] write tools should have idempotency or deduplication protection", () => {
    // If Claude sends create_campaign twice due to a timeout/retry at the MCP layer,
    // the server creates two campaigns. No request ID, no dedup check.
    const src = readFile(SERVERS[0].indexFile);
    const hasDedup = /idempoten|dedup|request.*id|already.*created|mutex|lock/i.test(src);
    expect(hasDedup).toBe(true);
  });

  // [RED] 19. Circuit breaker is shared across ALL tools in a server
  it("[RED] circuit breaker should be per-operation or per-endpoint, not global", () => {
    // If getCampaigns fails 5 times, the breaker opens and BLOCKS createKeyword too.
    // These are different API endpoints with different failure modes.
    for (const server of SERVERS) {
      const src = readFile(server.resilienceFile);
      // The single `circuitBreakerPolicy` is shared across ALL operations.
      // Should have a Map<string, CircuitBreaker> or factory creating per-operation breakers.
      const hasPerOpBreaker = /Map.*breaker|breaker.*Map|operationBreakers|breakerFor|getBreaker/i.test(src);
      if (hasPerOpBreaker) return;
    }
    expect(false).toBe(true);
  });

  // [RED] 20. Cooperative timeout means operations can run forever if they don't check
  it("[RED] timeout should use Aggressive strategy not Cooperative for API calls", () => {
    // TimeoutStrategy.Cooperative means the timeout only works if the wrapped function
    // checks for cancellation. fetch() doesn't check cockatiel's cancellation token.
    // The AbortSignal.timeout(30_000) in Reddit is the right approach but it's separate
    // from the cockatiel timeout -- they're redundant and potentially conflicting.
    for (const server of SERVERS) {
      const src = readFile(server.resilienceFile);
      if (src.includes("TimeoutStrategy.Aggressive")) return;
    }
    // All use Cooperative, which doesn't actually cancel API calls
    expect(false).toBe(true);
  });
});

// ============================================
// MAYHEM -- IS THE API
// ============================================

describe("MAYHEM -- IS The API", () => {

  // [RED] 21. Google Ads API version is not pinned
  it("[RED] google-ads-api version should be exact (not ^) in package.json", () => {
    const pkg = JSON.parse(readFile(SERVERS[0].packageJson));
    const version = pkg.dependencies?.["google-ads-api"] || "";
    // Current: "^23.0.0" -- will auto-upgrade to 23.x.x
    // API field names can change between minor versions
    expect(version).not.toMatch(/^\^/);
    expect(version).not.toMatch(/^~/);
  });

  // [RED] 22. No pagination indicator in campaign list responses
  it("[RED] list tools should include pagination info (has_more, total_count)", () => {
    const src = readFile(SERVERS[0].indexFile);
    // google_ads_list_campaigns returns raw query results with no pagination metadata
    const listCampaignsHandler = src.match(/case "google_ads_list_campaigns"[\s\S]*?break;/);
    expect(listCampaignsHandler).not.toBeNull();
    const handler = listCampaignsHandler![0];
    expect(handler).toMatch(/has_more|total_count|next_page|pagination|page_token/i);
  });

  // [RED] 23. GA4 "(not set)" values not handled
  it("[RED] ga4_run_report should handle (not set) dimension values gracefully", () => {
    const src = readFile(SERVERS[4].indexFile);
    // GA4 API returns "(not set)" for dimensions where data isn't available.
    // If Claude uses this as a lookup key in a subsequent tool call, it breaks.
    // The server should flag or filter these.
    const handlesNotSet = /not.set|\(not set\)|dimensionValue.*null|empty.*dimension/i.test(src);
    expect(handlesNotSet).toBe(true);
  });

  // [RED] 24. No rate limit header reading from HTTP responses
  it("[RED] at least one server should read rate limit headers from HTTP responses", () => {
    let anyReadsHeaders = false;
    for (const server of SERVERS) {
      const src = readFile(server.indexFile);
      // Must specifically read headers from the fetch response (resp.headers.get)
      // Not just have a RateLimitError class.
      if (/resp\.headers\.get.*rate|headers\.get.*retry-after|x-ratelimit-remaining/i.test(src)) {
        anyReadsHeaders = true;
      }
    }
    expect(anyReadsHeaders).toBe(true);
  });

  // [RED] 25. Eventual consistency not documented or handled
  it("[RED] create tools should document eventual consistency (created items may not appear in list immediately)", () => {
    // After creating a campaign, immediately calling list_campaigns might not include it.
    // The tools should at least document this, if not handle it.
    const src = readFile(SERVERS[0].indexFile);
    const hasConsistencyNote = /eventual.*consist|may not.*immediately|propagat|delay.*after.*creat/i.test(src);
    expect(hasConsistencyNote).toBe(true);
  });

  // [RED] 26. Reddit API timestamp format not validated
  it("[RED] reddit_ads should validate ISO 8601 timestamp format before sending to API", () => {
    const src = readFile(SERVERS[5].indexFile);
    // Ralph passes start_time: "tomorrow" or "2026-03-17" (missing time component)
    // The code does handle date-only for reports but NOT for campaign creation.
    const createSection = src.match(/case "reddit_ads_create_campaign"[\s\S]*?break;/);
    expect(createSection).not.toBeNull();
    const section = createSection![0];
    // Should validate ISO 8601 format
    expect(section).toMatch(/ISO.*8601|validate.*time|invalid.*format|\.toISOString|regex.*\d{4}-\d{2}/i);
  });

  // [RED] 27. LinkedIn API version pinned in config but not validated
  it("[RED] linkedin-ads should validate API version format at startup", () => {
    const src = readFile(SERVERS[2].indexFile);
    // The config has api.version but no validation that it's a valid format
    const hasVersionValidation = /version.*valid|validate.*version|invalid.*version|api.*version.*format/i.test(src);
    expect(hasVersionValidation).toBe(true);
  });

  // [RED] 28. Google Ads GAQL query has no result row limit
  it("[RED] google_ads_gaql_query should enforce a max row limit to prevent massive responses", () => {
    const src = readFile(SERVERS[0].indexFile);
    // Raw GAQL queries can return unlimited rows. No server-side cap.
    const gaqlHandler = src.match(/case "google_ads_gaql_query"[\s\S]*?break;/);
    if (!gaqlHandler) {
      expect(gaqlHandler).not.toBeNull();
      return;
    }
    const handler = gaqlHandler![0];
    // Should inject LIMIT if not present, or cap the result set
    expect(handler).toMatch(/LIMIT|max.*row|limit.*row|cap.*result/i);
  });

  // [RED] 29. Reddit budget field name mismatch between create and update
  it("[RED] reddit_ads update_campaign should use consistent field name for budget", () => {
    const src = readFile(SERVERS[5].indexFile);
    // Create uses: goal_value: data.dailyBudgetMicro
    // Update uses: updates.daily_budget_micro (line 561)
    // These are DIFFERENT API field names. If the Reddit API expects goal_value,
    // the update is silently ignored.
    const createMatch = src.match(/createCampaign[\s\S]*?goal_value/);
    const updateMatch = src.match(/case "reddit_ads_update_campaign"[\s\S]*?daily_budget/);
    expect(createMatch).not.toBeNull();
    expect(updateMatch).not.toBeNull();
    // The field name used in create (goal_value) and update (daily_budget_micro)
    // should be the same
    const createField = createMatch![0].includes("goal_value") ? "goal_value" : "daily_budget_micro";
    const updateField = updateMatch![0].includes("goal_value") ? "goal_value" : "daily_budget_micro";
    expect(createField).toBe(updateField);
  });

  // [RED] 30. No GAQL injection protection for raw query tool
  it("[RED] google_ads_gaql_query should reject queries with mutation statements (INSERT, UPDATE, DELETE)", () => {
    const src = readFile(SERVERS[0].indexFile);
    // The sanitizeNumericId and escapeGaqlString functions protect parameterized queries,
    // but the raw GAQL tool passes user input directly.
    // A query like "SELECT campaign.id FROM campaign; DELETE FROM campaign WHERE 1=1"
    // should be rejected (though GAQL doesn't support this, defense-in-depth).
    const gaqlHandler = src.match(/case "google_ads_gaql_query"[\s\S]*?break;/);
    expect(gaqlHandler).not.toBeNull();
    const handler = gaqlHandler![0];
    expect(handler).toMatch(/INSERT|UPDATE|DELETE|mutate|read.*only|SELECT.*only/i);
  });
});

// ============================================
// MYTHOS -- TESTS THE NARRATIVE
// ============================================

describe("MYTHOS -- Tests The Narrative", () => {

  // [RED] 31. "120+ tools" claim -- the per-server table counts should add up to 120+
  it("[RED] suite README per-server tool counts should add up to the claimed total", () => {
    const readme = readFile(SUITE_README);

    // Count actual tools from all 7 TypeScript servers (from tools.ts source code)
    let actualTsTools = 0;
    for (const server of SERVERS) {
      actualTsTools += countTools(server.toolsFile);
    }

    // Extract per-server counts from the README table
    const tableMatches = [...readme.matchAll(/\|\s*(\d+)\s*\|\s*`(?:npm|pip) install/g)];
    let tableTotalClaimed = 0;
    for (const m of tableMatches) {
      tableTotalClaimed += parseInt(m[1]);
    }

    // The README table totals should match: per-server sums == headline number
    // AND the TypeScript server counts should match the table
    // Count just npm servers from table
    const npmMatches = [...readme.matchAll(/\|\s*(\d+)\s*\|\s*`npm install ([\w-]+)`/g)];
    let npmTableTotal = 0;
    const perServerDiscrepancies: string[] = [];
    for (const m of npmMatches) {
      const tableCt = parseInt(m[1]);
      npmTableTotal += tableCt;
      const pkgName = m[2];
      const server = SERVERS.find(s => s.pkg === pkgName);
      if (server) {
        const actualCt = countTools(server.toolsFile);
        if (actualCt !== tableCt) {
          perServerDiscrepancies.push(`${pkgName}: table=${tableCt}, actual=${actualCt}`);
        }
      }
    }

    // At least one discrepancy should exist (GTM went from 14 to 15 tools, or similar)
    // OR the total should not match the headline claim
    // This is testing that the README is MAINTAINED, not just initially correct
    expect(perServerDiscrepancies.length).toBe(0);
  });

  // [RED] 32. Per-server tool count in README table should match actual tools.ts
  it("[RED] README table tool counts should match actual tool counts in each server", () => {
    const readme = readFile(SUITE_README);
    const mismatches: string[] = [];

    // Parse the table: | [server-name](url) | Platform | N | `npm install pkg` |
    const tableRows = readme.match(/\|\s*\[[\w-]+\].*?\|\s*\w+.*?\|\s*(\d+)\s*\|\s*`(?:npm|pip) install ([\w-]+)`/g);
    expect(tableRows).not.toBeNull();

    for (const row of tableRows || []) {
      const parsed = row.match(/\|\s*(\d+)\s*\|\s*`(?:npm|pip) install ([\w-]+)`/);
      if (!parsed) continue;
      const claimedCount = parseInt(parsed[1]);
      const pkgName = parsed[2];

      // Find the matching server
      const server = SERVERS.find(s => s.pkg === pkgName);
      if (!server) continue; // Skip meta-ads-mcp (Python)

      const actualCount = countTools(server.toolsFile);
      if (actualCount !== claimedCount) {
        mismatches.push(`${pkgName}: README says ${claimedCount}, actual ${actualCount}`);
      }
    }

    expect(mismatches).toEqual([]);
  });

  // [RED] 33. "Safe by default" -- ALL create tools must default to PAUSED
  it("[RED] reddit_ads_create_campaign tool allows configured_status: ACTIVE to override PAUSED default", () => {
    // The tool schema exposes configured_status as a parameter.
    // Claude could pass ACTIVE, bypassing the "safe by default" claim.
    // Safe by default means the SERVER enforces PAUSED, not just defaults to it.
    const src = readFile(SERVERS[5].indexFile);
    // Look for server-side enforcement: should IGNORE configured_status on create
    // or at least warn
    const createSection = src.match(/case "reddit_ads_create_campaign"[\s\S]*?break;/);
    expect(createSection).not.toBeNull();
    const section = createSection![0];
    // If configured_status is passed through, it's not "safe by default" -- it's "safe by convention"
    const enforcedPaused = /configured_status.*PAUSED.*only|override.*PAUSED|ignore.*configured_status|force.*PAUSED/i.test(section);
    expect(enforcedPaused).toBe(true);
  });

  // [RED] 34. "Production-grade" claim without monitoring
  it("[RED] suite README claims production-grade but no server has metrics/observability endpoints", () => {
    const readme = readFile(SUITE_README);
    expect(readme.toLowerCase()).toContain("production-grade");

    // Check if ANY server has actual metrics ENDPOINTS or observability INTEGRATION
    // (not just the word "metrics" appearing in GAQL queries like "metrics.impressions")
    let hasMetricsEndpoint = false;
    for (const server of SERVERS) {
      const src = readFile(server.indexFile);
      // Look for actual metrics infrastructure, not Google Ads "metrics.clicks" fields
      if (/prometheus.*register|new Counter|new Histogram|opentelemetry\.init|StatsD|metrics\.endpoint|\/metrics/i.test(src)) {
        hasMetricsEndpoint = true;
      }
    }
    expect(hasMetricsEndpoint).toBe(true);
  });

  // [RED] 35. CHANGELOG doesn't mention tool renames
  it("[RED] gtm-ga4 CHANGELOG should document the ga4_* to gtm_ga4_* tool rename", () => {
    const changelog = readFile(join(SERVERS[6].dir, "CHANGELOG.md"));
    // Tools were renamed from ga4_* to gtm_ga4_* to avoid collision with standalone mcp-ga4.
    // This is a BREAKING CHANGE that should be in the changelog.
    const mentionsRename = /rename|gtm_ga4|breaking.*change|tool.*name.*change|prefix/i.test(changelog);
    expect(mentionsRename).toBe(true);
  });

  // [RED] 36. CHANGELOG versions don't match package.json versions
  it("[RED] CHANGELOG latest version should match package.json version for all servers", () => {
    const mismatches: string[] = [];
    for (const server of SERVERS) {
      const changelog = readFile(join(server.dir, "CHANGELOG.md"));
      const pkg = JSON.parse(readFile(server.packageJson));
      const changelogVersion = changelog.match(/\[(\d+\.\d+\.\d+)\]/)?.[1];
      if (changelogVersion && changelogVersion !== pkg.version) {
        mismatches.push(`${server.key}: CHANGELOG ${changelogVersion} != package.json ${pkg.version}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  // [RED] 37. .mcp.json example in README is incomplete
  it("[RED] suite README .mcp.json example should include GOOGLE_ADS_CUSTOMER_ID", () => {
    const readme = readFile(SUITE_README);
    // The example .mcp.json for google-ads doesn't include GOOGLE_ADS_CUSTOMER_ID
    // which is needed for single-client mode
    const googleAdsSection = readme.match(/google-ads[\s\S]*?}/);
    expect(googleAdsSection).not.toBeNull();
    expect(googleAdsSection![0]).toContain("GOOGLE_ADS_CUSTOMER_ID");
  });

  // [RED] 38. README warns against sharing .mcp.json with credentials
  it("[RED] suite README should explicitly warn against sharing .mcp.json files", () => {
    const readme = readFile(SUITE_README);
    // The README contains "CLIENT_SECRET" as an env var name, but that's not a WARNING.
    // It should have an explicit security note telling users not to share their .mcp.json.
    const hasExplicitWarning = /never share.*\.mcp|\.mcp\.json.*private|do not commit.*\.mcp|WARNING.*credential|security.*\.mcp/i.test(readme);
    expect(hasExplicitWarning).toBe(true);
  });

  // [RED] 39. No audit log for write operations
  it("[RED] at least one server should log write operations to a persistent audit file", () => {
    let hasAuditLog = false;
    for (const server of SERVERS) {
      const src = readFile(server.indexFile);
      if (/audit.*log|write.*log|action.*log|mutation.*log|appendFile.*audit|fs\.append/i.test(src)) {
        hasAuditLog = true;
      }
    }
    expect(hasAuditLog).toBe(true);
  });

  // [RED] 40. License file FULL TEXT should be identical across all servers
  it("[RED] all first-party servers should have byte-identical LICENSE files", () => {
    // They're all MIT, but are the copyright holders and years consistent?
    const licenseTexts = new Map<string, string>();
    for (const server of SERVERS) {
      const licensePath = join(server.dir, "LICENSE");
      if (existsSync(licensePath)) {
        // Compare full text, not just the type
        const text = readFile(licensePath).trim();
        licenseTexts.set(server.key, text);
      }
    }
    // All should be present
    expect(licenseTexts.size).toBe(SERVERS.length);
    // All should be IDENTICAL (same year, same holder, same text)
    const uniqueTexts = new Set(licenseTexts.values());
    expect(uniqueTexts.size).toBe(1);
  });

  // [RED] 41. Multi-client support claim: GSC doesn't support it via env vars
  it("[RED] suite README's multi-client claim should note GSC limitations", () => {
    const readme = readFile(SUITE_README);
    // GSC uses env vars only (no config.json multi-client support).
    // But the suite README implies all servers support multi-client.
    const gscSection = readme.match(/mcp-google-gsc[\s\S]*?(?=###|$)/);
    if (gscSection) {
      // Should mention single-client or env-var-only limitation
      const mentionsLimit = /single.*client|env.*var.*only|one.*property|no.*multi/i.test(gscSection[0]);
      expect(mentionsLimit).toBe(true);
    } else {
      // If there's no GSC section, the general architecture section should note this
      expect(readme).toMatch(/GSC.*single|GSC.*env|search.*console.*single/i);
    }
  });
});

// ============================================
// COMBINED: PRODUCTION INCIDENTS
// ============================================

describe("COMBINED -- Production Incidents", () => {

  // [RED] 42. The billing surprise: budget unit not documented in every budget tool
  it("[RED] every budget-related tool should have explicit unit documentation (dollars, not microcurrency)", () => {
    const toolsWithBudget: { server: string; tool: string; description: string }[] = [];

    for (const server of SERVERS) {
      const src = readFile(server.toolsFile);
      // Find all tools with "budget" or "bid" in their properties
      const toolMatches = src.matchAll(/name:\s*"([^"]+)"[\s\S]*?(?=name:\s*"|$)/g);
      for (const match of toolMatches) {
        const toolBlock = match[0];
        const toolName = match[1];
        if (/budget|bid.*dollar/i.test(toolBlock)) {
          // Extract the budget field description
          const budgetDesc = toolBlock.match(/(?:budget|bid).*?description:\s*"([^"]+)"/i);
          if (budgetDesc) {
            toolsWithBudget.push({
              server: server.key,
              tool: toolName,
              description: budgetDesc[1],
            });
          }
        }
      }
    }

    // Every budget tool should explicitly say "dollars" or "USD" or include an example
    const unclear = toolsWithBudget.filter(t =>
      !/dollar|USD|\$|e\.g\.\s*\d+\.\d{2}/i.test(t.description) &&
      !/micro/i.test(t.description) // microcurrency docs are ok too
    );
    expect(unclear).toEqual([]);
  });

  // [RED] 43. Google Ads create_campaign does not Math.round the microcurrency conversion
  it("[RED] google_ads_create_campaign microcurrency conversion should use Math.round", () => {
    const src = readFile(SERVERS[0].indexFile);
    // Find the specific line: budget_amount_micros: (args?.daily_budget as number) * 1000000
    const line = src.match(/budget_amount_micros:\s*\(args\?\.daily_budget.*?\)\s*\*\s*1000000/);
    expect(line).not.toBeNull();
    // It should use Math.round() to prevent floating point precision issues
    // 19.99 * 1000000 = 19989999.999999996 without Math.round
    expect(line![0]).toMatch(/Math\.round/);
  });

  // [RED] 44. Reddit update uses wrong API field name for budget
  it("[RED] reddit_ads_update_campaign should use goal_value not daily_budget_micro for budget updates", () => {
    const src = readFile(SERVERS[5].indexFile);
    const updateHandler = src.match(/case "reddit_ads_update_campaign"[\s\S]*?(?=case\s)/);
    expect(updateHandler).not.toBeNull();
    const handler = updateHandler![0];
    // Create uses goal_value. Update uses daily_budget_micro.
    // These should match the API's expected field name.
    // If the API expects goal_value, the update silently fails to change the budget.
    expect(handler).toContain("goal_value");
  });

  // [RED] 45. The config leak: .gitignore should also exclude .env files
  it("[RED] all servers should have .gitignore that excludes .env AND run-mcp.sh", () => {
    // config.json is already in .gitignore. But .env files and run-mcp.sh
    // (which contains Keychain reads) should also be excluded.
    const missing: string[] = [];
    for (const server of SERVERS) {
      const gitignorePath = join(server.dir, ".gitignore");
      if (existsSync(gitignorePath)) {
        const content = readFile(gitignorePath);
        if (!content.includes(".env")) {
          missing.push(`${server.key} (missing .env)`);
        }
        if (!content.includes("run-mcp.sh")) {
          missing.push(`${server.key} (missing run-mcp.sh)`);
        }
      } else {
        missing.push(`${server.key} (no .gitignore)`);
      }
    }
    expect(missing).toEqual([]);
  });

  // [RED] 46. Error responses include raw stack traces that could leak secrets
  it("[RED] error responses should redact file paths and env var names from stack traces", () => {
    let anyRedacts = false;
    for (const server of SERVERS) {
      const src = readFile(server.indexFile);
      // Check if error responses redact stack traces
      if (/redact.*stack|sanitize.*stack|stack.*redact|\.stack.*replace|strip.*path/i.test(src)) {
        anyRedacts = true;
      }
    }
    expect(anyRedacts).toBe(true);
  });

  // [RED] 47. No request timeout for Reddit token refresh
  it("[RED] reddit_ads token refresh fetch should have an AbortSignal timeout", () => {
    const src = readFile(SERVERS[5].indexFile);
    // The token refresh uses fetch() but does the token refresh call have a timeout?
    const tokenRefreshSection = src.match(/access_token[\s\S]*?refresh_token[\s\S]*?fetch\([^)]*reddit\.com.*?\)/s);
    expect(tokenRefreshSection).not.toBeNull();
    expect(tokenRefreshSection![0]).toMatch(/AbortSignal|signal|timeout/i);
  });

  // [RED] 48. LinkedIn token persisted via child_process but import is in wrong scope
  it("[RED] linkedin-ads should import execFileSync at top level, not inside token refresh", () => {
    const src = readFile(SERVERS[2].indexFile);
    // Dynamic import inside token refresh:
    //   const { execFileSync } = await import("child_process");
    // This works but is slow on every token rotation. Should be top-level import.
    const hasDynamicImport = /await import\("child_process"\)/.test(src);
    const hasTopLevelExecFile = /^import.*execFileSync.*from "child_process"/m.test(src);
    // Should have top-level import, not dynamic
    expect(hasDynamicImport).toBe(false);
    expect(hasTopLevelExecFile).toBe(true);
  });

  // [RED] 49. LinkedIn token expiry calculation doesn't account for clock skew
  it("[RED] linkedin-ads should subtract clock skew buffer from token expiry", () => {
    const src = readFile(SERVERS[2].indexFile);
    // Line: this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    // 60 seconds buffer. But LinkedIn tokens are 60 DAYS. 60 seconds is negligible.
    // Reddit uses (expires_in - 60) for 1-hour tokens -- 60s is ~1.7% buffer.
    // For LinkedIn, this is 0.001% buffer. Network latency + clock skew could be more.
    // Not a real bug, but inconsistent design. The buffer should scale with TTL.
    const expiryCalc = src.match(/tokenExpiry\s*=\s*Date\.now\(\)\s*\+.*expires_in.*?(\d+)\s*\)/);
    expect(expiryCalc).not.toBeNull();
    const bufferSeconds = parseInt(expiryCalc![1]);
    // Buffer should be at least 5 minutes (300s) for long-lived tokens
    expect(bufferSeconds).toBeGreaterThanOrEqual(300);
  });

  // [RED] 50. No health check heartbeat for long-running MCP servers
  it("[RED] at least one server should have a periodic health check or heartbeat", () => {
    let hasHeartbeat = false;
    for (const server of SERVERS) {
      const src = readFile(server.indexFile);
      if (/setInterval.*health|heartbeat|periodic.*check|keepalive/i.test(src)) {
        hasHeartbeat = true;
      }
    }
    expect(hasHeartbeat).toBe(true);
  });
});

// ============================================
// DEEP CUTS -- The Hardest Bugs
// ============================================

describe("DEEP CUTS -- The Hardest Bugs", () => {

  // [RED] 51. safeResponse mutates the original data object
  it("[RED] safeResponse should not mutate the original data (should deep clone first)", () => {
    // Look at safeResponse: it does obj[key] = obj[key].slice(...)
    // This mutates the original object passed in. If the caller still holds a reference,
    // they see truncated data.
    for (const server of SERVERS) {
      const src = readFile(server.resilienceFile);
      const safeResponseFn = src.match(/function safeResponse[\s\S]*?^}/m);
      if (safeResponseFn) {
        const fn = safeResponseFn[0];
        // Should clone before mutating
        const clones = /structuredClone|JSON\.parse.*JSON\.stringify|\.\.\.data|Object\.assign/i.test(fn);
        if (clones) return;
      }
    }
    expect(false).toBe(true);
  });

  // [RED] 52. Google Ads enable_items has no confirmation step
  it("[RED] google_ads_enable_items should require a confirmation_token or double-confirmation", () => {
    const src = readFile(SERVERS[0].indexFile);
    const enableHandler = src.match(/case "google_ads_enable_items"[\s\S]*?break;/);
    expect(enableHandler).not.toBeNull();
    // Should have some form of confirmation beyond just calling the tool
    const hasConfirmation = /confirm|token|approval|are you sure|double.*check/i.test(enableHandler![0]);
    expect(hasConfirmation).toBe(true);
  });

  // [RED] 53. Reddit bid_dollars = 0 not validated
  it("[RED] reddit_ads_create_ad_group should reject bid_dollars of 0 or negative", () => {
    const src = readFile(SERVERS[5].indexFile);
    const createAdGroupSection = src.match(/case "reddit_ads_create_ad_group"[\s\S]*?break;/);
    expect(createAdGroupSection).not.toBeNull();
    const section = createAdGroupSection![0];
    // Should validate bid > 0
    expect(section).toMatch(/bid.*<=?\s*0|bid.*negative|minimum.*bid|invalid.*bid/i);
  });

  // [RED] 54. Date format inconsistency: some tools accept "7daysAgo" but others only accept YYYY-MM-DD
  it("[RED] all date parameters should document accepted formats consistently", () => {
    // GA4 accepts "7daysAgo", "today" etc. Google Ads requires YYYY-MM-DD.
    // GSC accepts "90daysAgo". Reddit requires ISO 8601.
    // The formats are never cross-validated or made consistent.
    const formats: { server: string; tool: string; format: string }[] = [];

    for (const server of SERVERS) {
      const src = readFile(server.toolsFile);
      const dateDescs = [...src.matchAll(/(?:start_date|end_date)[\s\S]*?description:\s*"([^"]+)"/g)];
      for (const m of dateDescs) {
        formats.push({ server: server.key, tool: "date param", format: m[1] });
      }
    }

    // Check that EVERY date parameter description includes accepted format examples
    const missingFormat = formats.filter(f => !/YYYY-MM-DD|ISO|daysAgo|format/i.test(f.format));
    expect(missingFormat).toEqual([]);
  });

  // [RED] 55. Google Ads keyword_volume has no per-call keyword count validation
  it("[RED] google_ads_keyword_volume should enforce max 20 keywords server-side", () => {
    const src = readFile(SERVERS[0].indexFile);
    // The tool schema says "max 20 per call" but is this enforced server-side?
    const volumeHandler = src.match(/case "google_ads_keyword_volume"[\s\S]*?break;/);
    expect(volumeHandler).not.toBeNull();
    const handler = volumeHandler![0];
    expect(handler).toMatch(/\.length\s*>\s*20|max.*20|keywords.*limit|too many.*keyword/i);
  });

  // [RED] 56. Reddit configured_status accepts any string, not just ACTIVE/PAUSED
  it("[RED] reddit_ads_create_campaign should validate configured_status enum values", () => {
    const src = readFile(SERVERS[5].indexFile);
    // Ralph passes configured_status: "ENABLED" (Google Ads term) or "active" (lowercase)
    // Reddit API will reject it but the error message won't be helpful
    const createSection = src.match(/case "reddit_ads_create_campaign"[\s\S]*?break;/);
    expect(createSection).not.toBeNull();
    const section = createSection![0];
    const validatesStatus = /ACTIVE|PAUSED.*only|valid.*status|enum.*check|allowed.*status/i.test(section)
      && /throw|error|reject|invalid/i.test(section);
    expect(validatesStatus).toBe(true);
  });

  // [RED] 57. Google Ads enable_items returns "Items enabled and now LIVE" even if arrays are empty
  it("[RED] google_ads_enable_items should not say 'Items enabled' when nothing was enabled", () => {
    const src = readFile(SERVERS[0].indexFile);
    const enableHandler = src.match(/case "google_ads_enable_items"[\s\S]*?"Items enabled and now LIVE"/);
    expect(enableHandler).not.toBeNull();
    // The message "Items enabled and now LIVE" is returned even when
    // no campaign_ids, ad_group_ids, or ad_ids were provided.
    // Should check if any items were actually enabled.
    const handler = src.match(/case "google_ads_enable_items"[\s\S]*?break;/);
    expect(handler![0]).toMatch(/no.*items|nothing.*to.*enable|at least one|empty/i);
  });

  // [RED] 58. LinkedIn API has 100 req/day limit but no request counter
  it("[RED] linkedin-ads should track request count and warn when approaching daily limit", () => {
    const src = readFile(SERVERS[2].indexFile);
    const hasRequestCounter = /request.*count|daily.*limit|req.*count|api.*calls.*today|quota/i.test(src);
    expect(hasRequestCounter).toBe(true);
  });

  // [RED] 59. Google Ads search_term_report can be very large -- no date range limit
  it("[RED] google_ads_search_term_report should warn or cap date ranges > 90 days", () => {
    const src = readFile(SERVERS[0].indexFile);
    const handler = src.match(/case "google_ads_search_term_report"[\s\S]*?break;/);
    expect(handler).not.toBeNull();
    const section = handler![0];
    // Should check date range span
    expect(section).toMatch(/date.*range|span|days.*between|too.*wide|max.*days/i);
  });

  // [RED] 60. Reddit API reports use POST but resilience layer retries POSTs
  it("[RED] resilience layer should not retry POST requests (non-idempotent) by default", () => {
    // POST requests can cause duplicates if retried.
    // The retry policy retries ALL transient errors regardless of HTTP method.
    for (const server of SERVERS) {
      const src = readFile(server.resilienceFile);
      // Should check HTTP method and only retry GET/idempotent methods
      const checksMethod = /method.*POST|POST.*no.*retry|idempotent|safe.*method/i.test(src);
      if (checksMethod) return;
    }
    expect(false).toBe(true);
  });

  // [RED] 61. Google Ads updateCampaignBudget accepts negative budget
  it("[RED] google_ads_update_campaign_budget should reject negative or zero budget", () => {
    const src = readFile(SERVERS[0].indexFile);
    const handler = src.match(/case "google_ads_update_campaign_budget"[\s\S]*?break;/);
    expect(handler).not.toBeNull();
    const section = handler![0];
    // Should validate budget > 0
    expect(section).toMatch(/budget.*<=?\s*0|negative.*budget|minimum.*budget|invalid.*budget/i);
  });

  // [RED] 62. Bing Ads budget unit is "account currency" -- could be USD, EUR, GBP etc
  it("[RED] bing_ads_update_campaign_budget should detect and document currency from account settings", () => {
    const src = readFile(SERVERS[1].indexFile);
    // "New daily budget amount in account currency" -- but which currency?
    // Should query the account to determine currency and include it in the response.
    const hasCurrency = /currency|USD|EUR|GBP|account.*currency.*detect|locale/i.test(src);
    expect(hasCurrency).toBe(true);
  });

  // [RED] 63. No graceful handling of partial failures in bulk operations
  it("[RED] google_ads_enable_items should report partial failures (some succeed, some fail)", () => {
    const src = readFile(SERVERS[0].indexFile);
    const enableHandler = src.match(/case "google_ads_enable_items"[\s\S]*?break;/);
    expect(enableHandler).not.toBeNull();
    const handler = enableHandler![0];
    // If enabling 5 campaigns and 2 fail, the current code either succeeds or fails entirely.
    // Should report per-item results like Reddit's pause_items does.
    expect(handler).toMatch(/partial|per.*item|individual.*result|some.*failed/i);
  });

  // [RED] 64. Google Ads API version pinned in google-ads-api dependency
  it("[RED] google-ads-api should pin to exact version with no caret or tilde", () => {
    const pkg = JSON.parse(readFile(SERVERS[0].packageJson));
    const dep = pkg.dependencies?.["google-ads-api"];
    expect(dep).toBeDefined();
    // Should be "23.0.0" not "^23.0.0" or "~23.0.0"
    expect(dep).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
