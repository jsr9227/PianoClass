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

  // ── Micrófono: detección monofónica por autocorrelación ──
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let current = null;
      let candidate = null;
      let count = 0;
      let silent = 0;
      let prevRms = 0;
      let running = true;
      const loop = () => {
        if (!running) return;
        analyser.getFloatTimeDomainData(buf);
        const { freq, rms } = detectPitch(buf, ctx.sampleRate);
        const onset = rms > 0.02 && rms > prevRms * 1.8;
        prevRms = rms;
        if (freq > 0) {
          silent = 0;
          const midi = Math.round(PC.music.freqToMidi(freq));
          if (midi === candidate) count++;
          else {
            candidate = midi;
            count = 1;
          }
          if (count >= 3 && (midi !== current || (onset && count === 3))) {
            if (current != null) input.noteOff(current, 'mic');
            current = midi;
            input.noteOn(midi, 0.8, 'mic');
          }
        } else if (++silent > 4 && current != null) {
          input.noteOff(current, 'mic');
          current = null;
          candidate = null;
        }
        requestAnimationFrame(loop);
      };
      loop();
      mic = {
        stop() {
          running = false;
          if (current != null) input.noteOff(current, 'mic');
          stream.getTracks().forEach((t) => t.stop());
        },
      };
      setStatus({ mic: 'on' });
    } catch (e) {
      setStatus({ mic: 'denied' });
    }
  };

  function detectPitch(buf, sampleRate) {
    const n = buf.length;
    let rms = 0;
    for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < 0.01) return { freq: -1, rms };
    // Recorta los extremos por debajo del umbral para estabilizar la correlación.
    let r1 = 0;
    let r2 = n - 1;
    const thr = 0.2;
    for (let i = 0; i < n / 2; i++) if (Math.abs(buf[i]) < thr) { r1 = i; break; }
    for (let i = 1; i < n / 2; i++) if (Math.abs(buf[n - i]) < thr) { r2 = n - i; break; }
    const x = buf.slice(r1, r2);
    const len = x.length;
    const c = new Float32Array(len);
    for (let lag = 0; lag < len; lag++) {
      let s = 0;
      for (let i = 0; i < len - lag; i++) s += x[i] * x[i + lag];
      c[lag] = s;
    }
    let d = 0;
    while (d < len - 1 && c[d] > c[d + 1]) d++;
    let maxVal = -1;
    let maxPos = -1;
    for (let i = d; i < len; i++) if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    if (maxPos <= 0 || maxVal < c[0] * 0.5) return { freq: -1, rms };
    const a = c[maxPos - 1] || 0;
    const b = c[maxPos];
    const cc = c[maxPos + 1] || 0;
    const shift = (a - cc) / (2 * (a - 2 * b + cc) || 1);
    const freq = sampleRate / (maxPos + shift);
    return { freq: freq > 25 && freq < 4200 ? freq : -1, rms };
  }
  input.detectPitch = detectPitch;

  PC.input = input;
})(window);
