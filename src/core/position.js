/**
 * Estado de uma posição de xadrez e regras de movimento.
 *
 * Tudo aqui é função pura sobre objetos simples: nenhuma dependência de
 * Three.js ou do DOM.
 *
 * Posição:
 *   {
 *     board:     matriz 8x8 de null | { type, color }   (board[z][x])
 *     turn:      'w' | 'b'
 *     castling:  { wK, wQ, bK, bQ }  (direitos de roque)
 *     enPassant: { x, z } | null     (casa "de passagem" após avanço duplo)
 *     halfmove:  lances sem captura nem movimento de peão (regra dos 50 lances)
 *     fullmove:  número do lance completo
 *   }
 *
 * Lance:
 *   {
 *     from, to:   { x, z }
 *     piece:      'P' | 'N' | 'B' | 'R' | 'Q' | 'K'
 *     color:      'w' | 'b'
 *     captured:   tipo da peça capturada | null
 *     capturedAt: { x, z } | null   (difere de `to` no en passant)
 *     promotion:  'Q' | 'R' | 'B' | 'N' | null
 *     castle:     'K' (roque curto) | 'Q' (roque longo) | null
 *     enPassant:  boolean
 *     doublePush: boolean
 *   }
 */
import { WHITE, BLACK, PROMOTION_TYPES, opposite, inside, squareName, parseSquare } from './constants.js';

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const KNIGHT_OFFSETS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_OFFSETS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// Casas iniciais das torres e o direito de roque associado a cada uma.
const ROOK_HOMES = [
  { x: 0, z: 7, right: 'wQ' },
  { x: 7, z: 7, right: 'wK' },
  { x: 0, z: 0, right: 'bQ' },
  { x: 7, z: 0, right: 'bK' },
];

// ---------------------------------------------------------------------------
// Criação, clonagem e serialização (FEN)
// ---------------------------------------------------------------------------

export const emptyBoard = () => Array.from({ length: 8 }, () => Array(8).fill(null));

export function clonePosition(position) {
  return {
    ...position,
    board: position.board.map((row) => row.slice()),
    castling: { ...position.castling },
  };
}

export function fromFEN(fen) {
  const [placement, turn = 'w', rights = '-', ep = '-', half = '0', full = '1'] = fen.trim().split(/\s+/);
  const ranks = placement.split('/');
  if (ranks.length !== 8) throw new Error(`FEN inválido: ${fen}`);

  const board = emptyBoard();
  ranks.forEach((rank, z) => {
    let x = 0;
    for (const ch of rank) {
      if (/\d/.test(ch)) {
        x += Number(ch);
      } else {
        const isWhite = ch === ch.toUpperCase();
        board[z][x] = { type: ch.toUpperCase(), color: isWhite ? WHITE : BLACK };
        x += 1;
      }
    }
    if (x !== 8) throw new Error(`FEN inválido (fileira ${8 - z}): ${fen}`);
  });

  return {
    board,
    turn,
    castling: { wK: rights.includes('K'), wQ: rights.includes('Q'), bK: rights.includes('k'), bQ: rights.includes('q') },
    enPassant: ep === '-' ? null : parseSquare(ep),
    halfmove: Number(half),
    fullmove: Number(full),
  };
}

export function toFEN(position) {
  const placement = position.board
    .map((row) => {
      let text = '';
      let empty = 0;
      for (const cell of row) {
        if (!cell) {
          empty += 1;
          continue;
        }
        if (empty) text += empty;
        empty = 0;
        text += cell.color === WHITE ? cell.type : cell.type.toLowerCase();
      }
      return empty ? text + empty : text;
    })
    .join('/');

  const { wK, wQ, bK, bQ } = position.castling;
  const rights = `${wK ? 'K' : ''}${wQ ? 'Q' : ''}${bK ? 'k' : ''}${bQ ? 'q' : ''}` || '-';
  const ep = position.enPassant ? squareName(position.enPassant.x, position.enPassant.z) : '-';
  return `${placement} ${position.turn} ${rights} ${ep} ${position.halfmove} ${position.fullmove}`;
}

export const createInitialPosition = () => fromFEN(INITIAL_FEN);

// ---------------------------------------------------------------------------
// Ataques e xeque
// ---------------------------------------------------------------------------

const pieceAt = (board, x, z) => (inside(x, z) ? board[z][x] : null);

function firstPieceAlong(board, x, z, dx, dz) {
  let cx = x + dx;
  let cz = z + dz;
  while (inside(cx, cz)) {
    if (board[cz][cx]) return board[cz][cx];
    cx += dx;
    cz += dz;
  }
  return null;
}

/** A casa (x, z) está sob ataque de alguma peça da cor `by`? */
export function isAttacked(board, x, z, by) {
  // Peões brancos andam para z menor; a casa de onde atacariam (x, z) fica em z + 1.
  const pawnRow = z - (by === WHITE ? -1 : 1);
  for (const dx of [-1, 1]) {
    const p = pieceAt(board, x + dx, pawnRow);
    if (p && p.color === by && p.type === 'P') return true;
  }
  for (const [dx, dz] of KNIGHT_OFFSETS) {
    const p = pieceAt(board, x + dx, z + dz);
    if (p && p.color === by && p.type === 'N') return true;
  }
  for (const [dx, dz] of KING_OFFSETS) {
    const p = pieceAt(board, x + dx, z + dz);
    if (p && p.color === by && p.type === 'K') return true;
  }
  for (const [dx, dz] of ROOK_DIRS) {
    const p = firstPieceAlong(board, x, z, dx, dz);
    if (p && p.color === by && (p.type === 'R' || p.type === 'Q')) return true;
  }
  for (const [dx, dz] of BISHOP_DIRS) {
    const p = firstPieceAlong(board, x, z, dx, dz);
    if (p && p.color === by && (p.type === 'B' || p.type === 'Q')) return true;
  }
  return false;
}

export function findKing(board, color) {
  for (let z = 0; z < 8; z += 1) {
    for (let x = 0; x < 8; x += 1) {
      const p = board[z][x];
      if (p && p.type === 'K' && p.color === color) return { x, z };
    }
  }
  return null;
}

export function isInCheck(position, color = position.turn) {
  const king = findKing(position.board, color);
  return king ? isAttacked(position.board, king.x, king.z, opposite(color)) : false;
}

// ---------------------------------------------------------------------------
// Geração de lances
// ---------------------------------------------------------------------------

const createMove = (piece, color, from, to, extra = {}) => ({
  from,
  to,
  piece,
  color,
  captured: null,
  capturedAt: null,
  promotion: null,
  castle: null,
  enPassant: false,
  doublePush: false,
  ...extra,
});

function pawnMoves(position, x, z, list) {
  const { board, turn: color } = position;
  const dir = color === WHITE ? -1 : 1;
  const startRow = color === WHITE ? 6 : 1;
  const promotionRow = color === WHITE ? 0 : 7;
  const from = { x, z };

  const push = (to, extra = {}) => {
    if (to.z === promotionRow) {
      for (const promotion of PROMOTION_TYPES) list.push(createMove('P', color, from, to, { ...extra, promotion }));
    } else {
      list.push(createMove('P', color, from, to, extra));
    }
  };

  if (inside(x, z + dir) && !board[z + dir][x]) {
    push({ x, z: z + dir });
    if (z === startRow && !board[z + 2 * dir][x]) {
      list.push(createMove('P', color, from, { x, z: z + 2 * dir }, { doublePush: true }));
    }
  }

  for (const dx of [-1, 1]) {
    const nx = x + dx;
    const nz = z + dir;
    if (!inside(nx, nz)) continue;
    const target = board[nz][nx];
    if (target && target.color !== color) {
      push({ x: nx, z: nz }, { captured: target.type, capturedAt: { x: nx, z: nz } });
    } else if (!target && position.enPassant && position.enPassant.x === nx && position.enPassant.z === nz) {
      list.push(
        createMove('P', color, from, { x: nx, z: nz }, { captured: 'P', capturedAt: { x: nx, z }, enPassant: true }),
      );
    }
  }
}

function stepMoves(position, x, z, offsets, list) {
  const { board, turn: color } = position;
  const type = board[z][x].type;
  for (const [dx, dz] of offsets) {
    const nx = x + dx;
    const nz = z + dz;
    if (!inside(nx, nz)) continue;
    const target = board[nz][nx];
    if (!target) list.push(createMove(type, color, { x, z }, { x: nx, z: nz }));
    else if (target.color !== color) {
      list.push(createMove(type, color, { x, z }, { x: nx, z: nz }, { captured: target.type, capturedAt: { x: nx, z: nz } }));
    }
  }
}

function slideMoves(position, x, z, dirs, list) {
  const { board, turn: color } = position;
  const type = board[z][x].type;
  for (const [dx, dz] of dirs) {
    let nx = x + dx;
    let nz = z + dz;
    while (inside(nx, nz)) {
      const target = board[nz][nx];
      if (!target) {
        list.push(createMove(type, color, { x, z }, { x: nx, z: nz }));
      } else {
        if (target.color !== color) {
          list.push(createMove(type, color, { x, z }, { x: nx, z: nz }, { captured: target.type, capturedAt: { x: nx, z: nz } }));
        }
        break;
      }
      nx += dx;
      nz += dz;
    }
  }
}

function castlingMoves(position, list) {
  const { board, turn: color } = position;
  const row = color === WHITE ? 7 : 0;
  const enemy = opposite(color);
  const king = board[row][4];
  if (!king || king.type !== 'K' || king.color !== color) return;
  if (isAttacked(board, 4, row, enemy)) return;

  const isOwnRook = (x) => board[row][x]?.type === 'R' && board[row][x].color === color;
  const from = { x: 4, z: row };

  if (
    position.castling[`${color}K`] && isOwnRook(7) &&
    !board[row][5] && !board[row][6] &&
    !isAttacked(board, 5, row, enemy) && !isAttacked(board, 6, row, enemy)
  ) {
    list.push(createMove('K', color, from, { x: 6, z: row }, { castle: 'K' }));
  }
  if (
    position.castling[`${color}Q`] && isOwnRook(0) &&
    !board[row][1] && !board[row][2] && !board[row][3] &&
    !isAttacked(board, 3, row, enemy) && !isAttacked(board, 2, row, enemy)
  ) {
    list.push(createMove('K', color, from, { x: 2, z: row }, { castle: 'Q' }));
  }
}

/** Lances pseudo-legais da cor que joga (podem deixar o próprio rei em xeque). */
export function generatePseudoMoves(position) {
  const list = [];
  for (let z = 0; z < 8; z += 1) {
    for (let x = 0; x < 8; x += 1) {
      const piece = position.board[z][x];
      if (!piece || piece.color !== position.turn) continue;
      switch (piece.type) {
        case 'P': pawnMoves(position, x, z, list); break;
        case 'N': stepMoves(position, x, z, KNIGHT_OFFSETS, list); break;
        case 'K': stepMoves(position, x, z, KING_OFFSETS, list); break;
        case 'R': slideMoves(position, x, z, ROOK_DIRS, list); break;
        case 'B': slideMoves(position, x, z, BISHOP_DIRS, list); break;
        case 'Q': slideMoves(position, x, z, [...ROOK_DIRS, ...BISHOP_DIRS], list); break;
        default: break;
      }
    }
  }
  castlingMoves(position, list);
  return list;
}

// ---------------------------------------------------------------------------
// Aplicação de lances
// ---------------------------------------------------------------------------

function revokeRookRights(castling, square) {
  for (const home of ROOK_HOMES) {
    if (home.x === square.x && home.z === square.z) castling[home.right] = false;
  }
}

/** Devolve uma NOVA posição com o lance aplicado (não altera a original). */
export function applyMove(position, move) {
  const next = clonePosition(position);
  const { board } = next;
  const { from, to, color } = move;
  const piece = board[from.z][from.x];

  if (move.capturedAt) board[move.capturedAt.z][move.capturedAt.x] = null;
  board[from.z][from.x] = null;
  board[to.z][to.x] = move.promotion ? { type: move.promotion, color } : piece;

  if (move.castle) {
    const rookFrom = move.castle === 'K' ? 7 : 0;
    const rookTo = move.castle === 'K' ? 5 : 3;
    board[from.z][rookTo] = board[from.z][rookFrom];
    board[from.z][rookFrom] = null;
  }

  if (move.piece === 'K') {
    next.castling[`${color}K`] = false;
    next.castling[`${color}Q`] = false;
  }
  revokeRookRights(next.castling, from); // torre se moveu
  revokeRookRights(next.castling, to); // torre foi capturada

  next.enPassant = move.doublePush ? { x: from.x, z: (from.z + to.z) / 2 } : null;
  next.halfmove = move.piece === 'P' || move.captured ? 0 : position.halfmove + 1;
  if (color === BLACK) next.fullmove += 1;
  next.turn = opposite(color);
  return next;
}

/** Lances legais: pseudo-legais que não deixam o próprio rei em xeque. */
export function generateLegalMoves(position) {
  const color = position.turn;
  return generatePseudoMoves(position).filter((move) => !isInCheck(applyMove(position, move), color));
}

// ---------------------------------------------------------------------------
// Material insuficiente
// ---------------------------------------------------------------------------

/** Nenhum dos lados consegue dar xeque-mate (K x K, K+B x K, K+N x K, bispos de mesma cor). */
export function hasInsufficientMaterial(position) {
  const minors = [];
  for (let z = 0; z < 8; z += 1) {
    for (let x = 0; x < 8; x += 1) {
      const p = position.board[z][x];
      if (!p || p.type === 'K') continue;
      if (p.type !== 'B' && p.type !== 'N') return false; // peão, torre ou dama
      minors.push({ type: p.type, shade: (x + z) % 2 });
    }
  }
  if (minors.length <= 1) return true;
  return minors.every((m) => m.type === 'B' && m.shade === minors[0].shade);
}
