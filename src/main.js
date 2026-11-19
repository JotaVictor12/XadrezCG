import { DEFAULT_SKIN } from './config/skins.js';
import { Game } from './core/game.js';
import { ChessScene } from './graphics/chess-scene.js';
import { isWebGL2Supported } from './graphics/support.js';
import { Hud } from './ui/hud.js';
import { PromotionModal } from './ui/promotion-modal.js';
import { PlayerMenu } from './ui/player-menu.js';
import { GameController } from './app/controller.js';

const container = document.getElementById('canvas-container');

if (isWebGL2Supported()) {
  const controller = new GameController({
    game: new Game(),
    scene: new ChessScene(container, { skin: DEFAULT_SKIN }),
    hud: new Hud(),
    promotionModal: new PromotionModal(),
    playerMenu: new PlayerMenu(),
  });
  controller.start(DEFAULT_SKIN);
} else {
  container.innerHTML =
    '<div class="h-full flex items-center justify-center text-center p-8 text-slate-400">' +
    '<p><strong class="text-slate-200">WebGL2 não está disponível neste navegador.</strong><br>' +
    'Atualize o navegador ou ative a aceleração de hardware.</p></div>';
}
