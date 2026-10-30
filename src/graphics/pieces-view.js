import * as THREE from 'three';
import { createPieceObject } from './piece-geometry.js';

const toWorld = (x, z) => new THREE.Vector3(x - 3.5, 0, z - 3.5);

/**
 * Representação 3D das peças: coloca cada peça de uma posição na sua casa.
 */
export class PiecesView {
  constructor(scene, skin) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.materials = {
      w: new THREE.MeshBasicMaterial({ color: skin.lightPiece }),
      b: new THREE.MeshBasicMaterial({ color: skin.darkPiece }),
    };
  }

  /** Reconstrói todas as peças a partir de uma posição. */
  sync(position) {
    for (const child of [...this.group.children]) this.group.remove(child);

    position.board.forEach((row, z) => {
      row.forEach((piece, x) => {
        if (piece) this._spawn(piece.type, piece.color, x, z);
      });
    });
  }

  _spawn(type, color, x, z) {
    const object = createPieceObject(type, this.materials[color]);
    if (color === 'b') object.rotation.y = Math.PI; // pretas olham para as brancas
    object.position.copy(toWorld(x, z));
    object.userData = { type, color, x, z };
    this.group.add(object);
    return object;
  }
}
