/**
 * Notação algébrica padrão (SAN): "e4", "Nbd2", "exd5", "O-O", "e8=Q+", "Qh4#".
 */
import { FILES, squareName } from './constants.js';
import { applyMove, generateLegalMoves, isInCheck } from './position.js';

export function toSAN(position, move, legalMoves = generateLegalMoves(position)) {
  let san;

  if (move.castle) {
    san = move.castle === 'K' ? 'O-O' : 'O-O-O';
  } else {
    const destination = squareName(move.to.x, move.to.z);

    if (move.piece === 'P') {
      san = move.captured ? `${FILES[move.from.x]}x${destination}` : destination;
      if (move.promotion) san += `=${move.promotion}`;
    } else {
      // Desambiguação: outra peça do mesmo tipo também chega à mesma casa?
      const rivals = legalMoves.filter(
        (m) =>
          m.piece === move.piece &&
          m.to.x === move.to.x &&
          m.to.z === move.to.z &&
          !(m.from.x === move.from.x && m.from.z === move.from.z),
      );
      let hint = '';
      if (rivals.length > 0) {
        const sameFile = rivals.some((m) => m.from.x === move.from.x);
        const sameRank = rivals.some((m) => m.from.z === move.from.z);
        if (!sameFile) hint = FILES[move.from.x];
        else if (!sameRank) hint = String(8 - move.from.z);
        else hint = squareName(move.from.x, move.from.z);
      }
      san = `${move.piece}${hint}${move.captured ? 'x' : ''}${destination}`;
    }
  }

  const after = applyMove(position, move);
  if (isInCheck(after, after.turn)) {
    san += generateLegalMoves(after).length === 0 ? '#' : '+';
  }
  return san;
}
