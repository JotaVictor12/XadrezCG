/**
 * Modal de promoção de peão. `choose()` devolve uma Promise com a peça escolhida
 * ('Q' | 'R' | 'B' | 'N') ou `null` se o jogador cancelar (Esc ou clique fora).
 */
export class PromotionModal {
  constructor(root = document) {
    this.modal = root.getElementById('promotionModal');
    this.panel = this.modal.firstElementChild;
    this._resolve = null;

    this.modal.querySelectorAll('.promo-btn').forEach((button) => {
      button.addEventListener('click', () => this._close(button.dataset.piece));
    });
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this._close(null);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._resolve) this._close(null);
    });
  }

  choose() {
    return new Promise((resolve) => {
      this._resolve = resolve;
      this.modal.classList.remove('hidden');
      requestAnimationFrame(() => {
        this.modal.classList.remove('opacity-0');
        this.panel.classList.replace('scale-95', 'scale-100');
      });
    });
  }

  _close(choice) {
    const resolve = this._resolve;
    this._resolve = null;
    this.modal.classList.add('opacity-0');
    this.panel.classList.replace('scale-100', 'scale-95');
    setTimeout(() => this.modal.classList.add('hidden'), 300);
    resolve?.(choice);
  }
}
