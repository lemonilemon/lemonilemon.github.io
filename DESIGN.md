# Site design: Hugo → Astro migration

Scaffolding for the migration on the `astro-migration` branch. Delete once the
Astro site ships.

Mockup: https://claude.ai/artifact/2LAKtQH7aXS6EGN9eXynLi (private canvas:
home in light and dark, phone, writing index, post, about).

## Concept

One idea carries the site. It comes from the opening of 地。-關於地球的運動-,
Sakanaction's 怪獣:

> この世界は好都合に未完成　だから知りたいんだ

The world is conveniently unfinished, and that is exactly why one wants to
know. Incompleteness is not a defect. It is the invitation. The site never
states this in words. The visual carries it.

What the visitor sees on the home page, and nothing else:

- A diagram of concentric rings, each left unfinished. The innermost is nearly
  closed; every ring further out is drawn less, until the outermost is half an
  arc. All the openings face the same way, off the right edge of the frame: the
  unfinished part of the world is beyond what the page shows. A small point
  marks the centre, like a compass pivot.
- When the page loads the rings draw themselves once, inner first, over about
  two seconds, and stop before closing. Under `prefers-reduced-motion` they are
  simply there. Nothing moves after that.
- The intro block: the lemon avatar, 64px, cropped to the slice; one sentence
  on who the author is and what the site holds; a link to the latest post.
  The avatar is the only colour on the page.
- Header navigation: Writing, About, theme toggle. Footer: copyright, RSS,
  source.

The header mark and favicon are the same unfinished circle at 14px.

Ring geometry (1280×800 frame): centre (1040, 420), radii 110 / 210 / 330 /
480, drawn fractions 0.92 / 0.80 / 0.64 / 0.50 of a full circle, openings
centred on the right. On phone: centre (310, 210), radii 60 / 115 / 180 / 255.

The tone is focus, clarity, elegance. Every other page is a single 680px
reading column with the same header and footer. No sidebars, no cards, no
tags in lists, no icons beyond the ring mark and the theme toggle.

## Typography

| Role   | Latin          | CJK           | Use                                   |
|--------|----------------|---------------|---------------------------------------|
| Text   | Spectral       | Noto Serif TC | everything readable: statement, titles, prose |
| Labels | IBM Plex Mono  | (Plex Mono, CJK falls back to Noto Serif TC) | nav, dates, tags, meta, code |

Spectral weights 400/500/600 plus italics. Scale: statement 60px (phone 40),
page titles 40–42px, h2 28px, prose 19px at line-height 1.75–1.8, list titles
24px, labels 12.5–13px uppercase with 0.12em tracking. Reading measure 680px.
`<html lang>` follows the post's `lang` so CJK glyph forms are correct.

Fonts are self-hosted in the Astro build (subset woff2 in `public/fonts`), not
loaded from Google Fonts at runtime. The mockup uses Google Fonts only for
preview.

## Colour tokens

| Token          | Light     | Dark      | Use                              |
|----------------|-----------|-----------|----------------------------------|
| `--bg`         | `#fbfaf7` | `#0e1014` | page                             |
| `--surface`    | `#f2f0ea` | `#161920` | code blocks                      |
| `--ink`        | `#17181a` | `#e8e6df` | text, moving points              |
| `--muted`      | `#6b6b66` | `#9a9a93` | secondary text, labels           |
| `--rule`       | `#e1dfd8` | `#262a31` | hairlines, outermost ring        |
| `--rule-strong`| `#c9c6bd` | `#454b55` | innermost ring, link underline   |

Light is the default under `prefers-color-scheme: light`; dark reads as night
sky. A header toggle overrides and persists in `localStorage`. Code uses Shiki
dual themes `github-light` / `github-dark`.

Links: ink text with a 1px underline in `--rule-strong`, darkening to ink on
hover. No colour change.

## Layout

- Home: viewport-height, no scroll on desktop. Intro block left, max width
  520px, vertically centred. Ring SVG absolutely positioned behind it. On phone
  the centre moves to the top right and the intro block sits in the lower half
  (avatar 56px). The page has a visually hidden `<h1>` with the site
  name; the visible text is a paragraph.
- Header 80px (phone 64px): orbit mark + wordmark left; nav right in mono
  uppercase; 44px hit targets.
- Reading pages (Writing, post, About): 680px column, 88px top padding.
- Writing index: title, one line of intro, posts grouped by year. Each row is
  title left, date right, hairline between rows.
- Post: back link, title, one meta line (date, reading time, language, tags),
  prose, previous/next, comments.
- About: facts only. Current focus, languages, how the site is built, and the
  "Elsewhere" links. The concept is not explained.

## Copy

Home: "I'm lemonilemon, a computer science student at National Taiwan
University. I write here about what I'm learning, in English or 中文."
About: drafted in the mockup; to be rewritten in the author's voice.

## Pages and URLs

Existing URLs are kept.

| Path                     | Content                                    |
|--------------------------|--------------------------------------------|
| `/`                      | home                                        |
| `/posts/`                | writing index                               |
| `/posts/<slug>/`         | post (`hugo-site` stays `hugo-site`)        |
| `/tags/<tag>/`           | tag pages (linked from post meta only)      |
| `/about/`                | about                                       |
| `/rss.xml`, `/index.xml` | feed; `/index.xml` kept for Hugo subscribers|
| `/sitemap-index.xml`     | sitemap                                     |
| `/404`                   | not found                                   |

Dropped taxonomies: categories, series, authors. Tags stay.

## Content model

`src/content/posts/<slug>/index.md`, YAML front matter, images beside the post:

```yaml
title: string
description: string        # optional
date: date
updated: date              # optional
lang: "en" | "zh-TW"       # sets <html lang>, reading speed, date locale
tags: string[]
draft: boolean             # default false
math: boolean              # default false, loads KaTeX CSS
comments: boolean          # default true
```

Reading time: 500 chars/min for zh-TW, 212 words/min for en.
About page: `src/pages/about.md` with a layout.

## Features

| Feature       | Plan                                                   |
|---------------|--------------------------------------------------------|
| Theme toggle  | kept, icon only                                        |
| Avatar        | the lemon, beside the intro on home. Source: a cropped copy of the Gravatar committed to `src/assets` (the Gravatar itself has handwriting across the top), or the Gravatar URL with a CSS zoom crop |
| Social links  | text links on About only                               |
| Comments      | giscus (GitHub Discussions), replaces Disqus. To confirm |
| Previous/next | kept; related posts dropped                            |
| RSS, sitemap  | `@astrojs/rss`, `@astrojs/sitemap`                     |
| Math          | Astro 7 built-in math syntax + KaTeX CSS, opt-in       |
| Twemoji, TOC, search, OG images | dropped / not in v1                  |

## Toolchain

- Astro 7.x, TypeScript strict, npm, Node 24 (flake: `nodejs_24` only; `hugo`
  and `go` removed).
- GitHub Actions: `withastro/action` build → `actions/deploy-pages`.
- Removed: `hugo.toml`, `themes/` submodule, `archetypes/`, `resources/`.
- `.gitignore` gains `node_modules/`, `dist/`, `.astro/`.
