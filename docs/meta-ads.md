# Meta Ads setup

→ Full README: [meta-ads-mcp](https://github.com/mharnett/meta-ads-mcp)

## You need

A Meta access token. Two options:

### Option 1: System User token (recommended)

Best for production use. Generate in Meta Business Suite:

1. Business Settings → System Users → Add System User
2. Assign your ad accounts with **Advertiser** role
3. Generate token → select `ads_management` + `ads_read` scopes
4. Copy the token — it's long-lived

```bash
META_ACCESS_TOKEN=EAAG...your_token
```

### Option 2: OAuth flow

For personal accounts or development:

```bash
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
```

Then run `python -m meta_ads_mcp --auth` to complete the OAuth flow.

## Write mode

Meta Ads MCP is read-only by default. Enable writes:

```bash
META_ADS_MCP_WRITE=true
```
