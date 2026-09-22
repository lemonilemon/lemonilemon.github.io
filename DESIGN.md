# Site design: Hugo → Astro migration

Scaffolding for the migration on the `astro-migration` branch. Delete once the
Astro site ships.

Mockup: https://claude.ai/artifact/2LAKtQH7aXS6EGN9eXynLi (private canvas:
home in light and dark, phone, writing index, post, about).

## Concept

One idea carries the site: **the world moves, and it can be understood.**

The inspiration is 地。-關於地球的運動-, taken as an attitude rather than as
imagery: curiosity about how things work is worth the effort, and the moment
something makes sense is its own reward. The site does not borrow the anime's
elements. It borrows the stance and applies it to whatever the author is
learning, which is currently computer science.

What the visitor sees on the home page, and nothing else:

- A large, abstract orbital system drawn in hairlines, centred past the right
  edge so the outer orbits leave the viewport. The system is bigger than the
  frame. Small points move slowly along the orbits (CSS animation; periods
  20 s, 50 s, 100 s, 180 s, inner fastest; frozen under
  `prefers-reduced-motion`). The centre point is the one accent colour.
- The statement: **The world moves.** / *I want to understand how.*
- One sentence of context and a link to the latest post.
- Header navigation: Writing, About, theme toggle. Footer: copyright, RSS,
  source.

The tone is focus, clarity, elegance. Every other page is a single 680px
reading column with the same header and footer. No sidebars, no cards, no
tags in lists, no icons beyond the orbit mark and the theme toggle.

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
| `--rule`       | `#e1dfd8` | `#262a31` | hairlines, outermost orbit       |
| `--rule-strong`| `#c9c6bd` | `#454b55` | innermost orbit, link underline  |
| `--accent`     | `#b8901f` | `#e2c25f` | the centre point only            |

Light is the default under `prefers-color-scheme: light`; dark reads as night
sky. A header toggle overrides and persists in `localStorage`. Code uses Shiki
dual themes `github-light` / `github-dark`.

Links: ink text with a 1px underline in `--rule-strong`, darkening to ink on
hover. No colour change.

## Layout

- Home: viewport-height, no scroll on desktop. Statement block left, max width
  540px, vertically centred. Orbit SVG absolutely positioned, centre at
  (1040, 420) of a 1280×800 frame, radii 110/210/330/480. On phone the centre
  moves to the top right and the statement sits in the lower half.
- Header 80px (phone 64px): orbit mark + wordmark left; nav right in mono
  uppercase; 44px hit targets.
- Reading pages (Writing, post, About): 680px column, 88px top padding.
- Writing index: title, one line of intro, posts grouped by year. Each row is
  title left, date right, hairline between rows.
- Post: back link, title, one meta line (date, reading time, language, tags),
  prose, previous/next, comments.
- About: the concept in prose (draft copy is in the mockup), current focus,
  how the site is built, and the "Elsewhere" links.

## Copy

Home statement: "The world moves." / "I want to understand how."
Home context: "I'm lemonilemon, a computer science student at National Taiwan
University. This is where I keep what I learn about how things work: systems,
languages, mathematics, and whatever moves me next."
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
| Avatar        | none on the site (Gravatar dropped)                    |
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
