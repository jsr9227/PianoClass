// Prueba la importación MIDI generando archivos .mid en memoria. Uso: node tests/midi.test.js
require('../js/music.js');
require('../js/midi-import.js');
const { PC } = globalThis;
const assert = require('assert');

const vlq = (n) => {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
};
// tracks: [[{tick, dur, midi}]]; meta en la pista 0
function writeMidi(tracks, { ppq = 480, tempo = 500000, timeSig = [4, 2], key = 0 } = {}) {
  const chunks = [];
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length + 1, ppq >> 8, ppq & 0xff];
  const metaTrack = [
    0, 0xff, 0x03, 4, ...Buffer.from('Test'),
    0, 0xff, 0x51, 3, tempo >> 16, (tempo >> 8) & 0xff, tempo & 0xff,
    0, 0xff, 0x58, 4, timeSig[0], timeSig[1], 24, 8,
    0, 0xff, 0x59, 2, key & 0xff, 0,
    0, 0xff, 0x2f, 0,
  ];
  chunks.push(metaTrack);
  for (const notes of tracks) {
    const evs = [];
    notes.forEach((n) => {
      evs.push({ t: n.tick, b: [0x90, n.midi, 90] });
      evs.push({ t: n.tick + n.dur, b: [0x80, n.midi, 0] });
    });
    evs.sort((a, b) => a.t - b.t || (a.b[0] === 0x80 ? -1 : 1));
    const data = [];
    let last = 0;
    evs.forEach((e) => {
      data.push(...vlq(e.t - last), ...e.b);
      last = e.t;
    });
    data.push(0, 0xff, 0x2f, 0);
    chunks.push(data);
  }
  const bytes = [...header];
  chunks.forEach((c) => bytes.push(0x4d, 0x54, 0x72, 0x6b, (c.length >>> 24) & 0xff, (c.length >> 16) & 0xff, (c.length >> 8) & 0xff, c.length & 0xff, ...c));
  return new Uint8Array(bytes).buffer;
}

const Q = 480;
// 1) Dos pistas: melodía y bajo, con un compás vacío inicial y notas ligeramente desajustadas (humanizadas)
const melody = [60, 62, 64, 65, 67, 67, 69, 67].map((m, i) => ({ tick: 4 * Q + i * Q + (i % 2 ? 7 : -5) + 5, dur: Q - 30, midi: m }));
melody.push({ tick: 12 * Q, dur: 4 * Q, midi: 72 });
const bass = [{ tick: 4 * Q, dur: 4 * Q, midi: 48 }, { tick: 8 * Q, dur: 2 * Q, midi: 53 }, { tick: 10 * Q, dur: 2 * Q, midi: 55 }, { tick: 12 * Q, dur: 4 * Q, midi: 48 }];
// Acorde en la pista de bajo para comprobar acordes
bass.push({ tick: 12 * Q, dur: 4 * Q, midi: 52 }, { tick: 12 * Q, dur: 4 * Q, midi: 55 });
let song = PC.midiImport.toSong(PC.midiImport.parseMidi(writeMidi([bass, melody])));
let c = PC.music.compileSong(song);
assert.deepStrictEqual(c.errors, []);
assert.strictEqual(c.measures.length, 3, 'debe quitar el compás vacío inicial');
assert.strictEqual(song.bpm, 120);
assert(song.rh.startsWith('C4/q D4/q E4/q F4/q'), 'mano derecha = pista aguda: ' + song.rh);
assert(song.lh.startsWith('C3/w'), 'mano izquierda = pista grave: ' + song.lh);
assert(song.lh.includes('C3.E3.G3/w'), 'acorde en la mano izquierda: ' + song.lh);
console.log('ok   dos pistas →', song.rh, '||', song.lh);

// 2) Una sola pista: se separa por altura; compás 3/4, tonalidad con bemoles, síncopa que cruza la barra
const single = [
  { tick: 0, dur: Q * 2, midi: 70 }, { tick: 0, dur: Q * 3, midi: 46 },
  { tick: Q * 2, dur: Q * 2, midi: 72 }, // cruza la barra (3/4)
  { tick: Q * 4, dur: Q / 2, midi: 74 }, { tick: Q * 4.5, dur: Q / 4, midi: 75 }, { tick: Q * 3, dur: Q * 3, midi: 51 },
];
song = PC.midiImport.toSong(PC.midiImport.parseMidi(writeMidi([single], { timeSig: [3, 2], key: -2, tempo: 600000 })));
c = PC.music.compileSong(song);
assert.deepStrictEqual(c.errors, []);
assert.deepStrictEqual(song.time, [3, 4]);
assert.strictEqual(song.key, -2);
assert.strictEqual(song.bpm, 100);
assert(song.rh.startsWith('Bb4/h C5/q |'), 'nota acortada en la barra: ' + song.rh);
assert(song.lh.startsWith('Bb2/h.'), song.lh);
console.log('ok   una pista →', song.rh, '||', song.lh);

// 3) Archivo no MIDI
assert.throws(() => PC.midiImport.parseMidi(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer));
console.log('\nTodas las pruebas de importación pasaron');
module.exports = { writeMidi };
