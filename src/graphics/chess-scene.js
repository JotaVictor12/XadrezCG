import * as THREE from 'three';
import { SKINS, DEFAULT_SKIN } from '../config/skins.js';
import { BoardView } from './board-view.js';
import { PiecesView } from './pieces-view.js';

/**
 * Cena 3D: renderer, câmera (duas posições), luzes, tabuleiro e peças com textura.
 * Não conhece as regras do xadrez: desenha a posição recebida e informa qual casa
 * foi clicada (raycasting).
 *
 * Mouse:
 *   clique  seleciona uma peça ou a casa de destino (onSquareClick)
 *
 * Teclado:
 *   C       alterna a câmera entre o lado das brancas e o das pretas
 *   1, 2, 3 liga/desliga a luz ambiente, a principal e a de preenchimento
 */
export class ChessScene {
  /**
   * @param {HTMLElement} container
   * @param {{ skin?: string, onSquareClick?: (x: number, z: number) => void }} options
   */
  constructor(container, { skin = DEFAULT_SKIN, onSquareClick = null } = {}) {
    this.container = container;
    this.onSquareClick = onSquareClick;
    this.skin = SKINS[skin];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.skin.bg);

    // Projeção perspectiva: campo de visão vertical de 45°, proporção (ajustada em render())
    // e planos near/far. O Three.js monta a matriz de projeção a partir desses valores.
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(0, 12, 12); // começa do lado das brancas
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Comprime a soma das luzes para a faixa da tela, sem estourar as cores claras em branco.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    container.replaceChildren(this.renderer.domElement);

    this._addLights();

    // As imagens das texturas carregam em segundo plano: a cena só é desenhada quando todas chegam.
    this.texturesLoaded = false;
    THREE.DefaultLoadingManager.onLoad = () => {
      this.texturesLoaded = true;
      this.render();
    };

    this.board = new BoardView(this.scene, this.skin);
    this.pieces = new PiecesView(this.scene, this.skin);

    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();

    this._bindEvents();
  }

  /** Mostra uma posição inteira. */
  showPosition(position) {
    this.pieces.sync(position);
    this.render();
  }

  /** Destaca a peça selecionada e os destinos possíveis (calculados pelo núcleo). */
  setHighlights(highlights) {
    this.board.setHighlights(highlights);
    this.render();
  }

  /** Leva a câmera para o lado oposto do tabuleiro (brancas ↔ pretas). */
  flipCamera() {
    this.camera.position.z = -this.camera.position.z;
    this.camera.lookAt(0, 0, 0);
    this.render();
  }

  /** Liga/desliga uma das luzes: 'ambient', 'key' ou 'fill'. */
  toggleLight(name) {
    const light = this.lights[name];
    light.visible = !light.visible;
    this.render();
  }

  render() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height || !this.texturesLoaded) return;
    // Matriz de projeção: recalculada aqui sempre que a proporção da tela muda.
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    // O renderer envia camera.projectionMatrix ao vertex shader de cada material, que faz
    // gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0).
    this.renderer.render(this.scene, this.camera);
  }

  _addLights() {
    // Ambiente: clareia tudo por igual, sem direção (sem ela, o lado não iluminado fica preto).
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    // Principal: luz branca do alto, do lado das brancas, como um lustre sobre a mesa.
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(8, 15, 8);
    this.scene.add(key);

    // Preenchimento: luz fraca e azulada do lado oposto, que suaviza as sombras da principal.
    const fill = new THREE.DirectionalLight(0x90e0ef, 0.3);
    fill.position.set(-8, 10, -8);
    this.scene.add(fill);

    this.lights = { ambient, key, fill };
  }

  _bindEvents() {
    this.renderer.domElement.addEventListener('click', (e) => {
      const square = this._pickSquare(e);
      if (square) this.onSquareClick?.(square.x, square.z);
    });

    const lightKeys = { 1: 'ambient', 2: 'key', 3: 'fill' };
    window.addEventListener('keydown', (e) => {
      if (e.key === 'c' || e.key === 'C') this.flipCamera();
      else if (lightKeys[e.key]) this.toggleLight(lightKeys[e.key]);
    });

    // A cena é estática: só precisa ser desenhada de novo quando algo muda.
    new ResizeObserver(() => this.render()).observe(this.container);
  }

  /** Raycasting: lança um raio da câmera pelo ponto clicado e retorna { x, z } da casa atingida ou null. */
  _pickSquare(event) {
    // Posição do clique em coordenadas normalizadas (NDC): de -1 a 1 nos dois eixos, y para cima.
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this._raycaster.setFromCamera(this._pointer, this.camera);

    // Interseção do raio com as casas e as peças; a primeira da lista é a mais próxima da câmera.
    const hits = this._raycaster.intersectObjects([this.board.group, this.pieces.group], true);
    if (hits.length === 0) return null;

    // Sobe na hierarquia até a peça (ou casa) que carrega a coordenada.
    let object = hits[0].object;
    while (object && !object.userData.isPiece && object.userData.type !== 'square') object = object.parent;
    return object ? { x: object.userData.x, z: object.userData.z } : null;
  }
}
