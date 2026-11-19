/**
 * Partida de xadrez: posição atual, histórico (em SAN), desfazer, pontuação e detecção
 * de fim de jogo.
 * Não conhece Three.js nem o DOM.
 */
import { opposite, PIECE_VALUES } from './constants.js';
import {
  applyMove,
  createInitialPosition,
  fromFEN,
  generateLegalMoves,
  hasInsufficientMaterial,
  isInCheck,
  toFEN,
} from './position.js';
import { toSAN } from './notation.js';

/** Chave de repetição: peças + vez + roques + en passant (só se a captura for possível). */
function repetitionKey(position, enPassantCapturable) {
  const [placement, turn, rights, ep] = toFEN(position).split(' ');
  return `${placement} ${turn} ${rights} ${enPassantCapturable ? ep : '-'}`;
}

const sameMove = (a, b) =>
  a.from.x === b.from.x &&
  a.from.z === b.from.z &&
  a.to.x === b.to.x &&
  a.to.z === b.to.z &&
  (a.promotion ?? null) === (b.promotion ?? null);

export class Game {
  constructor(fen) {
    this.reset(fen);
  }

  reset(fen) {
    this.position = fen ? fromFEN(fen) : createInitialPosition();
    this.history = []; // { move, san, before }
    this.keys = [];
    this._analyze();
    this.keys.push(this.key);
    this.status = this._computeStatus();
  }

  get turn() {
    return this.position.turn;
  }

  /** Lances legais de uma casa (promoções aparecem 4 vezes, uma por peça). */
  movesFrom(x, z) {
    return this.legalMoves.filter((m) => m.from.x === x && m.from.z === z);
  }

  /**
   * Joga um lance, se for legal. Retorna { move, san, status } ou null.
   * `candidate` precisa ter from, to e (se houver promoção) promotion.
   */
  play(candidate) {
    if (this.status.over) return null;
    const move = this.legalMoves.find((m) => sameMove(m, candidate));
    if (!move) return null;

    const san = toSAN(this.position, move, this.legalMoves);
    this.history.push({ move, san, before: this.position });
    this.position = applyMove(this.position, move);
    this._analyze();
    this.keys.push(this.key);
    this.status = this._computeStatus();
    return { move, san, status: this.status };
  }

  /** Desfaz o último lance. Retorna a entrada do histórico desfeita ou null. */
  undo() {
    const last = this.history.pop();
    if (!last) return null;
    this.keys.pop();
    this.position = last.before;
    this._analyze();
    this.status = this._computeStatus();
    return last;
  }

  /** Lances jogados em notação algébrica (ex.: ["e4", "e5", "Nf3"]). */
  get sanMoves() {
    return this.history.map((entry) => entry.san);
  }

  get lastMove() {
    return this.history.length ? this.history[this.history.length - 1].move : null;
  }

  /**
   * Pontuação: soma do valor das peças que cada cor capturou
   * (peão 1, cavalo 3, bispo 3, torre 5, dama 9).
   */
  get score() {
    const score = { w: 0, b: 0 };
    for (const { move } of this.history) {
      if (move.captured) score[move.color] += PIECE_VALUES[move.captured];
    }
    return score;
  }

  _analyze() {
    this.legalMoves = generateLegalMoves(this.position);
    this.key = repetitionKey(this.position, this.legalMoves.some((m) => m.enPassant));
  }

  /**
   * { over, check, result, winner }
   * result: 'checkmate' | 'stalemate' | 'insufficient-material' | 'fifty-move' | 'repetition' | null
   * Simplificação: 50 lances e tripla repetição encerram a partida automaticamente
   * (no xadrez oficial, são empates "reivindicáveis").
   */
  _computeStatus() {
    const turn = this.position.turn;
    const check = isInCheck(this.position, turn);

    if (this.legalMoves.length === 0) {
      return check
        ? { over: true, check, result: 'checkmate', winner: opposite(turn) }
        : { over: true, check, result: 'stalemate', winner: null };
    }
    if (hasInsufficientMaterial(this.position)) {
      return { over: true, check, result: 'insufficient-material', winner: null };
    }
    if (this.position.halfmove >= 100) {
      return { over: true, check, result: 'fifty-move', winner: null };
    }
    if (this.keys.filter((k) => k === this.key).length >= 3) {
      return { over: true, check, result: 'repetition', winner: null };
    }
    return { over: false, check, result: null, winner: null };
  }
}
