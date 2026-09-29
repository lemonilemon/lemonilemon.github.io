# Site design: Hugo → Astro migration

Scaffolding for the migration on the `astro-migration` branch. Delete once the
Astro site ships.

Mockup: https://claude.ai/artifact/2LAKtQH7aXS6EGN9eXynLi (private canvas:
home light and dark, plus "Home · phone · day" and "· night"; writing, post,
CV and colophon in light and dark; avatar. The older "Home · phone" board
with the rings is superseded). The canvas is the source of truth; this file records the decisions
behind the build.

## Concept

The home page is a different scene by day and by night. The theme toggle
chooses which one you see. Neither is explained on the page; the colophon
names them.

- **Day** (light theme): a line-drawn laptop running a small Space Travel, the
  1969 game that led to Unix. The ship sits landed on Earth until someone
  touches it. Hold the screen to fly towards the pointer, or focus it and use
  the arrow keys; `-` and `+` change the scale. Landing gently on both Venus
  and Mars shows a `$` prompt for a few seconds. It is a real (patched-conic)
  orbital game, made playable by:
  - a dotted line showing where the ship will coast, a × where it would
    crash, and a dashed ghost of any planet it meets (faint for a near miss);
  - faint orbit rings for Venus, Earth and Mars;
  - time running ×4 while coasting around the Sun, ×2 high above a planet,
    and ×0.6 when descending close to a surface;
  - a camera that follows whichever body's gravity holds the ship and zooms
    to fit it, both ways;
  - steering in real time, independent of the game's pace.
  The physics lives in `src/scripts/home/space-physics.ts` (leapfrog
  integration, so the prediction matches the flight). A first takeoff
  straight up heads towards Venus; Mars needs the planets to line up.
- **Night** (dark theme): a star field and the inner planets with fading
  trails. Choose a body ("Stand on Mars") and the view slides so that body sits
  still at the centre while the others, the Sun included, loop around it. A
  tribute to 《チ。―地球の運動について―》.
- A pause/play button controls whichever scene is showing: in the footer on
  wide layouts, inside the scene on phones. Under `prefers-reduced-motion`
  both start paused.

The intro: "Hello, world!", one sentence ("I'm a CS & Finance student in
Taiwan. I write here about what I'm learning and what I'm working on."), then
CV, GitHub, LinkedIn and Email links. The page has a visually hidden `<h1>`
with the site name.

The mark and favicon: an orbit arc with a dot, 14px.

## Layout

- Wide layout: a two-column grid inside the page margins (1 : 1.1, 56px
  gap). The intro (max 520px) sits left; the scene is right-aligned to the
  same margin as the header and centred vertically with the intro. Scenes are
  drawn on a 1280×800 frame and each SVG shows one region of it, scaled to
  fit its column and the viewport height: the laptop (659, 147, 582×412, at
  most 720px wide), the orrery (660, 60, 600×600, at most 600px). Desktop
  home is one viewport tall, no scroll.
- The laptop's lid and keyboard deck share one hinge edge (x 700–1200): the
  lid has rounded top corners only, and the deck widens to the front.
- Stacked layout (below 1000px wide, or below 561px tall): the scene fills
  the space between the header and the intro (min 280px), the intro sits at
  the bottom, and the page may scroll. The scenes draw at real pixel size:
  - Day: the phone's own screen, framed by a 1px hairline (ink at 35%, 10px
    corners) on the `--screen` fill, up to 640px wide. No laptop, no
    keyboard: hold the screen to fly. Three 44px keys in the bottom-right
    corner, drawn like the laptop's keys: zoom out, zoom in, pause. Status
    line bottom-left, 11px; scale top-right.
  - Night: full-bleed, centred 1.2 AU in from the right edge so the outer
    paths run off the screen; 0.19 × width px per AU, smaller if the space
    is short. A tap stands on the body nearest the tap. Pause at the
    bottom-right of the scene.
- Header 80px (phone 64px): mark and wordmark left; Writing and the theme
  toggle right (CV is linked from the home intro, not the header), mono uppercase, 44px hit targets. The current section is ink.
- Footer: copyright left; RSS, Source, Colophon right.
- Reading pages (Writing, post, tags, colophon, 404): 680px column, 88px top
  padding (post 72px). CV: 760px column.
- Night reading pages have a few twinkling stars in the side gutters, drawn at
  native size and hidden below 1244px wide so they never reach the column.

## Typography

| Role   | Latin         | CJK                    | Use                              |
|--------|---------------|------------------------|----------------------------------|
| Text   | Spectral      | Noto Serif TC Variable | intro, titles, prose             |
| Labels | IBM Plex Mono | Noto Serif TC Variable | nav, dates, tags, meta, code     |

Spectral 400/500/600 plus 400/500 italic; Plex Mono 400/500. Self-hosted from
Fontsource npm packages. Noto Serif TC ships as ~100 unicode-range slices, so
the browser downloads only the slices a page uses. (Astro's Fonts API was
tried and dropped: its `<Font>` component inlines every `@font-face` rule into
each page, ~300 KB for the CJK font.)

Scale: intro 60px (phone 42), page titles 40px, post title 42px, h2 28px,
prose 19px at line-height 1.8, list titles 24px, labels 12.5px uppercase with
0.12em tracking. `<html lang>` follows the post's `lang`.

## Colour tokens

| Token          | Light     | Dark      | Use                              |
|----------------|-----------|-----------|----------------------------------|
| `--bg`         | `#fbfaf7` | `#0e1014` | page                             |
| `--surface`    | `#f2f0ea` | `#171a20` | code blocks                      |
| `--ink`        | `#17181a` | `#e8e6df` | text, drawings                   |
| `--body`       | `#45464a` | `#c4c2bb` | intro sentence                   |
| `--muted`      | `#6b6b66` | `#9a9a93` | secondary text, labels           |
| `--faint`      | `#a8a59c` | `#5d626a` | pause button                     |
| `--rule`       | `#e1dfd8` | `#262a31` | hairlines                        |
| `--rule-strong`| `#c9c6bd` | `#454b55` | link underline, blockquote rule  |

Light follows `prefers-color-scheme` until the toggle is used; the choice is
stored in `localStorage`. Code uses Shiki dual themes `github-light` /
`github-dark` on the `--surface` background.

## Pages and URLs

| Path                     | Content                                     |
|--------------------------|---------------------------------------------|
| `/`                      | home                                        |
| `/posts/`                | writing index, grouped by year              |
| `/posts/<slug>/`         | post (`hugo-site` stays `hugo-site`)        |
| `/tags/<tag>/`           | tag pages (linked from post meta only)      |
| `/cv/`                   | CV: `public/cv.pdf` rendered with PDF.js    |
| `/about/`                | redirects to `/cv/`                         |
| `/colophon/`             | colophon                                    |
| `/rss.xml`, `/index.xml` | feed; `/index.xml` kept for Hugo subscribers|
| `/sitemap-index.xml`     | sitemap                                     |
| `/404`                   | not found                                   |

## Content model

`src/content/posts/<slug>/index.md`, YAML front matter, images beside the post:

```yaml
title: string
description: string        # optional
date: date
updated: date              # optional
lang: "en" | "zh-TW"       # sets <html lang>, reading speed
tags: string[]
draft: boolean             # default false
math: boolean              # default false, links the KaTeX stylesheet
comments: boolean          # default true
```

Reading time: 500 chars/min for zh-TW, 212 words/min for en.

## Features

| Feature       | Plan                                                    |
|---------------|---------------------------------------------------------|
| Theme toggle  | icon only; also switches the home scene                 |
| Comments      | giscus; hidden until `GISCUS` ids are set in `src/consts.ts` |
| Previous/next | "Older" / "Newer" under each post                       |
| RSS, sitemap  | `@astrojs/rss`, `@astrojs/sitemap`                      |
| Math          | Astro 7's Markdown processor (Sätteri) parses `$…$`; a small plugin renders it with KaTeX at build time |
| Avatar        | not on the site; the canvas keeps the lemon for GitHub and social profiles |

## Toolchain

- Astro 7, TypeScript strict, npm, Node 24 (flake: `nodejs_24`).
- `npm run build` runs `astro check` then `astro build`.
- GitHub Actions: `withastro/action@v6` → `actions/deploy-pages@v5`.

## Open

- `public/cv.pdf` and `CV.updated` in `src/consts.ts`.
- giscus: enable Discussions on the repo, install the giscus app, copy the ids.
