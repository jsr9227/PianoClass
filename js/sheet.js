// Renderizador de partitura (sistema de piano: clave de Sol + clave de Fa) en SVG con desplazamiento horizontal.
(function (root) {
  const PC = (root.PC = root.PC || {});
  const { keyAlter, pitchSolfege, EPS } = PC.music;

  const STEP = 5; // medio espacio entre líneas
  const STAFF = {
    R: { bottomStep: 30, bottomY: 100, middleStep: 34, ledgerLow: 28, ledgerHigh: 40, clef: '𝄞', clefY: 92, clefSize: 46 },
    L: { bottomStep: 18, bottomY: 210, middleStep: 22, ledgerLow: 16, ledgerHigh: 28, clef: '𝄢', clefY: 192, clefSize: 34 },
  };
  const HEIGHT = 262;
  const LEFT_PAD = 40;
  const STEM = 32;
  const FINGER_Y = { R: 30, L: 250 };

  const yOf = (hand, step) => STAFF[hand].bottomY - (step - STAFF[hand].bottomStep) * STEP;
  const staffTop = (hand) => STAFF[hand].bottomY - 8 * STEP;

  function headerWidth(song) {
    return 52 + Math.abs(song.key || 0) * 10 + 26;
  }

  class Sheet {
    constructor(viewport) {
      this.viewport = viewport;
      this.noteEls = new Map();
      this.tx = 0;
      viewport.addEventListener('click', (e) => {
        if (!this.song || !this.onSeek) return;
        const r = viewport.getBoundingClientRect();
        const beat = (e.clientX - r.left - this.tx - LEFT_PAD) / this.ppb;
        if (beat >= -0.5 && beat <= this.song.total) this.onSeek(Math.max(0, beat));
      });
    }

    render(song) {
      this.song = song;
      const minDur = Math.min(...song.events.map((e) => e.dur));
      this.ppb = Math.max(70, 34 / minDur);
      this.cursorX = headerWidth(song) + 50;
      const X = (b) => LEFT_PAD + b * this.ppb;
      this.X = X;
      const width = X(song.total) + 300;
      const out = [];

      // Líneas del pentagrama
      for (const hand of ['R', 'L']) {
        for (let i = 0; i < 5; i++) {
          const y = STAFF[hand].bottomY - i * 2 * STEP;
          out.push(`<line class="staff-line" x1="0" x2="${width}" y1="${y}" y2="${y}"/>`);
        }
      }
      out.push(`<rect id="loop-rect" class="loop-rect" x="0" y="${staffTop('R') - 22}" width="0" height="${STAFF.L.bottomY - staffTop('R') + 44}" visibility="hidden"/>`);

      // Barras de compás y números
      const barOffset = Math.min(18, this.ppb * minDur * 0.55);
      song.measures.forEach((m, i) => {
        const x = i === 0 ? X(0) - barOffset - 6 : X(m.start) - barOffset;
        if (i > 0) out.push(`<line class="bar" x1="${x}" x2="${x}" y1="${staffTop('R')}" y2="${STAFF.L.bottomY}"/>`);
        out.push(`<text class="measure-num" x="${x + 3}" y="${staffTop('R') - 8}">${i + 1}</text>`);
      });
      const endX = X(song.total) - barOffset + 10;
      out.push(`<line class="bar" x1="${endX}" x2="${endX}" y1="${staffTop('R')}" y2="${STAFF.L.bottomY}"/>`);
      out.push(`<rect class="bar-final" x="${endX + 4}" y="${staffTop('R')}" width="4" height="${STAFF.L.bottomY - staffTop('R')}"/>`);

      // Figuras
      const accState = { R: {}, L: {} };
      let curMeasure = -1;
      const events = song.events.slice().sort((a, b) => a.start - b.start);
      for (const ev of events) {
        if (ev.measure !== curMeasure) {
          curMeasure = ev.measure;
          accState.R = {};
          accState.L = {};
        }
        if (ev.rest) out.push(this._rest(ev, X(ev.start)));
        else this._layoutChord(ev, X(ev.start), accState[ev.hand], song.key || 0);
      }
      // Agrupar corcheas/semicorcheas bajo barras y dibujar plicas
      for (const hand of ['R', 'L']) {
        const evs = events.filter((e) => e.hand === hand);
        for (const group of this._beamGroups(evs, song)) out.push(this._drawGroup(group, X));
      }
      for (const ev of events) if (!ev.rest) out.push(this._noteheads(ev, X(ev.start)));

      this.viewport.innerHTML = `
        <svg class="sheet-svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}">${out.join('')}</svg>
        <svg class="sheet-header" width="${headerWidth(song)}" height="${HEIGHT}">${this._header(song)}</svg>
        <div class="sheet-cursor" style="left:${this.cursorX}px"></div>`;
      this.svg = this.viewport.querySelector('.sheet-svg');
      this.loopRect = this.svg.querySelector('#loop-rect');
      this.noteEls.clear();
      this.svg.querySelectorAll('[data-n]').forEach((g) => this.noteEls.set(g.dataset.n, g));
      this.setPosition(0);
    }

    _header(song) {
      const out = [`<rect class="header-bg" x="0" y="0" width="${headerWidth(song)}" height="${HEIGHT}"/>`];
      const w = headerWidth(song);
      for (const hand of ['R', 'L']) {
        const s = STAFF[hand];
        for (let i = 0; i < 5; i++) {
          const y = s.bottomY - i * 2 * STEP;
          out.push(`<line class="staff-line" x1="8" x2="${w}" y1="${y}" y2="${y}"/>`);
        }
        out.push(`<text class="clef" x="14" y="${s.clefY}" font-size="${s.clefSize}">${s.clef}</text>`);
        // Armadura
        const fifths = song.key || 0;
        // Posiciones (en pasos) de las alteraciones de la armadura para cada clave
        const sharpSteps = hand === 'R' ? [38, 35, 39, 36, 33, 37, 34] : [24, 21, 25, 22, 19, 23, 20];
        const flatSteps = hand === 'R' ? [34, 37, 33, 36, 32, 35, 31] : [20, 23, 19, 22, 18, 21, 17];
        for (let i = 0; i < Math.abs(fifths); i++) {
          const step = (fifths > 0 ? sharpSteps : flatSteps)[i];
          out.push(`<text class="acc" x="${52 + i * 10}" y="${yOf(hand, step) + 4}">${fifths > 0 ? '♯' : '♭'}</text>`);
        }
        const tx = 52 + Math.abs(fifths) * 10 + 6;
        out.push(`<text class="timesig" x="${tx}" y="${staffTop(hand) + 19}">${song.time[0]}</text>`);
        out.push(`<text class="timesig" x="${tx}" y="${staffTop(hand) + 39}">${song.time[1]}</text>`);
      }
      out.push(`<line class="bar" x1="8" x2="8" y1="${staffTop('R')}" y2="${STAFF.L.bottomY}"/>`);
      out.push(`<path class="brace" d="M7 ${staffTop('R')} q-9 ${(STAFF.L.bottomY - staffTop('R')) / 4} 0 ${(STAFF.L.bottomY - staffTop('R')) / 2} q-9 ${(STAFF.L.bottomY - staffTop('R')) / 4} 0 ${(STAFF.L.bottomY - staffTop('R')) / 2}" />`);
      return out.join('');
    }

    _layoutChord(ev, x, accState, fifths) {
      const hand = ev.hand;
      const steps = ev.pitches.map((p) => p.step);
      const avg = steps.reduce((a, b) => a + b, 0) / steps.length;
      ev._up = avg < STAFF[hand].middleStep;
      ev._minY = Math.min(...steps.map((s) => yOf(hand, s)));
      ev._maxY = Math.max(...steps.map((s) => yOf(hand, s)));
      ev.pitches.forEach((p) => {
        const current = p.step in accState ? accState[p.step] : keyAlter(fifths, p.letter);
        p._acc = p.alter !== current ? (p.alter > 0 ? '♯' : p.alter < 0 ? '♭' : '♮') : null;
        accState[p.step] = p.alter;
      });
    }

    _beamGroups(evs, song) {
      const unit = song.time[1] === 8 ? 1.5 : 1;
      const groups = [];
      let cur = null;
      for (const ev of evs) {
        if (ev.rest) {
          cur = null;
          continue;
        }
        const beamable = ev.durType === 'e' || ev.durType === 's';
        const m = song.measures[ev.measure];
        const beatIdx = ev.measure * 100 + Math.floor((ev.start - m.start) / unit + EPS);
        if (beamable && cur && cur.beat === beatIdx) cur.events.push(ev);
        else {
          cur = { beat: beamable ? beatIdx : null, events: [ev] };
          groups.push(cur);
          if (!beamable) cur = null;
        }
      }
      return groups;
    }

    _drawGroup(group, X) {
      const evs = group.events;
      const hand = evs[0].hand;
      const out = [];
      if (evs.length === 1) {
        const ev = evs[0];
        if (ev.durType === 'w') return '';
        const x = X(ev.start);
        const sx = ev._up ? x + 5.6 : x - 5.6;
        const y1 = ev._up ? ev._maxY : ev._minY;
        const y2 = ev._up ? ev._minY - STEM : ev._maxY + STEM;
        out.push(`<line class="stem" x1="${sx}" x2="${sx}" y1="${y1}" y2="${y2}"/>`);
        const flags = ev.durType === 'e' ? 1 : ev.durType === 's' ? 2 : 0;
        for (let i = 0; i < flags; i++) {
          const fy = ev._up ? y2 + i * 8 : y2 - i * 8;
          const d = ev._up ? `M${sx} ${fy} c 2 8 12 10 8 22 c 1 -9 -4 -13 -8 -14 z` : `M${sx} ${fy} c 2 -8 12 -10 8 -22 c 1 9 -4 13 -8 14 z`;
          out.push(`<path class="flag" d="${d}"/>`);
        }
        return out.join('');
      }
      const avg = evs.reduce((a, e) => a + e.pitches.reduce((s, p) => s + p.step, 0) / e.pitches.length, 0) / evs.length;
      const up = avg < STAFF[hand].middleStep;
      const sx = (ev) => (up ? X(ev.start) + 5.6 : X(ev.start) - 5.6);
      const ends = evs.map((e) => (up ? e._minY - STEM : e._maxY + STEM));
      const slope = Math.max(-8, Math.min(8, ends[ends.length - 1] - ends[0]));
      // Ajusta la barra para que ninguna plica quede demasiado corta
      const xa = sx(evs[0]);
      const xb = sx(evs[evs.length - 1]);
      const lineAt = (x, base) => base + ((x - xa) / (xb - xa || 1)) * slope;
      const base = up ? Math.min(...evs.map((e, i) => ends[i] - ((sx(e) - xa) / (xb - xa || 1)) * slope)) : Math.max(...evs.map((e, i) => ends[i] - ((sx(e) - xa) / (xb - xa || 1)) * slope));
      evs.forEach((e) => {
        e._up = up;
        const x = sx(e);
        out.push(`<line class="stem" x1="${x}" x2="${x}" y1="${up ? e._maxY : e._minY}" y2="${lineAt(x, base)}"/>`);
      });
      const beam = (xA, xB, off) => {
        const dir = up ? 1 : -1;
        const ya = lineAt(xA, base) + dir * off;
        const yb = lineAt(xB, base) + dir * off;
        const t = 5 * dir;
        return `<path class="beam" d="M${xA} ${ya} L${xB} ${yb} L${xB} ${yb + t} L${xA} ${ya + t} Z"/>`;
      };
      out.push(beam(xa, xb, 0));
      // Barras secundarias de semicorcheas
      for (let i = 0; i < evs.length; i++) {
        if (evs[i].durType !== 's') continue;
        const x = sx(evs[i]);
        const next = evs[i + 1];
        const prev = evs[i - 1];
        if (next && next.durType === 's') out.push(beam(x, sx(next), 8));
        else if (!(prev && prev.durType === 's')) {
          if (next) out.push(beam(x, x + 9, 8));
          else out.push(beam(x - 9, x, 8));
        }
      }
      return out.join('');
    }

    _noteheads(ev, x) {
      const hand = ev.hand;
      const out = [];
      const hollow = ev.durType === 'w' || ev.durType === 'h';
      // Líneas adicionales
      const steps = ev.pitches.map((p) => p.step);
      const lo = Math.min(...steps);
      const hi = Math.max(...steps);
      const s = STAFF[hand];
      for (let st = s.ledgerLow; st >= lo; st -= 2) out.push(`<line class="ledger" x1="${x - 10}" x2="${x + 10}" y1="${yOf(hand, st)}" y2="${yOf(hand, st)}"/>`);
      for (let st = s.ledgerHigh; st <= hi; st += 2) out.push(`<line class="ledger" x1="${x - 10}" x2="${x + 10}" y1="${yOf(hand, st)}" y2="${yOf(hand, st)}"/>`);
      ev.pitches.forEach((p, i) => {
        const y = yOf(hand, p.step);
        const n = ev.notes[i];
        const parts = [];
        parts.push(`<ellipse class="head${hollow ? ' hollow' : ''}" cx="${x}" cy="${y}" rx="6.2" ry="4.4" transform="rotate(-20 ${x} ${y})"/>`);
        if (p._acc) parts.push(`<text class="acc" x="${x - 17}" y="${y + 4.5}">${p._acc}</text>`);
        if (ev.dotted) {
          const onLine = (p.step - s.bottomStep) % 2 === 0;
          parts.push(`<circle class="dot" cx="${x + 11}" cy="${onLine ? y - STEP : y}" r="1.8"/>`);
        }
        if (p.finger) parts.push(`<text class="finger" x="${x}" y="${FINGER_Y[hand] - (hand === 'R' ? i * 11 : -i * 11)}">${p.finger}</text>`);
        parts.push(`<text class="note-name" x="${x + 9}" y="${y + 13}">${pitchSolfege(p)}</text>`);
        out.push(`<g class="note hand-${hand}" data-n="${n.id}">${parts.join('')}</g>`);
      });
      return out.join('');
    }

    _rest(ev, x) {
      const hand = ev.hand;
      const mid = STAFF[hand].bottomY - 4 * STEP;
      const top = staffTop(hand);
      const cls = `class="rest"`;
      switch (ev.durType) {
        case 'w':
          return `<rect ${cls} x="${x - 6}" y="${top + 10}" width="12" height="5"/>`;
        case 'h':
          return `<rect ${cls} x="${x - 6}" y="${mid - 5}" width="12" height="5"/>`;
        case 'q':
          return `<path ${cls} d="M${x - 2} ${mid - 14} l6 7 l-5 6 l6 7 c-5 -2 -9 0 -5 6 c-8 -3 -6 -11 1 -8 l-6 -7 l5 -6 z"/>` + (ev.dotted ? `<circle class="dot" cx="${x + 9}" cy="${mid - 3}" r="1.8"/>` : '');
        default: {
          const flags = ev.durType === 'e' ? 1 : 2;
          let d = '';
          for (let i = 0; i < flags; i++) {
            const y = mid - 6 + i * 9;
            d += `<circle ${cls} cx="${x - 3 - i * 1.5}" cy="${y}" r="2.6"/><path class="rest-stroke" d="M${x - 3 - i * 1.5} ${y + 1} q4 1 6 -3"/>`;
          }
          d += `<line class="rest-stroke" x1="${x + 3}" y1="${mid - 9}" x2="${x - 2}" y2="${mid + 10 + (flags - 1) * 8}"/>`;
          return d + (ev.dotted ? `<circle class="dot" cx="${x + 8}" cy="${mid - 3}" r="1.8"/>` : '');
        }
      }
    }

    setPosition(beat) {
      if (!this.svg) return;
      this.tx = this.cursorX - this.X(beat);
      this.svg.style.transform = `translate3d(${this.tx}px,0,0)`;
    }

    setNoteState(id, state) {
      const g = this.noteEls.get(id);
      if (!g) return;
      g.classList.remove('hit', 'miss', 'target');
      if (state) g.classList.add(state);
    }

    clearStates() {
      this.noteEls.forEach((g) => g.classList.remove('hit', 'miss', 'target'));
    }

    setLoop(from, to) {
      if (!this.loopRect) return;
      if (from == null) {
        this.loopRect.setAttribute('visibility', 'hidden');
        return;
      }
      const x0 = this.X(from) - 14;
      const x1 = this.X(to) - 14;
      this.loopRect.setAttribute('x', x0);
      this.loopRect.setAttribute('width', Math.max(0, x1 - x0));
      this.loopRect.setAttribute('visibility', 'visible');
    }
  }

  PC.Sheet = Sheet;
})(window);
