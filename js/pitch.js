// Detección polifónica de notas (acordes) a partir del espectro del micrófono y nombres de acordes.
(function (root) {
  const PC = (root.PC = root.PC || {});

  // Busca el pico del espectro alrededor de la frecuencia f (± ~media semitonada).
  function peakAt(spec, f, binHz) {
    const c = f / binHz;
    const w = Math.max(1.5, c * 0.025);
    const lo = Math.max(1, Math.floor(c - w));
    const hi = Math.min(spec.length - 1, Math.ceil(c + w));
    let v = 0;
    let idx = -1;
    for (let i = lo; i <= hi; i++) {
      if (spec[i] > v) {
        v = spec[i];
        idx = i;
      }
    }
    return { v, idx, w: Math.max(2, Math.round(c * 0.012) + 1) };
  }

  /**
   * Detecta las notas que suenan a la vez.
   * mags: magnitudes lineales del espectro (fftSize/2 valores).
   * opts.hints: Set de notas MIDI esperadas (la partitura sabe qué debería sonar; se detectan con más facilidad).
   * Devuelve [{ midi, strength }] ordenado por altura.
   */
  function detectNotes(mags, sampleRate, fftSize, opts = {}) {
    const binHz = sampleRate / fftSize;
    const spec = Float32Array.from(mags); // espectro residual (se le van restando las notas halladas)
    const orig = mags;
    const minMidi = opts.minMidi || 36; // Do2
    const maxMidi = opts.maxMidi || 96; // Do7
    const maxNotes = opts.maxNotes || 6;
    const hints = opts.hints || new Set();
    const relThreshold = opts.relThreshold || 0.22;
    const maxHz = Math.min(sampleRate / 2 - binHz * 4, 6000);

    // Suelo de ruido: mediana del espectro en la zona útil
    const a = Math.floor(50 / binHz);
    const b = Math.min(spec.length - 1, Math.floor(maxHz / binHz));
    const sorted = Array.from(spec.subarray(a, b)).sort((x, y) => x - y);
    const floor = sorted[Math.floor(sorted.length / 2)] || 1e-9;
    const peakMax = sorted[sorted.length - 1] || 0;
    if (peakMax < floor * 12) return [];

    const H = 8;
    const FACTOR = opts.envelope || 0.8;
    const freqOf = (m) => 440 * Math.pow(2, (m - 69) / 12);

    const salience = (m) => {
      const f0 = freqOf(m);
      const p1 = peakAt(spec, f0, binHz).v;
      // La fundamental tiene que existir claramente (evita confundir una nota con su octava inferior)
      if (p1 < floor * 6 || p1 < peakMax * 0.02) return 0;
      let s = 0;
      let found = 0;
      for (let h = 1; h <= H; h++) {
        const f = f0 * h;
        if (f > maxHz) break;
        const p = peakAt(spec, f, binHz).v;
        if (p > floor * 4) found++;
        s += p / Math.pow(h, 0.5);
      }
      // Un tono de piano real tiene varios armónicos; una sola línea espectral aislada puntúa menos
      return s * (found >= 2 ? 1 : 0.6);
    };

    const notes = [];
    let ref = 0;
    for (let iter = 0; iter < maxNotes; iter++) {
      let best = null;
      for (let m = minMidi; m <= maxMidi; m++) {
        if (notes.some((n) => n.midi === m)) continue;
        let s = salience(m);
        if (!s) continue;
        if (hints.has(m)) s *= 1.6;
        if (!best || s > best.s) best = { midi: m, s };
      }
      if (!best) break;
      if (!ref) ref = best.s;
      const needed = hints.has(best.midi) ? relThreshold * 0.6 : relThreshold;
      if (best.s < ref * needed) break;
      notes.push({ midi: best.midi, strength: best.s / ref });

      // Resta la contribución estimada de sus armónicos para poder encontrar las demás notas del acorde
      // Cada armónico se limita por el mínimo de los armónicos inferiores (los armónicos de un tono
      // decrecen): si otra nota del acorde coincide con él (octava, quinta…), su exceso se conserva.
      const f0 = freqOf(best.midi);
      let runMin = Infinity;
      for (let h = 1; h <= H; h++) {
        const f = f0 * h;
        if (f > maxHz) break;
        const pk = peakAt(spec, f, binHz);
        if (pk.idx < 0) continue;
        const o = peakAt(orig, f, binHz).v;
        const remove = h === 1 ? pk.v : Math.min(pk.v, FACTOR * runMin);
        runMin = Math.min(runMin, o);
        const keep = pk.v > 0 ? 1 - remove / pk.v : 0;
        for (let i = pk.idx - pk.w; i <= pk.idx + pk.w; i++) if (i > 0 && i < spec.length) spec[i] *= keep;
      }
    }
    return notes.sort((x, y) => x.midi - y.midi);
  }

  // ── Nombres de acordes ──
  const ROOTS = ['Do', 'Do♯', 'Re', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
  const CHORDS = [
    { iv: [0, 4, 7], name: ' mayor' },
    { iv: [0, 3, 7], name: ' menor' },
    { iv: [0, 4, 7, 10], name: '7' },
    { iv: [0, 4, 7, 11], name: ' maj7' },
    { iv: [0, 3, 7, 10], name: ' m7' },
    { iv: [0, 3, 6], name: ' disminuido' },
    { iv: [0, 3, 6, 9], name: ' dim7' },
    { iv: [0, 3, 6, 10], name: ' m7♭5' },
    { iv: [0, 4, 8], name: ' aumentado' },
    { iv: [0, 5, 7], name: ' sus4' },
    { iv: [0, 2, 7], name: ' sus2' },
    { iv: [0, 4, 7, 9], name: '6' },
    { iv: [0, 3, 7, 9], name: ' m6' },
    { iv: [0, 2, 4, 7], name: ' add9' },
    { iv: [0, 4, 10], name: '7' }, // séptima sin quinta
    { iv: [0, 4, 11], name: ' maj7' },
    { iv: [0, 3, 10], name: ' m7' },
    { iv: [0, 7], name: '5' },
  ];
  const INTERVALS = ['unísono', 'segunda menor', 'segunda mayor', 'tercera menor', 'tercera mayor', 'cuarta justa', 'tritono', 'quinta justa', 'sexta menor', 'sexta mayor', 'séptima menor', 'séptima mayor'];

  function chordName(midis) {
    const list = [...new Set(midis)].sort((a, b) => a - b);
    if (!list.length) return '';
    const bass = list[0] % 12;
    const pcs = [...new Set(list.map((m) => m % 12))];
    if (pcs.length === 1) return ROOTS[bass] + (list.length > 1 ? ' (octava)' : '');
    let best = null;
    for (const root of pcs) {
      const set = pcs.map((p) => (p - root + 12) % 12).sort((a, b) => a - b);
      CHORDS.forEach((c, order) => {
        if (c.iv.length === set.length && c.iv.every((v, i) => v === set[i])) {
          const score = order + (root === bass ? 0 : 0.5);
          if (!best || score < best.score) best = { root, c, score };
        }
      });
    }
    if (best) return ROOTS[best.root] + best.c.name + (best.root !== bass ? ' / ' + ROOTS[bass] : '');
    if (pcs.length === 2) return `${ROOTS[bass]} + ${ROOTS[list.find((m) => m % 12 !== bass) % 12]} (${INTERVALS[(pcs[0] === bass ? pcs[1] - bass + 12 : pcs[0] - bass + 12) % 12]})`;
    return list.map((m) => ROOTS[m % 12]).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
  }

  PC.pitch = { detectNotes, chordName };
})(typeof window !== 'undefined' ? window : globalThis);
