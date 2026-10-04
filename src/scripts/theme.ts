// The theme is set on <html data-theme> by the inline script in Base.astro
// before first paint. A stored choice wins; otherwise the system setting.

export type Theme = 'light' | 'dark';

const KEY = 'theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

export const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

function apply(theme: Theme) {
  if (theme === currentTheme()) return;
  document.documentElement.dataset.theme = theme;
  document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

// The new theme spreads over the page in a circle growing from `from`, the
// point the switch was pressed. Without view transitions, or for readers who
// prefer reduced motion, it switches at once.
function reveal(theme: Theme, from?: { x: number; y: number }) {
  if (!from || !document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply(theme);
    return;
  }
  const transition = document.startViewTransition(() => apply(theme));
  const radius = Math.hypot(Math.max(from.x, innerWidth - from.x), Math.max(from.y, innerHeight - from.y));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0 at ${from.x}px ${from.y}px)`, `circle(${radius}px at ${from.x}px ${from.y}px)`] },
        { duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {
      // The transition was skipped; the theme is already applied.
    });
}

// Remember a choice only while it differs from the browser's preference:
// toggling back to what the browser prefers returns to following it.
export function setTheme(theme: Theme, from?: { x: number; y: number }) {
  const preferred: Theme = media.matches ? 'dark' : 'light';
  try {
    if (theme === preferred) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  reveal(theme, from);
}

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

media.addEventListener('change', () => {
  if (!stored()) apply(media.matches ? 'dark' : 'light');
});
