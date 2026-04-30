# LinkedIn Ads setup

→ Full README: [mcp-linkedin-ads](https://github.com/mharnett/mcp-linkedin-ads)

## You need

- A [LinkedIn Developer App](https://www.linkedin.com/developers/apps) with **Marketing Developer Platform** access
- Scopes: `r_ads`, `rw_ads`
- A Refresh Token from the OAuth flow

## Get credentials

1. LinkedIn Developer Portal → Create App → request Marketing Developer Platform access
2. Auth tab → generate access/refresh tokens with the required scopes

## Environment variables

```bash
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REFRESH_TOKEN=your_refresh_token
```
