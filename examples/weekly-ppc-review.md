# Weekly PPC review

A cross-platform performance summary using Google Ads + Bing Ads + GA4.

## Conversation

```
You: Pull last 7 days of campaign performance from Google Ads — clicks, impressions, cost,
     conversions. Show me the top 10 campaigns by spend.

Claude: [calls google_ads_keyword_performance, returns table]
        ...

You: Same thing from Bing. Then compare — where are the CPA gaps?

Claude: [calls bing_ads_keyword_performance, cross-references]
        ...

You: Pull GA4 sessions for the same period, filter to paid channels. Do the sessions
     align with what Google Ads is reporting for clicks?

Claude: [calls ga4_run_report with sessionDefaultChannelGroup filter]
        ...

You: Flag any campaigns where Google Ads clicks exceed GA4 sessions by >20%.
     Those usually mean tracking gaps.

Claude: Found 2 campaigns with significant divergence: [details]
```

## MCPs used

- `mcp-google-ads` — `google_ads_ad_performance`, `google_ads_list_campaigns`
- `mcp-bing-ads` — `bing_ads_keyword_performance`
- `mcp-ga4` — `ga4_run_report`
