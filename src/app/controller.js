const COLOR_NAMES = { w: 'BRANCAS', b: 'PRETAS' };

const BANNER_TEXT = {
  checkmate: (winner) => `XEQUE-MATE! VITÓRIA DAS ${COLOR_NAMES[winner]}`,
  stalemate: () => 'EMPATE POR AFOGAMENTO!',
  'insufficient-material': () => 'EMPATE: MATERIAL INSUFICIENTE',
  'fifty-move': () => 'EMPATE: REGRA DOS 50 LANCES',
  repetition: () => 'EMPATE: TRIPLA REPETIÇÃO',
};

/**
 * Cola entre o núcleo (Game), a cena 3D (ChessScene) e a interface (Hud/Modal).
 * Mantém apenas o estado de interação: qual peça está selecionada.
 */
export class GameController {
  constructor({ game, scene, hud, promotionModal }) {
    this.game = game;
    this.scene = scene;
    this.hud = hud;
    this.promotionModal = promotionModal;

    this.selected = null; // { x, z }
    this.selectedMoves = []; // lances legais da peça selecionada
    this.awaitingPromotion = false;
  }

  start() {
    this.scene.onSquareClick = (x, z) => this.handleSquareClick(x, z);
    this.hud.bind({ onReset: () => this.reset() });
    this.scene.showPosition(this.game.position);
    this.refresh();
  }

  /**
   * Primeiro clique: seleciona uma peça da vez. Segundo clique: joga o lance, se a casa
   * for um destino legal; senão, troca a seleção ou desmarca.
   */
  async handleSquareClick(x, z) {
    if (this.awaitingPromotion || this.game.status.over) return;

    if (this.selected) {
      const candidates = this.selectedMoves.filter((m) => m.to.x === x && m.to.z === z);
      if (candidates.length > 0) {
        await this.commit(candidates);
        return;
      }
    }

    const piece = this.game.position.board[z][x];
    if (piece && piece.color === this.game.turn) {
      this.selected = { x, z };
      this.selectedMoves = this.game.movesFrom(x, z);
    } else {
      this.clearSelection();
    }
    this.refreshHighlights();
  }

  /** `candidates`: um lance normal, ou quatro (uma por peça) quando há promoção. */
  async commit(candidates) {
    let move = candidates[0];

    if (candidates.length > 1) {
      this.awaitingPromotion = true;
      const choice = await this.promotionModal.choose();
      this.awaitingPromotion = false;
      if (!choice) return; // cancelou: mantém a seleção
      move = candidates.find((m) => m.promotion === choice);
    }

    const result = this.game.play(move);
    if (!result) return;

    this.clearSelection();
    this.scene.showPosition(this.game.position);
    this.refresh();
  }

  /** Reinicia a partida: posição inicial, pontuação zerada e vez das brancas. */
  reset() {
    if (this.awaitingPromotion) return;
    this.game.reset();
    this.clearSelection();
    this.scene.showPosition(this.game.position);
    this.refresh();
  }

  clearSelection() {
    this.selected = null;
    this.selectedMoves = [];
  }

  // --- Sincronização da interface -----------------------------------------

  refresh() {
    const { status } = this.game;

    this.hud.setTurn(this.game.turn);
    this.hud.setScore(this.game.score);

    if (status.over) {
      const kind = status.result === 'checkmate' ? 'win' : 'draw';
      this.hud.showBanner(BANNER_TEXT[status.result](status.winner), kind, { persistent: true });
    } else if (status.check) {
      this.hud.showBanner('XEQUE! O REI ESTÁ AMEAÇADO!', 'check');
    } else {
      this.hud.hideBanner();
    }

    this.refreshHighlights();
  }

  refreshHighlights() {
    this.scene.setHighlights({
      selected: this.selected,
      targets: this.selectedMoves.map((m) => ({ x: m.to.x, z: m.to.z, capture: m.captured !== null })),
    });
  }
}
