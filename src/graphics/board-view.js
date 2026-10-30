import * as THREE from 'three';

const FRAME_WIDTH = 0.5; // largura da moldura ao redor das 8×8 casas
const BEVEL = 0.04; // chanfro das bordas da moldura e da base
const FILES = 'abcdefgh';

/** Contorno quadrado centrado na origem, com cantos arredondados opcionais. */
function squareOutline(size, radius = 0, path = new THREE.Shape()) {
  const h = size / 2;
  path.moveTo(-h + radius, -h);
  path.lineTo(h - radius, -h);
  if (radius) path.quadraticCurveTo(h, -h, h, -h + radius);
  path.lineTo(h, h - radius);
  if (radius) path.quadraticCurveTo(h, h, h - radius, h);
  path.lineTo(-h + radius, h);
  if (radius) path.quadraticCurveTo(-h, h, -h, h - radius);
  path.lineTo(-h, -h + radius);
  if (radius) path.quadraticCurveTo(-h, -h, -h + radius, -h);
  return path;
}

/** Extruda um contorno deitado no plano XZ, com bordas chanfradas, de y = 0 até `height`. */
function flatSlab(shape, height) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height - 2 * BEVEL,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 3,
    curveSegments: 6,
  });
  geometry.rotateX(-Math.PI / 2); // a extrusão (eixo z) passa a ser a altura (eixo y)
  geometry.translate(0, BEVEL, 0);
  return geometry;
}

/**
 * Tabuleiro 3D: 64 casas, moldura em relevo com as coordenadas (a–h, 1–8) e base.
 */
export class BoardView {
  constructor(scene, skin) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.squares = [];

    // Casas: caixas 1 × 0,3 × 1 com o topo em y = 0.
    const geometry = new THREE.BoxGeometry(1, 0.3, 1);
    for (let x = 0; x < 8; x += 1) {
      for (let z = 0; z < 8; z += 1) {
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
        mesh.position.set(x - 3.5, -0.15, z - 3.5);
        mesh.userData = { x, z };
        this.group.add(mesh);
        this.squares.push(mesh);
      }
    }

    // Moldura: anel quadrado (contorno externo com um furo do tamanho das casas)
    // que fica 0,05 acima delas. O chanfro cresce para fora, então os tamanhos o descontam.
    const frameShape = squareOutline(8 + 2 * FRAME_WIDTH - 2 * BEVEL, 0.15);
    frameShape.holes.push(squareOutline(8 + 2 * BEVEL, 0, new THREE.Path()));
    this.border = new THREE.Mesh(flatSlab(frameShape, 0.4), new THREE.MeshBasicMaterial());
    this.border.position.y = -0.35;
    this.group.add(this.border);

    // Base: placa mais larga e mais escura sob a moldura.
    this.base = new THREE.Mesh(flatSlab(squareOutline(9.5 - 2 * BEVEL, 0.3), 0.2), new THREE.MeshBasicMaterial());
    this.base.position.y = -0.55;
    this.group.add(this.base);

    this._addCoordinates();
    this.applySkin(skin);
  }

  /** Letras (colunas) e números (fileiras) na moldura, legíveis dos dois lados. */
  _addCoordinates() {
    this.labelMaterials = new Map(); // caractere → material com a textura
    const geometry = new THREE.PlaneGeometry(0.32, 0.32);
    geometry.rotateX(-Math.PI / 2); // deitado sobre a moldura
    const edge = 4 + FRAME_WIDTH / 2;
    for (let i = 0; i < 8; i += 1) {
      const offset = i - 3.5;
      this._addLabel(FILES[i], geometry, offset, edge, 0); // lado das brancas
      this._addLabel(FILES[i], geometry, offset, -edge, Math.PI); // lado das pretas
      this._addLabel(String(8 - i), geometry, -edge, offset, 0);
      this._addLabel(String(8 - i), geometry, edge, offset, Math.PI);
    }
  }

  _addLabel(text, geometry, x, z, rotationY) {
    const label = new THREE.Mesh(geometry, this._labelMaterial(text));
    label.position.set(x, 0.052, z);
    label.rotation.y = rotationY;
    this.group.add(label);
  }

  /** Textura desenhada em um <canvas> 2D (uma por caractere, reaproveitada). */
  _labelMaterial(text) {
    if (!this.labelMaterials.has(text)) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 44px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 34);
      const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true });
      this.labelMaterials.set(text, material);
    }
    return this.labelMaterials.get(text);
  }

  applySkin(skin) {
    this.border.material.color.setHex(skin.boardBorder);
    this.base.material.color.setHex(skin.boardBorder).multiplyScalar(0.6);
    for (const material of this.labelMaterials.values()) material.color.setHex(skin.boardLabel);

    // Casa a8 (x = 0, z = 0) é clara: alterna pela paridade de x + z.
    for (const square of this.squares) {
      const { x, z } = square.userData;
      square.material.color.setHex((x + z) % 2 === 0 ? skin.boardLight : skin.boardDark);
    }
  }
}
