// Runs the one scene that is showing (by theme and layout), stops the rest,
// and wires every play/pause button to it.
import { currentTheme, type Theme } from '../theme';
import { STACKED, type Layout, type Scene } from './scene';

const scenes = new Map<string, Scene>();
const stacked = window.matchMedia(STACKED);
const key = (theme: Theme, layout: Layout) => `${theme}:${layout}`;
const active = () => scenes.get(key(currentTheme(), stacked.matches ? 'stacked' : 'wide'));

function sync() {
  const current = active();
  for (const scene of scenes.values()) (scene === current ? scene.start() : scene.stop());
  if (!current) return;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-play]')) {
    button.setAttribute('aria-label', current.playing ? 'Pause' : 'Play');
    button.toggleAttribute('data-paused', !current.playing);
  }
}

export function register(theme: Theme, layout: Layout, scene: Scene) {
  scenes.set(key(theme, layout), scene);
  sync();
}

function toggle() {
  const current = active();
  if (!current) return;
  current.playing = !current.playing;
  sync();
}

document.addEventListener('themechange', sync);
document.addEventListener('playtoggle', toggle);
stacked.addEventListener('change', sync);
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-play]')) button.addEventListener('click', toggle);
