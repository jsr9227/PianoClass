// Comprueba que todas las partituras incorporadas se analizan y que sus compases cuadran.
// Uso: node tests/songs.test.js
require('../js/music.js');
require('../js/songs.js');
const { PC } = globalThis;
const assert = require('assert');

let failed = 0;
const ids = new Set();
for (const song of PC.songs) {
  try {
    assert(!ids.has(song.id), 'id duplicado');
    ids.add(song.id);
    const c = PC.music.compileSong(song);
    assert.deepStrictEqual(c.errors, []);
    assert(c.notes.length > 0, 'sin notas');
    c.notes.forEach((n) => assert(n.midi >= 21 && n.midi <= 108, 'nota fuera del piano'));
    console.log(`ok   ${song.id} (${c.measures.length} compases, ${c.notes.length} notas)`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${song.id}: ${e.message}`);
  }
}

// Pruebas unitarias básicas del analizador.
const p = PC.music.parsePitch('C4');
assert.strictEqual(p.midi, 60);
assert.strictEqual(PC.music.parsePitch('F#4').midi, 66);
assert.strictEqual(PC.music.parsePitch('Bb3').midi, 58);
assert.strictEqual(PC.music.parseDuration('q.').beats, 1.5);
assert.strictEqual(PC.music.keyAlter(1, 3), 1); // Fa# en Sol mayor
assert.strictEqual(PC.music.keyAlter(-1, 6), -1); // Sib en Fa mayor
const bad = PC.music.compileSong({ time: [4, 4], rh: 'C4 D4 E4 | F4 |' });
assert(bad.errors.length > 0, 'debería detectar compases incorrectos');

if (failed) {
  console.log(`\n${failed} partitura(s) con errores`);
  process.exit(1);
}
console.log('\nTodas las pruebas pasaron');
