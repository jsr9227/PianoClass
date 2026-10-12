# PianoClass 🎹

Aplicación web para aprender piano con partituras interactivas, inspirada en el método de aprendizaje de apps como flowkey. Funciona en el navegador, sin instalar nada y sin dependencias.

## Cómo usarla

- **Abrir:** haz doble clic en `index.html`, o sírvela con `npm start` (o cualquier servidor estático, por ejemplo GitHub Pages).
- **Tocar:** con un **teclado MIDI / piano digital** (USB o Bluetooth, en Chrome, Edge u Opera), con el **micrófono** para pianos acústicos (reconoce notas y acordes), con el **ratón o la pantalla táctil**, o con el **teclado del ordenador**:
  - `Q W E R T Y U I O P` → Do4 … Mi5 (teclas negras: `2 3 5 6 7 9 0`)
  - `Z X C V B N M` → Do3 … Si3 (teclas negras: `S D G H J`)
  - `Espacio` reproducir/pausa · `Inicio` volver al principio · `←` `→` compás anterior/siguiente

## Funciones

| Función | Descripción |
|---|---|
| **Partitura que se desplaza** | Sistema de piano (claves de Sol y Fa) con cursor; las notas se colorean en verde (bien) o rojo (fallo). Haz clic en un compás para saltar a él. |
| **Modo Esperar** | La música se detiene en cada nota hasta que la tocas. Tocar la nota resaltada inicia la canción. |
| **Modo Tiempo real** | La canción avanza sin parar tras un compás de entrada y puntúa tu precisión. |
| **Modo Escuchar** | La aplicación toca la pieza mientras ves las teclas iluminadas. |
| **Manos separadas** | Practica la mano izquierda, la derecha o ambas. La otra mano puede sonar como acompañamiento. |
| **Tempo** | Del 25 % al 125 % de la velocidad original. |
| **Bucle** | Repite un rango de compases hasta dominarlo. |
| **Cascada de notas y teclado** | Las notas caen hacia las teclas que hay que pulsar (verde = mano derecha, azul = mano izquierda). |
| **Ayudas** | Nombres de notas (Do Re Mi) en la partitura y en el teclado, digitación, metrónomo y consejos por pieza. |
| **Reconocimiento de acordes** | El micrófono detecta varias notas a la vez (análisis del espectro con resta de armónicos) y la app muestra el nombre del acorde que tocas: Do mayor, La menor, Sol7, Re m7, inversiones… |
| **Importar MIDI** | Convierte cualquier archivo `.mid` en una partitura interactiva (pistas → manos, compás, tonalidad y tempo). Se guarda en «Mis partituras». |
| **Progreso** | Precisión y estrellas (1–3) por pieza, guardadas en el navegador. |

## Partituras incorporadas (50)

Todas son de dominio público, en arreglos simplificados:

- **Curso de primeros pasos** (6 lecciones): el Do central, cinco dedos con la mano derecha, la mano izquierda, la escala de Do mayor, acordes I–IV–V y las dos manos juntas.
- **Popular (13):** Korobeiniki (tema de Tetris), Aura Lee (melodía de «Love Me Tender»), La cucaracha, Greensleeves, Oh! Susanna, When the Saints Go Marching In, Yankee Doodle, Auld Lang Syne, Amazing Grace, Estrellita, Martinillo, Jingle Bells, Cumpleaños feliz.
- **Infantil (6):** Hot Cross Buns, María tenía un corderito, Rema rema tu barca, El puente de Londres, En la granja de mi tío, Pop Goes the Weasel.
- **Navidad (5):** Noche de paz, We Wish You a Merry Christmas, Deck the Halls, Adeste Fideles, Hark! The Herald Angels Sing.
- **Clásica (20):** Himno de la alegría, Para Elisa, Sinfonía n.º 5 y Claro de luna (Beethoven); Marcha turca, Sonata facile, Pequeña serenata nocturna y Sinfonía n.º 40 (Mozart); Minueto en Sol, Preludio en Do y Tocata y fuga (Bach); Canon (Pachelbel); En la gruta del rey de la montaña y La mañana (Grieg); Sinfonía del Nuevo Mundo (Dvořák); Can-can (Offenbach); The Entertainer (Joplin); Gymnopédie n.º 1 (Satie); La primavera (Vivaldi); Marcha fúnebre (Chopin).

### ¿Y las canciones actuales?

Las canciones recientes (pop, reguetón, bandas sonoras…) tienen derechos de autor: una transcripción de su melodía es una copia de la obra, y apps como flowkey pagan licencias a las editoriales para ofrecerlas. Por eso no vienen incluidas. Para tocarlas en PianoClass, usa **＋ Importar MIDI** con archivos que tengas derecho a usar: los que compres, los que crees tú, o arreglos con licencia libre (en MuseScore.com muchas partituras se pueden descargar como MIDI). Lo ideal es un MIDI con dos pistas, una para cada mano.

## Añadir tus propias partituras

Las piezas están en `js/songs.js`. Cada mano se escribe como una lista de figuras:

```js
{
  id: 'mi-cancion', title: 'Mi canción', composer: 'Yo',
  level: 1, category: 'Popular', bpm: 90, time: [4, 4], key: 0, // key: nº de sostenidos (+) o bemoles (−)
  pickup: 0,                       // duración de la anacrusa en negras (opcional)
  rh: 'C4 D4 E4/e F4/e G4 | C5/w@5 |',
  lh: 'C3/h G2/h | C3.E3.G3/w |',
}
```

- Nota: letra + alteración opcional (`#`, `b`, `n`) + octava → `C4` es el Do central, `F#4`, `Bb3`.
- Duración tras `/`: `w` redonda, `h` blanca, `q` negra (por defecto), `e` corchea, `s` semicorchea; añade `.` para puntillo (`q.`).
- Silencio: `r/q`. Acorde: notas unidas con `.` → `C4.E4.G4/h`. Digitación tras `@` → `C4@1`, `C4.E4.G4/w@1.3.5`.
- `|` marca el final de cada compás; las pruebas comprueban que todos los compases cuadran.

## Pruebas

```bash
npm test
```

- `tests/songs.test.js`: todas las partituras se analizan sin errores y cada compás dura lo que indica el compás de la pieza.
- `tests/pitch.test.js`: detección de notas y acordes con señales sintéticas de piano (incluye 60 acordes aleatorios) y nombres de acordes.
- `tests/midi.test.js`: importación de archivos MIDI generados en memoria.

**Limitaciones del micrófono:** la detección polifónica funciona bien con sonidos limpios, pero en un piano real influyen el ruido de la sala, la resonancia y la calidad del micrófono. Al practicar se usa la partitura como pista (sabe qué notas esperar), y las notas que el micrófono oiga de más no cuentan como error. Para una detección perfecta, lo mejor sigue siendo un teclado MIDI.

## Estructura

```
index.html        Interfaz (biblioteca, práctica, resultados, ayuda)
css/styles.css    Estilos (con modo oscuro y diseño adaptable a móvil)
js/music.js       Formato de partitura, alturas y nombres de notas
js/songs.js       Biblioteca de partituras (curso y primeras piezas)
js/songs-extra.js Ampliación de la biblioteca
js/pitch.js       Detección polifónica de notas y nombres de acordes
js/midi-import.js Lectura de archivos MIDI y conversión a partitura
js/sheet.js       Dibujo de la partitura en SVG
js/keyboard.js    Teclado en pantalla y cascada de notas
js/player.js      Motor de práctica (modos, bucle, manos, tempo, puntuación)
js/audio.js       Sintetizador de piano con Web Audio
js/input.js       Entrada MIDI, teclado del ordenador y micrófono (acordes)
js/app.js         Lógica de la interfaz y progreso
```

*PianoClass es un proyecto independiente, sin relación con flowkey.*
