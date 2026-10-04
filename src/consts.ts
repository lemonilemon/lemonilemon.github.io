export const SITE = {
  name: 'lemonilemon',
  author: 'Jasper Tsai',
  // The name on official records, which LinkedIn also uses.
  realName: 'Meng-Heng Tsai',
  description: "lemonilemon's personal website: notes on what I'm learning and working on.",
  since: 2025,
  source: 'https://github.com/lemonilemon/lemonilemon.github.io',
};

export const LINKS = {
  github: 'https://github.com/lemonilemon/',
  linkedin: 'https://www.linkedin.com/in/meng-heng-tsai-8b1965330/',
  email: 'mailto:imlemonilemon@gmail.com',
};

// The CV page renders this file with PDF.js. The deploy workflow copies it from
// the private resume repo; for a local preview, copy CV/public.pdf there.
// `updated` is shown next to the download link, e.g. 'September 2026'.
export const CV = {
  pdf: '/cv.pdf',
  updated: null as string | null,
};

// giscus needs GitHub Discussions enabled on the repo and the giscus app
// installed; copy the ids from https://giscus.app. Comments stay hidden
// until repoId and categoryId are set.
export const GISCUS = {
  repo: 'lemonilemon/lemonilemon.github.io',
  repoId: '',
  category: 'Comments',
  categoryId: '',
};
