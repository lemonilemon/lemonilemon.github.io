# lemonilemon.github.io

My personal website, built with [Astro](https://astro.build/).

```sh
nix develop   # or any Node 24
npm install
npm run dev
```

To update the dev shell, run `nix flake update`, then `nix build --dry-run .#devShells.x86_64-linux.default`. If it would build `nodejs` rather than fetch it, cache.nixos.org has no prebuilt Node for that nixpkgs yet: keep the old `flake.lock` (`git checkout flake.lock`) and try again in a day or two.

Posts live in `src/content/posts/<slug>/index.md`. The CV page renders `public/cv.pdf`, which the deploy workflow copies from the private resume repo (`CV/public.pdf`) and the build refuses unless it is the public version; it is gitignored, so copy it there yourself to preview locally.
