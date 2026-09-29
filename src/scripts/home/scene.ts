// A home-page scene: runs only while it is showing.
export interface Scene {
  playing: boolean;
  start(): void;
  stop(): void;
}

// Wide: the scene sits beside the intro at its design-frame position.
// Stacked: the scene fills the space above the intro. Keep in step with the
// media queries in pages/index.astro.
export type Layout = 'wide' | 'stacked';
export const STACKED = '(max-width: 999px), (max-height: 560px)';
