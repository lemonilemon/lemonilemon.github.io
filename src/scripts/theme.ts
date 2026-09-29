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

// Remember a choice only while it differs from the browser's preference:
// toggling back to what the browser prefers returns to following it.
export function setTheme(theme: Theme) {
  const preferred: Theme = media.matches ? 'dark' : 'light';
  try {
    if (theme === preferred) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  apply(theme);
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
