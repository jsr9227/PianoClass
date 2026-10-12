// Generadores de ejercicios: para tocar (usan el formato de partitura y el Player existentes),
// de oído (preguntas con audio) y de improvisación. Funciones puras con aleatoriedad reproducible.
(function (root) {
  const PC = (root.PC = root.PC || {});
  const T = PC.theory;

  // Generador pseudoaleatorio con semilla (mulberry32) para poder reproducir y probar los ejercicios
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, list) => list[Math.floor(r() * list.length)];
  const shuffle = (r, list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const C = { tonic: 0, mode: 'major' };
  const song = (id, title, fields) => ({ id: 'ex-' + id, title, composer: 'Ejercicio', bpm: 72, time: [4, 4], key: 0, generated: true, ...fields });

  // ── Técnica ──
  const SCALE_FINGERS = {
    R: { 0: [1, 2, 3, 1, 2, 3, 4, 5], 7: [1, 2, 3, 1, 2, 3, 4, 5], 5: [1, 2, 3, 4, 1, 2, 3, 4], 2: [1, 2, 3, 1, 2, 3, 4, 5] },
    L: { 0: [5, 4, 3, 2, 1, 3, 2, 1], 7: [5, 4, 3, 2, 1, 3, 2, 1], 5: [5, 4, 3, 2, 1, 3, 2, 1], 2: [5, 4, 3, 2, 1, 3, 2, 1] },
  };
  function scale(tonic, hand) {
    const key = { tonic, mode: 'major' };
    const base = hand === 'R' ? 60 + tonic : 48 + tonic;
    const notes = T.scaleMidis(key, 'major', base, base + 12);
    const f = SCALE_FINGERS[hand][tonic] || SCALE_FINGERS[hand][0];
    const up = notes.map((m, i) => `${T.midiToken(m, key)}@${f[i]}`);
    const down = notes.slice().reverse().map((m, i) => `${T.midiToken(m, key)}@${f[7 - i]}`);
    const bars = [];
    const all = up.concat(down);
    for (let i = 0; i < all.length; i += 4) bars.push(all.slice(i, i + 4).join(' ') + ' |');
    const rest = 'r/w | '.repeat(bars.length);
    const voice = bars.join(' ') + ` ${T.midiToken(base, key)}/w |`;
    return song(`escala-${tonic}-${hand}`, `Escala de ${T.keyName(key)} (${hand === 'R' ? 'mano derecha' : 'mano izquierda'})`, {
      key: T.keySignature(key), bpm: 80,
      rh: hand === 'R' ? voice : rest + 'r/w |',
      lh: hand === 'L' ? voice : undefined,
    });
  }

  function coordination(type) {
    if (type === 'contrario') {
      return song('coord-contrario', 'Movimiento contrario (manos juntas)', {
        rh: 'C4@1 D4@2 E4@3 F4@4 | G4/w@5 | G4@5 F4@4 E4@3 D4@2 | C4/w@1 |',
        lh: 'C3@1 B2@2 A2@3 G2@4 | F2/w@5 | F2@5 G2@4 A2@3 B2@2 | C3/w@1 |',
      });
    }
    return song('coord-paralelo', 'Movimiento paralelo (manos juntas)', {
      rh: 'C4@1 D4@2 E4@3 F4@4 | G4/w@5 | G4@5 F4@4 E4@3 D4@2 | C4/w@1 |',
      lh: 'C3@5 D3@4 E3@3 F3@2 | G3/w@1 | G3@1 F3@2 E3@3 D3@4 | C3/w@5 |',
    });
  }

  function inversions(romanChord = 'I', key = C) {
    const ch = T.parseRoman(romanChord, key);
    const vs = T.voicings(ch, 55, 67).sort((a, b) => a.notes[0] - b.notes[0]).slice(0, 3);
    const tok = (v) => v.notes.map((m) => T.midiToken(m, key)).join('.');
    // Sube por las tres posiciones y vuelve: fundamental, 1.ª inversión, 2.ª inversión, 1.ª, fundamental
    const seq = vs.concat(vs.slice(0, -1).reverse());
    const bass = T.midiToken(T.bassNote(ch), key);
    return song(`inversiones-${ch.symbol}`, `Inversiones de ${ch.name}`, {
      key: T.keySignature(key), bpm: 66,
      rh: seq.map((v) => `${tok(v)}/w |`).join(' '),
      lh: seq.map(() => `${bass}/w |`).join(' '),
      chords: [{ beat: 0, name: ch.symbol }],
    });
  }

  // ── Ritmo (siempre con una sola nota para centrarse en el pulso) ──
  const RHYTHMS = {
    'negras-blancas': { title: 'Negras y blancas', time: [4, 4], rh: 'C4 C4 C4/h | C4/h C4 C4 | C4 C4 C4 C4 | C4/w | C4/h C4/h | C4 C4/h C4 | C4 C4 C4/h | C4/w |' },
    corcheas: { title: 'Corcheas', time: [4, 4], rh: 'C4 C4 C4/e C4/e C4 | C4/e C4/e C4/e C4/e C4/h | C4 C4/e C4/e C4 C4/e C4/e | C4/w |' },
    puntillo: { title: 'Negra con puntillo', time: [4, 4], rh: 'C4/q. C4/e C4/h | C4/q. C4/e C4/q. C4/e | C4/h C4/q. C4/e | C4/w |' },
    sincopa: { title: 'Síncopa', time: [4, 4], rh: 'C4/e C4 C4/e C4/h | C4/e C4 C4/e C4 C4 | C4 C4/e C4 C4/e C4 | C4/w |' },
    'compas-12': {
      title: 'Compás flamenco de 12 tiempos (acentos en 3, 6, 8, 10 y 12)', time: [12, 4],
      rh: [1, 2].map(() => Array.from({ length: 12 }, (_, i) => ([3, 6, 8, 10, 12].includes(i + 1) ? 'C5' : 'C4')).join(' ') + ' |').join(' '),
    },
  };
  function rhythm(id) {
    const r = RHYTHMS[id];
    return song(`ritmo-${id}`, `Ritmo: ${r.title}`, { time: r.time, bpm: id === 'compas-12' ? 120 : 76, rh: r.rh });
  }

  // ── Lectura a primera vista: melodía nueva cada vez (en posición de cinco dedos) ──
  function sightReading(clef, seed, bars = 4) {
    const r = rng(seed);
    const base = clef === 'L' ? 48 : 60;
    const pos = [0, 2, 4, 5, 7].map((i) => base + i);
    let idx = 0;
    const tokens = [];
    for (let b = 0; b < bars; b++) {
      let beats = 0;
      const bar = [];
      while (beats < 4) {
        const last = b === bars - 1 && beats >= 2;
        const dur = last ? 4 - beats : beats <= 2 && r() < 0.25 ? 2 : 1;
        if (last) idx = 0;
        else idx = Math.max(0, Math.min(4, idx + pick(r, [-2, -1, -1, 1, 1, 2, 0])));
        bar.push(`${T.midiToken(pos[idx], C)}/${dur === 2 ? 'h' : dur === 1 ? 'q' : dur === 3 ? 'h.' : 'w'}`);
        beats += dur;
      }
      tokens.push(bar.join(' ') + ' |');
    }
    return song(`lectura-${clef}-${seed}`, `Lectura a primera vista (clave de ${clef === 'L' ? 'fa' : 'sol'})`, {
      bpm: 66, rh: clef === 'R' ? tokens.join(' ') : undefined, lh: clef === 'L' ? tokens.join(' ') : undefined,
    });
  }

  // ── Armonía ──
  function progression({ progId, tonic, pattern = 'bloque', bpm = 72, repeats = 2, rootPosition = false, romans }) {
    const p = T.PROGRESSIONS.find((x) => x.id === progId);
    const key = { tonic: tonic != null ? tonic : p.mode === 'phrygian' ? 4 : p.mode === 'minor' ? 9 : 0, mode: p.mode };
    return { ...T.progressionSong({ romans: romans || p.romans, key, pattern, bpm, repeats, rootPosition }), progId, keyInfo: key };
  }

  // ── Entrenamiento auditivo ──
  const INTERVALS = [
    { st: 3, name: 'Tercera menor' }, { st: 4, name: 'Tercera mayor' }, { st: 7, name: 'Quinta justa' }, { st: 12, name: 'Octava' },
    { st: 2, name: 'Segunda mayor' }, { st: 5, name: 'Cuarta justa' }, { st: 1, name: 'Segunda menor' }, { st: 9, name: 'Sexta mayor' },
  ];
  // Cada pregunta: { prompt, play: [[midis...], ...] (cada grupo suena a la vez, uno detrás de otro), options, answer, explain }
  function earQuestions(type, seed, count = 6, level = 1) {
    const r = rng(seed);
    const qs = [];
    for (let i = 0; i < count; i++) {
      if (type === 'notas') {
        const set = level > 1 ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 4, 5, 7];
        const pc = pick(r, set.slice(1));
        const options = shuffle(r, [pc, ...shuffle(r, set.slice(1).filter((x) => x !== pc)).slice(0, 2)]).map((x) => T.pcName(x));
        qs.push({ prompt: 'Primero suena Do. ¿Qué nota suena después?', play: [[60], [60 + pc]], options, answer: T.pcName(pc), explain: `Era ${T.pcName(pc)}: está a ${pc} semitonos de Do.` });
      } else if (type === 'intervalos') {
        const set = INTERVALS.slice(0, level > 1 ? 8 : 4);
        const iv = pick(r, set);
        const rootM = 55 + Math.floor(r() * 10);
        const options = shuffle(r, [iv, ...shuffle(r, set.filter((x) => x !== iv)).slice(0, 2)]).map((x) => x.name);
        qs.push({ prompt: '¿Qué intervalo suena? (dos notas, una detrás de otra)', play: [[rootM], [rootM + iv.st]], options, answer: iv.name, explain: `${iv.name}: ${iv.st} semitonos.` });
      } else if (type === 'calidad') {
        const qual = pick(r, level > 1 ? ['maj', 'min', 'dim', 'aug'] : ['maj', 'min']);
        const rootM = 55 + Math.floor(r() * 9);
        const notes = T.QUALITIES[qual].iv.map((x) => rootM + x);
        const options = (level > 1 ? ['maj', 'min', 'dim', 'aug'] : ['maj', 'min']).map((x) => T.QUALITIES[x].name);
        qs.push({ prompt: '¿El acorde es mayor o menor?', play: [notes, ...notes.map((n) => [n]), notes], options, answer: T.QUALITIES[qual].name,
          explain: qual === 'maj' ? 'Mayor: suena luminoso (tercera mayor, 4 semitonos).' : qual === 'min' ? 'Menor: suena más oscuro (tercera menor, 3 semitonos).' : `${T.QUALITIES[qual].name}.` });
      } else if (type === 'cambio') {
        const first = T.parseRoman('I', C);
        const target = pick(r, ['I', 'IV', 'V']);
        const voiced = T.voiceLead([first, T.parseRoman(target, C)]);
        const play = [voiced[0].notes.concat(T.bassNote(first)), voiced[1].notes.concat(T.bassNote(T.parseRoman(target, C)))];
        const name = { I: 'Se queda en el mismo acorde (I)', IV: 'Cambia al IV (Fa)', V: 'Cambia al V (Sol)' };
        qs.push({ prompt: 'Suena Do (I) y luego otro acorde. ¿Qué pasa?', play, options: [name.I, name.IV, name.V], answer: name[target],
          explain: target === 'I' ? 'No cambió: los dos acordes eran Do.' : target === 'IV' ? 'El IV suena como «abrirse» o salir de casa.' : 'El V suena con tensión: pide volver al I.' });
      } else if (type === 'progresiones') {
        const ids = ['I-V-vi-IV', 'I-IV-V', 'vi-IV-I-V', 'I-vi-IV-V'];
        const set = shuffle(r, ids).slice(0, 3);
        const id = pick(r, set);
        const p = T.PROGRESSIONS.find((x) => x.id === id);
        const chords = p.romans.map((x) => T.parseRoman(x, C));
        const v = T.voiceLead(chords);
        qs.push({ prompt: '¿Qué progresión suena?', play: v.map((x, k) => x.notes.concat(T.bassNote(chords[k]))), options: set.map((x) => T.PROGRESSIONS.find((y) => y.id === x).label), answer: p.label,
          explain: `${p.label}: ${chords.map((c) => c.symbol).join(' – ')}.` });
      } else if (type === 'eco') {
        const len = level > 1 ? 5 : 3 + (i % 2);
        let idx = Math.floor(r() * 3);
        const pos = [60, 62, 64, 65, 67];
        const mel = [pos[idx]];
        for (let k = 1; k < len; k++) {
          idx = Math.max(0, Math.min(4, idx + pick(r, [-1, 1, 1, -2, 2])));
          mel.push(pos[idx]);
        }
        qs.push({ prompt: `Escucha la melodía de ${len} notas (empieza en ${T.pcName(mel[0])}) y tócala.`, play: mel.map((m) => [m]), melody: mel, answer: mel.map((m) => T.pcName(m)).join(' '),
          explain: `Era: ${mel.map((m) => T.pcName(m)).join(' – ')}.` });
      }
    }
    return qs;
  }

  // Comprueba una respuesta tocada (melodía de eco): se ignoran octavas
  function checkEcho(expected, played) {
    if (played.length < expected.length) return false;
    const tail = played.slice(-expected.length);
    return tail.every((m, i) => T.mod12(m) === T.mod12(expected[i]));
  }

  PC.exercises = { rng, pick, shuffle, scale, coordination, inversions, rhythm, RHYTHMS, sightReading, progression, earQuestions, checkEcho, INTERVALS };
})(typeof window !== 'undefined' ? window : globalThis);
