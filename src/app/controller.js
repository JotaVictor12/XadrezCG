import { findKing } from '../core/position.js';

const BANNER_TEXT = {
  checkmate: (winner) => `XEQUE-MATE! VITÓRIA DE ${winner.toUpperCase()}`,
  stalemate: () => 'EMPATE POR AFOGAMENTO!',
  'insufficient-material': () => 'EMPATE: MATERIAL INSUFICIENTE',
  'fifty-move': () => 'EMPATE: REGRA DOS 50 LANCES',
  repetition: () => 'EMPATE: TRIPLA REPETIÇÃO',
};

/**
 * Cola entre o núcleo (Game), a cena 3D (ChessScene) e a interface (Hud, menu e modal).
 * Mantém apenas o estado de interação: nomes dos jogadores e qual peça está selecionada.
 */
export class GameController {
  constructor({ game, scene, hud, promotionModal, playerMenu }) {
    this.game = game;
    this.scene = scene;
    this.hud = hud;
    this.promotionModal = promotionModal;
    this.playerMenu = playerMenu;

    this.players = { w: 'Player 1', b: 'Player 2' };
    this.inMenu = false;

    this.selected = null; // { x, z }
    this.selectedMoves = []; // lances legais da peça selecionada
    this.awaitingPromotion = false;
  }

  start(skinKey) {
    this.scene.onSquareClick = (x, z) => this.handleSquareClick(x, z);
    this.hud.setSkin(skinKey);
    this.hud.bind({
      onFlip: () => this.scene.flipCamera(),
      onUndo: () => this.undo(),
      onReset: () => this.reset(),
      onSkinChange: (key) => this.scene.setSkin(key),
    });
    this.scene.showPosition(this.game.position);
    this.refresh();
    this.scene.start();
    this.openMenu();
  }

  /** Mostra o menu de nomes; o tabuleiro fica bloqueado até começar a partida. */
  async openMenu() {
    this.inMenu = true;
    this.players = await this.playerMenu.ask(this.players);
    this.inMenu = false;
    this.refresh();
  }

  /**
   * Primeiro clique: seleciona uma peça da vez. Segundo clique: joga o lance, se a casa
   * for um destino legal; senão, troca a seleção ou desmarca.
   */
  async handleSquareClick(x, z) {
    if (this.inMenu || this.awaitingPromotion || this.game.status.over) return;

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
    this.scene.animateMove(result.move);
    if (result.status.result === 'checkmate') this.scene.celebrate();
    this.refresh();
  }

  /** Desfaz o último lance (a pontuação é recalculada a partir do histórico). */
  undo() {
    if (this.inMenu || this.awaitingPromotion || !this.game.undo()) return;
    this.clearSelection();
    this.scene.showPosition(this.game.position);
    this.refresh();
  }

  /** Reinicia a partida (posição inicial, pontuação zerada) e volta para o menu de nomes. */
  reset() {
    if (this.inMenu || this.awaitingPromotion) return;
    this.game.reset();
    this.clearSelection();
    this.scene.showPosition(this.game.position);
    this.refresh();
    this.openMenu();
  }

  clearSelection() {
    this.selected = null;
    this.selectedMoves = [];
  }

  // --- Sincronização da interface -----------------------------------------

  refresh() {
    const { status } = this.game;

    this.hud.setTurn(this.game.turn, this.players[this.game.turn]);
    this.hud.setScore(this.game.score);
    this.hud.renderHistory(this.game.sanMoves);
    this.hud.setUndoEnabled(this.game.history.length > 0);

    if (status.over) {
      const kind = status.result === 'checkmate' ? 'win' : 'draw';
      this.hud.showBanner(BANNER_TEXT[status.result](this.players[status.winner] ?? ''), kind, { persistent: true });
    } else if (status.check) {
      this.hud.showBanner('XEQUE! O REI ESTÁ AMEAÇADO!', 'check');
    } else {
      this.hud.hideBanner();
    }

    this.refreshHighlights();
  }

  refreshHighlights() {
    const last = this.game.lastMove;
    this.scene.setHighlights({
      selected: this.selected,
      targets: this.selectedMoves.map((m) => ({ x: m.to.x, z: m.to.z, capture: m.captured !== null })),
      check: this.game.status.check ? findKing(this.game.position.board, this.game.turn) : null,
      lastMove: last ? { from: last.from, to: last.to } : null,
    });
  }
}
