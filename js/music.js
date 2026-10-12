// Utilidades musicales: análisis del formato de partitura, alturas y nombres de notas.
(function (root) {
  const PC = (root.PC = root.PC || {});

  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const SEMITONES = [0, 2, 4, 5, 7, 9, 11];
  const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
  const DURATIONS = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
  const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
  const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3]; // B E A D G C F
  const EPS = 1e-6;

  function parsePitch(str) {
    const m = /^([A-G])(##|#|bb|b|n)?(\d)$/.exec(str);
    if (!m) throw new Error('Nota no válida: "' + str + '"');
    const letter = LETTERS.indexOf(m[1]);
    const acc = m[2] || '';
    const alter = acc === 'n' || acc === '' ? 0 : acc[0] === '#' ? acc.length : -acc.length;
    const octave = Number(m[3]);
    return {
      letter,
      alter,
      octave,
      step: octave * 7 + letter,
      midi: 12 * (octave + 1) + SEMITONES[letter] + alter,
    };
  }

  function parseDuration(str) {
    const m = /^([whqes])(\.?)$/.exec(str);
    if (!m) throw new Error('Duración no válida: "' + str + '"');
    return { type: m[1], dotted: !!m[2], beats: DURATIONS[m[1]] * (m[2] ? 1.5 : 1) };
  }

  // Formato de token: ALTURAS[/DURACIÓN][@DIGITACIÓN]
  //   C4  F#4/e  Bb3/h.  r/q (silencio)  C4.E4.G4/w@1.3.5 (acorde)  "|" = barra de compás
  function parseVoice(src, hand) {
    const events = [];
    const bars = [];
    let beat = 0;
    const tokens = src.trim().split(/\s+/).filter(Boolean);
    for (const tok of tokens) {
      if (tok === '|') {
        bars.push(beat);
        continue;
      }
      const m = /^([^/@]+)(?:\/([^@]+))?(?:@(.+))?$/.exec(tok);
      if (!m) throw new Error('Token no válido: "' + tok + '"');
      const dur = parseDuration(m[2] || 'q');
      const fingers = m[3] ? m[3].split('.').map(Number) : [];
      if (m[1] === 'r') {
        events.push({ hand, rest: true, start: beat, dur: dur.beats, durType: dur.type, dotted: dur.dotted, pitches: [] });
      } else {
        const pitches = m[1].split('.').map(parsePitch);
        pitches.forEach((p, i) => (p.finger = fingers[i]));
        events.push({ hand, rest: false, start: beat, dur: dur.beats, durType: dur.type, dotted: dur.dotted, pitches });
      }
      beat += dur.beats;
    }
    return { events, bars, end: beat };
  }

  function compileSong(song) {
    const measureLen = (song.time[0] * 4) / song.time[1];
    const pickup = song.pickup || 0;
    const voices = [];
    if (song.rh) voices.push(parseVoice(song.rh, 'R'));
    if (song.lh) voices.push(parseVoice(song.lh, 'L'));
    const total = Math.max(...voices.map((v) => v.end));

    const measures = [];
    let s = 0;
    if (pickup > 0) {
      measures.push({ start: 0, len: pickup });
      s = pickup;
    }
    while (s < total - EPS) {
      measures.push({ start: s, len: measureLen });
      s += measureLen;
    }

    const measureAt = (b) => {
      let i = 0;
      while (i + 1 < measures.length && measures[i + 1].start <= b + EPS) i++;
      return i;
    };

    const errors = [];
    voices.forEach((v) => {
      v.bars.forEach((b) => {
        const ok = measures.some((m) => Math.abs(m.start + m.len - b) < EPS);
        if (!ok) errors.push(`Mano ${v.events[0] ? v.events[0].hand : '?'}: barra en el pulso ${b} no coincide con un final de compás`);
      });
      if (Math.abs(v.end - total) > EPS) errors.push(`Mano ${v.events[0].hand}: termina en ${v.end}, se esperaba ${total}`);
    });

    const events = [];
    const notes = [];
    let id = 0;
    voices.forEach((v) =>
      v.events.forEach((ev) => {
        ev.id = 'e' + id++;
        ev.measure = measureAt(ev.start);
        if (ev.start + ev.dur > measures[ev.measure].start + measures[ev.measure].len + EPS) {
          errors.push(`Mano ${ev.hand}: una figura cruza la barra del compás ${ev.measure + 1}`);
        }
        ev.notes = ev.pitches.map((p, i) => {
          const n = { id: ev.id + '_' + i, hand: ev.hand, start: ev.start, dur: ev.dur, midi: p.midi, pitch: p, event: ev };
          notes.push(n);
          return n;
        });
        events.push(ev);
      })
    );
    notes.sort((a, b) => a.start - b.start || a.midi - b.midi);

    return Object.assign({}, song, { measureLen, pickup, total, measures, events, notes, errors, measureAt });
  }

  // Agrupa las notas en "pasos" (todas las notas que empiezan a la vez), opcionalmente filtrando por manos.
  function buildSteps(notes, hands) {
    const steps = [];
    for (const n of notes) {
      if (!hands[n.hand]) continue;
      const last = steps[steps.length - 1];
      if (last && Math.abs(last.start - n.start) < EPS) last.notes.push(n);
      else steps.push({ start: n.start, notes: [n] });
    }
    return steps;
  }

  function keyAlter(fifths, letter) {
    if (fifths > 0) return SHARP_ORDER.slice(0, fifths).includes(letter) ? 1 : 0;
    if (fifths < 0) return FLAT_ORDER.slice(0, -fifths).includes(letter) ? -1 : 0;
    return 0;
  }

  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const SOLFEGE_BY_PC = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];

  function midiName(midi) {
    return SHARP_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  }
  function solfege(midi) {
    return SOLFEGE_BY_PC[midi % 12];
  }
  function pitchSolfege(p) {
    return SOLFEGE[p.letter] + (p.alter > 0 ? '♯' : p.alter < 0 ? '♭' : '');
  }
  function isBlack(midi) {
    return [1, 3, 6, 8, 10].includes(midi % 12);
  }
  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function freqToMidi(f) {
    return 69 + 12 * Math.log2(f / 440);
  }

  PC.music = {
    LETTERS, SOLFEGE, SHARP_ORDER, FLAT_ORDER, EPS,
    parsePitch, parseDuration, parseVoice, compileSong, buildSteps, keyAlter,
    midiName, solfege, pitchSolfege, isBlack, midiToFreq, freqToMidi,
  };
})(typeof window !== 'undefined' ? window : globalThis);
