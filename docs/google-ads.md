# Google Ads setup

→ Full README: [mcp-google-ads](https://github.com/mharnett/mcp-google-ads)

## You need

- A **Developer Token** — apply at [Google Ads API Center](https://developers.google.com/google-ads/api/docs/get-started/dev-token)
- **OAuth credentials** — Client ID + Secret from [Google Cloud Console](https://console.cloud.google.com/)
- A **Refresh Token** for your MCC account

## Get credentials

1. Google Cloud Console → Create Project → Enable **Google Ads API**
2. Credentials → Create OAuth Client ID → **Desktop App** → download JSON
3. Run `google-ads-auth` (from `pip install google-ads`) to generate your refresh token

## Environment variables

```bash
GOOGLE_ADS_DEVELOPER_TOKEN=your_dev_token
GOOGLE_ADS_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token

# Optional: enable write tools (creates/updates/pauses)
GOOGLE_ADS_MCP_WRITE=true
```

## Multi-client config

Create `config.json` next to the installed package:

```json
{
  "clients": {
    "client-slug": {
      "customer_id": "123-456-7890",
      "name": "Client Name",
      "folder": "/path/to/client/workspace"
    }
  }
}
```

The server auto-detects the active client from your working directory.
