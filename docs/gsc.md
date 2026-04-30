# Google Search Console setup

→ Full README: [mcp-google-gsc](https://github.com/mharnett/mcp-google-gsc)

## You need

- A **Google Cloud service account** with Search Console API access
- The service account email added as a user in each Search Console property

## Setup

1. Google Cloud Console → IAM & Admin → Service Accounts → Create
2. Enable **Search Console API** in the project
3. Download the JSON key
4. In Search Console: Settings → Users and permissions → Add service account email

## Environment variables

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

For multi-client setups, see the [mcp-google-gsc README](https://github.com/mharnett/mcp-google-gsc) for `config.json` schema.
