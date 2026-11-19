import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const cache = new Map(); // arquivo → textura (cada imagem é carregada uma vez só)

/**
 * Carrega uma imagem de assets/textures/.
 * @param {string} file nome do arquivo
 * @param {number} repeat repetições da imagem a cada 1 unidade de UV
 */
export function loadTexture(file, repeat = 1) {
  if (!cache.has(file)) {
    const texture = loader.load(`./assets/textures/${file}`);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; // UV fora de 0..1 repete a imagem
    texture.anisotropy = 8; // mantém a textura nítida nas superfícies vistas de lado
    cache.set(file, texture);
  }
  const texture = cache.get(file);
  texture.repeat.set(repeat, repeat);
  return texture;
}
