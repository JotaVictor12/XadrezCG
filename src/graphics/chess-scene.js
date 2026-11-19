import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SKINS, DEFAULT_SKIN } from '../config/skins.js';
import { Animator, easeInOutSine } from './animator.js';
import { BoardView } from './board-view.js';
import { PiecesView } from './pieces-view.js';
import { Effects } from './effects.js';
import { loadTexture } from './textures.js';

const DRAG_THRESHOLD_PX = 5;
const KEY_ORBIT_SPEED = 1.2; // rad/s
const KEY_HEIGHT_SPEED = 9; // unidades/s
const CAMERA_HEIGHT_RANGE = [3, 18];

/**
 * Cena 3D completa: renderer, câmera, luzes, sombras, tabuleiro, peças, efeitos e
 * entrada do usuário. Não conhece as regras do xadrez: recebe posições/lances prontos
 * e informa qual casa foi clicada (raycasting).
 *
 * Mouse:
 *   clique     seleciona uma peça ou a casa de destino (onSquareClick)
 *   arrastar   orbita a câmera; scroll aproxima/afasta (OrbitControls)
 *
 * Teclado:
 *   setas      giram a câmera ao redor do tabuleiro e mudam a altura
 *   C          gira a câmera 180° (lado das brancas ↔ lado das pretas)
 *   1, 2, 3    liga/desliga a luz ambiente, a principal e a de preenchimento
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
    // Neblina exponencial com a cor do fundo: o que está longe se mistura ao fundo.
    this.scene.fog = new THREE.FogExp2(this.skin.bg, 0.012);

    // Projeção perspectiva: campo de visão vertical de 45°, proporção (ajustada em _resize())
    // e planos near/far. O Three.js monta a matriz de projeção a partir desses valores.
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(0, 12, 12); // começa do lado das brancas

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Sombras por shadow map: a cena é desenhada do ponto de vista da luz para saber o que ela não alcança.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // bordas da sombra suavizadas
    // Comprime a soma das luzes para a faixa da tela, sem estourar as cores claras em branco.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    container.replaceChildren(this.renderer.domElement);

    // Câmera livre: arrastar orbita em torno do centro do tabuleiro e o scroll faz zoom.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // movimento continua um pouco e para suavemente
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false; // sem translação: a câmera sempre mira o centro, o tabuleiro não sai da tela
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // não deixa a câmera passar por baixo da mesa
    this.controls.minDistance = 5;
    this.controls.maxDistance = 25;
    this.controls.target.set(0, 0, 0);

    this._addLights();

    // As imagens das texturas carregam em segundo plano: a cena só é desenhada quando todas chegam.
    // Todos os temas são carregados já no início, para a troca de tema ser instantânea.
    this.texturesLoaded = false;
    THREE.DefaultLoadingManager.onLoad = () => {
      this.texturesLoaded = true;
    };
    for (const { textures } of Object.values(SKINS)) Object.values(textures).forEach((file) => loadTexture(file));

    this.animator = new Animator();
    this.effects = new Effects(this.scene);
    this.board = new BoardView(this.scene, this.skin);
    this.pieces = new PiecesView(this.scene, this.animator, this.effects, this.skin);

    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._pointerDown = null;
    this._keys = new Set();
    this._lastTime = 0;

    this._bindEvents();
    this._resize();
  }

  // --- API pública ---------------------------------------------------------

  /** Inicia o laço de renderização (um quadro por atualização da tela). */
  start() {
    this._lastTime = performance.now();
    this.renderer.setAnimationLoop((time) => this._tick(time));
  }

  /** Mostra uma posição inteira (início, reiniciar, desfazer). */
  showPosition(position) {
    this.effects.clear();
    this.pieces.sync(position);
  }

  /** Anima um lance já aplicado no núcleo. */
  animateMove(move) {
    this.pieces.move(move);
  }

  /** Destaca seleção, destinos, xeque e último lance (calculados pelo núcleo). */
  setHighlights(highlights) {
    this.board.setHighlights(highlights);
  }

  /** Troca o tema: fundo, neblina, texturas do tabuleiro e materiais das peças. */
  setSkin(key) {
    const skin = SKINS[key];
    if (!skin) return;
    this.skin = skin;
    this.scene.background.setHex(skin.bg);
    this.scene.fog.color.setHex(skin.bg);
    this.board.applySkin(skin);
    this.pieces.applySkin(skin);
  }

  /** Confete do xeque-mate. */
  celebrate() {
    this.effects.confetti();
  }

  /** Gira a câmera 180° ao redor do tabuleiro, com animação. */
  flipCamera() {
    const { x, z } = this.camera.position;
    const radius = Math.hypot(x, z);
    const startAngle = Math.atan2(x, z);
    const targetAngle = z > 0 ? -Math.PI : 0;

    this.animator.run({
      key: 'camera-flip',
      duration: 800,
      onUpdate: (t) => {
        const angle = startAngle + (targetAngle - startAngle) * easeInOutSine(t);
        this.camera.position.x = Math.sin(angle) * radius;
        this.camera.position.z = Math.cos(angle) * radius;
        this.controls.update();
      },
    });
  }

  /** Liga/desliga uma das luzes: 'ambient', 'key' ou 'fill'. */
  toggleLight(name) {
    const light = this.lights[name];
    light.visible = !light.visible;
  }

  // --- Internos ------------------------------------------------------------

  _addLights() {
    // Ambiente: clareia tudo por igual, sem direção (sem ela, o lado não iluminado fica preto).
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    // Principal: luz branca do alto, do lado das brancas, como um lustre sobre a mesa.
    // É a única que projeta sombra.
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(8, 15, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); // resolução do shadow map
    // A sombra de luz direcional usa uma câmera ortográfica: o volume cobre o tabuleiro inteiro.
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 40;
    const extent = 8;
    Object.assign(key.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent });
    key.shadow.camera.updateProjectionMatrix(); // necessário após alterar o volume
    this.scene.add(key);

    // Preenchimento: luz fraca e azulada do lado oposto, que suaviza as sombras da principal.
    const fill = new THREE.DirectionalLight(0x90e0ef, 0.3);
    fill.position.set(-8, 10, -8);
    this.scene.add(fill);

    this.lights = { ambient, key, fill };
  }

  _bindEvents() {
    const canvas = this.renderer.domElement;

    // Distingue clique de arrasto de câmera: só conta se o ponteiro quase não se moveu.
    canvas.addEventListener('pointerdown', (e) => {
      this._pointerDown = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.button !== 0 || !this._pointerDown) return;
      const moved = Math.hypot(e.clientX - this._pointerDown.x, e.clientY - this._pointerDown.y);
      if (moved > DRAG_THRESHOLD_PX) return;
      const square = this._pickSquare(e);
      if (square) this.onSquareClick?.(square.x, square.z);
    });

    // Ignora o teclado enquanto o jogador digita em um campo de texto (menu de nomes).
    const lightKeys = { 1: 'ambient', 2: 'key', 3: 'fill' };
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'c' || e.key === 'C') this.flipCamera();
      else if (lightKeys[e.key]) this.toggleLight(lightKeys[e.key]);
      else this._keys.add(e.key); // setas: tratadas a cada quadro em _updateKeyboard
    });
    window.addEventListener('keyup', (e) => this._keys.delete(e.key));

    new ResizeObserver(() => this._resize()).observe(this.container);
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

  _resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    // Matriz de projeção: recalculada sempre que a proporção da tela muda.
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /** Gira a posição da câmera em torno do eixo Y (rotação no plano XZ). */
  _orbit(angle) {
    const { x, z } = this.camera.position;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.camera.position.x = x * cos + z * sin;
    this.camera.position.z = z * cos - x * sin;
  }

  _updateKeyboard(dt) {
    const [minY, maxY] = CAMERA_HEIGHT_RANGE;
    if (this._keys.has('ArrowLeft')) this._orbit(KEY_ORBIT_SPEED * dt);
    if (this._keys.has('ArrowRight')) this._orbit(-KEY_ORBIT_SPEED * dt);
    if (this._keys.has('ArrowUp') && this.camera.position.y > minY) this.camera.position.y -= KEY_HEIGHT_SPEED * dt;
    if (this._keys.has('ArrowDown') && this.camera.position.y < maxY) this.camera.position.y += KEY_HEIGHT_SPEED * dt;
  }

  /** Um quadro: teclado, câmera, animações, efeitos e desenho. `dt` em segundos. */
  _tick(time) {
    const dt = Math.min((time - this._lastTime) / 1000, 0.05); // limita saltos após troca de aba
    this._lastTime = time;

    this._updateKeyboard(dt);
    this.controls.update();
    this.animator.update(time);
    this.effects.update(dt);
    // O renderer envia camera.projectionMatrix ao vertex shader de cada material, que faz
    // gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0).
    if (this.texturesLoaded) this.renderer.render(this.scene, this.camera);
  }
}
