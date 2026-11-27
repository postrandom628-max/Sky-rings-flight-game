// Input: keyboard (arrows / WASD, Shift boost, Space confirm, P pause) plus
// mouse and touch steering: the plane chases the pointer while it is held.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let pointer = null; // {x, y} in canvas CSS pixels, while held
  let pointerRect = null;

  function keyDown(event) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === ' ' || event.key === 'Enter') actions |= ACTION_CONFIRM;
    if (event.key.toLowerCase() === 'p' || event.key === 'Escape') actions |= ACTION_PAUSE;
  }
  function keyUp(event) {
    keys.delete(event.key.toLowerCase());
  }
  function pointerDown(event) {
    pointerRect = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - pointerRect.left, y: event.clientY - pointerRect.top };
    canvas.setPointerCapture?.(event.pointerId);
  }
  function pointerMove(event) {
    if (pointer === null || pointerRect === null) return;
    pointer.x = event.clientX - pointerRect.left;
    pointer.y = event.clientY - pointerRect.top;
  }
  function pointerUp() {
    pointer = null;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  /** Steering in -1..1 for x and y, from keys or the held pointer. */
  function steer(planeX, planeY, scaleX, scaleY) {
    let x = 0;
    let y = 0;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1;
    if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) y -= 1;
    if (keys.has('arrowdown') || keys.has('s')) y += 1;
    if (pointer !== null) {
      const tx = pointer.x * scaleX;
      const ty = pointer.y * scaleY;
      const dx = tx - planeX;
      const dy = ty - planeY;
      if (Math.abs(dx) > 14) x = Math.max(-1, Math.min(1, dx / 160));
      if (Math.abs(dy) > 14) y = Math.max(-1, Math.min(1, dy / 160));
    }
    return { x, y };
  }

  function boost() {
    return keys.has('shift');
  }

  function confirmHeld() {
    return keys.has(' ') || keys.has('enter');
  }

  return { takeActions, steer, boost, confirmHeld };
}
