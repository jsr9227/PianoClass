// Entradas: teclado MIDI (Web MIDI), teclado del ordenador y micrófono (detección de tono).
(function (root) {
  const PC = (root.PC = root.PC || {});
  const listeners = { on: [], off: [], status: [] };
  const emit = (type, ...args) => listeners[type].forEach((fn) => fn(...args));

  const input = {
    on(type, fn) {
      listeners[type].push(fn);
    },
    noteOn(midi, velocity = 0.8, source = 'ui') {
      emit('on', midi, velocity, source);
    },
    noteOff(midi, source = 'ui') {
      emit('off', midi, source);
    },
    status: { midi: 'off', midiNames: [], mic: 'off' },
  };
  const setStatus = (patch) => {
    Object.assign(input.status, patch);
    emit('status', input.status);
  };

  // ── Web MIDI ──
  input.initMidi = async function () {
    if (!navigator.requestMIDIAccess) {
      setStatus({ midi: 'unsupported' });
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      const bind = () => {
        const names = [];
        access.inputs.forEach((port) => {
          names.push(port.name);
          port.onmidimessage = (e) => {
            const [st, note, vel] = e.data;
            const cmd = st & 0xf0;
            if (cmd === 0x90 && vel > 0) input.noteOn(note, vel / 127, 'midi');
            else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) input.noteOff(note, 'midi');
          };
        });
        setStatus({ midi: names.length ? 'connected' : 'none', midiNames: names });
      };
      access.onstatechange = bind;
      bind();
    } catch (e) {
      setStatus({ midi: 'denied' });
    }
  };

  // ── Teclado del ordenador (distribución tipo "tracker", dos filas) ──
  // Fila inferior Z..M = Do3..Si3, fila superior Q..] = Do4..Sol5. Las teclas negras en la fila de arriba.
  const KEYMAP = {
    KeyZ: 48, KeyS: 49, KeyX: 50, KeyD: 51, KeyC: 52, KeyV: 53, KeyG: 54, KeyB: 55, KeyH: 56, KeyN: 57, KeyJ: 58, KeyM: 59, Comma: 60,
    KeyQ: 60, Digit2: 61, KeyW: 62, Digit3: 63, KeyE: 64, KeyR: 65, Digit5: 66, KeyT: 67, Digit6: 68, KeyY: 69, Digit7: 70, KeyU: 71,
    KeyI: 72, Digit9: 73, KeyO: 74, Digit0: 75, KeyP: 76, BracketLeft: 77, Equal: 78, BracketRight: 79,
  };
  input.KEYMAP = KEYMAP;
  input.octaveShift = 0;
  const held = new Map();
  input.initKeyboard = function () {
    root.addEventListener('keydown', (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName)) return;
      if (!(e.code in KEYMAP) || held.has(e.code)) return;
      const midi = KEYMAP[e.code] + 12 * input.octaveShift;
      held.set(e.code, midi);
      input.noteOn(midi, 0.75, 'keyboard');
      e.preventDefault();
    });
    root.addEventListener('keyup', (e) => {
      if (!held.has(e.code)) return;
      input.noteOff(held.get(e.code), 'keyboard');
      held.delete(e.code);
    });
    root.addEventListener('blur', () => {
      held.forEach((m) => input.noteOff(m, 'keyboard'));
      held.clear();
    });
  };

  // ── Micrófono: detección polifónica (acordes) por análisis del espectro ──
  // input.micHints() puede devolver las notas que la partitura espera; se detectan con más facilidad.
  input.micHints = () => new Set();
  let mic = null;
  input.toggleMic = async function () {
    if (mic) {
      mic.stop();
      mic = null;
      setStatus({ mic: 'off' });
      return;
    }
    try {
      const ctx = PC.audio.context;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 8192; // resolución suficiente para separar semitonos graves
      analyser.smoothingTimeConstant = 0;
      src.connect(analyser);
      const db = new Float32Array(analyser.frequencyBinCount);
      const mags = new Float32Array(analyser.frequencyBinCount);
      const time = new Float32Array(2048);
      const seen = new Map(); // midi -> fotogramas seguidos detectada
      const missing = new Map(); // midi -> fotogramas seguidos sin detectar
      const active = new Set();
      let prevRms = 0;
      let running = true;

      const loop = () => {
        if (!running) return;
        analyser.getFloatTimeDomainData(time);
        let rms = 0;
        for (let i = 0; i < time.length; i++) rms += time[i] * time[i];
        rms = Math.sqrt(rms / time.length);
        const onset = rms > 0.015 && rms > prevRms * 1.5;
        prevRms = prevRms * 0.6 + rms * 0.4;

        let detected = [];
        if (rms > 0.006) {
          analyser.getFloatFrequencyData(db);
          for (let i = 0; i < db.length; i++) mags[i] = Math.pow(10, db[i] / 20);
          detected = PC.pitch.detectNotes(mags, ctx.sampleRate, analyser.fftSize, { hints: input.micHints() }).map((n) => n.midi);
        }
        const now = new Set(detected);
        for (const m of now) {
          seen.set(m, (seen.get(m) || 0) + 1);
          missing.delete(m);
          if (!active.has(m) && seen.get(m) >= 3) {
            active.add(m);
            input.noteOn(m, Math.min(1, rms * 8), 'mic');
          } else if (active.has(m) && onset) {
            // Ataque nuevo sobre una nota que ya sonaba: tecla pulsada otra vez
            input.noteOff(m, 'mic');
            input.noteOn(m, Math.min(1, rms * 8), 'mic');
          }
        }
        for (const m of [...seen.keys()]) {
          if (now.has(m)) continue;
          seen.delete(m);
          missing.set(m, 0);
        }
        for (const [m, n] of missing) {
          if (now.has(m)) continue;
          if (n + 1 >= 4) {
            missing.delete(m);
            if (active.delete(m)) input.noteOff(m, 'mic');
          } else missing.set(m, n + 1);
        }
        setTimeout(loop, 30);
      };
      loop();
      mic = {
        stop() {
          running = false;
          active.forEach((m) => input.noteOff(m, 'mic'));
          stream.getTracks().forEach((t) => t.stop());
        },
      };
      setStatus({ mic: 'on' });
    } catch (e) {
      setStatus({ mic: 'denied' });
    }
  };

  PC.input = input;
})(window);
