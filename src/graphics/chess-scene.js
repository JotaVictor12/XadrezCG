import * as THREE from 'three';
import { SKINS, DEFAULT_SKIN } from '../config/skins.js';
import { BoardView } from './board-view.js';
import { PiecesView } from './pieces-view.js';

/**
 * Cena 3D: renderer, câmera fixa, tabuleiro e peças. Apenas desenha a posição recebida.
 */
export class ChessScene {
  /**
   * @param {HTMLElement} container
   * @param {{ skin?: string }} options
   */
  constructor(container, { skin = DEFAULT_SKIN } = {}) {
    this.container = container;
    this.skin = SKINS[skin];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.skin.bg);

    // Câmera fixa, do lado das brancas, olhando para o centro do tabuleiro.
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(0, 12, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    container.replaceChildren(this.renderer.domElement);

    this.board = new BoardView(this.scene, this.skin);
    this.pieces = new PiecesView(this.scene, this.skin);

    // A cena é estática: só precisa ser desenhada de novo quando o tamanho muda.
    new ResizeObserver(() => this.render()).observe(container);
  }

  /** Mostra uma posição inteira. */
  showPosition(position) {
    this.pieces.sync(position);
    this.render();
  }

  render() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.render(this.scene, this.camera);
  }
}
