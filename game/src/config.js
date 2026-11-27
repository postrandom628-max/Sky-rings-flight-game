// Sky Rings — Alpine Flight: a complete pseudo-3D chase-view flight game.
// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. All art is drawn from code (canvas paths, gradients):
// no external assets, no network requests, fully offline.

export const FIELD = { width: 1280, height: 720, horizonY: 330, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLANE = {
  // Screen-space flight box (the chase view): the plane flies inside it.
  minX: 90,
  maxX: 1190,
  minY: 150,
  maxY: 600,
  // How fast the plane answers the stick, in px/s^2 (smoothed velocity).
  accel: 2600,
  maxVX: 560,
  maxVY: 420,
  // Seconds of invulnerability after a hit, while the plane blinks.
  invulnerable: 1.6,
  // Half-extents of the collision box around the plane's centre.
  halfW: 62,
  halfH: 30,
};

export const LIVES = 3;

/** Rings: the target rings ahead. Flying through the middle scores. */
export const RING = {
  radius: 64,
  perfectRadius: 26,
  points: 100,
  perfectPoints: 150,
  // A ring is guaranteed at least this often (seconds between forced rings).
  maxGap: 2.6,
};

/** Collectible stars. */
export const STAR = { radius: 22, points: 25 };

/** How fast things approach (z falls from 1 = horizon to 0 = the plane). */
export const APPROACH = {
  base: 0.16,
  perLevel: 0.012,
  boost: 0.12,
};

/** Spawning. */
export const SPAWN = {
  interval: 0.85,
  intervalScale: 0.94,
  minInterval: 0.42,
};

/** Seconds of play per level; speeds and spawn rates stop growing at max. */
export const LEVEL = { seconds: 25, max: 8 };

/** Seconds of runway roll before lift-off at the start of a run. */
export const TAKEOFF = 3.2;

/** How many entities can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 48;

export const PALETTE = {
  // Sky palettes cycle with the level: dawn, noon, sunset, dusk.
  skies: [
    { top: '#2b4a7a', mid: '#7fb2e5', low: '#ffd9a0', sun: '#fff3c4' },
    { top: '#1e6fd9', mid: '#7ec8f7', low: '#cfeeff', sun: '#fffbe0' },
    { top: '#3b2a6e', mid: '#e8735a', low: '#ffc46b', sun: '#ffe9a8' },
    { top: '#101a3a', mid: '#3d4a8a', low: '#8a6bb0', sun: '#ffd9a0' },
  ],
  farRidge: '#5d7396',
  farRidgeSnow: '#e8eef7',
  nearHill: '#3f7a4a',
  nearHillDark: '#2f5c38',
  groundA: '#69a84f',
  groundB: '#7fb85c',
  fieldC: '#e0b64f',
  river: '#4fa8dd',
  road: '#4a4a52',
  runway: '#3c3f46',
  runwayMark: '#f5f5f5',
  ring: '#ffc93c',
  ringGlow: '#ffdf7e',
  star: '#ffe066',
  balloon: '#e5534b',
  balloonAlt: '#7b61ff',
  storm: '#3a3f4d',
  peak: '#5b6470',
  peakSnow: '#f2f6fb',
  planeBody: '#f4f6f8',
  planeAccent: '#e8452c',
  planeWing: '#dfe6ec',
  panel: 'rgba(12, 18, 32, 0.72)',
  panelEdge: 'rgba(255, 255, 255, 0.25)',
  text: '#eef1f5',
  muted: '#aab3c2',
  warn: '#ff5a4e',
  good: '#7dff8a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sky-rings.best';
