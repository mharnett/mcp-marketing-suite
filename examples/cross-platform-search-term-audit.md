# Cross-platform search term audit

Find negative keyword candidates across Google Ads and Bing, and spot queries you're
covering on one platform but not the other.

## Conversation

```
You: Pull the Google Ads search term report for the last 30 days. Filter to queries with
     at least 10 impressions and zero conversions.

Claude: [calls google_ads_search_term_report, returns 47 qualifying queries]

You: Now pull the same from Bing for the same period.

Claude: [calls bing_ads_search_term_report, returns 31 qualifying queries]

You: Which queries appear in both platforms' zero-conversion lists?
     Those are the highest-confidence negatives.

Claude: Found 12 queries on both platforms: [list]
        Recommend adding these as negatives to shared sets on both platforms.

You: Which Google queries have no equivalent in Bing at all?
     If they're converting on Google, I might want to add coverage in Bing.

Claude: Found 8 converting Google queries with no Bing impression: [list]
        These are keyword gaps worth expanding to Bing.
```

## MCPs used

- `mcp-google-ads` — `google_ads_search_term_report`
- `mcp-bing-ads` — `bing_ads_search_term_report`

## Follow-up actions

```
You: Add the 12 shared zero-conversion queries to the Google Ads shared negative list.

Claude: [calls google_ads_add_shared_negatives — requires GOOGLE_ADS_MCP_WRITE=true]
        Added 12 negatives to shared set "Negative - Cross Platform" ✓
```
