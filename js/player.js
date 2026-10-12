// Motor de práctica: modos Esperar / Tiempo real / Escuchar, bucle, manos, tempo, metrónomo y puntuación.
(function (root) {
  const PC = (root.PC = root.PC || {});
  const { buildSteps, EPS } = PC.music;

  class Player {
    constructor(hooks) {
      this.hooks = hooks; // { onNoteState(note, state), onWrong(midi), onFinish(stats), onLoop(stats), onState() }
      this.settings = { mode: 'wait', hands: { R: true, L: true }, tempo: 1, loop: null, metronome: false, accompany: true };
      this.song = null;
      this.pos = 0;
      this.playing = false;
      this.countIn = 0;
      this.statuses = new Map();
      this.held = new Set();
    }

    load(song) {
      this.song = song;
      this.pause();
      this.rebuild();
      this.seek(0);
    }

    get range() {
      const s = this.song;
      const loop = this.settings.loop;
      if (loop) return [s.measures[loop[0]].start, s.measures[loop[1]].start + s.measures[loop[1]].len];
      return [0, s.total];
    }

    get beatsPerSecond() {
      return (this.song.bpm * this.settings.tempo) / 60;
    }

    set(patch) {
      const prevMode = this.settings.mode;
      Object.assign(this.settings, patch);
      if ('hands' in patch || 'loop' in patch || ('mode' in patch && patch.mode !== prevMode)) {
        this._clearTarget();
        this.rebuild();
        const [a, b] = this.range;
        this.seek(this.pos >= a && this.pos < b && !('loop' in patch) ? this.pos : a);
      }
      this.hooks.onState && this.hooks.onState();
    }

    rebuild() {
      this.steps = buildSteps(this.song.notes, this.settings.hands);
    }

    resetStats() {
      this.stats = { hits: 0, misses: 0, wrong: 0, total: 0 };
    }

    // Coloca la posición, borra los estados de las notas desde ahí y recalcula punteros.
    seek(beat) {
      const [a, b] = this.range;
      beat = Math.max(a, Math.min(beat, b - EPS));
      // Arranca al principio del compás para que sea natural retomar
      const m = this.song.measures[this.song.measureAt(beat)];
      beat = Math.max(a, m.start);
      PC.audio.allOff();
      this._clearTarget();
      this.pos = beat;
      this.lastPos = beat;
      for (const n of this.song.notes) {
        if (n.start >= beat - EPS && this.statuses.has(n.id)) {
          this.statuses.delete(n.id);
          this.hooks.onNoteState(n, null);
        }
      }
      this.resetStats();
      this.stepIdx = this.steps.findIndex((s) => s.start >= beat - EPS);
      if (this.stepIdx < 0) this.stepIdx = this.steps.length;
      this._initStep();
      this.autoIdx = this.song.notes.findIndex((n) => n.start >= beat - EPS);
      if (this.autoIdx < 0) this.autoIdx = this.song.notes.length;
      this.countIn = 0;
      this.hooks.onState && this.hooks.onState();
    }

    _clearTarget() {
      const step = this.steps && this.steps[this.stepIdx];
      if (step) step.notes.forEach((n) => !this.statuses.has(n.id) && this.hooks.onNoteState(n, null));
    }

    _initStep() {
      const step = this.steps[this.stepIdx];
      this.remaining = step ? new Set(step.notes.map((n) => n.midi)) : new Set();
      if (step && this.settings.mode === 'wait') step.notes.forEach((n) => this.hooks.onNoteState(n, 'target'));
    }

    play() {
      if (!this.song) return;
      PC.audio.ensure();
      const [a, b] = this.range;
      if (this.pos >= b - EPS) this.seek(a);
      this.playing = true;
      // En tiempo real damos un compás de entrada con el metrónomo
      if (this.settings.mode === 'realtime') this.countIn = this.song.time[0] < 3 ? this.song.time[0] * 2 : this.song.time[0];
      this.countInUnit = 4 / this.song.time[1];
      this.countInClock = 0;
      this.countInClicks = 0;
      this.hooks.onState && this.hooks.onState();
    }

    pause() {
      this.playing = false;
      this.countIn = 0;
      PC.audio.allOff();
      this.hooks.onState && this.hooks.onState();
    }

    toggle() {
      this.playing ? this.pause() : this.play();
    }

    restart() {
      this.seek(this.range[0]);
      for (const n of this.song.notes) {
        if (this.statuses.has(n.id)) this.hooks.onNoteState(n, null);
      }
      this.statuses.clear();
      this._initStep();
    }

    get waiting() {
      const step = this.steps[this.stepIdx];
      return this.settings.mode === 'wait' && this.playing && step && this.pos >= step.start - EPS && this.remaining.size > 0;
    }

    tick(dt) {
      if (!this.song || !this.playing) return;
      dt = Math.min(dt, 0.1);
      const bps = this.beatsPerSecond;

      if (this.countIn > 0) {
        this.countInClock += dt * bps;
        while (this.countInClicks < this.countIn && this.countInClicks * this.countInUnit <= this.countInClock + EPS) {
          PC.audio.click(this.countInClicks === 0);
          this.countInClicks++;
        }
        if (this.countInClock >= this.countIn * this.countInUnit - EPS) this.countIn = 0;
        return;
      }

      const mode = this.settings.mode;
      let next = this.pos + dt * bps;
      if (mode === 'wait') {
        const step = this.steps[this.stepIdx];
        if (step && this.remaining.size > 0 && next >= step.start) next = step.start;
      }
      this._advance(next);
    }

    _advance(next) {
      const prev = this.pos;
      const [, end] = this.range;
      const mode = this.settings.mode;
      this.pos = Math.min(next, end);

      // Metrónomo
      if (this.settings.metronome) {
        const unit = 4 / this.song.time[1];
        const origin = this.song.pickup || 0;
        const k0 = Math.floor((prev - origin) / unit + EPS);
        const k1 = Math.floor((this.pos - origin) / unit + EPS);
        if (k1 > k0) {
          const per = this.song.time[0];
          PC.audio.click(((k1 % per) + per) % per === 0);
        }
      }

      // Notas que suenan solas: todas en "Escuchar"; la mano no practicada como acompañamiento.
      const notes = this.song.notes;
      while (this.autoIdx < notes.length) {
        const n = notes[this.autoIdx];
        const reached = mode === 'wait' ? n.start < this.pos - EPS || (n.start <= this.pos + EPS && !this.waitingAt(n.start)) : n.start <= this.pos + EPS;
        if (!reached || n.start >= end - EPS) break;
        const practiced = this.settings.hands[n.hand];
        if (mode === 'listen' || (!practiced && this.settings.accompany)) {
          PC.audio.noteOn(n.midi, 0.7, n.dur / this.beatsPerSecond);
        }
        this.autoIdx++;
      }

      // Tiempo real: notas que se han pasado sin tocar = fallo
      if (mode === 'realtime') {
        const tol = this._tolerance();
        while (this.stepIdx < this.steps.length && this.steps[this.stepIdx].start < this.pos - tol) {
          for (const n of this.steps[this.stepIdx].notes) {
            if (!this.statuses.has(n.id)) this._mark(n, 'miss');
          }
          this.stepIdx++;
        }
      } else if (mode === 'listen') {
        while (this.stepIdx < this.steps.length && this.steps[this.stepIdx].start <= this.pos + EPS) this.stepIdx++;
      }

      if (this.pos >= end - EPS) this._reachEnd();
    }

    waitingAt(start) {
      const step = this.steps[this.stepIdx];
      return step && Math.abs(step.start - start) < EPS && this.remaining.size > 0;
    }

    _tolerance() {
      return Math.max(0.2, 0.18 * this.beatsPerSecond); // ~180 ms, al menos una semicorchea larga
    }

    _mark(n, state) {
      this.statuses.set(n.id, state);
      this.hooks.onNoteState(n, state);
      if (state === 'hit') this.stats.hits++;
      if (state === 'miss') this.stats.misses++;
    }

    _reachEnd() {
      const mode = this.settings.mode;
      // Lo que quede pendiente cuenta como fallo
      if (mode === 'realtime') {
        for (; this.stepIdx < this.steps.length && this.steps[this.stepIdx].start < this.range[1] - EPS; this.stepIdx++) {
          for (const n of this.steps[this.stepIdx].notes) if (!this.statuses.has(n.id)) this._mark(n, 'miss');
        }
      }
      const stats = this.summary();
      if (this.settings.loop) {
        this.hooks.onLoop && this.hooks.onLoop(stats);
        const [a] = this.range;
        for (const n of this.song.notes) if (this.statuses.has(n.id)) this.hooks.onNoteState(n, null);
        this.statuses.clear();
        this.seek(a);
      } else {
        this.playing = false;
        this.hooks.onFinish && this.hooks.onFinish(stats);
        this.hooks.onState && this.hooks.onState();
      }
    }

    summary() {
      const s = this.stats;
      const [a, b] = this.range;
      const total = this.steps.filter((st) => st.start >= a - EPS && st.start < b - EPS).reduce((acc, st) => acc + st.notes.length, 0);
      const denom = Math.max(1, s.hits + s.misses + s.wrong);
      const accuracy = this.settings.mode === 'listen' ? null : Math.round((100 * s.hits) / Math.max(denom, total));
      return { ...s, total, accuracy, mode: this.settings.mode, complete: !this.settings.loop };
    }

    // ── Entrada del alumno ──
    // lenient: las notas inesperadas no cuentan como error (el micrófono puede oír armónicos o ruido)
    noteOn(midi, { lenient = false } = {}) {
      this.held.add(midi);
      if (!this.song || !this.playing || this.countIn > 0) return 'neutral';
      const mode = this.settings.mode;
      if (mode === 'listen') return 'neutral';

      if (mode === 'wait') {
        const step = this.steps[this.stepIdx];
        if (step && this.remaining.has(midi) && step.start - this.pos < 2.01) {
          this.remaining.delete(midi);
          step.notes.filter((n) => n.midi === midi).forEach((n) => this._mark(n, 'hit'));
          if (this.remaining.size === 0) {
            this.stepIdx++;
            this._initStep();
          }
          return 'ok';
        }
        // Tolerancia: tocar de nuevo una nota del paso anterior no es un error
        const prevStep = this.steps[this.stepIdx - 1];
        if (prevStep && prevStep.notes.some((n) => n.midi === midi) && this.pos - prevStep.start < 0.5) return 'neutral';
        if (lenient) return 'neutral';
        this.stats.wrong++;
        this.hooks.onWrong && this.hooks.onWrong(midi);
        return 'wrong';
      }

      // Tiempo real
      const tol = this._tolerance();
      let best = null;
      for (let i = this.stepIdx; i < this.steps.length; i++) {
        const st = this.steps[i];
        if (st.start > this.pos + tol) break;
        for (const n of st.notes) {
          if (n.midi === midi && !this.statuses.has(n.id) && Math.abs(st.start - this.pos) <= tol) {
            if (!best || Math.abs(st.start - this.pos) < Math.abs(best.start - this.pos)) best = n;
          }
        }
      }
      if (best) {
        this._mark(best, 'hit');
        return 'ok';
      }
      if (lenient) return 'neutral';
      this.stats.wrong++;
      this.hooks.onWrong && this.hooks.onWrong(midi);
      return 'wrong';
    }

    noteOff(midi) {
      this.held.delete(midi);
    }

    // Teclas a resaltar en el teclado: lo que hay que tocar ahora (Esperar) o lo que suena (otros modos).
    expectedKeys() {
      const map = new Map();
      if (!this.song) return map;
      const mode = this.settings.mode;
      if (mode === 'wait') {
        const step = this.steps[this.stepIdx];
        if (step && step.start - this.pos < 1.5) step.notes.forEach((n) => this.remaining.has(n.midi) && map.set(n.midi, n.hand));
      }
      for (const n of this.song.notes) {
        if (n.start > this.pos + EPS) break;
        if (n.start + n.dur > this.pos + EPS && (mode !== 'wait' || !this.settings.hands[n.hand] || this.statuses.get(n.id) === 'hit')) {
          if (!map.has(n.midi)) map.set(n.midi, n.hand);
        }
      }
      return map;
    }
  }

  PC.Player = Player;
})(window);
