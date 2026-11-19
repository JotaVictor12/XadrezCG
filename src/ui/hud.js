/**
 * Interface 2D (HUD): turno, pontuação, histórico de lances, faixa de alertas e botões.
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

const EMPTY_HISTORY_TEXT = 'Aguardando o primeiro movimento...';

export class Hud {
  constructor(root = document) {
    const $ = (id) => root.getElementById(id);
    this.turnBadge = $('turnBadge');
    this.turnDot = $('turnDot');
    this.turnText = $('turnText');
    this.scoreWhite = $('scoreWhite');
    this.scoreBlack = $('scoreBlack');
    this.moveLog = $('moveLog');
    this.moveCount = $('moveCount');
    this.bannerAlert = $('bannerAlert');
    this.bannerText = $('bannerText');
    this.skinSelector = $('skinSelector');
    this.btnFlip = $('btnFlip');
    this.btnUndo = $('btnUndo');
    this.btnReset = $('btnReset');
    this._bannerTimer = null;
  }

  bind({ onFlip, onUndo, onReset, onSkinChange }) {
    this.btnFlip.addEventListener('click', onFlip);
    this.btnUndo.addEventListener('click', onUndo);
    this.btnReset.addEventListener('click', onReset);
    this.skinSelector.addEventListener('change', (e) => onSkinChange(e.target.value));
  }

  setSkin(key) {
    this.skinSelector.value = key;
  }

  setTurn(color, playerName) {
    const style = TURN_STYLES[color];
    this.turnBadge.className = style.badge;
    this.turnDot.className = style.dot;
    this.turnText.textContent = `${playerName} (${style.text})`;
  }

  /** @param {{ w: number, b: number }} score */
  setScore(score) {
    this.scoreWhite.textContent = score.w;
    this.scoreBlack.textContent = score.b;
  }

  setUndoEnabled(enabled) {
    this.btnUndo.disabled = !enabled;
    this.btnUndo.classList.toggle('opacity-40', !enabled);
    this.btnUndo.classList.toggle('cursor-not-allowed', !enabled);
  }

  /** Histórico em notação algébrica, em pares (brancas / pretas) por linha. */
  renderHistory(sanMoves) {
    this.moveCount.textContent = `${sanMoves.length} ${sanMoves.length === 1 ? 'lance' : 'lances'}`;
    this.moveLog.replaceChildren();

    if (sanMoves.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-slate-500 italic text-center py-4';
      empty.textContent = EMPTY_HISTORY_TEXT;
      this.moveLog.appendChild(empty);
      return;
    }

    for (let i = 0; i < sanMoves.length; i += 2) {
      const row = document.createElement('div');
      row.className = 'grid grid-cols-[2rem_1fr_1fr] gap-1 p-1.5 rounded bg-slate-800/50 border border-slate-700/50 text-slate-300';

      const number = document.createElement('strong');
      number.className = 'text-indigo-400';
      number.textContent = `${i / 2 + 1}.`;

      const white = document.createElement('span');
      white.textContent = sanMoves[i];
      const black = document.createElement('span');
      black.textContent = sanMoves[i + 1] ?? '';

      row.append(number, white, black);
      this.moveLog.appendChild(row);
    }
    this.moveLog.scrollTop = this.moveLog.scrollHeight;
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
