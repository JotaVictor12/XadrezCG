/**
 * Menu inicial: os jogadores digitam seus nomes antes da partida.
 * `ask(names)` devolve uma Promise com { w, b } quando clicam em "Começar".
 * Player 1 joga de brancas e Player 2 de pretas.
 */

const DEFAULT_NAMES = { w: 'Player 1', b: 'Player 2' };

export class PlayerMenu {
  constructor(root = document) {
    this.menu = root.getElementById('playerMenu');
    this.form = root.getElementById('playerForm');
    this.inputs = { w: root.getElementById('playerWhite'), b: root.getElementById('playerBlack') };
    this._resolve = null;

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._close();
    });
  }

  /** Abre o menu com os nomes atuais já preenchidos. */
  ask(names = DEFAULT_NAMES) {
    this.inputs.w.value = names.w;
    this.inputs.b.value = names.b;
    this.menu.classList.remove('hidden');
    this.inputs.w.focus();
    this.inputs.w.select();
    return new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  _close() {
    const names = {
      w: this.inputs.w.value.trim() || DEFAULT_NAMES.w,
      b: this.inputs.b.value.trim() || DEFAULT_NAMES.b,
    };
    this.menu.classList.add('hidden');
    this._resolve?.(names);
    this._resolve = null;
  }
}
