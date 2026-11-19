/**
 * Interface 2D (HUD): turno, pontuação, faixa de alertas e botão de reiniciar.
 * Só manipula o DOM; não conhece regras nem Three.js.
 */

const BANNER_STYLES = {
  check: 'bg-red-600/90',
  win: 'bg-emerald-600/90',
  draw: 'bg-amber-600/90',
};

const TURN_STYLES = {
  w: {
    badge: 'flex items-center gap-2 font-bold text-sm text-slate-900 bg-amber-100 px-3 py-0.5 rounded-full shadow-sm',
    dot: 'w-2.5 h-2.5 rounded-full bg-amber-500 inline-block',
    text: 'BRANCAS',
  },
  b: {
    badge: 'flex items-center gap-2 font-bold text-sm text-slate-100 bg-slate-800 border border-slate-700 px-3 py-0.5 rounded-full shadow-sm',
    dot: 'w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block',
    text: 'PRETAS',
  },
};

export class Hud {
  constructor(root = document) {
    const $ = (id) => root.getElementById(id);
    this.turnBadge = $('turnBadge');
    this.turnDot = $('turnDot');
    this.turnText = $('turnText');
    this.scoreWhite = $('scoreWhite');
    this.scoreBlack = $('scoreBlack');
    this.bannerAlert = $('bannerAlert');
    this.bannerText = $('bannerText');
    this.btnReset = $('btnReset');
    this._bannerTimer = null;
  }

  bind({ onReset }) {
    this.btnReset.addEventListener('click', onReset);
  }

  setTurn(color) {
    const style = TURN_STYLES[color];
    this.turnBadge.className = style.badge;
    this.turnDot.className = style.dot;
    this.turnText.textContent = style.text;
  }

  /** @param {{ w: number, b: number }} score */
  setScore(score) {
    this.scoreWhite.textContent = score.w;
    this.scoreBlack.textContent = score.b;
  }

  /** @param {'check'|'win'|'draw'} kind */
  showBanner(text, kind, { persistent = false } = {}) {
    clearTimeout(this._bannerTimer);
    this.bannerText.textContent = text;
    this.bannerAlert.firstElementChild.className = `${BANNER_STYLES[kind]} text-white font-extrabold text-base px-8 py-2.5 rounded-full shadow-2xl backdrop-blur-md tracking-wider flex items-center gap-3 border border-white/20`;
    this.bannerAlert.classList.remove('-translate-y-12', 'opacity-0');
    if (!persistent) this._bannerTimer = setTimeout(() => this.hideBanner(), 3500);
  }

  hideBanner() {
    clearTimeout(this._bannerTimer);
    this.bannerAlert.classList.add('-translate-y-12', 'opacity-0');
  }
}
