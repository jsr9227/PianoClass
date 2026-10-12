// Pruebas de la teoría musical del motor pedagógico. Uso: node tests/theory.test.js
require('../js/music.js');
require('../js/learning/theory.js');
const { PC } = globalThis;
const T = PC.theory;
const assert = require('assert');

const C = { tonic: 0, mode: 'major' };
const G = { tonic: 7, mode: 'major' };
const F = { tonic: 5, mode: 'major' };
const Am = { tonic: 9, mode: 'minor' };
const Ephr = { tonic: 4, mode: 'phrygian' };

// Grados → acordes
assert.deepStrictEqual(['I', 'V', 'vi', 'IV'].map((r) => T.parseRoman(r, C).symbol), ['Do', 'Sol', 'Lam', 'Fa']);
assert.deepStrictEqual(['I', 'V', 'vi', 'IV'].map((r) => T.parseRoman(r, G).symbol), ['Sol', 'Re', 'Mim', 'Do']);
assert.deepStrictEqual(['I', 'IV', 'V'].map((r) => T.parseRoman(r, F).symbol), ['Fa', 'Si♭', 'Do']);
assert.deepStrictEqual(['ii7', 'V7', 'Imaj7'].map((r) => T.parseRoman(r, C).symbol), ['Rem7', 'Sol7', 'Domaj7']);
// Cadencia andaluza en La menor: Lam – Sol – Fa – Mi (con el V mayor)
assert.deepStrictEqual(['i', 'VII', 'VI', 'V'].map((r) => T.parseRoman(r, Am).symbol), ['Lam', 'Sol', 'Fa', 'Mi']);
// Vista desde Mi frigio son los mismos acordes: iv–III–II–I
assert.deepStrictEqual(['iv', 'III', 'II', 'I'].map((r) => T.parseRoman(r, Ephr).symbol), ['Lam', 'Sol', 'Fa', 'Mi']);
assert.deepStrictEqual(T.chordPcs(T.parseRoman('V', Am)), [4, 8, 11]); // Mi mayor: Mi Sol♯ Si
assert.throws(() => T.parseRoman('X', C));

// Tonalidades y armaduras
assert.strictEqual(T.keySignature(G), 1);
assert.strictEqual(T.keySignature(F), -1);
assert.strictEqual(T.keySignature(Am), 0);
assert.strictEqual(T.keySignature(Ephr), 0);
assert.strictEqual(T.keyName({ tonic: 10, mode: 'major' }), 'Si♭ mayor');
assert.strictEqual(T.midiToken(70, F), 'Bb4');
assert.strictEqual(T.midiToken(66, G), 'F#4');

// Inversiones y conducción de voces: I–IV–V–I en Do se mueve poco
const chords = ['I', 'IV', 'V', 'I'].map((r) => T.parseRoman(r, C));
const v = T.voiceLead(chords);
v.forEach((x, i) => assert.deepStrictEqual(x.notes.map(T.mod12).sort(), T.chordPcs(chords[i]).sort()));
for (let i = 1; i < v.length; i++) {
  const move = v[i].notes.reduce((s, n, k) => s + Math.abs(n - v[i - 1].notes[k]), 0);
  assert(move <= 6, `salto excesivo entre acordes ${i - 1} y ${i}: ${move} semitonos`);
}
assert.strictEqual(T.voicings(T.parseRoman('I', C), 48, 60).length >= 3, true);

// Escalas
assert.deepStrictEqual(T.scaleMidis(Ephr, 'phrygian', 64, 76).map((m) => T.pcName(m)), ['Mi', 'Fa', 'Sol', 'La', 'Si', 'Do', 'Re', 'Mi']);
assert.deepStrictEqual(T.scaleMidis(C, 'pentatonic-major', 60, 72).length, 6);

// Todas las progresiones, en todas las tonalidades y patrones, generan partituras válidas
let n = 0;
for (const p of T.PROGRESSIONS) {
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const pattern of Object.keys(T.PATTERNS)) {
      const song = T.progressionSong({ romans: p.romans, key: { tonic, mode: p.mode }, pattern });
      const c = PC.music.compileSong(song);
      assert.deepStrictEqual(c.errors, [], `${p.id} ${tonic} ${pattern}`);
      assert(c.notes.every((x) => x.midi >= 36 && x.midi <= 84), 'registro razonable');
      assert.strictEqual(song.chords.length, p.romans.length * 2 + 1);
      n++;
    }
  }
}

// Improvisación: proporción de notas de la escala
const ev = T.evaluateImprov([{ midi: 60, beat: 0 }, { midi: 62, beat: 1 }, { midi: 61, beat: 2 }, { midi: 67, beat: 4 }], {
  key: C, scale: 'major', chords: [{ beat: 0, pcs: [0, 4, 7] }],
});
assert.strictEqual(ev.count, 4);
assert.strictEqual(ev.inScale, 0.75);
assert.strictEqual(ev.chordTones, 2 / 3); // tiempos 0, 2 y 4: Do (sí), Do♯ (no), Sol (sí)

console.log(`Todas las pruebas de teoría pasaron (${n} progresiones generadas y validadas)`);
