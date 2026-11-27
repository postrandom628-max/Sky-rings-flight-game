// The world: the plane, the approaching rings / obstacles / stars, the
// scrolling terrain, scoring and lives. Everything is deterministic for a
// given seed: the same seed always plays the same flight.
//
// Coordinate model: the plane flies in screen space (x, y). The world ahead
// is a stream of entities with depth z: 1 is the horizon, 0 is the plane.
// As z falls, an entity grows and slides from its horizon position toward
// its target position at the plane's depth. When z crosses 0 it is resolved:
// a ring scores if the plane is inside it, a star scores if it touches the
// plane, an obstacle costs a life if it touches the plane.

import { APPROACH, FIELD, LEVEL, LIVES, PLANE, POOL_SIZE, RING, SPAWN, STAR, TAKEOFF } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_RING = 4;
export const EVENT_PERFECT = 8;
export const EVENT_STAR = 16;
export const EVENT_LEVEL = 32;

export const KIND_RING = 'ring';
export const KIND_STAR = 'star';
export const KIND_BALLOON = 'balloon';
export const KIND_STORM = 'storm';
export const KIND_PEAK = 'peak';

function makeEntity() {
  return { active: false, kind: KIND_RING, x: 640, y: 300, z: 1, r: 60, hue: 0, drift: 0, scored: false };
}

export function createWorld(random, lives = LIVES) {
  const pool = [];
  for (let i = 0; i < POOL_SIZE; i += 1) pool.push(makeEntity());

  // Pre-rolled ridge / field features so the terrain is stable and seeded.
  const ridgeFar = [];
  const ridgeNear = [];
  const fieldBand = [];
  for (let i = 0; i < 96; i += 1) {
    ridgeFar.push(0.35 + random() * 0.65);
    ridgeNear.push(0.3 + random() * 0.7);
    fieldBand.push(Math.floor(random() * 4));
  }
  const clouds = [];
  for (let i = 0; i < 14; i += 1) {
    clouds.push({ x: random() * FIELD.width, y: 40 + random() * 220, s: 0.5 + random() * 1.1, v: 6 + random() * 14 });
  }

  const state = {
    time: 0,
    distance: 0,
    score: 0,
    rings: 0,
    ringsTotal: 0,
    stars: 0,
    lives,
    level: 1,
    throttle: 0.55,
    boost: false,
    speed: 0, // knots, for the HUD
    altitude: 0, // feet, for the HUD
    heading: 270, // degrees, for the HUD
    takeoff: TAKEOFF, // seconds left on the runway roll
    plane: { x: FIELD.width / 2, y: FIELD.groundY, vx: 0, vy: 0, bank: 0, pitch: 0, invuln: 0 },
    spawnTimer: 1.1,
    ringTimer: 0,
    message: '',
    messageTimer: 0,
    flash: 0, // red damage flash, 0..1
    shake: 0, // screen shake, 0..1
    entities: pool,
    ridgeFar,
    ridgeNear,
    fieldBand,
    clouds,
  };

  function reset() {
    state.time = 0;
    state.distance = 0;
    state.score = 0;
    state.rings = 0;
    state.ringsTotal = 0;
    state.stars = 0;
    state.lives = lives;
    state.level = 1;
    state.throttle = 0.55;
    state.boost = false;
    state.speed = 0;
    state.altitude = 0;
    state.heading = 270;
    state.takeoff = TAKEOFF;
    state.plane.x = FIELD.width / 2;
    state.plane.y = FIELD.groundY;
    state.plane.vx = 0;
    state.plane.vy = 0;
    state.plane.bank = 0;
    state.plane.pitch = 0;
    state.plane.invuln = 0;
    state.spawnTimer = 1.1;
    state.ringTimer = 0;
    state.message = '';
    state.messageTimer = 0;
    state.flash = 0;
    state.shake = 0;
    for (const e of pool) e.active = false;
  }

  function spawn() {
    let slot = null;
    for (const e of pool) {
      if (!e.active) { slot = e; break; }
    }
    if (slot === null) return;
    // A ring is forced regularly so the flight always has a target ahead.
    const forceRing = state.ringTimer >= RING.maxGap;
    const roll = random();
    let kind;
    if (forceRing) kind = KIND_RING;
    else if (roll < 0.42) kind = KIND_RING;
    else if (roll < 0.62) kind = KIND_STAR;
    else if (roll < 0.77) kind = KIND_BALLOON;
    else if (roll < 0.89) kind = KIND_STORM;
    else kind = KIND_PEAK;

    slot.active = true;
    slot.kind = kind;
    slot.z = 1;
    slot.scored = false;
    slot.hue = random();
    slot.drift = (random() - 0.5) * 60;
    if (kind === KIND_RING) {
      slot.x = 320 + random() * 640;
      slot.y = 210 + random() * 300;
      slot.r = RING.radius;
      state.ringTimer = 0;
      state.ringsTotal += 1;
    } else if (kind === KIND_STAR) {
      slot.x = 200 + random() * 880;
      slot.y = 190 + random() * 330;
      slot.r = STAR.radius;
    } else if (kind === KIND_BALLOON) {
      slot.x = 180 + random() * 920;
      slot.y = 200 + random() * 260;
      slot.r = 46;
    } else if (kind === KIND_STORM) {
      slot.x = 180 + random() * 920;
      slot.y = 170 + random() * 220;
      slot.r = 58;
    } else {
      // A peak rises from the ground: its target y is the ground line.
      slot.x = 160 + random() * 960;
      slot.y = FIELD.groundY;
      slot.r = 70 + random() * 60;
    }
  }

  function hitPlane(e) {
    const p = state.plane;
    const dx = Math.abs(e.x - p.x);
    const dy = Math.abs(e.y - p.y);
    const rw = PLANE.halfW + e.r * 0.55;
    const rh = PLANE.halfH + e.r * 0.55;
    return dx < rw && dy < rh;
  }

  /** Advance the world one fixed step. `steer` is {x, y} in -1..1, `boost` a boolean. */
  function step(dt, steer, boost, demo) {
    let events = 0;
    const p = state.plane;
    state.time += dt;

    // Level up every LEVEL.seconds of flight.
    const level = Math.min(LEVEL.max, 1 + Math.floor(state.time / LEVEL.seconds));
    if (level !== state.level) {
      state.level = level;
      state.message = `LEVEL ${level} — FASTER!`;
      state.messageTimer = 2;
      events |= EVENT_LEVEL;
    }

    // Speed and HUD values.
    const targetThrottle = demo ? 0.7 : 0.55 + (boost ? 0.45 : 0);
    state.throttle += (targetThrottle - state.throttle) * Math.min(1, dt * 2);
    state.boost = boost;
    const knots = 95 + state.throttle * 165 + (state.level - 1) * 9;
    state.speed = knots;
    state.altitude = Math.max(0, Math.round((FIELD.groundY - p.y) * 14));

    // Takeoff roll: the plane stays on the runway, accelerating, then lifts.
    if (state.takeoff > 0) {
      state.takeoff -= dt;
      const lift = 1 - Math.max(0, state.takeoff) / TAKEOFF;
      p.y = FIELD.groundY - lift * lift * 130;
      p.x = FIELD.width / 2;
      state.distance += knots * dt * 0.35;
      if (state.takeoff <= 0) {
        state.message = 'AIRBORNE — FLY THROUGH THE RINGS!';
        state.messageTimer = 2.2;
      }
    } else {
      // Steering: smooth acceleration toward the stick, with banking and pitch.
      p.vx += steer.x * PLANE.accel * dt;
      p.vy += steer.y * PLANE.accel * dt;
      p.vx *= Math.max(0, 1 - dt * 4.2);
      p.vy *= Math.max(0, 1 - dt * 4.2);
      p.vx = Math.max(-PLANE.maxVX, Math.min(PLANE.maxVX, p.vx));
      p.vy = Math.max(-PLANE.maxVY, Math.min(PLANE.maxVY, p.vy));
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.x = Math.max(PLANE.minX, Math.min(PLANE.maxX, p.x));
      p.y = Math.max(PLANE.minY, Math.min(PLANE.maxY, p.y));
      if ((p.x === PLANE.minX && p.vx < 0) || (p.x === PLANE.maxX && p.vx > 0)) p.vx = 0;
      if ((p.y === PLANE.minY && p.vy < 0) || (p.y === PLANE.maxY && p.vy > 0)) p.vy = 0;
      state.distance += knots * dt * 0.55;
      state.score += knots * dt * 0.045;
    }
    p.bank += ((p.vx / PLANE.maxVX) * 0.55 - p.bank) * Math.min(1, dt * 6);
    p.pitch += ((-p.vy / PLANE.maxVY) * 0.28 - p.pitch) * Math.min(1, dt * 6);
    state.heading = 270 + (p.vx / PLANE.maxVX) * 28;
    if (p.invuln > 0) p.invuln -= dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2.2);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 1.8);

    // Clouds drift with parallax.
    for (const c of state.clouds) {
      c.x -= (c.v + knots * 0.12 * c.s) * dt;
      if (c.x < -160) { c.x = FIELD.width + 120; c.y = 40 + random() * 220; }
    }

    // Spawning.
    state.spawnTimer -= dt;
    state.ringTimer += dt;
    if (state.spawnTimer <= 0 && state.takeoff <= 0) {
      spawn();
      const interval = Math.max(
        SPAWN.minInterval,
        SPAWN.interval * Math.pow(SPAWN.intervalScale, state.level - 1),
      );
      state.spawnTimer = interval * (0.8 + random() * 0.4);
    }

    // Entities approach and resolve at the plane.
    const approach = APPROACH.base + APPROACH.perLevel * (state.level - 1) + (boost ? APPROACH.boost : 0);
    for (const e of pool) {
      if (!e.active) continue;
      e.z -= approach * dt;
      e.x += e.drift * dt * (1 - e.z);
      if (e.z <= 0) {
        e.active = false;
        if (e.kind === KIND_RING) {
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < e.r) {
            const perfect = d < RING.perfectRadius;
            state.score += perfect ? RING.perfectPoints : RING.points;
            state.rings += 1;
            state.message = perfect ? `PERFECT +${RING.perfectPoints}` : `RING +${RING.points}`;
            state.messageTimer = 1.1;
            events |= perfect ? EVENT_PERFECT : EVENT_RING;
          }
        } else if (e.kind === KIND_STAR) {
          if (hitPlane(e)) {
            state.score += STAR.points;
            state.stars += 1;
            state.message = `STAR +${STAR.points}`;
            state.messageTimer = 0.9;
            events |= EVENT_STAR;
          }
        } else if (p.invuln <= 0 && state.takeoff <= 0 && hitPlane(e)) {
          state.lives -= 1;
          p.invuln = PLANE.invulnerable;
          state.flash = 1;
          state.shake = 1;
          state.message = state.lives > 0 ? 'HIT! HULL DAMAGED' : 'CRASHED!';
          state.messageTimer = 1.4;
          events |= EVENT_HIT;
          if (state.lives <= 0) events |= EVENT_OVER;
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
