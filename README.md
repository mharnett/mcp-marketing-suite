# MCP Marketing Suite

A production-grade collection of Model Context Protocol (MCP) servers for performance marketing. Manage ad campaigns, analyze traffic, audit tracking, and report on performance -- all through natural language via Claude.

Built by practitioners running real ad spend across Google, Meta, Microsoft, LinkedIn, and Reddit.

## The Suite

| MCP Server | Platform | Tools | Install |
|------------|----------|-------|---------|
| [mcp-google-ads](https://github.com/mharnett/mcp-google-ads) | Google Ads | 35 | `npm install mcp-google-ads` |
| [mcp-bing-ads](https://github.com/mharnett/mcp-bing-ads) | Microsoft Advertising | 10 | `npm install mcp-bing-ads` |
| [mcp-linkedin-ads](https://github.com/mharnett/mcp-linkedin-ads) | LinkedIn Ads | 7 | `npm install mcp-linkedin-ads` |
| [mcp-reddit-ads](https://github.com/mharnett/mcp-reddit-ads) | Reddit Ads | 18 | `npm install mcp-reddit-ads` |
| [meta-ads-mcp](https://github.com/pipeboard-co/meta-ads-mcp) | Meta (Facebook/Instagram) | 28 | `pip install meta-ads-mcp` |
| [mcp-ga4](https://github.com/mharnett/mcp-ga4) | Google Analytics 4 | 9 | `npm install mcp-ga4` |
| [mcp-google-gsc](https://github.com/mharnett/mcp-search-console) | Google Search Console | 4 | `npm install mcp-google-gsc` |
| [mcp-gtm-ga4](https://github.com/mharnett/mcp-gtm-ga4) | Google Tag Manager + GA4 | 13 | `npm install mcp-gtm-ga4` |

**124+ tools** across 8 platforms. 7 TypeScript servers on npm, 1 Python server on PyPI.

## What You Can Do

**Campaign Management** -- Create, pause, update, and monitor campaigns across Google, Meta, Microsoft, LinkedIn, and Reddit from a single conversation.

**Performance Analysis** -- Pull spend, conversions, CPA, ROAS, and custom breakdowns. Compare across platforms without switching between UIs.

**Search Term Auditing** -- Review search queries, add negatives, pause underperformers. Works across Google Ads and Microsoft Advertising.

**Audience Targeting** -- Search interests, behaviors, demographics, and geo targets. Estimate audience sizes before launching.

**Analytics & Tracking** -- Query GA4 reports (historical and realtime), inspect URLs in Search Console, audit GTM consent compliance.

**Tag Management** -- List, create, and update GTM tags. Audit consent settings across all tags. Preview changes in sandbox before publishing.

## Quick Start

### Prerequisites

- Node.js 18+ (for TypeScript servers)
- Python 3.10+ (for meta-ads-mcp only)
- API credentials for each platform you want to use

### Install Individual Servers

Each server is standalone. Install only what you need:

```bash
# Ad platforms
npm install mcp-google-ads
npm install mcp-bing-ads
npm install mcp-linkedin-ads
npm install mcp-reddit-ads
pip install meta-ads-mcp

# Analytics & tracking
npm install mcp-ga4
npm install mcp-google-gsc
npm install mcp-gtm-ga4
```

### Configure Claude Code

Add servers to your `.mcp.json`:

```json
{
  "mcpServers": {
    "google-ads": {
      "command": "npx",
      "args": ["mcp-google-ads"],
      "env": {
        "GOOGLE_ADS_CLIENT_ID": "your-client-id",
        "GOOGLE_ADS_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_ADS_REFRESH_TOKEN": "your-refresh-token",
        "GOOGLE_ADS_DEVELOPER_TOKEN": "your-dev-token"
      }
    },
    "ga4": {
      "command": "npx",
      "args": ["mcp-ga4"],
      "env": {
        "GA4_PROPERTY_ID": "your-property-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account.json"
      }
    },
    "meta-ads": {
      "command": "meta-ads-mcp",
      "env": {
        "META_ACCESS_TOKEN": "your-access-token",
        "META_APP_ID": "your-app-id"
      }
    }
  }
}
```

See each server's README for full configuration details.

## Architecture

All TypeScript servers share a consistent architecture:

- **@modelcontextprotocol/sdk** for MCP protocol handling
- **Cockatiel** for resilience (retry with exponential backoff, circuit breaker, 30s timeout)
- **Pino** for structured JSON logging
- **200KB response truncation** to prevent context window overflow
- **Error classification** into auth, rate limit, and service errors with actionable messages
- **Safe by default** -- write operations create items in PAUSED state

```
User <-> Claude <-> MCP Server <-> Platform API
                        |
                   Resilience Layer
                   (retry, circuit breaker, timeout)
```

## Server Details

### Ad Platforms

**mcp-google-ads** -- The most comprehensive server. 35 tools including MCC (Multi-Client Center) support, GAQL queries, auto-context detection from working directory, and full campaign/keyword/ad management. Safe-by-default with approval workflow for activations.

**mcp-bing-ads** -- 10 tools for Microsoft Advertising. Campaign and keyword performance reports with CSV parsing from Bing's ZIP format. Shared negative keyword list management.

**mcp-linkedin-ads** -- 7 tools for LinkedIn Campaign Manager. Campaign, ad group, and creative management with performance reporting.

**mcp-reddit-ads** -- 18 tools for Reddit Ads API v3. Full CRUD for campaigns, ad groups, and ads. Subreddit and interest targeting. Budget values in dollars (auto-converted to microcurrency).

**meta-ads-mcp** -- 28 tools for Meta (Facebook/Instagram) Ads. Third-party server by Pipeboard. Supports campaign creation, audience targeting, creative management, and performance insights.

### Analytics & Tracking

**mcp-ga4** -- 9 tools for Google Analytics 4. Historical reports, realtime data, custom dimension/metric management. Dual config mode: single-property via env vars or multi-client via config.json.

**mcp-google-gsc** -- 4 tools for Google Search Console. Search analytics with dimension filters (query, page, device, country), URL inspection for indexing status, and site listing.

**mcp-gtm-ga4** -- 13 tools combining Google Tag Manager and GA4. Tag/trigger/variable management, consent compliance auditing, workspace preview and versioning. Sandbox safety prevents accidental production changes.

## Credentials Guide

Each platform requires its own API credentials. Here's where to get them:

| Platform | Credential Type | Where to Get It |
|----------|----------------|-----------------|
| Google Ads | OAuth + Developer Token | [Google Ads API Center](https://ads.google.com/aw/apicenter) |
| Microsoft Ads | OAuth via Azure AD | [Azure App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |
| LinkedIn Ads | OAuth App | [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) |
| Reddit Ads | OAuth App | [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) |
| Meta Ads | Access Token + App ID | [Meta Developer Portal](https://developers.facebook.com/) |
| GA4 | Service Account | [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) |
| Search Console | Service Account | Same as GA4 |
| GTM | Service Account | Same as GA4 |

## Contributing

Each server has its own GitHub repository. File issues and PRs there:

- [mcp-google-ads](https://github.com/mharnett/mcp-google-ads/issues)
- [mcp-bing-ads](https://github.com/mharnett/mcp-bing-ads/issues)
- [mcp-linkedin-ads](https://github.com/mharnett/mcp-linkedin-ads/issues)
- [mcp-reddit-ads](https://github.com/mharnett/mcp-reddit-ads/issues)
- [mcp-ga4](https://github.com/mharnett/mcp-ga4/issues)
- [mcp-google-gsc](https://github.com/mharnett/mcp-search-console/issues)
- [mcp-gtm-ga4](https://github.com/mharnett/mcp-gtm-ga4/issues)

## License

All first-party servers are MIT licensed. meta-ads-mcp is BUSL-1.1 (see its repo for details).

## Author

Built by [Mark Harnett](https://github.com/mharnett) at [Drak Marketing](https://drakmarketing.com). These tools are used daily to manage real ad spend across multiple clients.
