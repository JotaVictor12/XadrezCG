import * as THREE from 'three';
import { createPieceObject } from './piece-geometry.js';
import { easeInOutSine } from './animator.js';
import { loadTexture } from './textures.js';

const HOP_HEIGHT = 0.8;
const MOVE_DURATION_MS = 350;
const PROMOTION_SPARK = 0x00f0ff;

const toWorld = (x, z) => new THREE.Vector3(x - 3.5, 0, z - 3.5);

/**
 * Representação 3D das peças. Mantém uma grade `grid[z][x]` com o objeto 3D de
 * cada casa e se atualiza a partir dos lances jogados pelo núcleo (`move`) ou de
 * uma posição completa (`sync`, usado em reiniciar/desfazer).
 */
export class PiecesView {
  constructor(scene, animator, effects, skin) {
    this.animator = animator;
    this.effects = effects;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.grid = Array.from({ length: 8 }, () => Array(8).fill(null));
    this.materials = this._createMaterials(skin);
  }

  /**
   * Material PBR de cada cor, com a textura do tema. Se o tema tiver `emissive`, a mesma
   * imagem também é o mapa de emissão: só as partes claras da textura brilham.
   */
  _createMaterials(skin) {
    const material = (file, params) => {
      const texture = loadTexture(file);
      return new THREE.MeshPhysicalMaterial({ ...params, map: texture, emissiveMap: params.emissive ? texture : null });
    };
    return {
      w: material(skin.textures.lightPiece, skin.lightPiece),
      b: material(skin.textures.darkPiece, skin.darkPiece),
    };
  }

  /** Troca o material de todas as peças pelo do novo tema. */
  applySkin(skin) {
    const previous = this.materials;
    this.materials = this._createMaterials(skin);
    for (const root of this.group.children) {
      root.traverse((child) => {
        if (child.isMesh) child.material = this.materials[root.userData.color];
      });
    }
    previous.w.dispose();
    previous.b.dispose();
  }

  /** Reconstrói todas as peças a partir de uma posição (sem animação). */
  sync(position) {
    this.animator.clear();
    for (const child of [...this.group.children]) this.group.remove(child);
    this.grid = Array.from({ length: 8 }, () => Array(8).fill(null));

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
    object.userData = { isPiece: true, type, color, x, z }; // usado pelo raycasting
    this.group.add(object);
    this.grid[z][x] = object;
    return object;
  }

  /** Anima um lance já validado pelo núcleo (captura, roque e promoção inclusos). */
  move(move) {
    const { from, to } = move;
    const mover = this.grid[from.z][from.x];
    if (!mover) return;

    if (move.capturedAt) {
      const { x, z } = move.capturedAt;
      const victim = this.grid[z][x];
      if (victim) {
        this.effects.shatter(victim.position.clone());
        this.animator.cancel(victim);
        this.group.remove(victim);
        this.grid[z][x] = null;
      }
    }

    this._relocate(mover, to);
    this._glide(mover, to, () => {
      if (move.promotion) this._promote(mover, move.promotion, to);
    });

    if (move.castle) {
      const rookFrom = move.castle === 'K' ? 7 : 0;
      const rookTo = move.castle === 'K' ? 5 : 3;
      const rook = this.grid[from.z][rookFrom];
      if (rook) {
        this._relocate(rook, { x: rookTo, z: from.z });
        this._glide(rook, { x: rookTo, z: from.z });
      }
    }
  }

  _relocate(object, to) {
    const { x, z } = object.userData;
    this.grid[z][x] = null;
    this.grid[to.z][to.x] = object;
    object.userData.x = to.x;
    object.userData.z = to.z;
  }

  /** Desliza a peça até a casa de destino, com um salto (seno da fração do tempo). */
  _glide(object, to, onComplete) {
    const start = object.position.clone();
    const target = toWorld(to.x, to.z);
    this.animator.run({
      key: object,
      duration: MOVE_DURATION_MS,
      onUpdate: (t) => {
        object.position.lerpVectors(start, target, easeInOutSine(t));
        object.position.y = t < 1 ? Math.sin(t * Math.PI) * HOP_HEIGHT : 0;
      },
      onComplete,
    });
  }

  _promote(pawn, type, to) {
    // Se o peão foi capturado (ou o tabuleiro ressincronizado) durante a animação, não faz nada.
    if (this.grid[to.z][to.x] !== pawn) return;
    const { color } = pawn.userData;
    this.group.remove(pawn);
    const promoted = this._spawn(type, color, to.x, to.z);
    this.effects.shatter(promoted.position.clone(), PROMOTION_SPARK);
  }
}
