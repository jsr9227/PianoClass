// Prueba la detección de acordes con señales sintéticas de "piano" (tonos con armónicos que decaen)
// y el nombrado de acordes. Uso: node tests/pitch.test.js
require('../js/pitch.js');
const { PC } = globalThis;
const assert = require('assert');

const SR = 44100;
const N = 8192;

// FFT radix-2 iterativa (solo para la prueba; en el navegador lo hace el AnalyserNode)
function magnitudes(signal) {
  const re = Float64Array.from(signal);
  const im = new Float64Array(N);
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < N; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
      }
    }
  }
  const out = new Float32Array(N / 2);
  for (let i = 0; i < N / 2; i++) out[i] = Math.hypot(re[i], im[i]) / N;
  return out;
}

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Tono tipo piano: armónicos con amplitud decreciente y una pequeña inarmonía, más ruido.
function render(midis, { bright = 1, noise = 0.002, gains } = {}) {
  const x = new Float32Array(N);
  midis.forEach((m, k) => {
    const f0 = 440 * Math.pow(2, (m - 69) / 12);
    const g = gains ? gains[k] : 0.8 + 0.4 * rand();
    for (let h = 1; h <= 10; h++) {
      const f = f0 * h * Math.sqrt(1 + 0.0004 * h * h);
      if (f > SR / 2) break;
      const amp = (g * Math.pow(bright, h - 1)) / h;
      const ph = rand() * 6.283;
      for (let i = 0; i < N; i++) x[i] += amp * Math.sin((6.283185307 * f * i) / SR + ph);
    }
  });
  for (let i = 0; i < N; i++) {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
    x[i] = (x[i] + noise * (rand() * 2 - 1)) * hann;
  }
  return magnitudes(x);
}

const CASES = [
  { name: 'nota sola Do4', notes: [60] },
  { name: 'nota grave La2', notes: [45] },
  { name: 'Do mayor (Do4-Mi4-Sol4)', notes: [60, 64, 67] },
  { name: 'La menor (La3-Do4-Mi4)', notes: [57, 60, 64] },
  { name: 'Sol7 (Sol3-Si3-Re4-Fa4)', notes: [55, 59, 62, 65] },
  { name: 'Fa mayor 1.ª inversión (La3-Do4-Fa4)', notes: [57, 60, 65] },
  { name: 'dos manos (Do3 + Mi4-Sol4-Do5)', notes: [48, 64, 67, 72], hints: true },
  { name: 'Re menor (Re4-Fa4-La4)', notes: [62, 65, 69] },
  { name: 'Si♭ mayor (Si♭3-Re4-Fa4)', notes: [58, 62, 65] },
];

let failed = 0;
for (const c of CASES) {
  for (const bright of [0.7, 1]) {
    // Con «hints» se simula la práctica: la partitura indica qué notas se esperan.
    const opts = c.hints ? { hints: new Set(c.notes) } : {};
    const got = PC.pitch.detectNotes(render(c.notes, { bright }), SR, N, opts).map((n) => n.midi);
    const ok = JSON.stringify(got) === JSON.stringify(c.notes);
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.name} (brillo ${bright}) → [${got}]`);
  }
}

// Octava (Do4 + Do5): la nota aguda coincide con un armónico de la grave; con la pista de la partitura debe detectarse.
{
  const spec = render([60, 72], { gains: [1, 1] });
  const got = PC.pitch.detectNotes(spec, SR, N, { hints: new Set([60, 72]) }).map((n) => n.midi);
  const ok = JSON.stringify(got) === '[60,72]';
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} octava Do4+Do5 con pista → [${got}]`);
}

// Sin pistas, una doble octava (Do5 sobre Do3) puede confundirse con un armónico, pero el acorde se reconoce igual.
{
  const got = PC.pitch.detectNotes(render([48, 64, 67, 72], { bright: 0.7 }), SR, N).map((n) => n.midi);
  const ok = PC.pitch.chordName(got) === 'Do mayor';
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} Do mayor abierto sin pistas → [${got}] = ${PC.pitch.chordName(got)}`);
}

// Una nota equivocada no debe aparecer si no suena: Do mayor con pista de Re no detecta Re
{
  const got = PC.pitch.detectNotes(render([60, 64, 67]), SR, N, { hints: new Set([62]) }).map((n) => n.midi);
  const ok = !got.includes(62);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} pista sin sonido no crea notas → [${got}]`);
}

// Prueba aleatoria: 60 acordes de 3-4 notas con intensidades y timbres variados.
{
  const QUAL = [[0, 4, 7], [0, 3, 7], [0, 4, 7, 10], [0, 3, 7, 10], [0, 4, 7, 11], [0, 3, 6]];
  let exact = 0;
  let pcsOk = 0;
  let ghosts = 0;
  const TOTAL = 60;
  for (let t = 0; t < TOTAL; t++) {
    const root = 48 + Math.floor(rand() * 20);
    const q = QUAL[Math.floor(rand() * QUAL.length)];
    const notes = q.map((iv) => root + iv);
    if (rand() < 0.4) notes[0] += 12; // inversión
    notes.sort((a, b) => a - b);
    const spec = render(notes, { bright: 0.6 + rand() * 0.4, gains: notes.map(() => 0.6 + rand() * 0.6) });
    const got = PC.pitch.detectNotes(spec, SR, N).map((n) => n.midi);
    if (JSON.stringify(got) === JSON.stringify(notes)) exact++;
    const pcs = (l) => [...new Set(l.map((m) => m % 12))].sort().join();
    if (pcs(got) === pcs(notes)) pcsOk++;
    ghosts += got.filter((m) => !notes.includes(m)).length;
  }
  console.log(`acordes aleatorios: ${exact}/${TOTAL} exactos, ${pcsOk}/${TOTAL} acorde correcto, ${ghosts} notas fantasma`);
  if (pcsOk < TOTAL * 0.9) failed++;
}

// Silencio
assert.deepStrictEqual(PC.pitch.detectNotes(render([], { noise: 0.001 }), SR, N), []);

// Nombres de acordes
const names = [
  [[60, 64, 67], 'Do mayor'],
  [[57, 60, 64], 'La menor'],
  [[55, 59, 62, 65], 'Sol7'],
  [[64, 67, 72], 'Do mayor / Mi'],
  [[62, 65, 69, 72], 'Re m7'],
  [[59, 62, 65], 'Si disminuido'],
  [[60, 65, 67], 'Do sus4'],
  [[60, 64], 'Do + Mi (tercera mayor)'],
  [[60], 'Do'],
];
for (const [notes, expected] of names) {
  const got = PC.pitch.chordName(notes);
  if (got !== expected) {
    failed++;
    console.log(`FAIL nombre ${notes} → "${got}" (esperado "${expected}")`);
  }
}

if (failed) {
  console.log(`\n${failed} prueba(s) fallida(s)`);
  process.exit(1);
}
console.log('\nTodas las pruebas de detección pasaron');
