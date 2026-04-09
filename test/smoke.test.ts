import { describe, it, expect, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const LIVE = process.env.LIVE_TEST === "true";

// Server definitions: name, cwd, and expected tool counts/names
const SERVERS = [
  {
    name: "mcp-google-ads",
    cwd: "/Users/mark/claude-code/mcps/mcp-google-ads",
    minTools: 30,
    requiredTools: [
      "google_ads_get_client_context",
      "google_ads_list_campaigns",
      "google_ads_keyword_performance",
      "google_ads_gaql_query",
    ],
  },
  {
    name: "mcp-gsc",
    cwd: "/Users/mark/claude-code/mcps/mcp-gsc",
    minTools: 4,
    requiredTools: [
      "gsc_list_sites",
      "gsc_search_analytics",
      "gsc_inspection",
    ],
  },
  {
    name: "mcp-reddit-ads",
    cwd: "/Users/mark/claude-code/mcps/reddit-ad-mcp",
    minTools: 15,
    requiredTools: [
      "reddit_ads_get_client_context",
      "reddit_ads_get_campaigns",
      "reddit_ads_search_subreddits",
    ],
  },
  {
    name: "mcp-ga4",
    cwd: "/Users/mark/claude-code/mcps/mcp-ga4",
    minTools: 7,
    requiredTools: [
      "ga4_get_client_context",
      "ga4_run_report",
      "ga4_realtime_report",
      "ga4_list_data_streams",
    ],
  },
  {
    name: "mcp-gtm-ga4",
    cwd: "/Users/mark/claude-code/mcps/neon-one-gtm",
    minTools: 13,
    requiredTools: [
      "gtm_list_tags",
      "gtm_list_triggers",
      "gtm_audit_consent",
      "ga4_run_report",
    ],
  },
];

// Collect all clients for cleanup
const activeClients: Client[] = [];

afterAll(async () => {
  for (const c of activeClients) {
    try { await c.close(); } catch { /* ignore */ }
  }
});

async function connectToServer(cwd: string): Promise<Client> {
  const transport = new StdioClientTransport({
    command: "bash",
    args: ["-c", "source ./run-mcp.sh"],
    cwd,
  });
  const client = new Client({ name: "smoke-test", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  activeClients.push(client);
  return client;
}

describe.skipIf(!LIVE)("cross-MCP smoke test", () => {
  const allToolNames: Map<string, string[]> = new Map(); // tool name -> server names

  for (const server of SERVERS) {
    describe(server.name, () => {
      let client: Client;
      let toolNames: string[];

      it("starts and responds to ListTools", async () => {
        client = await connectToServer(server.cwd);
        const result = await client.listTools();
        toolNames = result.tools.map((t) => t.name);

        // Track for collision detection
        for (const name of toolNames) {
          if (!allToolNames.has(name)) allToolNames.set(name, []);
          allToolNames.get(name)!.push(server.name);
        }

        expect(toolNames.length).toBeGreaterThanOrEqual(server.minTools);
      }, 30_000);

      it("has all required tools", async () => {
        for (const tool of server.requiredTools) {
          expect(toolNames).toContain(tool);
        }
      });

      it("tools have valid schemas", async () => {
        const result = await client.listTools();
        for (const tool of result.tools) {
          expect(tool.name).toBeTruthy();
          expect(tool.description).toBeTruthy();
          expect(tool.inputSchema).toBeDefined();
          expect(tool.inputSchema.type).toBe("object");
        }
      });
    });
  }

  describe("cross-server", () => {
    it("no tool name collisions across servers (except intentional shared tools)", () => {
      // GTM server intentionally shares GA4 tool names
      const ALLOWED_SHARED = ["ga4_run_report", "ga4_realtime_report", "ga4_list_custom_dimensions", "ga4_create_custom_dimension"];

      const collisions: Array<{ name: string; servers: string[] }> = [];
      for (const [name, servers] of allToolNames.entries()) {
        if (servers.length > 1 && !ALLOWED_SHARED.includes(name)) {
          collisions.push({ name, servers });
        }
      }

      if (collisions.length > 0) {
        const detail = collisions.map((c) => `  ${c.name}: ${c.servers.join(", ")}`).join("\n");
        expect.fail(`Tool name collisions found:\n${detail}`);
      }
    });

    it("total unique tool count across all servers", () => {
      const uniqueTools = allToolNames.size;
      // Sanity check: we should have a substantial number of unique tools
      expect(uniqueTools).toBeGreaterThanOrEqual(50);
      console.log(`Total unique tools across ${SERVERS.length} servers: ${uniqueTools}`);
    });
  });
});
