# Microsoft Advertising (Bing Ads) setup

→ Full README: [mcp-bing-ads](https://github.com/mharnett/mcp-bing-ads)

## You need

- A **Developer Token** from [Microsoft Advertising](https://ads.microsoft.com/)
- An **Azure AD app registration** with `Microsoft Advertising API` permissions
- A **Refresh Token** from the OAuth flow

## Get credentials

1. [Azure Portal](https://portal.azure.com/) → App registrations → New registration
2. API permissions → Add `https://ads.microsoft.com/msads.manage offline_access`
3. Run the token flow: `npx mcp-bing-ads --auth` (after install)

## Environment variables

```bash
BING_ADS_DEVELOPER_TOKEN=your_developer_token
BING_ADS_CLIENT_ID=your_azure_client_id
BING_ADS_REFRESH_TOKEN=your_refresh_token
BING_ADS_CLIENT_SECRET=your_client_secret   # if using confidential client

# Optional: enable write tools
BING_ADS_MCP_WRITE=true
```
