import { DEFAULT_SKIN } from './config/skins.js';
import { createInitialPosition } from './core/position.js';
import { ChessScene } from './graphics/chess-scene.js';
import { isWebGL2Supported } from './graphics/support.js';

const container = document.getElementById('canvas-container');

if (isWebGL2Supported()) {
  const scene = new ChessScene(container, { skin: DEFAULT_SKIN });
  scene.showPosition(createInitialPosition());
} else {
  container.innerHTML =
    '<div class="h-full flex items-center justify-center text-center p-8 text-slate-400">' +
    '<p><strong class="text-slate-200">WebGL2 não está disponível neste navegador.</strong><br>' +
    'Atualize o navegador ou ative a aceleração de hardware.</p></div>';
}
