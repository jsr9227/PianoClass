// Sintetizador de piano sencillo con Web Audio (sin muestras externas).
(function (root) {
  const PC = (root.PC = root.PC || {});
  let ctx = null;
  let master = null;
  let enabled = true;
  const voices = new Map(); // midi -> [voz]

  // Parciales (armónico, amplitud): imitan el timbre brillante del ataque de un piano.
  const PARTIALS = [
    [1, 1],
    [2, 0.45],
    [3, 0.22],
    [4, 0.12],
    [5, 0.06],
  ];

  function ensure() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noteOn(midi, velocity = 0.8, duration = null) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    const freq = PC.music.midiToFreq(midi);
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(12000, freq * 8 + 2000 * velocity), t);
    filter.frequency.setTargetAtTime(Math.min(8000, freq * 3 + 400), t + 0.02, 0.4);
    filter.connect(out);
    out.connect(master);

    const oscs = PARTIALS.map(([h, a], i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * h * (1 + i * 0.0007); // ligera inarmonía
      g.gain.value = a / (1 + (h - 1) * (freq / 600));
      o.connect(g);
      g.connect(filter);
      o.start(t);
      return o;
    });

    const peak = 0.28 * velocity;
    const decay = Math.max(0.35, Math.min(2.6, 1.8 * Math.sqrt(262 / freq)));
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.006);
    out.gain.setTargetAtTime(peak * 0.35, t + 0.01, decay * 0.25);
    out.gain.setTargetAtTime(0.0001, t + 0.4, decay);

    const voice = { out, oscs, released: false };
    oscs[0].onended = () => out.disconnect();
    if (!voices.has(midi)) voices.set(midi, []);
    voices.get(midi).push(voice);
    if (duration != null) release(voice, t + Math.max(0.08, duration));
    else oscs.forEach((o) => o.stop(t + 8));
  }

  function release(voice, when) {
    if (voice.released) return;
    voice.released = true;
    const t = Math.max(when, ctx.currentTime);
    voice.out.gain.cancelScheduledValues(t);
    if (t <= ctx.currentTime + 0.001) voice.out.gain.setValueAtTime(voice.out.gain.value, t);
    voice.out.gain.setTargetAtTime(0, t, 0.07);
    voice.oscs.forEach((o) => {
      try {
        o.stop(t + 0.5);
      } catch (e) {
        /* ya detenido */
      }
    });
  }

  function noteOff(midi) {
    if (!ctx) return;
    const list = voices.get(midi);
    if (!list) return;
    list.forEach((v) => release(v, ctx.currentTime));
    voices.delete(midi);
  }

  function allOff() {
    for (const m of [...voices.keys()]) noteOff(m);
  }

  function click(accent) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.18 : 0.1, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.06);
  }

  PC.audio = {
    ensure,
    noteOn,
    noteOff,
    allOff,
    click,
    get context() {
      return ensure();
    },
    get enabled() {
      return enabled;
    },
    set enabled(v) {
      enabled = v;
      if (!v) allOff();
    },
  };
})(window);
