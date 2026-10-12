// Importación de archivos MIDI (.mid): los convierte al formato de partitura de PianoClass.
(function (root) {
  const PC = (root.PC = root.PC || {});

  function parseMidi(buffer) {
    const d = new DataView(buffer);
    let p = 0;
    const str = (n) => {
      let s = '';
      for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i));
      p += n;
      return s;
    };
    const u32 = () => ((p += 4), d.getUint32(p - 4));
    const u16 = () => ((p += 2), d.getUint16(p - 2));
    const vlq = () => {
      let v = 0;
      let b;
      do {
        b = d.getUint8(p++);
        v = (v << 7) | (b & 0x7f);
      } while (b & 0x80);
      return v;
    };

    if (str(4) !== 'MThd') throw new Error('No es un archivo MIDI válido');
    const hlen = u32();
    u16(); // formato
    const ntracks = u16();
    const division = u16();
    p = 8 + hlen;
    if (division & 0x8000) throw new Error('Formato de tiempo SMPTE no compatible');
    const out = { ppq: division, tracks: [], tempo: null, timeSig: null, keySig: null, title: null };

    for (let t = 0; t < ntracks && p < d.byteLength; t++) {
      const id = str(4);
      const len = u32();
      const end = p + len;
      if (id !== 'MTrk') {
        p = end;
        continue;
      }
      const track = { name: '', notes: [] };
      const open = new Map();
      let tick = 0;
      let status = 0;
      while (p < end) {
        tick += vlq();
        let b = d.getUint8(p);
        if (b & 0x80) {
          status = b;
          p++;
        } else if (!status) throw new Error('MIDI dañado');
        const type = status & 0xf0;
        const ch = status & 0x0f;
        if (status === 0xff) {
          const meta = d.getUint8(p++);
          const l = vlq();
          const at = p;
          if (meta === 0x51 && out.tempo == null) out.tempo = (d.getUint8(at) << 16) | (d.getUint8(at + 1) << 8) | d.getUint8(at + 2);
          else if (meta === 0x58 && !out.timeSig) out.timeSig = [d.getUint8(at), Math.pow(2, d.getUint8(at + 1))];
          else if (meta === 0x59 && !out.keySig) out.keySig = d.getInt8(at);
          else if (meta === 0x03) {
            const save = p;
            track.name = str(l);
            p = save;
          }
          p = at + l;
          status = 0; // los meta-eventos no establecen running status
        } else if (status === 0xf0 || status === 0xf7) {
          p += vlq();
          status = 0;
        } else if (type === 0x90 || type === 0x80) {
          const note = d.getUint8(p++);
          const vel = d.getUint8(p++);
          const key = ch * 128 + note;
          if (type === 0x90 && vel > 0) {
            if (!open.has(key)) open.set(key, []);
            open.get(key).push(tick);
          } else {
            const starts = open.get(key);
            if (starts && starts.length) {
              const st = starts.shift();
              if (ch !== 9) track.notes.push({ tick: st, dur: tick - st, midi: note, ch });
            }
          }
        } else if (type === 0xc0 || type === 0xd0) p += 1;
        else p += 2;
      }
      p = end;
      track.notes.sort((a, b) => a.tick - b.tick || a.midi - b.midi);
      if (!out.title && track.name && !track.notes.length) out.title = track.name;
      out.tracks.push(track);
    }
    return out;
  }

  // Duraciones representables (en semicorcheas) y su símbolo
  const DURS = [
    [24, 'w.'], [16, 'w'], [12, 'h.'], [8, 'h'], [6, 'q.'], [4, 'q'], [3, 'e.'], [2, 'e'], [1, 's'],
  ];
  const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Divide una figura de `len` semicorcheas en figuras representables sin pasar la barra de compás.
  function splitLen(len) {
    const parts = [];
    while (len > 0) {
      const d = DURS.find(([v]) => v <= len);
      parts.push(d);
      len -= d[0];
    }
    return parts;
  }

  /**
   * Convierte el MIDI analizado en una partitura.
   * Mano derecha / izquierda: si hay dos pistas (o más) con notas, la más aguda es la derecha;
   * si solo hay una, se separa por altura (Do central y por encima → derecha).
   */
  function toSong(midi, { title, maxMeasures = 300 } = {}) {
    const ppq = midi.ppq;
    const grid = ppq / 4; // semicorchea
    const [num, den] = midi.timeSig && [2, 4, 8].includes(midi.timeSig[1]) ? midi.timeSig : [4, 4];
    const measure = (num * 16) / den; // en semicorcheas
    const fifths = Math.max(-7, Math.min(7, midi.keySig || 0));
    const names = fifths < 0 ? FLAT : SHARP;
    const name = (m) => names[m % 12] + (Math.floor(m / 12) - 1);
    const bpm = Math.round(midi.tempo ? 60000000 / midi.tempo : 120);

    const withNotes = midi.tracks.filter((t) => t.notes.length).sort((a, b) => b.notes.length - a.notes.length);
    if (!withNotes.length) throw new Error('El archivo no contiene notas');
    const avg = (t) => t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length;
    let rhNotes;
    let lhNotes;
    if (withNotes.length >= 2) {
      const [a, b] = withNotes.slice(0, 2).sort((x, y) => avg(y) - avg(x));
      rhNotes = a.notes;
      lhNotes = b.notes;
      // Pistas adicionales: se reparten por altura
      withNotes.slice(2).forEach((t) => t.notes.forEach((n) => (n.midi >= 60 ? rhNotes : lhNotes).push(n)));
    } else {
      rhNotes = withNotes[0].notes.filter((n) => n.midi >= 60);
      lhNotes = withNotes[0].notes.filter((n) => n.midi < 60);
    }

    const q = (n) => {
      const s = Math.round(n.tick / grid);
      return { s, e: Math.max(s + 1, Math.round((n.tick + n.dur) / grid)), midi: n.midi };
    };
    let rq = rhNotes.map(q);
    let lq = lhNotes.map(q);
    // Quitar compases vacíos iniciales (cuentas previas habituales en MIDI)
    const first = Math.min(...rq.concat(lq).map((n) => n.s));
    const shift = Math.floor(first / measure) * measure;
    const limit = maxMeasures * measure;
    const prep = (list) => list.map((n) => ({ ...n, s: n.s - shift, e: n.e - shift })).filter((n) => n.s < limit);
    rq = prep(rq);
    lq = prep(lq);
    const lastEnd = Math.max(...rq.concat(lq).map((n) => Math.min(n.e, limit)));
    const total = Math.ceil(lastEnd / measure) * measure;

    const voice = (list) => {
      if (!list.length) return null;
      const byStart = new Map();
      list.forEach((n) => {
        if (!byStart.has(n.s)) byStart.set(n.s, []);
        byStart.get(n.s).push(n);
      });
      const starts = [...byStart.keys()].sort((a, b) => a - b);
      const tokens = [];
      let pos = 0;
      const emit = (len, pitch) => {
        // Corta en las barras de compás; las notas que cruzan la barra se acortan y lo demás pasa a silencio
        let first = true;
        while (len > 0) {
          const toBar = measure - (pos % measure);
          const chunk = Math.min(len, toBar);
          if (pitch && first) {
            const [v, sym] = splitLen(chunk)[0];
            tokens.push(`${pitch}/${sym}`);
            splitLen(chunk - v).forEach(([, s]) => tokens.push(`r/${s}`));
          } else splitLen(chunk).forEach(([, s]) => tokens.push(`r/${s}`));
          first = false;
          pos += chunk;
          len -= chunk;
          if (pos % measure === 0) tokens.push('|');
        }
      };
      starts.forEach((s, i) => {
        if (s > pos) emit(s - pos, null);
        if (s < pos) return; // solapada con el acorde anterior (ya cortado)
        const chord = byStart.get(s);
        const next = i + 1 < starts.length ? starts[i + 1] : total;
        const end = Math.min(Math.max(...chord.map((n) => n.e)), next, total);
        const pitches = [...new Set(chord.map((n) => n.midi))].sort((a, b) => a - b).slice(-6).map(name);
        emit(end - s, pitches.join('.'));
      });
      if (pos < total) emit(total - pos, null);
      return tokens.join(' ');
    };

    const rh = voice(rq);
    const lh = voice(lq);
    const all = rq.concat(lq);
    const density = all.length / Math.max(1, (total / 4) * (60 / bpm));
    return {
      id: 'user-' + Date.now().toString(36),
      title: title || midi.title || 'Partitura importada',
      composer: 'Importada desde MIDI',
      level: density < 1.5 ? 1 : density < 3 ? 2 : density < 5 ? 3 : 4,
      category: 'Mis partituras',
      user: true,
      bpm: Math.max(30, Math.min(220, bpm)),
      time: [num, den],
      key: fifths,
      rh: rh || undefined,
      lh: lh || undefined,
      tip: 'Partitura importada. Si una mano está vacía o mal repartida, prueba con un MIDI que tenga una pista para cada mano.',
    };
  }

  PC.midiImport = { parseMidi, toSong };
})(typeof window !== 'undefined' ? window : globalThis);
