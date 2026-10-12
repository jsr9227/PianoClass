// Catálogo de habilidades e itinerarios de aprendizaje.
// Una habilidad es la unidad de dominio: tiene su propio estado, independientemente del itinerario,
// así que cambiar de itinerario no hace perder progreso.
(function (root) {
  const PC = (root.PC = root.PC || {});
  const E = PC.exercises;

  // Dominios y su bloque en las sesiones
  const DOMAINS = {
    tecnica: { name: 'Técnica y coordinación', block: 'tecnica' },
    ritmo: { name: 'Ritmo', block: 'tecnica' },
    lectura: { name: 'Lectura', block: 'tecnica' },
    acordes: { name: 'Acordes y progresiones', block: 'acordes' },
    oido: { name: 'Oído', block: 'oido' },
    repertorio: { name: 'Canciones', block: 'canciones' },
    improvisacion: { name: 'Improvisación', block: 'memoria' },
  };

  const findSong = (id) => (PC.songs || []).find((s) => s.id === id);

  // Fábricas de habilidades
  const play = (id, domain, name, desc, why, makeSong, extra = {}) => ({ id, domain, name, desc, why, kind: 'play', targetAid: 2, targetTempo: 1, startTempo: 0.8, song: makeSong, ...extra });
  const ear = (id, name, desc, why, type, level = 1) => ({ id, domain: 'oido', name, desc, why, kind: 'ear', ear: { type, level } });
  const songSkill = (songId, name, why) =>
    play(`rep-${songId}`, 'repertorio', name, 'Tocar la pieza completa, con las dos manos.', why, () => findSong(songId), { targetAid: 4, songId, startTempo: 0.7 });

  const SKILLS = [
    // ── Técnica ──
    play('t-do-central', 'tecnica', 'El Do central', 'Encontrar el Do central y tocarlo con el pulgar.', 'Es la referencia para orientarse en el teclado y en la partitura.', () => findSong('curso-1'), { targetAid: 2, startTempo: 1 }),
    play('t-5dedos-rh', 'tecnica', 'Cinco dedos · mano derecha', 'Posición de Do con un dedo por tecla.', 'La posición fija de cinco dedos permite tocar melodías sin mirar las manos.', () => findSong('curso-2')),
    play('t-5dedos-lh', 'tecnica', 'Cinco dedos · mano izquierda', 'La misma posición con la izquierda, en clave de fa.', 'La mano izquierda suele ir por detrás: trabajarla aparte equilibra ambas.', () => findSong('curso-3')),
    play('t-coord-paralelo', 'tecnica', 'Manos juntas en paralelo', 'Las dos manos suben y bajan a la vez.', 'Coordinar ambas manos es la base para tocar melodía y acompañamiento.', () => E.coordination('paralelo')),
    play('t-coord-contrario', 'tecnica', 'Manos juntas en movimiento contrario', 'Las manos se alejan y se acercan en espejo.', 'El movimiento contrario usa los mismos dedos en ambas manos y facilita la independencia.', () => E.coordination('contrario')),
    play('t-escala-do', 'tecnica', 'Escala de Do mayor', 'Una octava con paso del pulgar.', 'El paso del pulgar permite tocar más de cinco notas seguidas sin saltos.', () => E.scale(0, 'R')),
    play('t-escala-do-lh', 'tecnica', 'Escala de Do · mano izquierda', 'Una octava con la izquierda.', 'Misma técnica de paso del pulgar en la otra mano.', () => E.scale(0, 'L')),
    play('t-escala-sol', 'tecnica', 'Escala de Sol mayor', 'Con el Fa♯ de la armadura.', 'Primera tonalidad con alteraciones: entender la armadura.', () => E.scale(7, 'R')),
    play('t-escala-fa', 'tecnica', 'Escala de Fa mayor', 'Con el Si♭ y digitación 1-2-3-4.', 'La digitación cambia según la tonalidad para que la mano no se cruce mal.', () => E.scale(5, 'R')),
    // ── Ritmo ──
    play('r-negras-blancas', 'ritmo', 'Negras y blancas', 'Mantener el pulso con figuras básicas.', 'El pulso estable es lo que hace que la música «vaya bien», aunque las notas sean simples.', () => E.rhythm('negras-blancas'), { mode: 'realtime', startTempo: 1 }),
    play('r-corcheas', 'ritmo', 'Corcheas', 'Dividir el pulso en dos.', 'La mayoría de melodías y acompañamientos usan corcheas.', () => E.rhythm('corcheas'), { mode: 'realtime', startTempo: 0.9 }),
    play('r-puntillo', 'ritmo', 'Negra con puntillo', 'Ritmo largo-corto.', 'Aparece constantemente en canciones populares.', () => E.rhythm('puntillo'), { mode: 'realtime', startTempo: 0.85 }),
    play('r-sincopa', 'ritmo', 'Síncopa', 'Notas que caen entre pulsos.', 'La síncopa es el motor rítmico del pop y la música moderna.', () => E.rhythm('sincopa'), { mode: 'realtime', startTempo: 0.8 }),
    play('r-compas-12', 'ritmo', 'Compás de 12 (flamenco)', 'Ciclo de 12 tiempos con acentos en 3, 6, 8, 10 y 12.', 'Es la base de la soleá y la bulería; sentir el ciclo es imprescindible en el flamenco.', () => E.rhythm('compas-12'), { mode: 'realtime', startTempo: 0.7 }),
    // ── Lectura (sin teclas iluminadas desde el principio: el objetivo es leer) ──
    play('l-clave-sol', 'lectura', 'Lectura en clave de sol', 'Melodías nuevas en posición de Do, mano derecha.', 'Leer material nuevo es lo que te hará autónomo con partituras que no conoces.', (ctx) => E.sightReading('R', ctx.seed), { minAid: 2, targetAid: 2, startTempo: 0.8, fresh: true }),
    play('l-clave-fa', 'lectura', 'Lectura en clave de fa', 'Melodías nuevas para la mano izquierda.', 'La clave de fa suele costar más: practicarla aparte acelera la lectura a dos manos.', (ctx) => E.sightReading('L', ctx.seed), { minAid: 2, targetAid: 2, startTempo: 0.8, fresh: true }),
    // ── Acordes y progresiones ──
    play('a-triadas-mayores', 'acordes', 'Acordes mayores', 'Do, Fa y Sol en estado fundamental.', 'Las tríadas mayores son la base del acompañamiento.', () => E.progression({ progId: 'I-IV-V', pattern: 'bloque', rootPosition: true, repeats: 1, bpm: 60 }), { startTempo: 1 }),
    play('a-triadas-menores', 'acordes', 'Acordes menores', 'La menor, Re menor y Mi menor.', 'Con mayores y menores ya puedes acompañar casi cualquier canción sencilla.', () => E.progression({ progId: 'vi-IV-I-V', romans: ['vi', 'ii', 'iii', 'vi'], pattern: 'bloque', rootPosition: true, repeats: 1, bpm: 60 }), { startTempo: 1 }),
    play('a-inversiones', 'acordes', 'Inversiones', 'Un acorde en sus tres posiciones.', 'Las inversiones permiten cambiar de acorde moviendo muy poco la mano.', () => E.inversions('I'), { startTempo: 1 }),
    play('a-prog-I-IV-V', 'acordes', 'Progresión I–IV–V', 'Los tres acordes principales con conducción de voces.', 'Es el esqueleto armónico de miles de canciones.', () => E.progression({ progId: 'I-IV-V', pattern: 'pulso' }), { targetAid: 4 }),
    play('a-prog-pop', 'acordes', 'Progresión I–V–vi–IV', 'La progresión más usada del pop.', 'Dominarla te permite acompañar una enorme cantidad de canciones actuales.', () => E.progression({ progId: 'I-V-vi-IV', pattern: 'pulso' }), { targetAid: 4 }),
    play('a-prog-sensible', 'acordes', 'Progresión vi–IV–I–V', 'Los mismos acordes empezando por el menor.', 'Cambiar el punto de partida cambia el carácter: aprende a oírlo y tocarlo.', () => E.progression({ progId: 'vi-IV-I-V', pattern: 'pulso' }), { targetAid: 4 }),
    play('a-prog-ii-V-I', 'acordes', 'Progresión ii–V–I', 'Cadencia con acordes de séptima.', 'Introduce las cuatriadas y la cadencia básica del jazz.', () => E.progression({ progId: 'ii-V-I', pattern: 'bloque' }), { targetAid: 4, startTempo: 0.8 }),
    play('a-balada', 'acordes', 'Acompañamiento de balada', 'I–V–vi–IV con ritmo de balada pop.', 'Un patrón de acompañamiento convierte los acordes en música lista para cantar encima.', () => E.progression({ progId: 'I-V-vi-IV', pattern: 'balada', bpm: 70 }), { targetAid: 4, startTempo: 0.75 }),
    play('a-rumba', 'acordes', 'Ritmo de rumba (3+3+2)', 'Acentos 3+3+2, típicos del pop español y la rumba.', 'Este ritmo aparece en muchísimas canciones españolas y latinas.', () => E.progression({ progId: 'i-VII-VI-V', pattern: 'rumba', bpm: 96 }), { targetAid: 4, startTempo: 0.7 }),
    play('a-transposicion', 'acordes', 'Transponer a Sol y Fa', 'I–V–vi–IV en otras tonalidades.', 'Transponer te permite adaptar una canción a tu voz o a la de quien canta.', (ctx) => E.progression({ progId: 'I-V-vi-IV', tonic: [7, 5, 2][ctx.seed % 3], pattern: 'pulso' }), { targetAid: 3, fresh: true }),
    play('a-andaluza', 'acordes', 'Cadencia andaluza', 'Lam – Sol – Fa – Mi.', 'La progresión más característica del flamenco y de mucha música española.', () => E.progression({ progId: 'i-VII-VI-V', pattern: 'bloque' }), { targetAid: 4 }),
    play('a-frigio', 'acordes', 'Modo frigio', 'La cadencia andaluza entendida desde Mi frigio.', 'En el flamenco el reposo está en el acorde de Mi: así se entiende su armonía.', () => E.progression({ progId: 'frigio', pattern: 'rumba', bpm: 90 }), { targetAid: 4, startTempo: 0.7 }),
    // ── Oído ──
    ear('o-notas', 'Reconocer notas', 'Identificar notas respecto a Do.', 'Relacionar sonido y nota es la base para tocar de oído.', 'notas'),
    ear('o-intervalos', 'Intervalos', 'Terceras, quintas y octavas.', 'Los intervalos son los «ladrillos» de melodías y acordes.', 'intervalos'),
    ear('o-mayor-menor', 'Mayor o menor', 'Distinguir acordes mayores y menores.', 'Es la primera decisión al sacar una canción de oído.', 'calidad'),
    ear('o-cambios', 'Cambios de acorde', 'Detectar a qué acorde cambia la música.', 'Oír los cambios permite acompañar sin partitura.', 'cambio'),
    ear('o-progresiones', 'Progresiones', 'Reconocer progresiones habituales.', 'Muchas canciones comparten progresión: reconocerla acelera aprenderlas.', 'progresiones'),
    ear('o-eco', 'Tocar de oído', 'Reproducir melodías cortas.', 'Conecta oído y manos: el paso hacia tocar sin partitura.', 'eco'),
    // ── Improvisación ──
    { id: 'i-pentatonica', domain: 'improvisacion', kind: 'improv', name: 'Improvisar con la pentatónica', desc: 'Melodías libres con Do-Re-Mi-Sol-La sobre I–V–vi–IV.', why: 'La pentatónica casi no tiene notas que choquen: ideal para empezar a improvisar sin miedo.', improv: { progId: 'I-V-vi-IV', scale: 'pentatonic-major', tonic: 0, mode: 'major' } },
    { id: 'i-notas-acorde', domain: 'improvisacion', kind: 'improv', name: 'Melodía con notas del acorde', desc: 'En los tiempos fuertes, usar notas del acorde que suena.', why: 'Apoyar la melodía en notas del acorde hace que suene «a canción».', improv: { progId: 'I-IV-V', scale: 'major', tonic: 0, mode: 'major', chordTones: true } },
    { id: 'i-frigio', domain: 'improvisacion', kind: 'improv', name: 'Improvisar en Mi frigio', desc: 'Melodías sobre la cadencia andaluza con el sonido flamenco.', why: 'La segunda menor (Mi–Fa) es el color más reconocible del flamenco.', improv: { progId: 'frigio', scale: 'phrygian-dominant', tonic: 4, mode: 'phrygian' } },
    // ── Repertorio (canciones de la biblioteca) ──
    songSkill('estrellita', 'Estrellita', 'Primera pieza con las dos manos.'),
    songSkill('himno-alegria', 'Himno de la alegría', 'Melodía por grados conjuntos con acompañamiento sencillo.'),
    songSkill('martinillo', 'Martinillo', 'Introduce las corcheas en una pieza.'),
    songSkill('aura-lee', 'Aura Lee (Love Me Tender)', 'Melodía cantable con cambios de acorde.'),
    songSkill('cumpleanos', 'Cumpleaños feliz', 'Anacrusa y compás de 3/4.'),
    songSkill('tetris', 'Korobeiniki (Tetris)', 'Ritmo con puntillo y bajo con octavas.'),
    songSkill('canon', 'Canon de Pachelbel', 'Bajo repetido y progresión clásica.'),
    songSkill('greensleeves', 'Greensleeves', 'Compás de 6/8 y alteraciones.'),
    songSkill('minueto-sol', 'Minueto en Sol', 'Lectura a dos manos en Sol mayor.'),
    songSkill('para-elisa', 'Para Elisa', 'Arpegios repartidos entre manos.'),
    songSkill('preludio-do', 'Preludio en Do', 'Acordes desplegados y regularidad.'),
    songSkill('gymnopedie', 'Gymnopédie n.º 1', 'Saltos de la mano izquierda y legato.'),
  ];
  const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

  // Itinerarios: 6 módulos de ~2 semanas = programa inicial orientativo de 12 semanas.
  // Las semanas son una guía; el avance real depende del dominio de cada habilidad.
  const PATHS = [
    {
      id: 'cero', name: 'Piano desde cero', icon: '🌱',
      desc: 'Para empezar sin conocimientos: orientación, manos, lectura básica, primeros acordes y canciones.',
      modules: [
        { title: 'Primeros pasos', goal: 'Orientarte en el teclado y tocar con cinco dedos.', skills: ['t-do-central', 't-5dedos-rh', 'r-negras-blancas', 'o-notas'] },
        { title: 'Las dos manos', goal: 'Usar la mano izquierda y coordinar ambas.', skills: ['t-5dedos-lh', 't-coord-paralelo', 'l-clave-sol', 'rep-estrellita'] },
        { title: 'Primeros acordes', goal: 'Tocar acordes mayores y la progresión I–IV–V.', skills: ['a-triadas-mayores', 'a-prog-I-IV-V', 'o-mayor-menor', 'r-corcheas', 'rep-himno-alegria'] },
        { title: 'Escalas y movimiento', goal: 'Pasar el pulgar y leer en clave de fa.', skills: ['t-escala-do', 't-coord-contrario', 'l-clave-fa', 'rep-martinillo'] },
        { title: 'Acompañar canciones', goal: 'Acompañar con la progresión pop y un ritmo de balada.', skills: ['a-triadas-menores', 'a-prog-pop', 'a-balada', 'o-cambios', 'rep-aura-lee'] },
        { title: 'Hacia la autonomía', goal: 'Tocar de memoria, de oído y crear tus primeras melodías.', skills: ['rep-cumpleanos', 'o-eco', 'i-pentatonica', 'r-puntillo'] },
      ],
    },
    {
      id: 'moderno', name: 'Piano moderno', icon: '🎤',
      desc: 'Pop, acordes y acompañamiento: progresiones, inversiones, ritmos y pop español.',
      modules: [
        { title: 'Base de acordes', goal: 'Tríadas mayores y menores y pulso estable.', skills: ['t-5dedos-rh', 'a-triadas-mayores', 'a-triadas-menores', 'r-negras-blancas', 'o-mayor-menor', 'rep-aura-lee'] },
        { title: 'Progresiones pop', goal: 'Las progresiones más usadas del pop.', skills: ['a-prog-I-IV-V', 'a-prog-pop', 'a-prog-sensible', 'o-cambios', 'r-corcheas', 'rep-cumpleanos'] },
        { title: 'Inversiones y fluidez', goal: 'Cambiar de acorde moviendo poco la mano.', skills: ['a-inversiones', 'a-balada', 't-coord-paralelo', 'o-progresiones'] },
        { title: 'Pop español', goal: 'Ritmos y progresiones del pop español; transponer.', skills: ['a-rumba', 'r-sincopa', 'a-transposicion', 'rep-tetris'] },
        { title: 'Flamenco y flamencito', goal: 'Cadencia andaluza, modo frigio y compás de 12.', skills: ['a-andaluza', 'a-frigio', 'r-compas-12', 'i-frigio'] },
        { title: 'Crear sobre los acordes', goal: 'Improvisar y componer melodías sencillas.', skills: ['i-pentatonica', 'i-notas-acorde', 'a-prog-ii-V-I', 'o-eco'] },
      ],
    },
    {
      id: 'clasico', name: 'Piano clásico', icon: '🎼',
      desc: 'Lectura, técnica e interpretación del repertorio clásico.',
      modules: [
        { title: 'Lectura y posición', goal: 'Leer en clave de sol en posición de Do.', skills: ['t-do-central', 't-5dedos-rh', 'l-clave-sol', 'r-negras-blancas', 'o-notas'] },
        { title: 'Clave de fa', goal: 'Leer y tocar con la mano izquierda.', skills: ['t-5dedos-lh', 'l-clave-fa', 't-coord-paralelo', 'rep-himno-alegria'] },
        { title: 'Técnica', goal: 'Escalas, paso del pulgar y ritmo.', skills: ['t-escala-do', 't-escala-do-lh', 't-escala-sol', 'r-corcheas', 'r-puntillo'] },
        { title: 'Repertorio I', goal: 'Primeras piezas clásicas completas.', skills: ['rep-canon', 'rep-minueto-sol', 't-escala-fa', 'o-intervalos'] },
        { title: 'Repertorio II', goal: 'Piezas con arpegios y mayor independencia.', skills: ['rep-para-elisa', 'rep-preludio-do', 'a-inversiones', 'o-mayor-menor'] },
        { title: 'Interpretar de memoria', goal: 'Tocar el repertorio sin partitura.', skills: ['rep-gymnopedie', 'rep-greensleeves', 't-coord-contrario'] },
      ],
    },
    {
      id: 'improvisacion', name: 'Improvisación y oído', icon: '👂',
      desc: 'Entrenar el oído, entender la armonía e improvisar sobre progresiones.',
      modules: [
        { title: 'Oído básico', goal: 'Reconocer notas, intervalos y acordes.', skills: ['o-notas', 'o-intervalos', 'o-mayor-menor', 't-5dedos-rh'] },
        { title: 'Acordes y escala', goal: 'Tocar los acordes que vas a oír.', skills: ['a-triadas-mayores', 'a-triadas-menores', 'a-prog-I-IV-V', 'r-negras-blancas'] },
        { title: 'Progresiones de oído', goal: 'Reconocer cambios y progresiones.', skills: ['o-cambios', 'o-progresiones', 'a-prog-pop', 'o-eco', 'rep-aura-lee'] },
        { title: 'Improvisar sobre progresiones', goal: 'Melodías libres y con notas del acorde.', skills: ['i-pentatonica', 'i-notas-acorde', 'r-corcheas', 'a-balada', 'rep-canon'] },
        { title: 'Modal: el frigio', goal: 'El sonido flamenco: frigio y cadencia andaluza.', skills: ['a-andaluza', 'a-frigio', 'i-frigio', 'r-compas-12'] },
        { title: 'Crear', goal: 'Transponer y crear sobre la cadencia de jazz.', skills: ['a-prog-ii-V-I', 'a-transposicion', 'r-sincopa', 'a-rumba'] },
      ],
    },
  ];
  PATHS.forEach((p) => p.modules.forEach((m, i) => {
    m.id = `${p.id}-${i + 1}`;
    m.weeks = [i * 2 + 1, i * 2 + 2];
    m.criteria = 'Superado cuando todas sus habilidades estén consolidadas. El siguiente módulo se abre cuando has superado al menos una vez cada habilidad de este.';
  }));
  const PATH = Object.fromEntries(PATHS.map((p) => [p.id, p]));

  PC.curriculum = { DOMAINS, SKILLS, SKILL, PATHS, PATH };
})(typeof window !== 'undefined' ? window : globalThis);
