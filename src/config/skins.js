/**
 * Tema visual ("skin"). Define as texturas das peças e do tabuleiro (imagens em
 * assets/textures/) e as cores das coordenadas e do fundo.
 */
export const SKINS = {
  classic: {
    label: 'Clássico (Madeira & Ébano)',
    textures: {
      lightPiece: 'peca-clara.jpeg',
      darkPiece: 'peca-escura.jpeg',
      boardLight: 'casa-clara.jpeg',
      boardDark: 'casa-escura.jpeg',
      boardBorder: 'moldura.jpeg',
    },
    boardLabel: 0xe8d3a7,
    bg: 0x0a0c10,
  },
};

export const DEFAULT_SKIN = 'classic';
