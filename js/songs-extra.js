// Ampliación de la biblioteca: más piezas muy conocidas de dominio público (arreglos simplificados).
(function (root) {
  const PC = (root.PC = root.PC || {});

  // Patrón de mano izquierda repetido: rep('C3/w |', 4) → 'C3/w | C3/w | C3/w | C3/w |'
  const rep = (s, n) => Array(n).fill(s).join(' ');

  PC.songs.push(
    // ───────────── Infantil ─────────────
    {
      id: 'hot-cross-buns', title: 'Hot Cross Buns', composer: 'Tradicional inglesa',
      level: 1, category: 'Infantil', bpm: 90, time: [4, 4], key: 0,
      tip: 'Solo tres notas: Mi, Re y Do. Ideal para tus primeros minutos al piano.',
      rh: 'E4@3 D4@2 C4/h@1 | E4@3 D4@2 C4/h@1 | C4/e@1 C4/e C4/e C4/e D4/e@2 D4/e D4/e D4/e | E4@3 D4@2 C4/h@1 |',
      lh: 'C3/w | C3/w | C3/h G2/h | G2/h C3/h |',
    },
    {
      id: 'maria-corderito', title: 'María tenía un corderito', composer: 'Tradicional (EE. UU.)',
      level: 1, category: 'Infantil', bpm: 100, time: [4, 4], key: 0,
      rh: 'E4 D4 C4 D4 | E4 E4 E4/h | D4 D4 D4/h | E4 G4 G4/h | E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4/w |',
      lh: 'C3/w | C3/w | G2/w | C3/w | C3/w | C3/w | G2/w | C3/w |',
    },
    {
      id: 'rema-barca', title: 'Rema, rema tu barca (Row, Row, Row Your Boat)', composer: 'Tradicional',
      level: 1, category: 'Infantil', bpm: 100, time: [6, 8], key: 0,
      tip: 'Compás de 6/8: se cuenta en dos grandes pulsos, cada uno dividido en tres corcheas.',
      rh: 'C4/q. C4/q. | C4/q D4/e E4/q. | E4/q D4/e E4/q F4/e | G4/h. | C5/e C5/e C5/e G4/e G4/e G4/e | E4/e E4/e E4/e C4/e C4/e C4/e | G4/q F4/e E4/q D4/e | C4/h. |',
      lh: 'C3/h. | C3/h. | C3/h. | C3/h. | C3/h. | C3/h. | G2/h. | C3/h. |',
    },
    {
      id: 'london-bridge', title: 'El puente de Londres', composer: 'Tradicional inglesa',
      level: 1, category: 'Infantil', bpm: 100, time: [4, 4], key: 0,
      rh: 'G4/q. A4/e G4 F4 | E4 F4 G4/h | D4 E4 F4/h | E4 F4 G4/h | G4/q. A4/e G4 F4 | E4 F4 G4/h | D4/h G4/h | E4 C4/h. |',
      lh: 'C3/w | C3/w | G2/w | C3/w | C3/w | C3/w | G2/w | C3/w |',
    },
    {
      id: 'old-macdonald', title: 'En la granja de mi tío (Old MacDonald)', composer: 'Tradicional',
      level: 1, category: 'Infantil', bpm: 110, time: [4, 4], key: 0,
      rh: 'C5 C5 C5 G4 | A4 A4 G4/h | E5 E5 D5 D5 | C5/h. G4 | C5 C5 C5 G4 | A4 A4 G4/h | E5 E5 D5 D5 | C5/w |',
      lh: 'C3/w | F3/h C3/h | C3/h G2/h | C3/w | C3/w | F3/h C3/h | C3/h G2/h | C3/w |',
    },
    {
      id: 'pop-weasel', title: 'Pop Goes the Weasel', composer: 'Tradicional inglesa',
      level: 2, category: 'Infantil', bpm: 110, time: [6, 8], key: 0,
      rh: 'C4/q C4/e D4/q D4/e | E4/e G4/e E4/e C4/q. | C4/q C4/e D4/q D4/e | E4/q. C4/q. | C4/q C4/e D4/q D4/e | E4/e G4/e E4/e C4/q. | A3/q. D4/q F4/e | E4/q. C4/q. |',
      lh: 'C3/h. | C3/h. | G2/h. | C3/h. | C3/h. | C3/h. | F2/h. | G2/q. C3/q. |',
    },

    // ───────────── Popular ─────────────
    {
      id: 'tetris', title: 'Korobeiniki (tema de Tetris)', composer: 'Tradicional rusa',
      level: 2, category: 'Popular', bpm: 132, time: [4, 4], key: 0,
      tip: 'La famosa melodía del videojuego Tetris. Empieza despacio y sube el tempo poco a poco.',
      rh: 'E5 B4/e C5/e D5 C5/e B4/e | A4 A4/e C5/e E5 D5/e C5/e | B4/q. C5/e D5 E5 | C5 A4 A4/h | r/e D5 F5/e A5 G5/e F5/e | E5/q. C5/e E5 D5/e C5/e | B4 B4/e C5/e D5 E5 | C5 A4 A4/h |',
      lh: 'A2 A3 A2 A3 | A2 A3 A2 A3 | E2 E3 E2 E3 | A2 A3 A2/h | D3 D2 D3 D2 | C3 G2 C3 G2 | E2 E3 E2 E3 | A2 A3 A2/h |',
    },
    {
      id: 'aura-lee', title: 'Aura Lee (melodía de «Love Me Tender»)', composer: 'George R. Poulton (1861)',
      level: 1, category: 'Popular', bpm: 76, time: [4, 4], key: 0,
      tip: 'Esta melodía de 1861 es la que Elvis Presley usó en «Love Me Tender».',
      rh: 'G4 C5 B4 C5 | D5 A4 D5/h | C5 B4 A4 B4 | C5/w | G4 C5 B4 C5 | D5 A4 D5/h | C5 B4 A4 B4 | C5/w |',
      lh: 'C3/w | D3/w | G2/w | C3/w | C3/w | D3/w | G2/w | C3/w |',
    },
    {
      id: 'cucaracha', title: 'La cucaracha', composer: 'Tradicional mexicana',
      level: 2, category: 'Popular', bpm: 120, time: [4, 4], key: -1, pickup: 1.5,
      tip: 'Está en Fa mayor: la armadura indica que todos los Si son Si♭.',
      rh: 'C4/e C4/e C4/e | F4 A4 r/e C4/e C4/e C4/e | F4 A4/h r/q | F4 F4/e E4/e E4/e D4/e D4/e C4/e | r/h r/e C4/e C4/e C4/e | E4 G4 r/e C4/e C4/e C4/e | E4 G4/h r/q | C5/e D5/e C5/e Bb4/e A4/e G4/e F4 | F4/h r/h |',
      lh: 'r/q. | F2/h C3/h | F2/h C3/h | C3/h G2/h | C3/h r/h | C3/h G2/h | C3/h G2/h | C3/h F2/h | F2/h r/h |',
    },
    {
      id: 'greensleeves', title: 'Greensleeves', composer: 'Tradicional inglesa (s. XVI)',
      level: 3, category: 'Popular', bpm: 96, time: [6, 8], key: 0, pickup: 0.5,
      tip: 'Melodía en La menor con Fa♯ y Sol♯: fíjate en las alteraciones accidentales.',
      rh: 'A4/e | C5 D5/e E5/e. F5/s E5/e | D5 B4/e G4/e. A4/s B4/e | C5 A4/e A4/e. G#4/s A4/e | B4 G#4/e E4 A4/e | C5 D5/e E5/e. F5/s E5/e | D5 B4/e G4/e. A4/s B4/e | C5/e. B4/s A4/e G#4/e. F#4/s G#4/e | A4/h. | G5/q. G5/e. F#5/s E5/e | D5 B4/e G4/e. A4/s B4/e | C5 A4/e A4/e. G#4/s A4/e | B4 G#4/e E4/q. | G5/q. G5/e. F#5/s E5/e | D5 B4/e G4/e. A4/s B4/e | C5/e. B4/s A4/e G#4/e. F#4/s G#4/e | A4/h. |',
      lh: 'r/e | A2/h. | G2/h. | A2/h. | E2/h. | A2/h. | G2/h. | A2/q. E2/q. | A2/h. | C3/h. | G2/h. | A2/h. | E2/h. | C3/h. | G2/h. | A2/q. E2/q. | A2/h. |',
    },
    {
      id: 'oh-susanna', title: 'Oh! Susanna', composer: 'Stephen Foster',
      level: 2, category: 'Popular', bpm: 100, time: [4, 4], key: 0, pickup: 1,
      rh: 'C4/e D4/e | E4 G4 G4/q. A4/e | G4 E4 C4/q. D4/e | E4 E4 D4 C4 | D4/h. C4/e D4/e | E4 G4 G4/q. A4/e | G4 E4 C4/q. D4/e | E4 E4 D4 D4 | C4/h. r/q |',
      lh: 'r/q | C3/w | C3/h G2/h | C3/w | G2/w | C3/w | C3/h G2/h | C3/h G2/h | C3/h. r/q |',
    },
    {
      id: 'saints', title: 'When the Saints Go Marching In', composer: 'Tradicional (gospel)',
      level: 2, category: 'Popular', bpm: 112, time: [4, 4], key: 0, pickup: 3,
      tip: 'Empieza con una anacrusa de tres tiempos. Cuenta «1» en silencio y entra en el 2.',
      rh: 'C4 E4 F4 | G4/w | r/q C4 E4 F4 | G4/w | r/q C4 E4 F4 | G4/h E4/h | C4/h E4/h | D4/w | r/q E4 E4 D4 | C4/h. C4 | E4/h G4 G4 | F4/w | r/q E4 F4 G4 | E4/h C4/h | D4/w | C4/w |',
      lh: 'r/h. | C3/w | C3/w | C3/w | C3/w | C3/w | C3/w | G2/w | G2/w | C3/w | C3/w | F2/w | F2/w | C3/h G2/h | G2/w | C3/w |',
    },
    {
      id: 'yankee-doodle', title: 'Yankee Doodle', composer: 'Tradicional (EE. UU.)',
      level: 2, category: 'Popular', bpm: 110, time: [4, 4], key: 0,
      rh: 'C4/e C4/e D4/e E4/e C4/e E4/e D4/e G3/e | C4/e C4/e D4/e E4/e C4 B3 | C4/e C4/e D4/e E4/e F4/e E4/e D4/e C4/e | B3/e G3/e A3/e B3/e C4 C4 | A4/e B4/e A4/e G4/e A4/e B4/e C5 | G4/e A4/e G4/e F4/e E4 G4 | A4/e B4/e A4/e G4/e A4/e B4/e C5/e A4/e | G4/e C5/e B4/e D5/e C5 C5 |',
      lh: 'C3/h G2/h | C3/h G2/h | C3/w | G2/h C3/h | F2/h C3/h | G2/h C3/h | F2/h F2/h | G2/h C3/h |',
    },
    {
      id: 'auld-lang-syne', title: 'Auld Lang Syne (Canción de la despedida)', composer: 'Tradicional escocesa',
      level: 2, category: 'Popular', bpm: 84, time: [4, 4], key: 0, pickup: 1,
      rh: 'G3 | C4/q. C4/e C4 E4 | D4/q. C4/e D4 E4/e D4/e | C4/q. C4/e E4 G4 | A4/h. A4 | G4/q. E4/e E4 C4 | D4/q. C4/e D4 E4/e D4/e | C4/q. A3/e A3 G3 | C4/h. r/q |',
      lh: 'r/q | C3/w | G2/w | C3/w | F2/w | C3/w | G2/w | F2/h G2/h | C3/h. r/q |',
    },
    {
      id: 'amazing-grace', title: 'Amazing Grace', composer: 'Tradicional (EE. UU.)',
      level: 2, category: 'Popular', bpm: 80, time: [3, 4], key: 0, pickup: 1,
      rh: 'G3 | C4/h E4/e C4/e | E4/h D4 | C4/h A3 | G3/h G3 | C4/h E4/e C4/e | E4/h D4 | G4/h. | G4/h E4 | G4/h E4/e G4/e | E4/h C4 | G3/h A3 | C4/h A3 | G3/h G3 | C4/h E4/e C4/e | E4/h D4 | C4/h. |',
      lh: 'r/q | C3/h. | C3/h. | F2/h. | C3/h. | C3/h. | C3/h. | G2/h. | G2/h. | C3/h. | C3/h. | C3/h. | F2/h. | C3/h. | C3/h. | G2/h. | C3/h. |',
    },

    // ───────────── Navidad ─────────────
    {
      id: 'noche-de-paz', title: 'Noche de paz', composer: 'Franz Xaver Gruber',
      level: 2, category: 'Navidad', bpm: 80, time: [6, 8], key: 0,
      rh: 'G4/q. A4/e G4 | E4/h. | G4/q. A4/e G4 | E4/h. | D5/h D5 | B4/h. | C5/h C5 | G4/h. | A4/h A4 | C5/q. B4/e A4 | G4/q. A4/e G4 | E4/h. | A4/h A4 | C5/q. B4/e A4 | G4/q. A4/e G4 | E4/h. | D5/h D5 | F5/q. D5/e B4 | C5/h. | E5/h. | C5/q. G4/e E4 | G4/q. F4/e D4 | C4/h. |',
      lh: rep('C3/h. |', 4) + ' ' + rep('G2/h. |', 2) + ' ' + rep('C3/h. |', 2) + ' ' + rep('F2/h. |', 2) + ' ' + rep('C3/h. |', 2) + ' ' + rep('F2/h. |', 2) + ' ' + rep('C3/h. |', 2) + ' ' + rep('G2/h. |', 2) + ' ' + rep('C3/h. |', 3) + ' G2/h. | C3/h. |',
    },
    {
      id: 'we-wish', title: 'We Wish You a Merry Christmas', composer: 'Tradicional inglesa',
      level: 2, category: 'Navidad', bpm: 112, time: [3, 4], key: 0, pickup: 1,
      rh: 'G4 | C5 C5/e D5/e C5/e B4/e | A4 A4 A4 | D5 D5/e E5/e D5/e C5/e | B4 G4 G4 | E5 E5/e F5/e E5/e D5/e | C5 A4 G4/e G4/e | A4 D5 B4 | C5/h. |',
      lh: 'r/q | C3/h. | F2/h. | D3/h. | G2/h. | E3/h. | F2/h. | G2/h. | C3/h. |',
    },
    {
      id: 'deck-the-halls', title: 'Deck the Halls', composer: 'Tradicional galesa',
      level: 2, category: 'Navidad', bpm: 112, time: [4, 4], key: 0,
      rh: 'G4/q. F4/e E4 D4 | C4 D4 E4 C4 | D4/e E4/e F4/e D4/e E4/q. D4/e | C4 B3 C4/h | G4/q. F4/e E4 D4 | C4 D4 E4 C4 | D4/e E4/e F4/e D4/e E4/q. D4/e | C4 B3 C4/h | D4/q. E4/e F4 D4 | E4/q. F4/e G4 D4 | E4/e F#4/e G4 A4/e B4/e C5 | B4 A4 G4/h | G4/q. F4/e E4 D4 | C4 D4 E4 C4 | A4/e A4/e A4/e A4/e G4/q. F4/e | E4 D4 C4/h |',
      lh: 'C3/w | C3/w | G2/h C3/h | C3 G2 C3/h | C3/w | C3/w | G2/h C3/h | C3 G2 C3/h | G2/w | C3/h G2/h | C3/h D3/h | G2/w | C3/w | C3/w | F2/h C3/h | G2/h C3/h |',
    },
    {
      id: 'adeste', title: 'Adeste Fideles (Venid, fieles todos)', composer: 'John Francis Wade',
      level: 2, category: 'Navidad', bpm: 92, time: [4, 4], key: 1, pickup: 1,
      rh: 'G4 | G4/h D4 G4 | A4/h D4/h | B4 A4 B4 C5 | B4/h A4 G4 | G4/h F#4 E4 | F#4 G4 A4 B4 | F#4/h E4/q. D4/e | D4/h. r/q |',
      lh: 'r/q | G2/w | D3/w | G2/h C3/h | G2/h D3/h | E3/h C3/h | D3/w | D3/h A2/h | D3/h. r/q |',
    },
    {
      id: 'hark-herald', title: 'Hark! The Herald Angels Sing', composer: 'Felix Mendelssohn',
      level: 2, category: 'Navidad', bpm: 100, time: [4, 4], key: 0,
      rh: 'G4 C5 C5/q. B4/e | C5 E5 E5 D5 | G5 G5 G5/q. F5/e | E5 D5 E5/h | G4 C5 C5/q. B4/e | C5 E5 E5 D5 | G5 D5 D5/q. B4/e | B4 A4 G4/h |',
      lh: 'C3/w | C3/h G2/h | C3/w | G2/h C3/h | C3/w | C3/h G2/h | G2/h D3/h | D3/h G2/h |',
    },

    // ───────────── Clásica ─────────────
    {
      id: 'beethoven-5', title: 'Sinfonía n.º 5 (inicio)', composer: 'Ludwig van Beethoven',
      level: 2, category: 'Clásica', bpm: 108, time: [2, 4], key: -3,
      tip: 'El motivo más famoso de la historia: tres corcheas y una nota larga. Las dos manos tocan lo mismo a una octava de distancia.',
      rh: 'r/e G4/e G4/e G4/e | Eb4/h | r/e F4/e F4/e F4/e | D4/h | D4/h | r/e G4/e G4/e G4/e | Eb4/h | r/e F4/e F4/e F4/e | D4/h | r/e G4/e G4/e G4/e | C4/h |',
      lh: 'r/e G3/e G3/e G3/e | Eb3/h | r/e F3/e F3/e F3/e | D3/h | D3/h | r/e G3/e G3/e G3/e | Eb3/h | r/e F3/e F3/e F3/e | D3/h | r/e G3/e G3/e G3/e | C3/h |',
    },
    {
      id: 'claro-de-luna', title: 'Sonata «Claro de luna» (inicio)', composer: 'Ludwig van Beethoven',
      level: 3, category: 'Clásica', bpm: 66, time: [12, 8], key: 4,
      tip: 'Tresillos tranquilos y uniformes en la mano derecha sobre octavas largas en la izquierda. Toca con suavidad.',
      rh: 'G#3/e C#4/e E4/e G#3/e C#4/e E4/e G#3/e C#4/e E4/e G#3/e C#4/e E4/e | G#3/e C#4/e E4/e G#3/e C#4/e E4/e G#3/e C#4/e E4/e G#3/e C#4/e E4/e | A3/e C#4/e E4/e A3/e C#4/e E4/e A3/e D4/e F#4/e A3/e D4/e F#4/e | G#3/e B#3/e F#4/e G#3/e C#4/e E4/e G#3/e C#4/e D#4/e F#3/e B#3/e D#4/e | G#3.C#4.E4/w. |',
      lh: 'C#2.C#3/w. | B1.B2/w. | A1.A2/h. F#1.F#2/h. | G#1.G#2/h. G#1.G#2/h. | C#2.C#3/w. |',
    },
    {
      id: 'marcha-turca', title: 'Marcha turca (tema)', composer: 'Wolfgang Amadeus Mozart',
      level: 4, category: 'Clásica', bpm: 104, time: [2, 4], key: 0, pickup: 1,
      tip: 'Las semicorcheas deben sonar ligeras y regulares. Practica primero a la mitad de tempo.',
      rh: 'B4/s A4/s G#4/s A4/s | C5/e r/e D5/s C5/s B4/s C5/s | E5/e r/e F5/s E5/s D#5/s E5/s | B5/s A5/s G#5/s A5/s B5/s A5/s G#5/s A5/s | C6 A5/e C6/e | B5/e A5/e G#5/e B5/e | A5 r/q |',
      lh: 'r/q | A3/e C4.E4/e A3/e C4.E4/e | A3/e C4.E4/e A3/e C4.E4/e | A3/e C4.E4/e A3/e C4.E4/e | A3/e C4.E4/e A3/e C4.E4/e | E3/e B3.D4/e E3/e B3.D4/e | A3 r/q |',
    },
    {
      id: 'sonata-facil', title: 'Sonata facile K. 545 (inicio)', composer: 'Wolfgang Amadeus Mozart',
      level: 3, category: 'Clásica', bpm: 96, time: [4, 4], key: 0,
      tip: 'La mano izquierda toca un «bajo de Alberti»: acorde desplegado abajo-arriba-medio-arriba.',
      rh: 'C5/h E5 G5 | B4/q. C5/s D5/s C5/h | A5/h G5 C6 | G5 F5/e E5/s F5/s E5/h | C5/w |',
      lh: 'C4/e G4/e E4/e G4/e C4/e G4/e E4/e G4/e | D4/e G4/e F4/e G4/e C4/e G4/e E4/e G4/e | C4/e A4/e F4/e A4/e C4/e G4/e E4/e G4/e | B3/e G4/e D4/e G4/e C4/e G4/e E4/e G4/e | C3.C4/w |',
    },
    {
      id: 'pequena-serenata', title: 'Pequeña serenata nocturna (inicio)', composer: 'Wolfgang Amadeus Mozart',
      level: 3, category: 'Clásica', bpm: 120, time: [4, 4], key: 1,
      tip: 'Eine kleine Nachtmusik. Las dos manos tocan la misma melodía a distancia de octava.',
      rh: 'G4 r/e D4/e G4 r/e D4/e | G4/e D4/e G4/e B4/e D5 r/q | C5 r/e A4/e C5 r/e A4/e | C5/e A4/e F#4/e A4/e D4 r/q | G4/w |',
      lh: 'G3 r/e D3/e G3 r/e D3/e | G3/e D3/e G3/e B3/e D4 r/q | C4 r/e A3/e C4 r/e A3/e | C4/e A3/e F#3/e A3/e D3 r/q | G2.G3/w |',
    },
    {
      id: 'sinfonia-40', title: 'Sinfonía n.º 40 (inicio)', composer: 'Wolfgang Amadeus Mozart',
      level: 3, category: 'Clásica', bpm: 104, time: [4, 4], key: -2, pickup: 1,
      rh: 'Eb5/e D5/e | D5 Eb5/e D5/e D5 Eb5/e D5/e | D5 Bb5/h Bb5/e A5/e | G5 G5/e F5/e Eb5 Eb5/e D5/e | C5 C5 r/q D5/e C5/e | C5 D5/e C5/e C5 D5/e C5/e | C5 A5/h A5/e G5/e | F#5 F#5/e E5/e D5 D5/e C5/e | Bb4 Bb4/h r/q |',
      lh: 'r/q | G2/w | G2/w | C3/h G2/h | D3/w | D3/w | D3/w | D3/h D3/h | G2/h. r/q |',
    },
    {
      id: 'rey-montana', title: 'En la gruta del rey de la montaña', composer: 'Edvard Grieg',
      level: 2, category: 'Clásica', bpm: 104, time: [4, 4], key: 2,
      tip: 'De «Peer Gynt». Toca muy ligero (staccato) y, cuando te salga, acelera como en la obra original.',
      rh: 'B3/e C#4/e D4/e E4/e F#4/e D4/e F#4 | F4/e C#4/e F4 E4/e C4/e E4 | B3/e C#4/e D4/e E4/e F#4/e D4/e F#4/e B4/e | A4/e F#4/e D4/e F#4/e A4/h | B3/e C#4/e D4/e E4/e F#4/e D4/e F#4 | F4/e C#4/e F4 E4/e C4/e E4 | B3/e C#4/e D4/e E4/e F#4/e D4/e F#4/e B4/e | A4/e F#4/e D4/e F#4/e B3/h |',
      lh: 'B2/h F#2/h | C#3/h C3/h | B2/h F#2/h | D3/h F#2/h | B2/h F#2/h | C#3/h C3/h | B2/h F#2/h | F#2/h B2/h |',
    },
    {
      id: 'la-manana', title: 'La mañana (Peer Gynt)', composer: 'Edvard Grieg',
      level: 2, category: 'Clásica', bpm: 84, time: [6, 8], key: 0,
      rh: 'G4/e E4/e D4/e C4/e D4/e E4/e | G4/e E4/e D4/e C4/e D4/e E4/e | D4/e E4/e G4/e E4/e G4/e A4/e | E4/e A4/e G4/e E4/e D4/e C4/e | C4/h. |',
      lh: 'C3.G3/h. | C3.G3/h. | C3.G3/h. | F2.C3/q. G2.D3/q. | C3.G3/h. |',
    },
    {
      id: 'nuevo-mundo', title: 'Sinfonía del Nuevo Mundo (Largo)', composer: 'Antonín Dvořák',
      level: 1, category: 'Clásica', bpm: 60, time: [4, 4], key: 0,
      tip: 'Melodía lenta y cantabile (conocida como «Goin\' Home»). Deja que cada nota respire.',
      rh: 'E4/q. G4/e G4/h | E4/q. D4/e C4/h | D4/q. E4/e G4/q. E4/e | D4/w | E4/q. G4/e G4/h | E4/q. D4/e C4/h | D4/q. E4/e D4/q. C4/e | C4/w |',
      lh: 'C3.G3/w | C3.G3/w | G2.D3/w | G2.D3/w | C3.G3/w | A2.E3/w | G2.D3/w | C3.G3/w |',
    },
    {
      id: 'can-can', title: 'Can-can (Orfeo en los infiernos)', composer: 'Jacques Offenbach',
      level: 3, category: 'Clásica', bpm: 120, time: [2, 4], key: 0,
      rh: 'C4 D4/e F4/e | E4/e D4/e G4 | G4 G4/e A4/e | E4/e F4/e D4 | D4 D4/e F4/e | E4/e D4/e C4/e C5/e | B4/e A4/e G4/e F4/e | E4/e D4/e C4 | C4 D4/e F4/e | E4/e D4/e G4 | G4 G4/e A4/e | E4/e F4/e D4 | D4 D4/e F4/e | E4/e D4/e C4/e C5/e | B4/e A4/e G4/e F4/e | E4/e D4/e C4 |',
      lh: rep('C3 G2 | C3 G2 | C3 G2 | G2 G2 | G2 G2 | C3 C3 | G2 G2 | C3 C3 |', 2),
    },
    {
      id: 'the-entertainer', title: 'The Entertainer', composer: 'Scott Joplin',
      level: 4, category: 'Clásica', bpm: 80, time: [2, 4], key: 0, pickup: 0.5,
      tip: 'Ragtime: la melodía va «a contratiempo» (síncopa) mientras la mano izquierda marca el pulso.',
      rh: 'D4/s D#4/s | E4/s C5/e E4/s C5/e E4/s C5/s | C5 r/s C5/s D5/s D#5/s | E5/s C5/s D5/s E5/e B4/s D5/e | C5/q. D4/s D#4/s | E4/s C5/e E4/s C5/e E4/s C5/s | C5 r/e A4/s G4/s | F#4/s A4/s C5/s E5/e D5/s C5/s A4/s | D5/q. D4/s D#4/s | E4/s C5/e E4/s C5/e E4/s C5/s | C5 r/s C5/s D5/s D#5/s | E5/s C5/s D5/s E5/e B4/s D5/e | C5/q. r/e |',
      lh: 'r/e | C3 G2 | C3 G2 | G2 G2 | C3/q. r/e | C3 G2 | C3 A2 | D3 D3 | G2/q. r/e | C3 G2 | C3 G2 | G2 G2 | C3/q. r/e |',
    },
    {
      id: 'gymnopedie', title: 'Gymnopédie n.º 1', composer: 'Erik Satie',
      level: 2, category: 'Clásica', bpm: 72, time: [3, 4], key: 2,
      tip: 'Lent et douloureux (lento y doloroso). La mano izquierda alterna un bajo y un acorde; la derecha canta por encima.',
      rh: 'r/h. | r/h. | r/h. | r/h. | r/q F#5 A5 | G5 F#5 C#5 | B4 C#5 D5 | A4/h. | F#4/h. | F#4/h. | r/q F#5 A5 | G5 F#5 C#5 | B4 C#5 D5 | A4/h. | C#5/h. | F#5/h. |',
      lh: rep('G2 B3.D4.F#4/h | D2 A3.C#4.F#4/h |', 8),
    },
    {
      id: 'primavera', title: 'La primavera (Las cuatro estaciones)', composer: 'Antonio Vivaldi',
      level: 3, category: 'Clásica', bpm: 96, time: [4, 4], key: 4, pickup: 0.5,
      rh: 'E4/e | G#4/e G#4/e G#4/e F#4/s E4/s B4/q. B4/s A4/s | G#4/e G#4/e G#4/e F#4/s E4/s B4/q. B4/s A4/s | G#4/e A4/s B4/s A4/e G#4/e F#4/h | G#4/e G#4/e G#4/e F#4/s E4/s B4/q. B4/s A4/s | G#4/e G#4/e G#4/e F#4/s E4/s B4/q. B4/s A4/s | G#4/e A4/s B4/s A4/e G#4/e F#4 E4 |',
      lh: 'r/e | E3/h B2/h | E3/h B2/h | E3/h B2/h | E3/h B2/h | E3/h B2/h | B2/h E3/h |',
    },
    {
      id: 'tocata-fuga', title: 'Tocata y fuga en Re menor (inicio)', composer: 'Johann Sebastian Bach',
      level: 3, category: 'Clásica', bpm: 60, time: [4, 4], key: -1,
      tip: 'El inicio más dramático del órgano. Deja sonar las notas largas.',
      rh: 'A5/s G5/s A5/h. r/e | G5/s F5/s E5/s D5/s C#5 D5/h | A4/s G4/s A4/h. r/e | E4/s F4/s C#4/s D4/h. r/s | r/w | r/w | D4.F4.A4/w |',
      lh: 'r/w | r/w | r/w | r/w | A2/s G2/s A2/h. r/e | E2/s F2/s C#2/s D2/h. r/s | D2.D3/w |',
    },
    {
      id: 'marcha-funebre', title: 'Marcha fúnebre', composer: 'Frédéric Chopin',
      level: 2, category: 'Clásica', bpm: 56, time: [4, 4], key: -5,
      rh: 'Bb3 Bb3/q. Bb3/e Bb3 | Db4/q. C4/e C4/q. Bb3/e | Bb3/q. A3/e Bb3/h | Bb3 Bb3/q. Bb3/e Bb3 | Db4/q. C4/e C4/q. Bb3/e | Bb3/q. A3/e Bb3/h |',
      lh: rep('Bb1.F2/h Bb1.Gb2/h |', 6),
    }
  );
})(typeof window !== 'undefined' ? window : globalThis);
