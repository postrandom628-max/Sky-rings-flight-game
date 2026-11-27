// Sound: everything is synthesised with WebAudio — no audio files, no
// network. The engine hum follows the throttle; rings, stars, hits and
// clicks are short oscillator envelopes. Audio only starts after a user
// gesture (browsers block it before then), and every call is safe when
// the context is unavailable.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let enabled = false;

  function ensure() {
    if (ctx !== null) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return enabled;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sine';
      engineOsc2.frequency.value = 110;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      engineOsc2.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      engineOsc2.start();
      enabled = true;
    } catch {
      enabled = false;
    }
    return enabled;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!enabled || ctx === null) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    ensure,
    setEngine(throttle, running) {
      if (!enabled || ctx === null || engineGain === null) return;
      const target = running ? 0.028 + throttle * 0.02 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.15);
      if (engineOsc !== null) engineOsc.frequency.setTargetAtTime(52 + throttle * 70, ctx.currentTime, 0.2);
      if (engineOsc2 !== null) engineOsc2.frequency.setTargetAtTime(104 + throttle * 140, ctx.currentTime, 0.2);
    },
    ring(perfect) {
      tone(880, 0.16, 'sine', 0.16);
      tone(perfect ? 1318 : 1174, 0.24, 'sine', 0.16, 0.07);
    },
    star() {
      tone(1567, 0.12, 'sine', 0.12);
    },
    crash() {
      tone(160, 0.4, 'square', 0.2, 0, 40);
      tone(70, 0.5, 'sawtooth', 0.18, 0, 30);
    },
    click() {
      tone(660, 0.07, 'sine', 0.1);
    },
    level() {
      tone(523, 0.12, 'sine', 0.12);
      tone(659, 0.12, 'sine', 0.12, 0.1);
      tone(784, 0.2, 'sine', 0.12, 0.2);
    },
  };
}
