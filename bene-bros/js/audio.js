// BENE BROS — efectos de sonido y música chiptune (melodías originales).
(function (global) {
  'use strict';
  const BB = global.BB;
  let ac = null, master = null, musicGain = null, sfxGain = null;
  let muted = false;
  try { muted = global.localStorage.getItem('benebros:mute') === '1'; } catch (e) { /* nada */ }

  function unlock() {
    if (!ac) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(ac.destination);
      musicGain = ac.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
      sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
    }
    if (ac.state === 'suspended') ac.resume();
  }
  const ready = () => ac && ac.state === 'running';
  const freq = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function tone(f, dur, type = 'square', vol = 0.3, slide = 0, when = 0, dest = sfxGain) {
    if (!ready()) return;
    const t0 = ac.currentTime + when;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  let noiseBuf = null;
  function noise(dur, vol = 0.3, when = 0) {
    if (!ready()) return;
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = ac.currentTime + when;
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = noiseBuf;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(g); g.connect(sfxGain); s.start(t0); s.stop(t0 + dur + 0.05);
  }

  const SFX = {
    jump: () => tone(300, 0.18, 'square', 0.2, 500),
    coin: () => { tone(freq(83), 0.07, 'square', 0.18); tone(freq(88), 0.25, 'square', 0.18, 0, 0.07); },
    stomp: () => { tone(220, 0.12, 'square', 0.25, -150); noise(0.08, 0.2); },
    bump: () => tone(120, 0.1, 'triangle', 0.4, -40),
    brick: () => { noise(0.25, 0.35); tone(160, 0.15, 'square', 0.15, -100); },
    item: () => [60, 64, 67, 72].forEach((n, i) => tone(freq(n), 0.1, 'square', 0.15, 0, i * 0.05)),
    power: () => [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(freq(n), 0.09, 'square', 0.18, 0, i * 0.06)),
    heart: () => [72, 79, 84].forEach((n, i) => tone(freq(n), 0.12, 'triangle', 0.3, 0, i * 0.08)),
    hurt: () => tone(500, 0.35, 'sawtooth', 0.2, -400),
    kick: () => { tone(180, 0.08, 'square', 0.25, 200); noise(0.05, 0.2); },
    throw: () => tone(600, 0.1, 'triangle', 0.25, -300),
    life: () => [76, 79, 88, 84, 86, 91].forEach((n, i) => tone(freq(n), 0.1, 'square', 0.15, 0, i * 0.08)),
    flag: () => [67, 72, 76].forEach((n, i) => tone(freq(n), 0.12, 'triangle', 0.3, 0, i * 0.07)),
    die: () => [71, 77, 77, 77, 76, 74, 72].forEach((n, i) => tone(freq(n), 0.16, 'square', 0.2, 0, 0.3 + i * 0.15)),
    bell: () => [0, 0.35, 0.7].forEach((w) => { tone(freq(84), 1.2, 'sine', 0.4, 0, w); tone(freq(96), 0.8, 'sine', 0.15, 0, w); tone(freq(91), 1, 'triangle', 0.1, 0, w); }),
    bossHit: () => { tone(150, 0.3, 'sawtooth', 0.3, -100); noise(0.2, 0.3); },
    pause: () => tone(freq(76), 0.08, 'square', 0.2),
    win: () => [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((n, i) => tone(freq(n), 0.18, 'square', 0.18, 0, i * 0.13)),
  };

  // ------------------------------------------------------------------ música
  // Cada canción: tempo (pasos por segundo) y pistas de notas MIDI (0 = silencio).
  const SONGS = {
    pradera: {
      bpm: 300,
      lead: [72, 0, 76, 79, 77, 76, 74, 0, 72, 74, 76, 72, 69, 0, 67, 0,
        65, 0, 69, 72, 71, 69, 67, 0, 67, 69, 71, 74, 72, 0, 0, 0,
        76, 0, 76, 77, 79, 0, 76, 0, 74, 0, 74, 76, 77, 0, 74, 0,
        72, 74, 76, 79, 77, 76, 74, 71, 72, 0, 67, 0, 72, 0, 0, 0],
      bass: [48, 0, 55, 0, 48, 0, 55, 0, 45, 0, 52, 0, 45, 0, 52, 0,
        41, 0, 48, 0, 43, 0, 50, 0, 43, 0, 47, 0, 48, 0, 43, 0,
        48, 0, 55, 0, 48, 0, 55, 0, 43, 0, 50, 0, 43, 0, 50, 0,
        41, 0, 45, 0, 43, 0, 47, 0, 48, 0, 43, 0, 48, 0, 0, 0],
    },
    cueva: {
      bpm: 240,
      lead: [69, 0, 0, 72, 0, 0, 71, 0, 69, 0, 64, 0, 0, 0, 0, 0,
        67, 0, 0, 71, 0, 0, 69, 0, 68, 0, 64, 0, 0, 0, 0, 0,
        69, 0, 72, 0, 76, 0, 74, 72, 71, 0, 72, 0, 74, 0, 0, 0,
        72, 0, 71, 0, 69, 0, 68, 0, 69, 0, 0, 0, 0, 0, 0, 0],
      bass: [45, 0, 52, 0, 45, 0, 52, 0, 45, 0, 52, 0, 45, 0, 52, 0,
        43, 0, 50, 0, 43, 0, 50, 0, 40, 0, 47, 0, 40, 0, 47, 0,
        41, 0, 48, 0, 41, 0, 48, 0, 43, 0, 50, 0, 43, 0, 50, 0,
        40, 0, 47, 0, 40, 0, 44, 0, 45, 0, 52, 0, 45, 0, 0, 0],
    },
    castillo: {
      bpm: 330,
      lead: [62, 65, 69, 65, 62, 65, 69, 72, 70, 69, 67, 65, 64, 0, 61, 0,
        62, 65, 69, 65, 62, 65, 69, 74, 73, 0, 70, 0, 69, 0, 0, 0,
        74, 0, 72, 70, 69, 0, 67, 65, 67, 0, 65, 64, 65, 0, 62, 0,
        61, 0, 64, 0, 67, 0, 70, 0, 69, 0, 0, 0, 62, 0, 0, 0],
      bass: [38, 38, 0, 38, 38, 0, 38, 0, 34, 34, 0, 34, 33, 0, 33, 0,
        38, 38, 0, 38, 38, 0, 38, 0, 34, 0, 34, 0, 33, 0, 33, 0,
        31, 31, 0, 31, 34, 0, 34, 0, 36, 36, 0, 36, 38, 0, 38, 0,
        33, 0, 33, 0, 37, 0, 37, 0, 38, 0, 38, 0, 38, 0, 0, 0],
    },
    jefe: {
      bpm: 400,
      lead: [62, 0, 62, 63, 0, 62, 0, 60, 62, 0, 62, 63, 0, 65, 0, 63,
        62, 0, 62, 63, 0, 62, 0, 60, 58, 0, 57, 0, 55, 0, 0, 0],
      bass: [38, 38, 50, 38, 38, 50, 38, 50, 38, 38, 50, 38, 38, 50, 38, 50,
        34, 34, 46, 34, 34, 46, 34, 46, 33, 33, 45, 33, 31, 31, 43, 31],
    },
  };

  let song = null, step = 0, nextTime = 0, timer = null;
  function playMusic(name) {
    stopMusic();
    if (!SONGS[name]) return;
    song = SONGS[name]; step = 0;
    unlock();
    if (!ac) return;
    nextTime = ac.currentTime + 0.05;
    timer = setInterval(schedule, 25);
  }
  function schedule() {
    if (!ready() || !song) return;
    const dt = 60 / song.bpm;
    while (nextTime < ac.currentTime + 0.12) {
      const when = nextTime - ac.currentTime;
      const l = song.lead[step % song.lead.length], b = song.bass[step % song.bass.length];
      if (l) tone(freq(l), dt * 0.9, 'square', 0.12, 0, when, musicGain);
      if (b) tone(freq(b), dt * 0.95, 'triangle', 0.35, 0, when, musicGain);
      if (step % 4 === 0) { /* pulso suave */ }
      nextTime += dt; step++;
    }
  }
  function stopMusic() { if (timer) clearInterval(timer); timer = null; song = null; }

  function setMuted(m) {
    muted = !!m;
    try { global.localStorage.setItem('benebros:mute', muted ? '1' : '0'); } catch (e) { /* nada */ }
    if (master) master.gain.value = muted ? 0 : 0.6;
  }

  BB.Audio = { unlock, SFX, playMusic, stopMusic, setMuted, isMuted: () => muted };
})(typeof window !== 'undefined' ? window : globalThis);
