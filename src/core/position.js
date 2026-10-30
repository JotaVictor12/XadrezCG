/**
 * Posição do tabuleiro lida de uma FEN (só a disposição das peças).
 *
 * Nenhuma dependência de Three.js ou do DOM: a cena 3D apenas desenha o
 * que estiver nesta estrutura.
 *
 * Posição:
 *   {
 *     board: matriz 8x8 de null | { type, color }   (board[z][x])
 *   }
 */
import { WHITE, BLACK } from './constants.js';

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const emptyBoard = () => Array.from({ length: 8 }, () => Array(8).fill(null));

/** Lê o primeiro campo da FEN: as 8 fileiras, da 8ª até a 1ª (maiúsculas = brancas). */
export function fromFEN(fen) {
  const [placement] = fen.trim().split(/\s+/);
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

  return { board };
}

export const createInitialPosition = () => fromFEN(INITIAL_FEN);
