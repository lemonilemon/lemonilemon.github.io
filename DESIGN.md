# Site design: Hugo → Astro migration

Scaffolding for the migration on the `astro-migration` branch. Delete once the
Astro site ships.

Mockup: https://claude.ai/artifact/2LAKtQH7aXS6EGN9eXynLi (private canvas:
home, post page, dark mode, phone).

## Direction

**Paper and lemon.** A quiet editorial reading site with one accent: lemon
yellow, taken from the handle. The accent is used as a marker, never as a
paint colour: link underlines, hover highlight, text selection, focus rings,
the avatar's offset shadow, and the lemon mark next to the wordmark. Everything
else is warm paper, warm ink, and hairlines.

The memorable pieces:

- Wordmark `lemonilemon` in Newsreader italic with a small lemon mark.
- Post lists are ledgers: a monospace date column, a serif title, hairline
  rules between rows, grouped by year.
- Links are ink-coloured with a 2px lemon underline; on hover the underline
  becomes a lemon highlight behind the text.
- The avatar has a hard lemon offset shadow instead of a soft drop shadow.

## Typography

Bilingual content (en, zh-TW) drives the choices. Every role has a Latin face
and a matching CJK face so mixed-script text keeps one voice.

| Role     | Latin            | CJK fallback       | Use                                  |
|----------|------------------|--------------------|--------------------------------------|
| Display  | Newsreader       | Noto Serif TC      | wordmark, page and post titles, h2/h3 |
| Body     | IBM Plex Sans    | IBM Plex Sans TC   | prose, UI copy                        |
| Mono     | IBM Plex Mono    | (Plex Sans TC)     | dates, tags, nav, labels, code        |

Scale (desktop): display 72 / 48 / 32 / 26; body 17.5px at line-height 1.75
for articles, 15–16px for UI; mono 13–14px. Reading measure 720px.
`<html lang>` is set per page from the post's `lang`, so the browser picks the
right CJK glyph forms.

Fonts are self-hosted in the Astro build (`@fontsource-variable/*` or subset
woff2 in `public/fonts`), not loaded from Google Fonts at runtime.

## Colour tokens

| Token       | Light     | Dark      |
|-------------|-----------|-----------|
| `--bg`      | `#f9f8f4` | `#171614` |
| `--surface` | `#f1efe8` | `#201f1b` |
| `--ink`     | `#1a1917` | `#ece9e1` |
| `--muted`   | `#5f5c55` | `#a39f94` |
| `--rule`    | `#dedbd2` | `#33312b` |
| `--lemon`   | `#f2d51f` | `#ffd83d` |
| `--lemon-ink` (accent as text) | `#7a6200` | `#ffd83d` |

Light and dark both ship. Default follows `prefers-color-scheme`; a header
toggle overrides it and persists in `localStorage`. Code blocks use Shiki dual
themes: `github-light` / `github-dark` (parity with the current site).

## Layout

- Container 1152px, 64px side padding on desktop, 20px on phone.
- Header: wordmark left; nav right in mono uppercase (Writing, About, RSS) plus
  the theme toggle. No hamburger: three links fit at phone width.
- Home: hero (title, bio, social links, avatar), a mono "currently into" line
  from the About page's tech list, then the ledger of recent posts.
- Writing index: all posts in one ledger grouped by year. No pagination until
  the list is long enough to need it.
- Post: 720px column with a sticky "On this page" table of contents in the
  right rail at ≥1100px (shown when a post has 3+ headings). Below the article:
  previous/next, related posts by shared tags (max 5), comments.
- Footer: mono, single line: © since 2025, RSS, source link.

## Pages and URLs

Existing URLs are kept.

| Path                     | Content                                   |
|--------------------------|-------------------------------------------|
| `/`                      | home                                       |
| `/posts/`                | writing index                              |
| `/posts/<slug>/`         | post (`hugo-site` stays `hugo-site`)       |
| `/tags/`, `/tags/<tag>/` | tag index and tag pages                    |
| `/series/<series>/`      | series pages                               |
| `/about/`                | about                                      |
| `/rss.xml`, `/index.xml` | feed; `/index.xml` kept for Hugo subscribers |
| `/sitemap-index.xml`     | sitemap                                    |
| `/404`                   | not found                                  |

Dropped taxonomies: `categories` and `authors` (single author; categories
duplicate tags on the one existing post). Decision to confirm.

## Content model

`src/content/posts/<slug>/index.md`, YAML front matter, images beside the post:

```yaml
title: string
description: string        # optional
date: date
updated: date              # optional
lang: "en" | "zh-TW"       # sets <html lang>, reading-speed, date locale
tags: string[]
series: string             # optional
draft: boolean             # default false
math: boolean              # default false, loads KaTeX CSS
comments: boolean          # default true
```

Reading time is script-aware: 500 chars/min for zh-TW, 212 words/min for en
(the values from the old commented-out Hugo config).

About page: `src/pages/about.md` with a layout.

## Features (parity with hugo-coder, and what changes)

| Feature              | Plan                                                   |
|----------------------|--------------------------------------------------------|
| Avatar               | Gravatar URL from the email hash (same as today)       |
| Social links         | inline SVG icons, no Font Awesome                       |
| Theme toggle         | kept                                                   |
| Twemoji              | dropped; native emoji                                  |
| Disqus               | replace with giscus (GitHub Discussions). Decision to confirm |
| Related posts        | by shared tags, max 5                                  |
| RSS                  | `@astrojs/rss`, full content                           |
| Sitemap              | `@astrojs/sitemap`                                     |
| Math                 | Astro 7 built-in math syntax + KaTeX CSS, opt-in       |
| Search               | not in v1 (Pagefind later if wanted)                   |
| OG images            | not in v1                                              |

## Toolchain

- Astro 7.x, TypeScript strict, npm, Node 24 (flake: `nodejs_24` only; `hugo`
  and `go` removed).
- GitHub Actions: `withastro/action` build → `actions/deploy-pages`.
- Removed: `hugo.toml`, `themes/` submodule, `archetypes/`, `resources/`.
- `.gitignore` gains `node_modules/`, `dist/`, `.astro/`.
