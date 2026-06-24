# Research Assistant Lite

A lightweight Zotero plugin for local research knowledge management. It keeps the original MVP behavior: imported papers are automatically tagged, multiple tags are supported, and the sidebar remains the main interaction surface.

## Features

- Automatic import-time tagging through Zotero item-add events.
- Configurable local rules from `src/rules/rules.json`.
- Explainable tags with matched rule, keyword, field, and score.
- Batch `Re-classify library` action.
- Ranked sidebar search using title, abstract, tag, and recent-opened boosts.
- Research Overview with tag counts, recent 7-day additions, top direction, and duplicate count.
- Lightweight duplicate hints by DOI match or title similarity over 90%.

No AI API, embedding store, vector database, backend, or cloud service is used.

## Rule Config

Edit `src/rules/rules.json` and rebuild the XPI:

```json
{
  "PDH": {
    "keywords": ["propane dehydrogenation", "PDH"],
    "weight": 2
  },
  "CO2 hydrogenation": {
    "keywords": ["CO2", "carbon dioxide", "formate"],
    "weight": 2
  }
}
```

Optional fields per rule:

- `fields`: defaults to `["title", "abstract"]`
- `wordBoundary`: useful for short tokens such as `Ni`
- `name`: display name for explanations

## Development

```powershell
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
```

The build command creates:

```text
dist/research-assistant-lite.xpi
```

Install the XPI through Zotero's plugin/add-ons manager.
