# Sistema de aprendizaje de PianoClass

Este documento describe el motor pedagógico: qué hace, por qué, qué partes se apoyan en investigación y qué partes son **hipótesis de diseño** que conviene evaluar con datos reales.

## 1. Punto de partida (auditoría)

Antes de este cambio, PianoClass era una web estática (JavaScript sin dependencias ni compilación, datos en `localStorage`) con:

- **Reutilizado:**
  - el formato de partitura y su compilador (`js/music.js`);
  - la partitura en SVG (`js/sheet.js`);
  - el teclado y la cascada (`js/keyboard.js`);
  - el motor de práctica (`js/player.js`): modos Esperar, Tiempo real y Escuchar, bucle, tempo, metrónomo, manos y acompañamiento;
  - el sintetizador (`js/audio.js`);
  - la entrada MIDI, micrófono y teclado (`js/input.js`), que ya identificaba el origen de cada nota;
  - las 50 partituras y el curso de 6 lecciones.
- **Lo que faltaba:**
  - un modelo de habilidades;
  - datos temporales por nota: solo se contaban aciertos y fallos;
  - adaptación, sesiones, oído, armonía y retirada de ayudas.

No se ha creado un motor MIDI nuevo ni un sistema paralelo. El `Player` existente ahora **registra** cada nota (momento, paso, compás, origen y suelta de la tecla) sin cambiar su forma de puntuar. Los ejercicios generados usan el mismo formato de partitura, así que se tocan con la misma pantalla de práctica.

## 2. Arquitectura

```
js/learning/theory.js      Tonalidades, grados, progresiones, inversiones, conducción de voces, escalas
js/learning/metrics.js     Eventos del Player → métricas por dimensión → diagnóstico explicable
js/learning/exercises.js   Generadores: técnica, ritmo, lectura, progresiones, preguntas de oído
js/learning/curriculum.js  Catálogo de 48 habilidades y 4 itinerarios (6 módulos cada uno)
js/learning/engine.js      Dominio, reglas de progresión, repetición espaciada, sesiones, migración
js/learning-ui.js          Pantallas (Hoy, Mi ruta, Armonía, Progreso, oído, feedback)
```

Los cinco módulos de `js/learning/` son **funciones puras sin DOM** y se prueban en Node (`npm test`). La interfaz solo muestra lo que decide el motor y registra los resultados.

### Modelo de datos (`localStorage`, clave `pianoclass.learning.v1`)

```js
{
  version: 1,
  profile: { pathId, minutes },               // itinerario y duración de sesión elegidos
  skills: {                                   // estado independiente por habilidad
    [skillId]: {
      attempts, passes, consecPasses, consecFails,
      rung,                                   // peldaño en la escalera de etapas (tocar)
      earLevel, improvAid,                    // nivel de oído / ayudas en improvisación
      passDays: ['2026-10-12', …],            // días con intento superado en el nivel objetivo
      consolidated, consolidatedAt, reinforce,
      srs: { reps, ease, interval, due, lapses },
      history: [{ t, pass, dims, rung, review }],   // últimos 30 intentos con todas las dimensiones
      lastIssues, weakMeasures, segmentIdx,
    },
  },
  sessions: [{ date, plannedMinutes, practicedMinutes, items: [{ skillId, pass, dims }] }],
  log: [{ t, skillId, pass, dims, review, first, fresh, source }],   // para los indicadores
  migrations: ['legacy-progress-v1'],
}
```

**Migración segura:** al arrancar, `engine.migrate()` importa las estrellas antiguas de `pianoclass.progress.v1` (lecciones del curso → habilidades de técnica; canciones → habilidades de repertorio) como un intento previo. **No modifica ni borra** la clave antigua, que la biblioteca sigue usando, y no se repite (queda anotada en `migrations`).

Las habilidades son globales: **cambiar de itinerario no pierde progreso**. Los repasos pendientes de habilidades de otro itinerario siguen apareciendo en las sesiones.

## 3. Principios pedagógicos

### 3.1 Con respaldo en investigación

Se describen de forma cualitativa. No se dan porcentajes de mejora, porque dependen de la tarea, el nivel y el diseño de cada estudio.

| Principio | Qué dice la investigación | Cómo se usa |
|---|---|---|
| **Práctica espaciada** | El efecto de espaciado (desde Ebbinghaus) es uno de los resultados más replicados de la psicología del aprendizaje: repartir la práctica en el tiempo mejora la retención frente a concentrarla. | Una habilidad solo se consolida si se supera **en días distintos**. Después se programan repasos con intervalos crecientes. |
| **Recuperación activa** (*testing effect*) | Recuperar algo de memoria refuerza su retención más que volver a estudiarlo (p. ej. Roediger y Karpicke, 2006). Es muy sólida en memoria declarativa; en habilidades motoras y musicales hay menos estudios. | Las ayudas visuales se retiran por niveles hasta tocar de memoria; el bloque «Memoria» pide tocar lo consolidado con la mínima ayuda. |
| **Retirada de ayudas** | En aprendizaje motor, la «hipótesis de la guía» (Salmoni, Schmidt y Walter, 1984) indica que una guía constante puede crear dependencia y empeorar la ejecución sin ella. | Cuatro niveles de ayuda (sección 4) que se van retirando al superar etapas. |
| **Práctica intercalada / interferencia contextual** | Mezclar tareas suele empeorar el rendimiento durante la práctica pero mejorar la retención (Shea y Morgan, 1979). Los resultados son **mixtos** según la complejidad de la tarea y el nivel del alumno. | Las sesiones alternan bloques y, dentro de cada bloque, habilidades (A B C A B C). Con material complejo para principiantes es razonable revisar esta decisión con datos. |
| **Práctica deliberada** | Marco de Ericsson, Krampe y Tesch-Römer (1993): práctica dirigida a debilidades concretas, con feedback. Se debate cuánto explica del nivel final; aquí se usa como guía de diseño, no como garantía. | El diagnóstico localiza el problema (compás, dimensión) y propone un bucle lento sobre el punto débil. |
| **Feedback específico** | El feedback informativo sobre el error ayuda a corregirlo. | Tras cada ejercicio: qué fue bien, qué mejorar con el dato que lo justifica, y la decisión tomada. |

### 3.2 Hipótesis de diseño (a validar)

Todas son configurables en `PC.engine.config` y `PC.metrics.config`. **No** se presentan como óptimas:

- **Umbrales de superación:**
  - 90 % de notas correctas;
  - ritmo ≥ 0,6, que equivale a unos 100 ms de error medio;
  - fluidez ≥ 0,6;
  - sincronía de manos y simultaneidad de acordes ≥ 0,5;
  - oído ≥ 80 %;
  - improvisación: ≥ 8 notas y ≥ 80 % dentro de la escala.
- **Umbrales del diagnóstico:** 90 ms de ritmo, 70 ms entre manos, 70 ms en acordes, 1,2 s de pausa…
- **Escalera de etapas:** el orden es modo Esperar lento → tempo objetivo → tiempo real → menos ayudas. Se sube con un intento superado y se baja tras **2 fallos seguidos**.
- **Consolidación:** superada en **2 días distintos** en el nivel objetivo y con los 2 últimos intentos superados.
- **Repetición espaciada** (variante simple de SM-2):
  - primer repaso a 1 día;
  - después, intervalo × facilidad (2,2 al empezar; sube 0,1 si el repaso es casi perfecto);
  - un repaso fallido vuelve a 1 día, baja la facilidad 0,2 y marca la habilidad «Necesita refuerzo»;
  - máximo 60 días.
- **Reparto de la sesión de 30 min:**
  - Piano moderno: técnica 5, acordes 10, oído 5, canciones 5, memoria e improvisación 5 (la propuesta original).
  - Los demás itinerarios usan variaciones propias (p. ej. clásico: más técnica/lectura y repertorio).
  - Hasta un 30 % del tiempo se mueve hacia bloques con repasos pendientes o habilidades en refuerzo.
- **Rondas:** como máximo 4 rondas de un mismo ejercicio por sesión.
- **Variedad mínima:** si lo desbloqueado cubre menos de 3 tipos de práctica, se adelanta una habilidad del siguiente módulo.
- **Desbloqueo de módulos:** el siguiente se abre al superar **una vez** cada habilidad del actual. Los anteriores se siguen practicando hasta consolidarse.
- **Programa de 12 semanas:** 6 módulos de 2 semanas por itinerario. Es una **guía**: el avance real lo marca el dominio.
- **Improvisación:** se evalúa de forma descriptiva (notas en la escala, notas del acorde en tiempos fuertes). No mide la calidad musical.

## 4. Reglas explicables

Cada decisión que toma el motor se muestra al alumno con su motivo:

- **Superar un intento** sube un peldaño. Ejemplo: «Siguiente paso: tiempo real al 100 % · partitura sin indicación de teclas».
- **Un fallo** mantiene las condiciones: «Repite el ejercicio en las mismas condiciones».
- **Dos fallos seguidos** bajan un peldaño y la habilidad pasa a **Necesita refuerzo**.
- **Criterios no cumplidos** se citan con su dato, p. ej. «Precisión rítmica: 30 % (se pide 60 %)». El dominio **no** es un porcentaje global: con el 100 % de notas y el ritmo impreciso, el intento no se supera.
- **Consolidación** y fecha del primer repaso. Si se supera el mismo día, se explica que hace falta otro día.
- **Repasos:** si se supera, se anuncia el nuevo intervalo; si no, la habilidad se marca para reforzar.
- **Oído:** sube de nivel (más opciones) tras dos aciertos seguidos y baja tras dos fallos.

**Estados de una habilidad:**

| Estado | Cuándo |
|---|---|
| No iniciada | Sin intentos todavía. |
| En aprendizaje | Hay intentos, pero aún no está consolidada. |
| Necesita refuerzo | 2 fallos seguidos, o un repaso fallido. |
| Consolidada | Superada en el nivel objetivo en días distintos. |
| Pendiente de repaso | Consolidada y ha llegado la fecha de repaso. |

**Niveles de ayuda** (recuperación activa):

1. Partitura y teclas iluminadas, con la cascada de notas.
2. Partitura sin teclas iluminadas ni nombres de notas. Los mensajes de error ya no revelan la nota correcta.
3. Guía parcial: cifrado de acordes, primera nota de cada compás y el ritmo (plicas), sin el resto de alturas.
4. De memoria: solo pentagrama, compases y cursor.

## 5. Medición con MIDI y limitaciones

`js/learning/metrics.js` calcula, a partir de los eventos del `Player`:

| Dimensión | Cómo se mide | Cuándo |
|---|---|---|
| Notas | Correctas, equivocadas y omitidas. | Siempre. |
| Ritmo | Desfase entre ataque y tiempo escrito: media absoluta, sesgo (adelantarse/retrasarse) y deriva. | Solo en tiempo real: en modo Esperar la música se adapta al alumno. |
| Tempo | Variación de los intervalos reales entre ataques frente a los escritos. | Tiempo real. |
| Simultaneidad de acordes | Diferencia entre la primera y la última nota de un acorde. | Ambos modos. |
| Sincronía de manos | Diferencia entre los ataques de cada mano en notas simultáneas. | Ambos modos. |
| Fluidez / transiciones | Tiempo que la música queda parada esperando cada nota, con los compases donde más se detiene. | Modo Esperar. |
| Duración | Tiempo que se mantiene la tecla frente a la figura. | Tiempo real. |

El ataque se estima entre fotogramas a partir del reloj de alta resolución, no solo del fotograma (unos 16 ms).

**Fiabilidad según la entrada:**

- **Piano MIDI:** exacta, con la resolución de los eventos del navegador.
- **Teclado del ordenador:** exacta en notas; en tiempo, sujeta a la repetición y latencia del teclado.
- **Pantalla táctil:** aproximada (latencia táctil).
- **Micrófono:** **estimación**. Se cuentan las notas detectadas, pero **no** se evalúan ritmo, tempo, simultaneidad ni duración, y se avisa en el feedback. Con un piano MIDI conectado, el micrófono se desactiva.

## 6. Cómo evaluar si funciona

La pestaña Progreso muestra indicadores calculados con `engine.evaluationMetrics()`:

- **Retención:** proporción de repasos superados tras el intervalo. Es la medida más directa del efecto del espaciado.
- **Transferencia:** precisión en material nuevo, como la lectura a primera vista (melodías distintas cada vez) y la transposición a otras tonalidades.
- **Primer intento:** precisión la primera vez que se ve un ejercicio.
- **Progresión:** habilidades consolidadas y días medios hasta consolidar.

Como todos los parámetros están en `config`, se pueden comparar variantes (intervalos, umbrales, intercalado frente a práctica por bloques) con estos mismos indicadores antes de dar ninguna por buena.

## 7. Limitaciones conocidas y siguientes pasos

- Las partituras de los ejercicios son arreglos simplificados propios. No se incluyen canciones comerciales con derechos.
- La detección por micrófono es monofónica o polifónica limitada, y sensible al ruido.
- La improvisación no evalúa fraseo ni estilo, solo indicadores descriptivos.
- Los datos viven en el navegador: no hay sincronización entre dispositivos ni copia de seguridad.
- Pendiente: calibrar los umbrales con datos reales de alumnos, añadir más tonalidades a las escalas y ampliar el repertorio del itinerario moderno con arreglos libres de derechos.
