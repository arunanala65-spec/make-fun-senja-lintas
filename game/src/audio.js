// Senja Lintas — procedural WebAudio: engine, wind, chimes. No audio files.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;

  function ensureStarted() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(ctx.destination);
    engineOsc.start();

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    noise.connect(windFilter).connect(windGain).connect(ctx.destination);
    noise.start();
  }

  function chime(freq, when, dur) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + when + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + dur + 0.05);
  }

  return {
    start: ensureStarted,
    update(throttle, speedKmh) {
      if (!ctx) return;
      engineOsc.frequency.value = 50 + throttle * 95;
      engineGain.gain.value = 0.02 + throttle * 0.09;
      windGain.gain.value = Math.min(0.12, speedKmh / 2600);
    },
    event(name) {
      if (!ctx) return;
      if (name === 'ring') { chime(880, 0, 0.35); chime(1320, 0.09, 0.4); }
      if (name === 'photo') { chime(1560, 0, 0.15); chime(1040, 0.12, 0.3); }
      if (name === 'rescue' || name === 'cargo') { chime(660, 0, 0.3); chime(990, 0.12, 0.45); }
      if (name === 'sortie') { chime(740, 0, 0.25); chime(1100, 0.12, 0.4); }
      if (name === 'finish') { chime(523, 0, 0.4); chime(659, 0.15, 0.4); chime(784, 0.3, 0.5); chime(1046, 0.45, 0.7); }
    },
  };
}
