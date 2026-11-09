# Giveaway 2026 — Drawing page

Public progress + spin-wheel page for the Ultimate Home Buying Package giveaway.

**Live:** https://rickyv06.github.io/giveaway-drawing/

This repo is static GitHub Pages only. It does **not** contain private contact data, API tokens, or fetch scripts.

## What visitors see
- Completed entry count and progress toward the goal
- Countdown to entries closing (Nov 30, 2026 · 11:59 PM CT)
- Recent-entries ticker (first name + last initial only)
- Spin wheel for drawing night

Demo practice: add `?demo=1` to the URL.

## Entries feed
The page reads `entries.json` from this repo. Counts update when that file is refreshed and pushed.

## Drawing night (static hosting)
1. Open the live page and spin — the winner is revealed on screen (confetti included).
2. The browser also stores the opaque winner id in `localStorage` under `giveaway2026_last_winner`.
3. Private full-contact winner records are **not** written by GitHub Pages. After the drawing, on the private workspace run:

```bash
python3 /workspace/funnels/giveaway/drawing/scripts/record_winner_local.py --from-json '<paste localStorage JSON>'
```

## Refresh entries (maintainers)
From the private workspace (token stays in env, never in this repo):

```bash
/workspace/funnels/giveaway/drawing/scripts/publish_entries.sh
```

## Privacy
- Public files show first name + last initial only
- `robots.txt` disallows all crawlers; page has `noindex,nofollow`
- No emails, phones, GHL ids, or tokens are published here
