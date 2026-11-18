/**
 * Constantes e utilitários de coordenadas do tabuleiro.
 *
 * Convenção de coordenadas (a mesma da cena 3D):
 *   x = coluna, 0..7  (0 = coluna "a", 7 = coluna "h")
 *   z = linha,  0..7  (0 = 8ª fileira, onde ficam as pretas; 7 = 1ª fileira)
 */
export const WHITE = 'w';
export const BLACK = 'b';

export const FILES = 'abcdefgh';
export const PROMOTION_TYPES = ['Q', 'R', 'B', 'N'];

export const opposite = (color) => (color === WHITE ? BLACK : WHITE);
export const inside = (x, z) => x >= 0 && x < 8 && z >= 0 && z < 8;

/** (4, 6) -> "e2" */
export const squareName = (x, z) => `${FILES[x]}${8 - z}`;

/** "e2" -> { x: 4, z: 6 } */
export const parseSquare = (name) => ({ x: FILES.indexOf(name[0]), z: 8 - Number(name[1]) });

/** Valor de cada peça na pontuação (o rei não é capturado, então não vale pontos). */
export const PIECE_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9 };
