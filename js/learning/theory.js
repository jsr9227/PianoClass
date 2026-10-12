// Teoría musical para el motor pedagógico: tonalidades, grados, acordes, progresiones, voicings y escalas.
// Funciones puras (sin DOM) para poder probarlas en Node.
(function (root) {
  const PC = (root.PC = root.PC || {});

  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    'pentatonic-major': [0, 2, 4, 7, 9],
    'pentatonic-minor': [0, 3, 5, 7, 10],
    // Frigio con la 3.ª mayor (frigio dominante): sonido típico del flamenco sobre el acorde de Mi
    'phrygian-dominant': [0, 1, 4, 5, 7, 8, 10],
  };
  const SCALE_NAMES = {
    major: 'mayor', minor: 'menor', phrygian: 'frigia', 'pentatonic-major': 'pentatónica mayor',
    'pentatonic-minor': 'pentatónica menor', 'phrygian-dominant': 'frigia dominante (flamenca)',
  };
  const QUALITIES = {
    maj: { iv: [0, 4, 7], suffix: '', name: 'mayor' },
    min: { iv: [0, 3, 7], suffix: 'm', name: 'menor' },
    dim: { iv: [0, 3, 6], suffix: '°', name: 'disminuido' },
    aug: { iv: [0, 4, 8], suffix: '+', name: 'aumentado' },
    7: { iv: [0, 4, 7, 10], suffix: '7', name: 'séptima de dominante' },
    maj7: { iv: [0, 4, 7, 11], suffix: 'maj7', name: 'séptima mayor' },
    m7: { iv: [0, 3, 7, 10], suffix: 'm7', name: 'menor séptima' },
  };
  const SOLFA_SHARP = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
  const SOLFA_FLAT = ['Do', 'Re♭', 'Re', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
  const LETTER_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const LETTER_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const FIFTHS_OF_MAJOR = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 5: -1, 10: -2, 3: -3, 8: -4, 1: -5 };
  const MODE_TO_RELATIVE_MAJOR = { major: 0, minor: 3, phrygian: 8 };
  const MODE_NAMES = { major: 'mayor', minor: 'menor', phrygian: 'frigio' };

  const mod12 = (n) => ((n % 12) + 12) % 12;

  // Tonalidad = { tonic: 0..11, mode: 'major' | 'minor' | 'phrygian' }
  function relativeMajor(key) {
    return mod12(key.tonic + MODE_TO_RELATIVE_MAJOR[key.mode]);
  }
  function useFlats(key) {
    return FIFTHS_OF_MAJOR[relativeMajor(key)] < 0;
  }
  function keySignature(key) {
    return FIFTHS_OF_MAJOR[relativeMajor(key)];
  }
  function pcName(pc, key) {
    return (key && useFlats(key) ? SOLFA_FLAT : SOLFA_SHARP)[mod12(pc)];
  }
  function keyName(key) {
    return `${pcName(key.tonic, key)} ${MODE_NAMES[key.mode]}`;
  }
  // Nombre de nota para el formato de partitura ("F#4", "Bb3")
  function midiToken(midi, key) {
    return (key && useFlats(key) ? LETTER_FLAT : LETTER_SHARP)[mod12(midi)] + (Math.floor(midi / 12) - 1);
  }

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  // Grados en números romanos: mayúscula = mayor, minúscula = menor, ° = disminuido, sufijos 7 / maj7.
  // Las raíces salen de la escala del modo (en menor, VII = 7.º grado natural; en frigio, II = 2.º grado rebajado).
  function parseRoman(roman, key) {
    const m = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°)?(maj7|7)?$/.exec(roman);
    if (!m) throw new Error('Grado no válido: ' + roman);
    const degree = ROMAN.indexOf(m[2].toUpperCase());
    const upper = m[2] === m[2].toUpperCase();
    const shift = m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0;
    const rootPc = mod12(key.tonic + SCALES[key.mode][degree] + shift);
    let quality = m[3] ? 'dim' : upper ? 'maj' : 'min';
    if (m[4] === 'maj7') quality = 'maj7';
    else if (m[4] === '7') quality = upper ? '7' : 'm7';
    return { roman, degree, rootPc, quality, symbol: pcName(rootPc, key) + QUALITIES[quality].suffix, name: `${pcName(rootPc, key)} ${QUALITIES[quality].name}` };
  }

  function chordPcs(chord) {
    return QUALITIES[chord.quality].iv.map((i) => mod12(chord.rootPc + i));
  }

  // Todas las posiciones (inversiones) de un acorde con la nota más grave dentro de [lo, hi]
  function voicings(chord, lo = 52, hi = 67) {
    const ivs = QUALITIES[chord.quality].iv;
    const out = [];
    for (let inv = 0; inv < ivs.length; inv++) {
      const rel = ivs.slice(inv).concat(ivs.slice(0, inv).map((i) => i + 12)).map((i) => i - ivs[inv]);
      const bassPc = mod12(chord.rootPc + ivs[inv]);
      for (let b = lo; b <= hi; b++) {
        if (mod12(b) === bassPc) out.push({ inversion: inv, notes: rel.map((r) => b + r) });
      }
    }
    return out;
  }

  // Conducción de voces: elige la posición que menos mueve la mano respecto al acorde anterior
  function voiceLead(chords, { center = 64, lo = 52, hi = 67 } = {}) {
    const result = [];
    let prev = null;
    for (const ch of chords) {
      const opts = voicings(ch, lo, hi);
      const cost = (v) =>
        prev
          ? v.notes.reduce((s, n) => s + Math.min(...prev.map((p) => Math.abs(p - n))), 0) + Math.abs(v.notes[0] - prev[0]) * 0.1
          : Math.abs(v.notes.reduce((a, b) => a + b, 0) / v.notes.length - center) + v.inversion * 0.5;
      const best = opts.reduce((a, b) => (cost(b) < cost(a) ? b : a));
      result.push(best);
      prev = best.notes;
    }
    return result;
  }

  // Bajo de la mano izquierda: fundamental entre Fa2 y Mi3
  function bassNote(chord) {
    let n = 41;
    while (mod12(n) !== chord.rootPc) n++;
    return n;
  }

  function scaleMidis(key, scale, lo, hi) {
    const pcs = SCALES[scale].map((i) => mod12(key.tonic + i));
    const out = [];
    for (let m = lo; m <= hi; m++) if (pcs.includes(mod12(m))) out.push(m);
    return out;
  }

  // ── Catálogo de progresiones ──
  const PROGRESSIONS = [
    { id: 'I-V-vi-IV', romans: ['I', 'V', 'vi', 'IV'], mode: 'major', style: 'Pop', label: 'I–V–vi–IV',
      about: 'La progresión más usada del pop. Empieza en reposo (I), crea tensión (V), se vuelve melancólica (vi) y se abre (IV).' },
    { id: 'vi-IV-I-V', romans: ['vi', 'IV', 'I', 'V'], mode: 'major', style: 'Pop', label: 'vi–IV–I–V',
      about: 'Los mismos cuatro acordes empezando por el menor: suena más emotiva. Muy habitual en baladas.' },
    { id: 'I-IV-V', romans: ['I', 'IV', 'V', 'I'], mode: 'major', style: 'Básica', label: 'I–IV–V',
      about: 'Los tres acordes principales de cualquier tonalidad mayor: tónica, subdominante y dominante.' },
    { id: 'I-vi-IV-V', romans: ['I', 'vi', 'IV', 'V'], mode: 'major', style: 'Pop', label: 'I–vi–IV–V',
      about: 'Progresión clásica de los años 50 y de muchas canciones pop y de autor.' },
    { id: 'ii-V-I', romans: ['ii7', 'V7', 'Imaj7', 'Imaj7'], mode: 'major', style: 'Jazz', label: 'ii–V–I',
      about: 'La cadencia básica del jazz: el ii prepara al V y el V resuelve en I. Con cuatriadas (acordes de séptima).' },
    { id: 'i-VII-VI-V', romans: ['i', 'VII', 'VI', 'V'], mode: 'minor', style: 'Flamenco', label: 'i–VII–VI–V (cadencia andaluza)',
      about: 'La cadencia andaluza: cuatro acordes que bajan por grados hasta un V mayor. Base del flamenco, la rumba y mucho pop español.' },
    { id: 'frigio', romans: ['iv', 'III', 'II', 'I'], mode: 'phrygian', style: 'Flamenco', label: 'iv–III–II–I (modo frigio)',
      about: 'La misma cadencia vista desde el modo frigio: el acorde final (I, mayor) es el reposo. Así se entiende en el flamenco.' },
    { id: 'i-iv-v', romans: ['i', 'iv', 'V', 'i'], mode: 'minor', style: 'Básica', label: 'i–iv–V (menor)',
      about: 'Los acordes principales del modo menor, con el V mayor para que la vuelta a i sea más fuerte.' },
  ];

  // Patrones de acompañamiento (un acorde por compás de 4/4). R = fundamental, F = quinta, C = acorde mano derecha.
  const PATTERNS = {
    bloque: { label: 'Acorde largo', rh: (c) => `${c.chord}/w`, lh: (b) => `${b.r}/w` },
    pulso: { label: 'Negras (pulso)', rh: (c) => Array(4).fill(`${c.chord}/q`).join(' '), lh: (b) => `${b.r}/w` },
    balada: { label: 'Balada pop', rh: (c) => `${c.chord}/h ${c.chord}/q ${c.chord}/q`, lh: (b) => `${b.r}/q. ${b.f}/e ${b.r8}/h` },
    arpegio: { label: 'Arpegio', rh: (c) => [0, 1, 2, 1, 0, 1, 2, 1].map((i) => `${c.notes[i]}/e`).join(' '), lh: (b) => `${b.r}/w` },
    rumba: { label: 'Rumba / flamencito (3+3+2)', rh: (c) => `${c.chord}/q. ${c.chord}/q. ${c.chord}/q`, lh: (b) => `${b.r}/q. ${b.f}/q. ${b.r}/q` },
  };

  // Construye una partitura (formato de PianoClass) a partir de una progresión
  // rootPosition: acordes en estado fundamental (para aprender la forma) en vez de conducir las voces
  function progressionSong({ romans, key, pattern = 'bloque', bpm = 72, repeats = 2, rhOnly = false, title, rootPosition = false }) {
    const chords = romans.map((r) => parseRoman(r, key));
    const voiced = rootPosition
      ? chords.map((c) => voicings(c, 55, 66).filter((v) => v.inversion === 0)[0])
      : voiceLead(chords);
    const tok = (m) => midiToken(m, key);
    const rh = [];
    const lh = [];
    const symbols = [];
    const P = PATTERNS[pattern];
    for (let rep = 0; rep < repeats; rep++) {
      chords.forEach((ch, i) => {
        const notes = voiced[i].notes.slice(0, 4).map(tok);
        const r = bassNote(ch);
        symbols.push({ beat: (rep * chords.length + i) * 4, name: ch.symbol, pcs: chordPcs(ch) });
        rh.push(P.rh({ chord: notes.slice(0, Math.min(notes.length, 4)).join('.'), notes: [notes[0], notes[1], notes[2]] }) + ' |');
        lh.push(P.lh({ r: tok(r), f: tok(r + 7), r8: tok(r + 12) }) + ' |');
      });
    }
    // Final en la tónica
    const tonic = chords.find((c) => c.degree === 0 && (c.quality === 'maj' || c.quality === 'min' || c.quality === 'maj7')) || chords[chords.length - 1];
    const last = voiceLead([tonic], { center: voiced[voiced.length - 1].notes[1] })[0];
    symbols.push({ beat: repeats * chords.length * 4, name: tonic.symbol, pcs: chordPcs(tonic) });
    rh.push(`${last.notes.map(tok).join('.')}/w |`);
    lh.push(`${tok(bassNote(tonic))}/w |`);
    return {
      id: 'prog-' + romans.join('-') + '-' + key.tonic + key.mode + '-' + pattern,
      title: title || `${romans.join('–')} en ${keyName(key)}`,
      composer: `Ejercicio · ${PATTERNS[pattern].label}`,
      bpm, time: [4, 4], key: keySignature(key),
      rh: rh.join(' '),
      lh: rhOnly ? undefined : lh.join(' '),
      chords: symbols,
      generated: true,
    };
  }

  // Evalúa una improvisación: proporción de notas de la escala y de notas del acorde en tiempos fuertes.
  // Es una heurística descriptiva (no mide la calidad musical).
  function evaluateImprov(played, { key, scale, chords }) {
    const pcs = SCALES[scale].map((i) => mod12(key.tonic + i));
    const n = played.length;
    if (!n) return { count: 0, inScale: 0, chordTones: null, range: 0 };
    const inScale = played.filter((p) => pcs.includes(mod12(p.midi))).length / n;
    const strong = played.filter((p) => Math.abs(p.beat - Math.round(p.beat)) < 0.2 && Math.round(p.beat) % 2 === 0);
    let chordTones = null;
    if (chords && chords.length && strong.length) {
      const at = (beat) => chords.filter((c) => c.beat <= beat + 0.01).pop();
      const hits = strong.filter((p) => {
        const c = at(p.beat);
        return c && c.pcs && c.pcs.includes(mod12(p.midi));
      }).length;
      chordTones = hits / strong.length;
    }
    const midis = played.map((p) => p.midi);
    return { count: n, inScale, chordTones, range: Math.max(...midis) - Math.min(...midis) };
  }

  PC.theory = {
    SCALES, SCALE_NAMES, QUALITIES, PROGRESSIONS, PATTERNS, MODE_NAMES,
    mod12, parseRoman, chordPcs, voicings, voiceLead, bassNote, scaleMidis,
    keySignature, useFlats, pcName, keyName, midiToken, progressionSong, evaluateImprov,
  };
})(typeof window !== 'undefined' ? window : globalThis);
