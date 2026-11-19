/**
 * Temas visuais ("skins"). Cada skin define as texturas das peças e do tabuleiro
 * (imagens em assets/textures/), os parâmetros do material das peças e as cores das
 * coordenadas e do fundo. Para adicionar um tema, basta incluir uma entrada aqui e uma
 * <option> no seletor do index.html.
 *
 * As peças usam MeshPhysicalMaterial (PBR): a textura dá a cor, `roughness` e `metalness`
 * definem como a luz é refletida e `clearcoat` dá o brilho de verniz/polimento.
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
    lightPiece: { roughness: 0.35, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.2 },
    darkPiece: { roughness: 0.4, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.2 },
    boardLabel: 0xe8d3a7,
    bg: 0x0a0c10,
  },
  cyberpunk: {
    label: 'Cyberpunk Neon',
    textures: {
      lightPiece: 'cyberpunk/peca-clara.jpeg',
      darkPiece: 'cyberpunk/peca-escura.jpeg',
      boardLight: 'cyberpunk/casa-clara.jpeg',
      boardDark: 'cyberpunk/casa-escura.jpeg',
      boardBorder: 'cyberpunk/moldura.jpeg',
    },
    // Com `emissive`, a própria textura vira mapa de emissão: as linhas claras brilham no escuro.
    lightPiece: { roughness: 0.2, metalness: 0.5, emissive: 0x66ffff, emissiveIntensity: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.1 },
    darkPiece: { roughness: 0.2, metalness: 0.5, emissive: 0xff66aa, emissiveIntensity: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.1 },
    boardLabel: 0x00f0ff,
    bg: 0x05050d,
  },
  metallic: {
    label: 'Ouro & Prata Metalizado',
    textures: {
      lightPiece: 'metalico/peca-clara.jpeg',
      darkPiece: 'metalico/peca-escura.jpeg',
      boardLight: 'metalico/casa-clara.jpeg',
      boardDark: 'metalico/casa-escura.jpeg',
      boardBorder: 'metalico/moldura.jpeg',
    },
    lightPiece: { roughness: 0.3, metalness: 0.6, clearcoat: 0.3, clearcoatRoughness: 0.1 },
    darkPiece: { roughness: 0.3, metalness: 0.6, clearcoat: 0.3, clearcoatRoughness: 0.1 },
    boardLabel: 0xffd700,
    bg: 0x080808,
  },
};

export const DEFAULT_SKIN = 'classic';

/** Cores de destaque das casas (independentes da skin). */
export const HIGHLIGHT_COLORS = {
  selected: 0x00d2ff,
  move: 0x20bf6b,
  capture: 0xff3366,
  check: 0xff0000,
  lastMove: 0xfacc15,
};
