// Biblioteca de partituras incorporadas. Todas las obras son de dominio público
// (arreglos simplificados propios). Formato descrito en js/music.js y en el README.
(function (root) {
  const PC = (root.PC = root.PC || {});

  // Patrón de arpegio del Preludio en Do de Bach: [bajo1, bajo2, a, b, c] por compás.
  function preludeVoices(chords) {
    const lh = [];
    const rh = [];
    chords.forEach(([a, b, c, d, e]) => {
      lh.push(`${a}/s ${b}/e. r/q ${a}/s ${b}/e. r/q |`);
      rh.push(`r/e ${c}/s ${d}/s ${e}/s ${c}/s ${d}/s ${e}/s r/e ${c}/s ${d}/s ${e}/s ${c}/s ${d}/s ${e}/s |`);
    });
    return { lh: lh.join(' '), rh: rh.join(' ') };
  }
  const prelude = preludeVoices([
    ['C4', 'E4', 'G4', 'C5', 'E5'],
    ['C4', 'D4', 'A4', 'D5', 'F5'],
    ['B3', 'D4', 'G4', 'D5', 'F5'],
    ['C4', 'E4', 'G4', 'C5', 'E5'],
    ['C4', 'E4', 'A4', 'E5', 'A5'],
    ['C4', 'D4', 'F#4', 'A4', 'D5'],
    ['B3', 'D4', 'G4', 'D5', 'G5'],
    ['B3', 'C4', 'E4', 'G4', 'C5'],
    ['A3', 'C4', 'E4', 'G4', 'C5'],
    ['D3', 'A3', 'D4', 'F#4', 'C5'],
    ['G3', 'B3', 'D4', 'G4', 'B4'],
  ]);

  PC.songs = [
    // ───────────── Curso: primeros pasos ─────────────
    {
      id: 'curso-1', course: true, lesson: 1,
      title: 'Lección 1 · El Do central', composer: 'Curso PianoClass',
      level: 1, category: 'Curso', bpm: 70, time: [4, 4], key: 0,
      tip: 'Busca el Do central: es la tecla blanca justo a la izquierda del grupo de dos teclas negras que está en el centro del piano. Tócalo con el pulgar (dedo 1) de la mano derecha.',
      rh: 'C4/h@1 C4/h@1 | C4@1 C4@1 C4/h@1 | C4@1 C4@1 C4@1 C4@1 | C4/w@1 |',
    },
    {
      id: 'curso-2', course: true, lesson: 2,
      title: 'Lección 2 · Cinco dedos (mano derecha)', composer: 'Curso PianoClass',
      level: 1, category: 'Curso', bpm: 72, time: [4, 4], key: 0,
      tip: 'Coloca un dedo en cada tecla: pulgar (1) en Do, índice (2) en Re, corazón (3) en Mi, anular (4) en Fa y meñique (5) en Sol. Los números sobre las notas indican el dedo.',
      rh: 'C4@1 D4@2 E4@3 F4@4 | G4/w@5 | G4@5 F4@4 E4@3 D4@2 | C4/w@1 | C4@1 E4@3 D4@2 F4@4 | E4@3 G4@5 E4/h@3 | D4@2 E4@3 D4@2 C4@1 | C4/w@1 |',
    },
    {
      id: 'curso-3', course: true, lesson: 3,
      title: 'Lección 3 · La mano izquierda', composer: 'Curso PianoClass',
      level: 1, category: 'Curso', bpm: 72, time: [4, 4], key: 0,
      tip: 'Ahora la mano izquierda, en clave de Fa. El meñique (5) va en el Do una octava por debajo del Do central y el pulgar (1) en Sol.',
      lh: 'C3@5 D3@4 E3@3 F3@2 | G3/w@1 | G3@1 F3@2 E3@3 D3@4 | C3/w@5 | C3/h@5 G3/h@1 | E3/h@3 G3/h@1 | D3@4 F3@2 E3@3 D3@4 | C3/w@5 |',
    },
    {
      id: 'curso-4', course: true, lesson: 4,
      title: 'Lección 4 · Escala de Do mayor', composer: 'Curso PianoClass',
      level: 2, category: 'Curso', bpm: 72, time: [4, 4], key: 0,
      tip: 'Para tocar las ocho notas de la escala, pasa el pulgar por debajo después del Mi (dedo 3) para caer en Fa con el dedo 1. Al bajar, cruza el dedo 3 por encima del pulgar.',
      rh: 'C4@1 D4@2 E4@3 F4@1 | G4@2 A4@3 B4@4 C5@5 | C5@5 B4@4 A4@3 G4@2 | F4@1 E4@3 D4@2 C4@1 | C4/w@1 |',
    },
    {
      id: 'curso-5', course: true, lesson: 5,
      title: 'Lección 5 · Acordes I · IV · V', composer: 'Curso PianoClass',
      level: 2, category: 'Curso', bpm: 66, time: [4, 4], key: 0,
      tip: 'Un acorde son varias notas a la vez. Pulsa las tres teclas juntas. Con estos tres acordes (Do, Fa y Sol) puedes acompañar cientos de canciones.',
      rh: 'C4.E4.G4/w@1.3.5 | C4.F4.A4/w@1.3.5 | B3.D4.G4/w@1.2.5 | C4.E4.G4/w@1.3.5 | C4.E4.G4/h@1.3.5 C4.E4.G4/h | C4.F4.A4/h@1.3.5 C4.F4.A4/h | B3.D4.G4/h@1.2.5 B3.D4.G4/h | C4.E4.G4/w@1.3.5 |',
      lh: 'C3/w@5 | F2/w@5 | G2/w@5 | C3/w@5 | C3/h C3/h | F2/h F2/h | G2/h G2/h | C3/w |',
    },
    {
      id: 'curso-6', course: true, lesson: 6,
      title: 'Lección 6 · Las dos manos', composer: 'Curso PianoClass',
      level: 2, category: 'Curso', bpm: 72, time: [4, 4], key: 0,
      tip: 'Primero las manos se turnan y al final tocan juntas. Si se te hace difícil, practica cada mano por separado con el selector de manos y baja el tempo.',
      rh: 'r/w | E4@3 F4@4 G4/h@5 | r/w | G4@5 F4@4 E4/h@3 | C4@1 D4@2 E4@3 F4@4 | G4/w@5 | G4@5 F4@4 E4@3 D4@2 | C4/w@1 |',
      lh: 'C3@5 D3@4 E3/h@3 | r/w | E3@3 D3@4 C3/h@5 | r/w | C3/w@5 | B2/h G2/h | G2/w | C3/w |',
    },

    // ───────────── Canciones ─────────────
    {
      id: 'estrellita', title: 'Estrellita, ¿dónde estás?', composer: 'Tradicional',
      level: 1, category: 'Popular', bpm: 92, time: [4, 4], key: 0,
      tip: 'Una melodía perfecta para empezar: la mano derecha no se mueve de la posición de Do.',
      rh: 'C4 C4 G4 G4 | A4 A4 G4/h | F4 F4 E4 E4 | D4 D4 C4/h | G4 G4 F4 F4 | E4 E4 D4/h | G4 G4 F4 F4 | E4 E4 D4/h | C4 C4 G4 G4 | A4 A4 G4/h | F4 F4 E4 E4 | D4 D4 C4/h |',
      lh: 'C3/w | F3/h C3/h | F3/h C3/h | G2/h C3/h | C3/h G2/h | C3/h G2/h | C3/h G2/h | C3/h G2/h | C3/w | F3/h C3/h | F3/h C3/h | G2/h C3/h |',
    },
    {
      id: 'himno-alegria', title: 'Himno de la alegría', composer: 'Ludwig van Beethoven',
      level: 1, category: 'Clásica', bpm: 100, time: [4, 4], key: 0,
      tip: 'Del final de la Novena Sinfonía. Casi todas las notas van por grados conjuntos.',
      rh: 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4/q. D4/e D4/h | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/q. C4/e C4/h | D4 D4 E4 C4 | D4 E4/e F4/e E4 C4 | D4 E4/e F4/e E4 D4 | C4 D4 G3/h | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/q. C4/e C4/h |',
      lh: 'C3/w | G2/w | C3/w | C3/h G2/h | C3/w | G2/w | C3/w | G2/h C3/h | G2/h C3/h | G2/h C3/h | G2/w | C3/h G2/h | C3/w | G2/w | C3/w | G2/h C3/h |',
    },
    {
      id: 'martinillo', title: 'Martinillo (Frère Jacques)', composer: 'Tradicional',
      level: 1, category: 'Popular', bpm: 100, time: [4, 4], key: 0,
      tip: 'Fíjate en el compás 5: aparecen corcheas, que duran la mitad que una negra.',
      rh: 'C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4/h | E4 F4 G4/h | G4/e A4/e G4/e F4/e E4 C4 | G4/e A4/e G4/e F4/e E4 C4 | C4 G3 C4/h | C4 G3 C4/h |',
      lh: 'C3/h G2/h | C3/h G2/h | C3/h G2/h | C3/h G2/h | C3/h G2/h | C3/h G2/h | C3 G2 C3/h | C3 G2 C3/h |',
    },
    {
      id: 'jingle-bells', title: 'Jingle Bells', composer: 'James Lord Pierpont',
      level: 2, category: 'Popular', bpm: 112, time: [4, 4], key: 0,
      tip: 'El estribillo repite mucho el Mi: mantén la mano relajada y deja que el dedo 3 haga el trabajo.',
      rh: 'E4 E4 E4/h | E4 E4 E4/h | E4 G4 C4/q. D4/e | E4/w | F4 F4 F4/q. F4/e | F4 E4 E4 E4/e E4/e | E4 D4 D4 E4 | D4/h G4/h | E4 E4 E4/h | E4 E4 E4/h | E4 G4 C4/q. D4/e | E4/w | F4 F4 F4 F4 | F4 E4 E4 E4/e E4/e | G4 G4 F4 D4 | C4/w |',
      lh: 'C3/w | C3/w | C3/w | C3/w | F2/w | C3/w | D3/w | G2/w | C3/w | C3/w | C3/w | C3/w | F2/w | C3/w | G2/w | C3/w |',
    },
    {
      id: 'cumpleanos', title: 'Cumpleaños feliz', composer: 'Mildred J. Hill y Patty Hill',
      level: 2, category: 'Popular', bpm: 96, time: [3, 4], key: 0, pickup: 1,
      tip: 'Empieza con una anacrusa: un compás incompleto antes del primer tiempo fuerte.',
      rh: 'G4/e. G4/s | A4 G4 C5 | B4/h G4/e. G4/s | A4 G4 D5 | C5/h G4/e. G4/s | G5 E5 C5 | B4 A4 F5/e. F5/s | E5 C5 D5 | C5/h. |',
      lh: 'r/q | C3/h. | G2/h. | G2/h. | C3/h. | C3/h. | F2/h. | C3 G2/h | C3/h. |',
    },
    {
      id: 'canon', title: 'Canon (en Do)', composer: 'Johann Pachelbel',
      level: 2, category: 'Clásica', bpm: 72, time: [4, 4], key: 0,
      tip: 'El bajo repite siempre las mismas ocho notas. Apréndelo primero con la mano izquierda sola.',
      rh: 'E5/h D5/h | C5/h B4/h | A4/h G4/h | A4/h B4/h | C5/h B4/h | A4/h G4/h | F4/h E4/h | F4/h D4/h | C5 E5 G5 F5 | E5 C5 E5 D5 | C5 A4 C5 G4 | F4 A4 G4 F4 | E4.C5/w |',
      lh: 'C3/h G2/h | A2/h E2/h | F2/h C2/h | F2/h G2/h | C3/h G2/h | A2/h E2/h | F2/h C2/h | F2/h G2/h | C3/h G2/h | A2/h E2/h | F2/h C2/h | F2/h G2/h | C3/w |',
    },
    {
      id: 'para-elisa', title: 'Para Elisa (tema)', composer: 'Ludwig van Beethoven',
      level: 3, category: 'Clásica', bpm: 60, time: [3, 8], key: 0, pickup: 0.5,
      tip: 'El famoso balanceo Mi–Re♯ se toca con los dedos 5 y 4. La mano izquierda dibuja los arpegios y la derecha los completa.',
      rh: 'E5/s D#5/s | E5/s D#5/s E5/s B4/s D5/s C5/s | A4/e r/s C4/s E4/s A4/s | B4/e r/s E4/s G#4/s B4/s | C5/e r/s E4/s E5/s D#5/s | E5/s D#5/s E5/s B4/s D5/s C5/s | A4/e r/s C4/s E4/s A4/s | B4/e r/s E4/s C5/s B4/s | A4/e r/e E5/s D#5/s | E5/s D#5/s E5/s B4/s D5/s C5/s | A4/e r/s C4/s E4/s A4/s | B4/e r/s E4/s G#4/s B4/s | C5/e r/s E4/s E5/s D#5/s | E5/s D#5/s E5/s B4/s D5/s C5/s | A4/e r/s C4/s E4/s A4/s | B4/e r/s E4/s C5/s B4/s | A4/q. |',
      lh: 'r/e | r/q. | A2/s E3/s A3/s r/s r/e | E2/s E3/s G#3/s r/s r/e | A2/s E3/s A3/s r/s r/e | r/q. | A2/s E3/s A3/s r/s r/e | E2/s E3/s G#3/s r/s r/e | A2/s E3/s A3/s r/s r/e | r/q. | A2/s E3/s A3/s r/s r/e | E2/s E3/s G#3/s r/s r/e | A2/s E3/s A3/s r/s r/e | r/q. | A2/s E3/s A3/s r/s r/e | E2/s E3/s G#3/s r/s r/e | A2.A3/q. |',
    },
    {
      id: 'minueto-sol', title: 'Minueto en Sol', composer: 'Christian Petzold (atrib. J. S. Bach)',
      level: 3, category: 'Clásica', bpm: 96, time: [3, 4], key: 1,
      tip: 'Está en Sol mayor: la armadura indica que todos los Fa son Fa♯.',
      rh: 'D5 G4/e A4/e B4/e C5/e | D5 G4 G4 | E5 C5/e D5/e E5/e F#5/e | G5 G4 G4 | C5 D5/e C5/e B4/e A4/e | B4 C5/e B4/e A4/e G4/e | F#4 G4/e A4/e B4/e G4/e | A4/h. | D5 G4/e A4/e B4/e C5/e | D5 G4 G4 | E5 C5/e D5/e E5/e F#5/e | G5 G4 G4 | C5 D5/e C5/e B4/e A4/e | B4 C5/e B4/e A4/e G4/e | A4 B4/e A4/e G4/e F#4/e | G4/h. |',
      lh: 'G3.B3.D4/h A3 | B3/h. | C4/h. | B3/h. | A3/h. | G3/h. | D4 B3 G3 | D4 D3/e C4/e B3/e A3/e | B3/h A3 | G3 B3 G3 | C4/h. | B3 C4/e B3/e A3/e G3/e | A3/h F#3 | G3/h B3 | C4 D4 D3 | G3/h G2 |',
    },
    {
      id: 'preludio-do', title: 'Preludio en Do (BWV 846)', composer: 'Johann Sebastian Bach',
      level: 3, category: 'Clásica', bpm: 60, time: [4, 4], key: 0,
      tip: 'Cada compás es un acorde desplegado. Antes de tocarlo, intenta reconocer la forma del acorde bajo tu mano.',
      rh: prelude.rh + ' E4.G4.C5/w |',
      lh: prelude.lh + ' C3.C4/w |',
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
