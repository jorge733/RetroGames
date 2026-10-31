// BENE BROS — motor del juego: entrada, física, enemigos, jefe y pantallas.
(function (global) {
  'use strict';
  const BB = global.BB, G = BB.GFX, A = BB.Audio;
  const T = 16, VW = 320, VH = 192, ROWS = BB.ROWS;
  const SFX = A.SFX;

  const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const store = {
    get(k, d) { try { const v = global.localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } },
  };
  BB.store = store;

  // ================================================================== entrada
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowDown: 'down', KeyS: 'down',
    ArrowUp: 'up', KeyW: 'up', KeyZ: 'jump', Space: 'jump', KeyK: 'jump',
    KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run', KeyJ: 'run',
    Enter: 'pause', KeyP: 'pause', Escape: 'back',
  };
  const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'run', 'pause', 'back'];

  class Input {
    constructor() {
      this.keys = {}; this.virt = {}; this.pad = {}; this.cur = {}; this.prev = {}; this.latch = {};
      const typing = (e) => /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '');
      global.addEventListener('keydown', (e) => {
        if (typing(e)) return;
        A.unlock();
        if (e.code === 'KeyM') { A.setMuted(!A.isMuted()); return; }
        const a = KEYS[e.code];
        if (a) { this.keys[a] = true; this.latch[a] = true; e.preventDefault(); }
      });
      global.addEventListener('keyup', (e) => { const a = KEYS[e.code]; if (a) this.keys[a] = false; });
      global.addEventListener('blur', () => { this.keys = {}; });
      global.addEventListener('pointerdown', () => A.unlock());
    }
    poll() {
      this.pad = {};
      const pads = global.navigator.getGamepads ? global.navigator.getGamepads() : [];
      for (const gp of pads) {
        if (!gp) continue;
        const b = (i) => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        this.pad.left = this.pad.left || b(14) || ax < -0.4;
        this.pad.right = this.pad.right || b(15) || ax > 0.4;
        this.pad.down = this.pad.down || b(13) || ay > 0.6;
        this.pad.jump = this.pad.jump || b(0);
        this.pad.up = this.pad.up || b(12) || ay < -0.6;
        this.pad.run = this.pad.run || b(2) || b(1);
        this.pad.pause = this.pad.pause || b(9);
        this.pad.back = this.pad.back || b(8);
      }
      for (const a of ACTIONS) { this.prev[a] = this.cur[a]; this.cur[a] = !!(this.keys[a] || this.virt[a] || this.pad[a] || this.latch[a]); }
      this.latch = {};
    }
    down(a) { return a === 'jump' ? this.cur.jump || this.cur.up : this.cur[a]; }
    pressed(a) {
      if (a === 'jump') return (this.cur.jump && !this.prev.jump) || (this.cur.up && !this.prev.up);
      return this.cur[a] && !this.prev[a];
    }
    any() { return this.pressed('jump') || this.pressed('pause') || this.pressed('run'); }
  }

  // ================================================================== juego
  class Game {
    constructor(canvas, opts = {}) {
      this.cv = canvas;
      canvas.width = VW; canvas.height = VH;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.input = new Input();
      this.opts = opts;
      this.campaign = opts.levels || BB.LEVELS;
      this.levels = this.campaign;
      this.frame = 0;
      this.best = store.get('benebros:best', 0);
      this.menuIndex = 0;
      this.state = 'title';
      this.titleCam = 0;
      if (opts.testMode) this.newGame(this.campaign);
      this.running = true;
      this.last = performance.now(); this.acc = 0;
      requestAnimationFrame((t) => this.loop(t));
    }

    destroy() { this.running = false; A.stopMusic(); }

    loop(t) {
      if (!this.running) return;
      requestAnimationFrame((tt) => this.loop(tt));
      this.acc += Math.min(t - this.last, 100); this.last = t;
      let n = 0;
      while (this.acc >= 1000 / 60 && n < 4) { this.acc -= 1000 / 60; this.update(); n++; }
      if (n) this.render();
    }

    // ---------------------------------------------------------------- partida
    newGame(levels) {
      this.levels = levels;
      this.lives = 3; this.score = 0; this.coins = 0; this.power = false;
      this.levelIndex = 0; this.checkpoint = null;
      this.startLevel();
    }

    startLevel() {
      this.loadLevel(this.levels[this.levelIndex]);
      this.state = 'intro'; this.timer = 130;
      A.stopMusic();
    }

    loadLevel(L) {
      this.level = L; this.theme = L.theme || 'pradera';
      const W = Math.max(...L.rows.map((r) => r.length));
      this.W = W;
      this.grid = [];
      for (let y = 0; y < ROWS; y++) this.grid.push([...(L.rows[y] || '').padEnd(W, '.')]);
      this.enemies = []; this.items = []; this.shots = []; this.particles = []; this.popups = [];
      this.platforms = []; this.flags = []; this.bumps = {};
      this.bell = null; this.boss = null;
      let start = { x: 2, y: 9 };
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < W; x++) {
          const ch = this.grid[y][x];
          const px = x * T, py = y * T;
          let clear = true;
          switch (ch) {
            case '@': start = { x, y }; break;
            case '!': this.bell = { x: px, y: py, ringing: false }; break;
            case 'C': this.flags.push({ x: px, y: py, active: false }); break;
            case 'g': this.enemies.push(makeEnemy('bellotin', px + 2, py + 2)); break;
            case 's': this.enemies.push(makeEnemy('caracol', px + 1, py + 3)); break;
            case 'b': this.enemies.push(makeEnemy('pajaro', px + 1, py + 3)); break;
            case 'p': this.enemies.push(makeEnemy('erizo', px + 1, py + 5)); break;
            case 'K': this.boss = makeEnemy('rey', px, py - 12); this.enemies.push(this.boss); break;
            case 'M': case 'V': this.platforms.push({ type: ch, x0: px, y0: py, x: px, y: py, w: 48, h: 8, t: 0, dx: 0, dy: 0 }); break;
            default: clear = false;
          }
          if (clear) this.grid[y][x] = '.';
        }
      }
      const cp = this.checkpoint && this.checkpoint.level === this.levelIndex ? this.checkpoint : null;
      if (cp) this.flags.forEach((f) => { if (f.x === cp.x) f.active = true; });
      this.player = {
        x: cp ? cp.x + 3 : start.x * T + 3, y: cp ? cp.y + 2 : start.y * T + 2, w: 10, h: 14,
        vx: 0, vy: 0, dir: 1, onGround: false, coyote: 0, jumpBuf: 0, hearts: 3, inv: 0,
        anim: 0, plat: null, combo: 0, dead: false,
      };
      this.time = (L.time || 300) * 60;
      this.cam = Math.max(0, Math.min(this.player.x - VW / 3, W * T - VW));
      this.bossFight = false;
    }

    music() {
      if (this.bossFight) A.playMusic('jefe');
      else A.playMusic(this.theme);
    }

    // ---------------------------------------------------------------- tiles
    tile(tx, ty) {
      if (tx < 0 || tx >= this.W) return 'X';
      if (ty < 0 || ty >= ROWS) return '.';
      return this.grid[ty][tx];
    }
    solid(tx, ty) { return BB.SOLID.has(this.tile(tx, ty)); }

    moveX(e) {
      e.x += e.vx;
      const t0 = Math.floor(e.y / T), t1 = Math.floor((e.y + e.h - 0.01) / T);
      if (e.vx > 0) {
        const tx = Math.floor((e.x + e.w - 0.01) / T);
        for (let ty = t0; ty <= t1; ty++) if (this.solid(tx, ty)) { e.x = tx * T - e.w; return true; }
      } else if (e.vx < 0) {
        const tx = Math.floor(e.x / T);
        for (let ty = t0; ty <= t1; ty++) if (this.solid(tx, ty)) { e.x = (tx + 1) * T; return true; }
      }
      return false;
    }

    // Devuelve el tile golpeado con la cabeza (o null).
    moveY(e) {
      const prevBottom = e.y + e.h;
      e.y += e.vy;
      e.onGround = false;
      const l = Math.floor(e.x / T), r = Math.floor((e.x + e.w - 0.01) / T);
      if (e.vy >= 0) {
        const ty = Math.floor((e.y + e.h) / T);
        for (let tx = l; tx <= r; tx++) {
          const ch = this.tile(tx, ty);
          if (BB.SOLID.has(ch) || (ch === '-' && prevBottom <= ty * T + 0.5)) {
            e.y = ty * T - e.h; e.vy = 0; e.onGround = true; break;
          }
        }
      } else {
        const ty = Math.floor(e.y / T);
        let best = null, bestD = 1e9;
        const cx = e.x + e.w / 2;
        for (let tx = l; tx <= r; tx++) {
          if (this.solid(tx, ty)) {
            const d = Math.abs(tx * T + 8 - cx);
            if (d < bestD) { bestD = d; best = tx; }
          }
        }
        if (best !== null) { e.y = (ty + 1) * T; e.vy = 0; return { tx: best, ty }; }
      }
      return null;
    }

    // ---------------------------------------------------------------- actualización
    update() {
      this.input.poll();
      this.frame++;
      const inp = this.input;
      switch (this.state) {
        case 'title': return this.updateTitle();
        case 'intro':
          if (--this.timer <= 0 || (this.timer < 100 && inp.any())) { this.state = 'play'; this.music(); }
          return;
        case 'pause':
          if (inp.pressed('pause')) { this.state = 'play'; SFX.pause(); this.music(); }
          if (inp.pressed('back')) this.quit();
          return;
        case 'dying': return this.updateDying();
        case 'clear': return this.updateClear();
        case 'gameover':
          if (--this.timer <= 0 || (this.timer < 150 && inp.any())) this.quit();
          return;
        case 'win':
          this.updateParticles();
          if (this.frame % 8 === 0) this.confetti(Math.random() * VW + this.cam, -4);
          if (this.timer > 0) this.timer--;
          else if (inp.any()) this.quit();
          return;
        case 'play': return this.updatePlay();
      }
    }

    quit() {
      A.stopMusic();
      if (this.opts.testMode && this.opts.onExit) { this.opts.onExit(); return; }
      this.state = 'title';
    }

    updateTitle() {
      const inp = this.input;
      this.titleCam += 0.4;
      const custom = store.get('benebros:levels', []);
      const items = this.menuItems(custom);
      if (inp.pressed('down')) { this.menuIndex = (this.menuIndex + 1) % items.length; SFX.bump(); }
      if (inp.cur.up && !inp.prev.up) { this.menuIndex = (this.menuIndex + items.length - 1) % items.length; SFX.bump(); }
      if (this.menuIndex >= items.length) this.menuIndex = 0;
      if ((inp.cur.jump && !inp.prev.jump) || inp.pressed('pause') || inp.pressed('run')) {
        const it = items[this.menuIndex];
        A.unlock(); SFX.item();
        if (it.id === 'play') this.newGame(this.campaign);
        else if (it.id === 'custom') this.newGame(custom);
        else if (it.id === 'editor') global.location.href = 'editor.html';
      }
    }

    menuItems(custom) {
      const items = [{ id: 'play', label: 'JUGAR' }];
      if (custom.length) items.push({ id: 'custom', label: 'MIS NIVELES (' + custom.length + ')' });
      items.push({ id: 'editor', label: 'EDITOR DE NIVELES' });
      return items;
    }

    updatePlay() {
      const inp = this.input;
      if (inp.pressed('pause')) { this.state = 'pause'; A.stopMusic(); SFX.pause(); return; }
      if (inp.pressed('back') && this.opts.testMode) { this.quit(); return; }

      if (--this.time <= 0) { this.time = 0; this.die(); return; }

      for (const pl of this.platforms) {
        pl.t++;
        const k = (1 - Math.cos(pl.t * 0.02)) / 2;
        const nx = pl.type === 'M' ? pl.x0 + k * 5 * T : pl.x0;
        const ny = pl.type === 'V' ? pl.y0 - k * 5 * T : pl.y0;
        pl.dx = nx - pl.x; pl.dy = ny - pl.y; pl.x = nx; pl.y = ny;
      }

      this.updatePlayer();
      if (this.state !== 'play') return;
      this.updateEnemies();
      this.updateItems();
      this.updateShots();
      this.updateParticles();
      for (const k in this.bumps) if (--this.bumps[k] <= 0) delete this.bumps[k];

      // cámara
      const p = this.player;
      const target = p.x + p.w / 2 - VW / 2 + p.dir * 24;
      this.cam += (target - this.cam) * 0.08;
      this.cam = Math.max(0, Math.min(this.cam, this.W * T - VW));

      // jefe
      if (this.boss && !this.bossFight && !this.boss.dead && Math.abs(this.boss.x - p.x) < 200) {
        this.bossFight = true; this.boss.active = true; this.music();
      }
    }

    updatePlayer() {
      const p = this.player, inp = this.input;
      const left = inp.down('left'), right = inp.down('right'), run = inp.down('run');
      const max = run ? 2.6 : 1.6;
      if (left && !right) {
        if (p.vx > 0 && p.onGround) p.vx -= 0.25; else p.vx -= p.onGround ? 0.09 : 0.07;
        p.dir = -1;
      } else if (right && !left) {
        if (p.vx < 0 && p.onGround) p.vx += 0.25; else p.vx += p.onGround ? 0.09 : 0.07;
        p.dir = 1;
      } else {
        p.vx = approach(p.vx, 0, p.onGround ? 0.12 : 0.02);
      }
      if (Math.abs(p.vx) > max) p.vx = approach(p.vx, Math.sign(p.vx) * max, 0.06);

      if (inp.pressed('jump')) p.jumpBuf = 7; else if (p.jumpBuf > 0) p.jumpBuf--;
      if (p.onGround) { p.coyote = 6; p.combo = 0; } else if (p.coyote > 0) p.coyote--;
      if (p.jumpBuf > 0 && p.coyote > 0) {
        p.vy = -(5.4 + Math.abs(p.vx) * 0.25);
        p.jumpBuf = 0; p.coyote = 0; p.onGround = false; p.plat = null;
        SFX.jump();
      }
      p.vy = Math.min(p.vy + (p.vy < 0 && inp.down('jump') ? 0.22 : 0.42), 6.5);

      // lanzar bellotas
      if (this.power && inp.pressed('run') && this.shots.length < 2) {
        this.shots.push({ x: p.x + (p.dir > 0 ? p.w : -6), y: p.y + 3, w: 6, h: 6, vx: p.dir * 3.6 + p.vx * 0.3, vy: -1, life: 120 });
        SFX.throw();
      }

      if (p.plat) { p.x += p.plat.dx; p.y += p.plat.dy; }
      p.plat = null;

      this.moveX(p);
      if (p.x < 0) p.x = 0;
      const prevBottom = p.y + p.h;
      p.prevBottom = prevBottom;
      const head = this.moveY(p);
      if (head) this.hitBlock(head.tx, head.ty);

      // plataformas móviles
      if (p.vy >= 0) {
        for (const pl of this.platforms) {
          if (p.x + p.w > pl.x && p.x < pl.x + pl.w && prevBottom <= pl.y + 2 + Math.max(0, -pl.dy) && p.y + p.h >= pl.y) {
            p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.plat = pl; break;
          }
        }
      }

      // tiles especiales
      const l = Math.floor(p.x / T), r = Math.floor((p.x + p.w - 0.01) / T);
      const t0 = Math.floor(p.y / T), t1 = Math.floor((p.y + p.h - 0.01) / T);
      for (let ty = t0; ty <= t1; ty++) {
        for (let tx = l; tx <= r; tx++) {
          const ch = this.tile(tx, ty);
          if (ch === 'o') { this.grid[ty][tx] = '.'; this.addCoin(); }
          else if (ch === '~' && p.y + p.h > ty * T + 5) { this.die(); return; }
          else if (ch === '^' && p.y + p.h > ty * T + 8) this.hurt();
        }
      }

      if (p.inv > 0) p.inv--;
      p.anim += Math.abs(p.vx) * 0.12;
      if (p.y > VH + 16) { this.die(); return; }

      // banderas
      for (const f of this.flags) {
        if (!f.active && overlap(p, { x: f.x, y: f.y - 16, w: 16, h: 32 })) {
          f.active = true; this.checkpoint = { level: this.levelIndex, x: f.x, y: f.y };
          SFX.flag(); this.popup(f.x, f.y - 20, '¡CONTROL!');
        }
      }
      // campana
      const b = this.bell;
      if (b && this.bellVisible() && overlap(p, { x: b.x - 2, y: b.y - 44, w: 20, h: 60 })) this.levelClear();
    }

    bellVisible() { return !this.boss || this.boss.dead; }

    hitBlock(tx, ty) {
      const ch = this.grid[ty][tx];
      const key = tx + ',' + ty;
      const cx = tx * T, cy = ty * T;
      if (ch === '*') { this.grid[ty][tx] = 'U'; this.bumps[key] = 8; this.items.push({ kind: 'coinpop', x: cx, y: cy - 16, vy: -5, life: 26 }); this.addCoin(); }
      else if (ch === 'P' || ch === 'H') {
        this.grid[ty][tx] = 'U'; this.bumps[key] = 8;
        const kind = ch === 'P' && !this.power ? 'bellota' : 'corazon';
        this.items.push({ kind, x: cx + 2, y: cy, w: 12, h: 12, vx: 0, vy: 0, rise: 16, ty: cy - 14 });
        SFX.item();
      } else if (ch === '=') {
        this.grid[ty][tx] = '.';
        for (let i = 0; i < 4; i++) {
          this.particles.push({ x: cx + 4 + (i % 2) * 8, y: cy + 4 + (i >> 1) * 8, vx: (i % 2 ? 1.2 : -1.2), vy: -4 + (i >> 1) * 1.5, life: 60, color: G.THEMES[this.theme].brick, size: 5, grav: 0.3 });
        }
        this.score += 50; SFX.brick();
      } else { SFX.bump(); this.bumps[key] = 6; }
      // golpe por debajo: afecta a lo que está encima
      const above = { x: cx, y: cy - T, w: T, h: T };
      for (const e of this.enemies) if (e.alive && overlap(e, above)) this.killEnemy(e, 0, 'bump');
      if (this.tile(tx, ty - 1) === 'o') { this.grid[ty - 1][tx] = '.'; this.addCoin(); this.items.push({ kind: 'coinpop', x: cx, y: cy - 16, vy: -5, life: 26 }); }
    }

    addCoin() {
      this.coins++; this.score += 100; SFX.coin();
      if (this.coins >= 100) { this.coins -= 100; this.lives++; SFX.life(); this.popup(this.player.x, this.player.y - 10, '+1 VIDA'); }
    }

    popup(x, y, text) { this.popups.push({ x, y, text: String(text), life: 50 }); }

    hurt() {
      const p = this.player;
      if (p.inv > 0 || p.dead) return;
      if (this.power) { this.power = false; p.inv = 100; SFX.hurt(); return; }
      p.hearts--;
      if (p.hearts <= 0) { this.die(); return; }
      p.inv = 100; p.vy = -3; SFX.hurt();
    }

    die() {
      const p = this.player;
      if (this.state !== 'play') return;
      p.dead = true; p.vy = -6; p.vx = 0; this.power = false;
      this.state = 'dying'; this.timer = 170;
      A.stopMusic(); SFX.die();
    }

    updateDying() {
      const p = this.player;
      if (this.timer < 150) { p.vy = Math.min(p.vy + 0.3, 6); p.y += p.vy; }
      if (--this.timer > 0) return;
      this.lives--;
      if (this.lives <= 0) {
        this.state = 'gameover'; this.timer = 240;
        this.saveBest();
      } else this.startLevel();
    }

    levelClear() {
      this.state = 'clear'; this.timer = 0; this.bell.ringing = true;
      A.stopMusic(); SFX.bell();
      this.player.vx = 0;
    }

    updateClear() {
      this.timer++;
      this.updateParticles();
      if (this.timer > 70 && this.time > 0) {
        const n = Math.min(this.time, 60 * 4);
        this.time -= n; this.score += Math.ceil(n / 60) * 10;
        if (this.frame % 4 === 0) SFX.coin();
      }
      if (this.timer % 10 === 0) this.confetti(this.bell.x + 8, this.bell.y - 40);
      if (this.timer > 70 && this.time <= 0 && this.timer > 220) {
        this.levelIndex++;
        this.checkpoint = null;
        if (this.levelIndex >= this.levels.length) {
          this.state = 'win'; this.timer = 120; this.saveBest(); SFX.win();
          if (this.opts.testMode) { this.state = 'gameover'; this.timer = 1; }
        } else this.startLevel();
      }
    }

    saveBest() { if (this.score > this.best) { this.best = this.score; store.set('benebros:best', this.best); } }

    confetti(x, y) {
      const colors = ['#e43b44', '#f7a23b', '#ffcd75', '#38b764', '#41a6f6', '#f28fb8'];
      for (let i = 0; i < 6; i++) {
        this.particles.push({ x, y, vx: Math.random() * 4 - 2, vy: Math.random() * -3, life: 90, color: colors[i], size: 2, grav: 0.08 });
      }
    }

    // ---------------------------------------------------------------- enemigos
    updateEnemies() {
      const p = this.player;
      for (const e of this.enemies) {
        if (!e.active) { if (e.x < this.cam + VW + 32 && e.kind !== 'rey') e.active = true; else continue; }
        if (!e.alive) {
          if (e.state === 'flat') { if (--e.timer <= 0) e.remove = true; continue; }
          e.vy += 0.3; e.y += e.vy; e.x += e.vx;
          if (e.y > VH + 40) e.remove = true;
          continue;
        }
        e.t++;
        ENEMY_AI[e.kind](this, e);
        if (e.y > VH + 32) e.remove = true;
        if (e.alive && !p.dead) this.playerVsEnemy(e);
      }
      this.enemies = this.enemies.filter((e) => !e.remove || e === this.boss);
    }

    playerVsEnemy(e) {
      const p = this.player;
      if (!overlap(p, e)) return;
      const fromAbove = p.vy >= 0 && p.prevBottom <= e.y + 6;
      const bounce = () => { p.vy = this.input.down('jump') ? -6 : -4; p.onGround = false; p.combo++; };

      if (e.kind === 'caracol' && e.state === 'shell') {
        // patear la concha
        e.state = 'slide'; e.vx = (p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1) * 3.8; e.grace = 14;
        SFX.kick(); this.score += 100;
        if (fromAbove) bounce();
        return;
      }
      if (e.kind === 'caracol' && e.state === 'slide' && e.grace > 0) return;
      if (e.kind === 'rey') {
        if (e.inv > 0) { if (fromAbove) bounce(); return; }
        if (fromAbove) { bounce(); p.vy = -6.5; this.damageBoss(e); } else this.hurt();
        return;
      }
      if (fromAbove && e.kind !== 'erizo') {
        bounce();
        const pts = Math.min(200 * Math.pow(2, p.combo - 1), 3200);
        this.score += pts; this.popup(e.x, e.y - 8, pts);
        SFX.stomp();
        if (e.kind === 'caracol') {
          if (e.state === 'slide') { e.state = 'shell'; e.vx = 0; e.timer = 360; }
          else { e.state = 'shell'; e.vx = 0; e.timer = 360; e.h = 11; e.y += 2; }
        } else if (e.kind === 'bellotin') { e.alive = false; e.state = 'flat'; e.timer = 30; }
        else this.killEnemy(e, p.dir, 'stomp');
        return;
      }
      this.hurt();
    }

    killEnemy(e, dir, why) {
      if (!e.alive) return;
      if (e.kind === 'rey') { this.damageBoss(e); return; }
      e.alive = false; e.state = 'dead'; e.vy = -4; e.vx = (dir || (Math.random() < 0.5 ? -1 : 1)) * 1;
      this.score += 200; this.popup(e.x, e.y - 8, 200);
      if (why !== 'stomp') SFX.kick();
    }

    damageBoss(e) {
      if (e.inv > 0 || !e.alive) return;
      e.hp--; e.inv = 70; SFX.bossHit();
      if (e.hp <= 0) {
        e.alive = false; e.dead = true; e.state = 'dead'; e.vy = -5; e.vx = 0.5;
        this.score += 5000; this.popup(e.x, e.y - 10, 5000);
        A.stopMusic(); this.bossFight = false;
        setTimeout(() => { if (this.state === 'play') A.playMusic(this.theme); }, 1500);
        for (let i = 0; i < 6; i++) this.confetti(e.x + 12, e.y);
      }
    }

    // ---------------------------------------------------------------- objetos
    updateItems() {
      const p = this.player;
      for (const it of this.items) {
        if (it.kind === 'coinpop') {
          it.vy += 0.3; it.y += it.vy;
          if (--it.life <= 0) { it.remove = true; this.popup(it.x, it.y, 100); }
          continue;
        }
        if (it.rise > 0) { it.rise--; it.y -= 1; if (it.rise === 0) it.vx = it.kind === 'bellota' ? 1 : 0; continue; }
        it.vy = Math.min(it.vy + 0.3, 5);
        if (this.moveX(it)) it.vx = -it.vx;
        this.moveY(it);
        if (it.kind === 'bellota' && it.onGround) it.vy = -2.5;
        if (it.y > VH + 20) it.remove = true;
        if (overlap(p, it)) {
          it.remove = true;
          if (it.kind === 'bellota') { this.power = true; SFX.power(); this.score += 1000; this.popup(it.x, it.y - 8, '¡BELLOTA DORADA!'); }
          else {
            SFX.heart();
            if (p.hearts < 3) { p.hearts++; this.popup(it.x, it.y - 8, '+♥'); } else { this.score += 500; this.popup(it.x, it.y - 8, 500); }
          }
        }
      }
      this.items = this.items.filter((i) => !i.remove);
    }

    updateShots() {
      for (const s of this.shots) {
        s.vy = Math.min(s.vy + 0.3, 5);
        if (this.moveX(s)) s.remove = true;
        this.moveY(s);
        if (s.onGround) s.vy = -3;
        if (--s.life <= 0 || s.y > VH || s.x < this.cam - 20 || s.x > this.cam + VW + 20) s.remove = true;
        for (const e of this.enemies) {
          if (e.alive && e.active && overlap(s, e)) { s.remove = true; this.killEnemy(e, Math.sign(s.vx), 'shot'); break; }
        }
        if (s.remove) this.particles.push({ x: s.x, y: s.y, vx: 0, vy: -0.5, life: 12, color: '#ffcd75', size: 4, grav: 0 });
      }
      this.shots = this.shots.filter((s) => !s.remove);
    }

    updateParticles() {
      for (const q of this.particles) { q.vy += q.grav; q.x += q.vx; q.y += q.vy; q.life--; }
      this.particles = this.particles.filter((q) => q.life > 0);
      for (const q of this.popups) { q.y -= 0.5; q.life--; }
      this.popups = this.popups.filter((q) => q.life > 0);
    }

    // ================================================================== dibujo
    render() {
      const ctx = this.ctx;
      ctx.imageSmoothingEnabled = false;
      if (this.state === 'title') return this.renderTitle();
      if (this.state === 'intro') return this.renderIntro();
      if (this.state === 'gameover' && this.timer > 0) return this.renderCard('FIN DEL JUEGO', ['PUNTOS: ' + this.score, 'RÉCORD: ' + this.best], '#e43b44');
      if (this.state === 'win') return this.renderWin();

      const cam = Math.round(this.cam), t = this.frame;
      G.background(ctx, this.theme, cam, VW, VH, t);

      // tiles
      const x0 = Math.floor(cam / T), x1 = Math.min(this.W - 1, x0 + Math.ceil(VW / T) + 1);
      for (let ty = 0; ty < ROWS; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const ch = this.grid[ty][tx];
          if (ch === '.') continue;
          const sx = tx * T - cam, sy = ty * T;
          if (ch === 'o') {
            const w = Math.abs(Math.cos((t + tx * 7) * 0.08));
            G.drawSprite(ctx, 'moneda', sx + 8 - 8 * w, sy, { sx: Math.max(0.15, w) });
            continue;
          }
          if (ch === '~') { G.drawLava(ctx, sx, sy, t); continue; }
          const img = G.tileImage(this.theme, ch, this.tile(tx, ty - 1));
          if (!img) continue;
          const b = this.bumps[tx + ',' + ty];
          ctx.drawImage(img, sx, sy - (b ? Math.sin(b / 8 * Math.PI) * 5 : 0));
        }
      }

      for (const f of this.flags) G.drawFlag(ctx, f.x - cam, f.y, f.active, t);
      if (this.bell && this.bellVisible()) G.drawBell(ctx, this.bell.x - cam, this.bell.y, t, this.bell.ringing);
      for (const pl of this.platforms) G.drawPlatform(ctx, pl.x - cam, pl.y, pl.w);

      for (const it of this.items) {
        if (it.kind === 'coinpop') {
          const w = Math.abs(Math.cos(it.life * 0.4));
          G.drawSprite(ctx, 'moneda', it.x - cam + 8 - 8 * w, it.y, { sx: Math.max(0.15, w) });
        } else if (it.kind === 'bellota') G.drawSprite(ctx, 'bellota', it.x - cam - 2, it.y - 3, { swap: 'bellotaDorada' });
        else G.drawSprite(ctx, 'corazon', it.x - cam - 2, it.y - 3);
      }

      for (const e of this.enemies) if (e.active || e.kind === 'rey') this.drawEnemy(e, cam);
      for (const s of this.shots) G.drawSprite(ctx, 'bellota', s.x - cam - 1, s.y - 1, { swap: 'bellotaDorada', scale: 0.5 });
      this.drawPlayer(cam);

      for (const q of this.particles) { ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x - cam), Math.round(q.y), q.size, q.size); }
      for (const q of this.popups) G.textCenter(ctx, q.text, q.x - cam + 8, q.y, '#fff');

      this.renderHUD();

      if (this.state === 'pause') {
        ctx.fillStyle = 'rgba(26,28,44,.7)'; ctx.fillRect(0, 0, VW, VH);
        G.textCenter(ctx, 'PAUSA', VW / 2, 70, '#ffcd75', 3);
        G.textCenter(ctx, 'ENTER: SEGUIR   ESC: SALIR', VW / 2, 110, '#f4f4f4');
      }
      if (this.state === 'clear') {
        G.textCenter(ctx, '¡NIVEL SUPERADO!', VW / 2, 60, '#ffcd75', 2);
        G.textCenter(ctx, 'BONUS DE TIEMPO', VW / 2, 84, '#f4f4f4');
      }
    }

    drawPlayer(cam) {
      const p = this.player, ctx = this.ctx;
      if (p.inv > 0 && Math.floor(p.inv / 4) % 2 && !p.dead) return;
      let name = 'santiIdle';
      if (p.dead || !p.onGround) name = 'santiJump';
      else if (Math.abs(p.vx) > 0.2) name = ['santiRun1', 'santiRun2', 'santiIdle', 'santiRun2'][Math.floor(p.anim) % 4];
      G.drawSprite(ctx, name, p.x - 3 - cam, p.y - 2, { flip: p.dir < 0, flipY: p.dead, swap: this.power ? 'dorado' : null });
    }

    drawEnemy(e, cam) {
      const ctx = this.ctx, x = e.x - cam, flip = e.vx > 0;
      if (x < -40 || x > VW + 40) return;
      const dead = e.state === 'dead';
      switch (e.kind) {
        case 'bellotin':
          if (e.state === 'flat') G.drawSprite(ctx, 'bellotin1', x - 2, e.y + 6, { sy: 0.5 });
          else G.drawSprite(ctx, (e.t >> 3) % 2 ? 'bellotin1' : 'bellotin2', x - 2, e.y - 2, { flip, flipY: dead });
          break;
        case 'caracol':
          if (e.state === 'walk' || dead) G.drawSprite(ctx, 'caracol', x - 1, e.y - 3 + ((e.t >> 4) % 2), { flip: e.vx < 0, flipY: dead });
          else {
            const wig = e.state === 'shell' && e.timer < 60 ? ((e.t >> 2) % 2) : 0;
            G.drawSprite(ctx, 'concha', x - 1 + wig, e.y - 3 - 2, { flip: e.state === 'slide' && (e.t >> 2) % 2 });
          }
          break;
        case 'pajaro':
          G.drawSprite(ctx, (e.t >> 3) % 2 ? 'pajaro1' : 'pajaro2', x - 1, e.y - 6, { flip, flipY: dead, swap: this.theme === 'cueva' ? 'murcielago' : null });
          break;
        case 'erizo':
          G.drawSprite(ctx, 'erizo', x - 1, e.y - 5 + ((e.t >> 3) % 2), { flip, flipY: dead });
          break;
        case 'rey': {
          if (e.inv > 0 && (e.inv >> 2) % 2) break;
          G.drawSprite(ctx, (e.t >> 3) % 2 ? 'bellotin1' : 'bellotin2', x - 3, e.y - 4, { flip, flipY: dead, swap: 'rey', scale: 2 });
          if (!dead) G.drawSprite(ctx, 'corona', x + 5, e.y - 14);
          if (this.bossFight) {
            for (let i = 0; i < 3; i++) G.drawSprite(ctx, 'corazon', VW / 2 - 24 + i * 16, 18, { alpha: i < e.hp ? 1 : 0.25 });
            G.textCenter(ctx, 'REY BELLOTA', VW / 2, 14, '#f28fb8');
          }
          break;
        }
      }
    }

    renderHUD() {
      const ctx = this.ctx, p = this.player;
      ctx.fillStyle = 'rgba(26,28,44,.55)'; ctx.fillRect(0, 0, VW, 11);
      G.text(ctx, 'SANTIAGO ' + String(this.score).padStart(6, '0'), 4, 3, '#f4f4f4');
      G.drawSprite(ctx, 'moneda', 112, -2, { scale: 0.75 });
      G.text(ctx, '×' + String(this.coins).padStart(2, '0'), 124, 3, '#ffcd75');
      for (let i = 0; i < 3; i++) G.drawSprite(ctx, 'corazon', 152 + i * 10, -1, { scale: 0.75, alpha: i < p.hearts ? 1 : 0.25 });
      if (this.power) G.drawSprite(ctx, 'bellota', 184, -2, { scale: 0.75, swap: 'bellotaDorada' });
      G.text(ctx, this.level.name, 200, 3, '#a7f070');
      G.text(ctx, 'T ' + String(Math.ceil(this.time / 60)).padStart(3, '0'), VW - 34, 3, this.time < 60 * 60 ? '#e43b44' : '#f4f4f4');
    }

    renderTitle() {
      const ctx = this.ctx, t = this.frame;
      G.background(ctx, 'pradera', this.titleCam, VW, VH, t);
      ctx.fillStyle = '#38b764'; ctx.fillRect(0, VH - 24, VW, 24);
      ctx.fillStyle = '#a7f070'; ctx.fillRect(0, VH - 24, VW, 2);
      // logo
      const title = 'BENE BROS';
      const colors = ['#e43b44', '#f7a23b', '#ffcd75', '#38b764', '#f4f4f4', '#41a6f6', '#7d6bd6', '#f28fb8', '#e43b44'];
      const sc = 4, adv = 6 * sc, tx = Math.round((VW - title.length * adv + sc) / 2);
      [...title].forEach((ch, i) => {
        const y = 14 + Math.round(Math.sin(t * 0.06 + i * 0.6) * 3);
        G.bigLetter(ctx, ch, tx + i * adv + 2, y + 3, '#1a1c2c', sc);
        G.bigLetter(ctx, ch, tx + i * adv, y, colors[i], sc);
      });
      G.textCenter(ctx, 'LAS AVENTURAS DE SANTIAGO', VW / 2, 50, '#f4f4f4');
      // Santiago corriendo
      const sx = (t * 1.2) % (VW + 60) - 30;
      G.drawSprite(ctx, ['santiRun1', 'santiRun2', 'santiIdle', 'santiRun2'][(t >> 3) % 4], sx, VH - 40);
      G.drawSprite(ctx, (t >> 3) % 2 ? 'bellotin1' : 'bellotin2', sx - 40, VH - 40, { flip: true });
      G.drawSprite(ctx, 'santiIdle', VW / 2 - 24, 64, { scale: 3 });

      const items = this.menuItems(store.get('benebros:levels', []));
      if (this.menuIndex >= items.length) this.menuIndex = 0;
      items.forEach((it, i) => {
        const sel = i === this.menuIndex;
        const y = 118 + i * 12;
        if (sel) G.drawSprite(ctx, 'moneda', VW / 2 - 60, y - 6, { scale: 1 });
        G.textCenter(ctx, it.label, VW / 2, y, sel ? '#ffcd75' : '#f4f4f4', 1);
      });
      G.textCenter(ctx, 'RÉCORD ' + this.best, VW / 2, VH - 14, '#f4f4f4');
      G.text(ctx, 'FLECHAS MOVER · Z SALTAR · X CORRER/LANZAR · M SONIDO', 8, VH - 6, '#1a1c2c', 1, null);
    }

    renderIntro() {
      const ctx = this.ctx;
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(0, 0, VW, VH);
      G.textCenter(ctx, 'NIVEL ' + (this.levelIndex + 1), VW / 2, 50, '#a7f070', 2);
      G.textCenter(ctx, this.level.name, VW / 2, 72, '#ffcd75', 3);
      G.drawSprite(ctx, 'santiIdle', VW / 2 - 28, 110, { scale: 2, swap: this.power ? 'dorado' : null });
      G.text(ctx, '× ' + this.lives, VW / 2 + 8, 122, '#f4f4f4', 2);
      if (this.checkpoint && this.checkpoint.level === this.levelIndex) G.textCenter(ctx, 'DESDE LA BANDERA', VW / 2, 156, '#41a6f6');
    }

    renderCard(title, lines, color) {
      const ctx = this.ctx;
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(0, 0, VW, VH);
      G.textCenter(ctx, title, VW / 2, 60, color, 3);
      lines.forEach((l, i) => G.textCenter(ctx, l, VW / 2, 100 + i * 12, '#f4f4f4'));
    }

    renderWin() {
      const ctx = this.ctx, t = this.frame;
      G.background(ctx, 'pradera', t * 0.5, VW, VH, t);
      ctx.fillStyle = '#38b764'; ctx.fillRect(0, VH - 24, VW, 24);
      G.textCenter(ctx, '¡SANTIAGO LO LOGRÓ!', VW / 2, 26, '#ffcd75', 2);
      G.textCenter(ctx, 'EL REY BELLOTA HA SIDO DERROTADO', VW / 2, 48, '#f4f4f4');
      G.drawSprite(ctx, 'santiIdle', VW / 2 - 24, VH - 24 - 48, { scale: 3, swap: 'dorado' });
      G.drawSprite(ctx, 'corona', VW / 2 - 24, VH - 24 - 48 - 26 + Math.sin(t * 0.1) * 2, { scale: 3 });
      G.textCenter(ctx, 'PUNTOS: ' + this.score + '   RÉCORD: ' + this.best, VW / 2, 62, '#f4f4f4');
      for (const q of this.particles) { ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x - this.cam), Math.round(q.y), q.size, q.size); }
      if (this.timer <= 0 && (t >> 5) % 2) G.textCenter(ctx, 'PULSA Z PARA VOLVER', VW / 2, VH - 14, '#f4f4f4');
    }

    // Utilidades para pruebas automáticas
    debugSteps(n) { for (let i = 0; i < n; i++) this.update(); this.render(); }
  }

  // ================================================================== enemigos
  function makeEnemy(kind, x, y) {
    const base = { kind, x, y, vx: 0, vy: 0, t: 0, alive: true, active: false, state: 'walk', onGround: false };
    switch (kind) {
      case 'bellotin': return Object.assign(base, { w: 12, h: 14, vx: -0.5 });
      case 'caracol': return Object.assign(base, { w: 14, h: 13, vx: -0.4 });
      case 'pajaro': return Object.assign(base, { w: 14, h: 8, vx: -0.6, baseY: y });
      case 'erizo': return Object.assign(base, { w: 14, h: 11, vx: -0.45 });
      case 'rey': return Object.assign(base, { w: 26, h: 28, hp: 3, inv: 0, jumpT: 90 });
    }
  }

  function walk(game, e, turnAtEdges) {
    e.vy = Math.min(e.vy + 0.35, 6);
    if (turnAtEdges && e.onGround) {
      const ahead = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
      const tx = Math.floor(ahead / T), ty = Math.floor((e.y + e.h + 2) / T);
      if (!game.solid(tx, ty) && game.tile(tx, ty) !== '-') e.vx = -e.vx;
    }
    if (game.moveX(e)) e.vx = -e.vx;
    game.moveY(e);
  }

  const ENEMY_AI = {
    bellotin(game, e) { walk(game, e, false); },
    erizo(game, e) { walk(game, e, true); },
    pajaro(game, e) {
      e.x += e.vx;
      e.y = e.baseY + Math.sin(e.t * 0.05) * 18;
      if (e.x < game.cam - 64) e.remove = true;
    },
    caracol(game, e) {
      if (e.state === 'walk') { walk(game, e, true); return; }
      if (e.state === 'shell') {
        e.vy = Math.min(e.vy + 0.35, 6); game.moveY(e);
        if (--e.timer <= 0) { e.state = 'walk'; e.h = 13; e.y -= 2; e.vx = game.player.x < e.x ? -0.4 : 0.4; }
        return;
      }
      // deslizándose: arrasa con todo
      if (e.grace > 0) e.grace--;
      e.vy = Math.min(e.vy + 0.35, 6);
      if (game.moveX(e)) { e.vx = -e.vx; SFX.bump(); }
      game.moveY(e);
      for (const o of game.enemies) if (o !== e && o.alive && o.active && overlap(o, e)) game.killEnemy(o, Math.sign(e.vx), 'shell');
      if (e.x < game.cam - 100 || e.x > game.cam + VW + 100) e.remove = true;
    },
    rey(game, e) {
      if (e.inv > 0) e.inv--;
      const p = game.player;
      const speed = 0.6 + (3 - e.hp) * 0.35;
      e.vx = approach(e.vx, (p.x < e.x ? -1 : 1) * speed, 0.05);
      e.vy = Math.min(e.vy + 0.3, 6);
      if (game.moveX(e)) e.vx = -e.vx;
      game.moveY(e);
      if (e.onGround && --e.jumpT <= 0) {
        e.vy = -6.5; e.jumpT = 80 + Math.floor(Math.random() * 60) - (3 - e.hp) * 15;
        SFX.bump();
      }
    },
  };

  BB.Game = Game;
  BB.VIEW = { W: VW, H: VH };
})(typeof window !== 'undefined' ? window : globalThis);
