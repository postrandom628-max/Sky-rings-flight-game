// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (chase the nearest ring, dodge anything in the way), so
// the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer toward the nearest ring, away from the nearest hazard in the way. */
function autopilot(state, dodge) {
  const p = state.plane;
  let ring = null;
  let hazard = null;
  for (const e of state.entities) {
    if (!e.active) continue;
    if (e.kind === 'ring' && (ring === null || e.z < ring.z)) ring = e;
    if (dodge && (e.kind === 'balloon' || e.kind === 'storm' || e.kind === 'peak') && e.z < 0.55 && (hazard === null || e.z < hazard.z)) hazard = e;
  }
  let tx = p.x;
  let ty = p.y;
  if (ring !== null) {
    tx = ring.x;
    ty = ring.y;
  }
  if (hazard !== null) {
    const dx = p.x - hazard.x;
    const dy = p.y - hazard.y;
    if (Math.abs(dx) < 220 && Math.abs(dy) < 190) {
      tx = p.x + (dx >= 0 ? 260 : -260);
      ty = p.y + (dy >= 0 ? 200 : -200);
    }
  }
  const sx = tx > p.x + 18 ? 1 : tx < p.x - 18 ? -1 : 0;
  const sy = ty > p.y + 18 ? 1 : ty < p.y - 18 ? -1 : 0;
  return { x: sx, y: sy };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  // The end scene's pilot is reckless: it chases rings and never dodges, so
  // the hazards catch it, as they would a hurried player.
  const dodge = name !== 'end';
  for (let i = 0; i < limit / STEP; i += 1) {
    const steer = autopilot(world.state, dodge);
    if (world.step(STEP, steer, false, true) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(world.state.score) };
}
