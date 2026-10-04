# lemonilemon.github.io

My personal website, built with [Astro](https://astro.build/).

```sh
nix develop   # or any Node 24
npm install
npm run dev
```

Posts live in `src/content/posts/<slug>/index.md`. The CV page renders `public/cv.pdf`, which the deploy workflow copies from the private resume repo (`CV/public.pdf`) and the build refuses unless it is the public version; it is gitignored, so copy it there yourself to preview locally.
