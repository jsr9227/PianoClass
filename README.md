# PianoClass 🎹

Aplicación web para aprender piano con partituras interactivas, inspirada en el método de aprendizaje de apps como flowkey. Funciona en el navegador, sin instalar nada y sin dependencias.

## Cómo usarla

- **Abrir:** haz doble clic en `index.html`, o sírvela con `npm start` (o cualquier servidor estático, por ejemplo GitHub Pages).
- **Tocar:** con un **teclado MIDI / piano digital** (USB o Bluetooth, en Chrome, Edge u Opera), con el **micrófono** para pianos acústicos (una nota a la vez), con el **ratón o la pantalla táctil**, o con el **teclado del ordenador**:
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
| **Progreso** | Precisión y estrellas (1–3) por pieza, guardadas en el navegador. |

## Partituras incorporadas

Todas son de dominio público, en arreglos simplificados:

- **Curso de primeros pasos** (6 lecciones): el Do central, cinco dedos con la mano derecha, la mano izquierda, la escala de Do mayor, acordes I–IV–V y las dos manos juntas.
- **Popular:** Estrellita ¿dónde estás?, Martinillo, Jingle Bells, Cumpleaños feliz.
- **Clásica:** Himno de la alegría (Beethoven), Canon (Pachelbel), Para Elisa (Beethoven), Minueto en Sol (Petzold/Bach), Preludio en Do BWV 846 (Bach).

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

Comprueba que todas las partituras se analizan sin errores y que la duración de cada compás coincide con el compás de la pieza.

## Estructura

```
index.html        Interfaz (biblioteca, práctica, resultados, ayuda)
css/styles.css    Estilos (con modo oscuro y diseño adaptable a móvil)
js/music.js       Formato de partitura, alturas y nombres de notas
js/songs.js       Biblioteca de partituras
js/sheet.js       Dibujo de la partitura en SVG
js/keyboard.js    Teclado en pantalla y cascada de notas
js/player.js      Motor de práctica (modos, bucle, manos, tempo, puntuación)
js/audio.js       Sintetizador de piano con Web Audio
js/input.js       Entrada MIDI, teclado del ordenador y micrófono
js/app.js         Lógica de la interfaz y progreso
```

*PianoClass es un proyecto independiente, sin relación con flowkey.*
