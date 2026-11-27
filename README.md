[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/postrandom628-max/Sky-rings-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/postrandom628-max/Sky-rings-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# Sky Rings — Alpine Flight

A complete, original pseudo-3D chase-view flight game that plays offline in a
desktop browser from its own files. No libraries, no network requests: every
pixel is drawn from code on one canvas, and every sound is synthesised with
WebAudio.

## The game

You are the pilot of a little red-and-white prop plane over an alpine valley.
Take off from the runway, then fly through the golden rings ahead, grab
stars, and dodge hot-air balloons, storm clouds and mountain peaks. Rings are
worth 100 points (150 for a perfect centre pass), stars 25. You have 3 lives;
each level gets faster. The sky changes with the level: dawn, noon, sunset,
dusk.

The HUD shows everything a pilot needs: altitude and airspeed on lit dials,
a heading compass tape, score, rings, stars, lives, level and throttle.

## How to run

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Then open http://localhost:8080 in desktop Chrome. Or open `game/index.html`
directly from the files — the game needs no server and no network.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Steer (left/right) and climb/descend |
| Mouse / touch (hold + drag) | The plane chases the pointer |
| Shift | Boost |
| Space / Enter / click | Start, restart |
| P / Esc | Pause |

Best score is kept in the browser's local storage.

## Screenshots

`screenshots/` holds 4 real renders of the game's own code (1280x720):

1. `1-start.jpg` — title screen, plane on the runway
2. `2-play.jpg` — mid-flight, rings and HUD
3. `3-rings.jpg` — mid-flight, different seed
4. `4-end.jpg` — game over

They are staged deterministically with `?shot=start|play|end&seed=N` (see
`shots.json`); the same seed always gives the same frame.

## Files

- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` (run with
  `MAKEFUN_OUTPUT_DIR=out node main.ts` outside the grader).
- `game/` — the playable game: `index.html` plus ES modules under `src/`
  (`config.js`, `random.js`, `world.js`, `input.js`, `audio.js`,
  `render.js`, `shots.js`, `main.js`).
- `vendor/makefun-game.ts` — make.fun's game library, copied unchanged.
- `serve.ts` — a tiny static server for local play-testing.

## Entry

Built for the make.fun bounty **"Make the best flight game"**
(https://make.fun/bounty/best-flight-game-20261126-0057): $500 USDC, 50
places, entries close Saturday 28 November 2026, 07:57 WIB.
