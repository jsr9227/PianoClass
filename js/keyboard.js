// Teclado de piano en pantalla y vista de "cascada" de notas que caen hacia las teclas.
(function (root) {
  const PC = (root.PC = root.PC || {});
  const { isBlack, solfege } = PC.music;

  class Keyboard {
    constructor(el) {
      this.el = el;
      this.keys = new Map();
      this.pointerNotes = new Map();
      this.showLabels = true;
      el.addEventListener('pointerdown', (e) => this._down(e));
      el.addEventListener('pointerover', (e) => e.buttons && this._down(e));
      ['pointerup', 'pointercancel', 'pointerout'].forEach((t) => el.addEventListener(t, (e) => this._up(e)));
    }

    setRange(lo, hi) {
      while (isBlack(lo)) lo--;
      while (isBlack(hi)) hi++;
      this.lo = lo;
      this.hi = hi;
      this.el.innerHTML = '';
      this.keys.clear();
      const whites = [];
      for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
      this.whiteCount = whites.length;
      const w = 100 / whites.length;
      let wi = 0;
      for (let m = lo; m <= hi; m++) {
        const k = document.createElement('div');
        k.dataset.midi = m;
        const black = isBlack(m);
        k.className = 'key ' + (black ? 'black' : 'white') + (m % 12 === 0 ? ' is-c' : '') + (m === 60 ? ' middle-c' : '');
        let left;
        let width;
        if (black) {
          width = w * 0.62;
          left = wi * w - width / 2;
        } else {
          width = w;
          left = wi * w;
          wi++;
        }
        k.style.left = left + '%';
        k.style.width = width + '%';
        if (!black) {
          const label = document.createElement('span');
          label.className = 'key-label';
          label.textContent = solfege(m) + (m % 12 === 0 ? Math.floor(m / 12) - 1 : '');
          k.appendChild(label);
        }
        this.keys.set(m, { el: k, left, width, black });
        this.el.appendChild(k);
      }
      this.setLabels(this.showLabels);
    }

    keyGeometry(midi) {
      return this.keys.get(midi);
    }

    setLabels(on) {
      this.showLabels = on;
      this.el.classList.toggle('no-labels', !on);
    }

    // expected: Map midi -> 'R' | 'L' (teclas que hay que pulsar / que suenan)
    setExpected(expected) {
      this.keys.forEach((k, m) => {
        const h = expected.get(m);
        k.el.classList.toggle('exp-R', h === 'R');
        k.el.classList.toggle('exp-L', h === 'L');
      });
    }

    press(midi, state) {
      const k = this.keys.get(midi);
      if (!k) return;
      k.el.classList.remove('ok', 'wrong', 'pressed');
      k.el.classList.add('pressed');
      if (state) k.el.classList.add(state);
    }

    release(midi) {
      const k = this.keys.get(midi);
      if (k) k.el.classList.remove('ok', 'wrong', 'pressed');
    }

    _down(e) {
      const k = e.target.closest('.key');
      if (!k) return;
      e.preventDefault();
      // En pantallas táctiles el puntero queda capturado por la tecla; lo liberamos para poder deslizar (glissando).
      if (k.hasPointerCapture && k.hasPointerCapture(e.pointerId)) k.releasePointerCapture(e.pointerId);
      const midi = Number(k.dataset.midi);
      const prev = this.pointerNotes.get(e.pointerId);
      if (prev === midi) return;
      if (prev != null) PC.input.noteOff(prev, 'pointer');
      this.pointerNotes.set(e.pointerId, midi);
      PC.input.noteOn(midi, 0.8, 'pointer');
    }

    _up(e) {
      if (e.type === 'pointerout' && e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.key') && e.buttons) return;
      const prev = this.pointerNotes.get(e.pointerId);
      if (prev == null) return;
      this.pointerNotes.delete(e.pointerId);
      PC.input.noteOff(prev, 'pointer');
    }
  }

  class Waterfall {
    constructor(canvas, keyboard) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.keyboard = keyboard;
      this.lookahead = 4; // pulsos visibles
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = root.devicePixelRatio || 1;
      this.canvas.width = Math.max(1, Math.round(r.width * dpr));
      this.canvas.height = Math.max(1, Math.round(r.height * dpr));
      this.w = r.width;
      this.h = r.height;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    draw(song, pos, hands, statuses, colors) {
      const { ctx, w, h } = this;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      if (!song) return;
      const kb = this.keyboard;
      // Líneas guía en cada Do y Fa
      ctx.fillStyle = colors.grid;
      kb.keys.forEach((k, m) => {
        if (m % 12 === 0 || m % 12 === 5) ctx.fillRect((k.left / 100) * w, 0, 1, h);
      });
      // Líneas de compás
      ctx.fillStyle = colors.grid;
      for (const m of song.measures) {
        const y = h - ((m.start - pos) / this.lookahead) * h;
        if (y >= 0 && y <= h) ctx.fillRect(0, y, w, 1);
      }
      const pxPerBeat = h / this.lookahead;
      for (const n of song.notes) {
        if (n.start > pos + this.lookahead) break;
        if (n.start + n.dur < pos - 0.05) continue;
        const k = kb.keys.get(n.midi);
        if (!k) continue;
        const x = (k.left / 100) * w + 1.5;
        const bw = (k.width / 100) * w - 3;
        const yBottom = h - (n.start - pos) * pxPerBeat;
        const bh = Math.max(6, n.dur * pxPerBeat - 3);
        const active = hands[n.hand];
        const st = statuses.get(n.id);
        let fill = n.hand === 'R' ? colors.R : colors.L;
        if (st === 'hit') fill = colors.hit;
        else if (st === 'miss') fill = colors.miss;
        ctx.globalAlpha = active ? 1 : 0.28;
        ctx.fillStyle = fill;
        roundRect(ctx, x, yBottom - bh, bw, bh, Math.min(5, bw / 3));
        ctx.fill();
        if (k.black) {
          ctx.globalAlpha = active ? 0.25 : 0.08;
          ctx.fillStyle = '#000';
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  PC.Keyboard = Keyboard;
  PC.Waterfall = Waterfall;
})(window);
