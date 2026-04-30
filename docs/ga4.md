# Google Analytics 4 setup

→ Full README: [mcp-ga4](https://github.com/mharnett/mcp-ga4)

## You need

- A GA4 Property ID (found in GA4 → Admin → Property Settings)
- A **Google Cloud service account** with `roles/analyticsViewer` on the property, OR OAuth credentials

## Service account setup (recommended)

1. Google Cloud Console → IAM & Admin → Service Accounts → Create
2. Download the JSON key
3. In GA4: Admin → Property Access Management → Add the service account email

## Environment variables

### Single property

```bash
GA4_PROPERTY_ID=123456789
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### Multi-client

Use a `config.json` mapping directories to property IDs — see the [mcp-ga4 README](https://github.com/mharnett/mcp-ga4) for the full schema.
