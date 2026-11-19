# ♟️ Xadrez 3D em WebGL2

![Three.js](https://img.shields.io/badge/Three.js-r128-black?logo=threedotjs)
![WebGL2](https://img.shields.io/badge/WebGL-2.0-990000?logo=webgl)

Quinta e última entrega do jogo de xadrez 3D da disciplina de **Computação Gráfica**: o **jogo
completo**. Sobre a jogabilidade da Entrega 4 (regras, pontuação e fim de partida), entram o menu com o
nome dos jogadores, o histórico em notação algébrica, desfazer lance, câmera livre, sombras, animações,
efeitos e **três temas visuais, cada um com as suas próprias texturas**.

![Partida no tema Clássico: último lance em amarelo, rei selecionado com os destinos em verde e estilhaços da captura em c6](assets/classico.jpeg)

## Novidades desta entrega

| Funcionalidade | Como funciona |
| --- | --- |
| Menu inicial | Os jogadores digitam seus nomes (Player 1 de brancas, Player 2 de pretas). O nome aparece na vez de jogar e no anúncio da vitória. **Reiniciar Partida** volta para o menu |
| Histórico em SAN | Cada lance é registrado em notação algébrica padrão: `e4`, `Nbd2`, `exd5`, `O-O`, `e8=Q+`, `Qh4#` ([`toSAN`](src/core/notation.js#L7)) |
| Desfazer lance | Volta para a posição anterior; a pontuação é recalculada a partir do histórico ([`undo`](src/core/game.js#L73)) |
| 3 temas com texturas | Clássico, Cyberpunk Neon e Ouro & Prata, escolhidos no seletor **Estilo** do cabeçalho |
| Câmera livre | Arrastar orbita, o scroll aproxima/afasta e as setas giram e inclinam a câmera (`OrbitControls`). A translação (*pan*) fica desligada: a câmera sempre mira o centro, então o tabuleiro nunca sai da tela |
| Giro de 180° | Botão **Girar Câmera 180°** (ou tecla `C`), agora com animação ([`flipCamera`](src/graphics/chess-scene.js#L137)) |
| Sombras | As peças projetam sombra no tabuleiro e umas nas outras (shadow map) |
| Destaques novos | Último lance em **amarelo** e rei em xeque em **vermelho**, além da seleção e dos destinos |
| Animações e efeitos | A peça desliza com um salto até o destino, a captura solta estilhaços, a promoção solta faíscas e o xeque-mate solta confete |

![Menu inicial: nomes dos jogadores antes da partida](assets/menu.jpeg)

## Temas e texturas

Cada tema tem **cinco imagens** (1024 × 1024 px) em [`assets/textures/`](assets/textures): casas
claras, casas escuras, moldura/base, peças brancas e peças pretas. O Clássico continua com a madeira da
Entrega 3; as imagens do Cyberpunk e do Metálico foram geradas por código pelo grupo (ruído procedural,
trilhas de circuito e grade hexagonal), sem imagens de terceiros. Todas são **repetíveis**: a borda
direita continua na esquerda e a de cima continua na de baixo, então a repetição (`RepeatWrapping`) não
mostra emenda.

| Tema | Casas claras | Casas escuras | Moldura e base | Peças brancas | Peças pretas |
| --- | --- | --- | --- | --- | --- |
| Clássico (Madeira & Ébano) | ![](assets/textures/casa-clara.jpeg) | ![](assets/textures/casa-escura.jpeg) | ![](assets/textures/moldura.jpeg) | ![](assets/textures/peca-clara.jpeg) | ![](assets/textures/peca-escura.jpeg) |
| Cyberpunk Neon | ![](assets/textures/cyberpunk/casa-clara.jpeg) | ![](assets/textures/cyberpunk/casa-escura.jpeg) | ![](assets/textures/cyberpunk/moldura.jpeg) | ![](assets/textures/cyberpunk/peca-clara.jpeg) | ![](assets/textures/cyberpunk/peca-escura.jpeg) |
| Ouro & Prata Metalizado | ![](assets/textures/metalico/casa-clara.jpeg) | ![](assets/textures/metalico/casa-escura.jpeg) | ![](assets/textures/metalico/moldura.jpeg) | ![](assets/textures/metalico/peca-clara.jpeg) | ![](assets/textures/metalico/peca-escura.jpeg) |

- **Configuração:** cada tema em [`skins.js`](src/config/skins.js#L10) diz qual imagem vai em cada objeto
  e os parâmetros do material das peças.
- **Material PBR:** as peças usam `MeshPhysicalMaterial`. A textura dá a cor; `roughness` (aspereza) e
  `metalness` mudam o reflexo da luz, e `clearcoat` acrescenta uma camada de verniz. A madeira é pouco
  metálica e envernizada, o ouro e a prata são metálicos, com reflexos fortes da luz principal
  ([`_createMaterials`](src/graphics/pieces-view.js#L32)).
- **Mapa de emissão (Cyberpunk):** a mesma imagem também é usada como `emissiveMap`, então só as linhas
  claras da grade brilham, mesmo do lado não iluminado da peça.
- **Coordenadas de textura:** o UV calculado na Entrega 3 (laterais das peças pelo comprimento do perfil,
  tampas por projeção plana, cada casa mostrando um trecho diferente da imagem) serve para qualquer
  imagem, então os temas novos não precisaram de nenhuma mudança na geometria. No metal escovado, os
  riscos seguem o `u` e ficam em anéis ao redor da peça, como metal torneado.
- **Troca de tema:** as 15 imagens são carregadas uma vez no início ([`loadTexture`](src/graphics/textures.js#L11)
  guarda cada uma), então trocar de tema só troca os mapas dos materiais, sem esperar
  ([`setSkin`](src/graphics/chess-scene.js#L121)).

| Cyberpunk Neon (xeque) | Ouro & Prata (xeque-mate) |
| :---: | :---: |
| ![Tema Cyberpunk: a dama branca dá xeque em h5, o rei preto fica em vermelho e o alerta aparece no topo](assets/xeque.jpeg) | ![Tema Ouro & Prata: xeque-mate do pastor com confete e vitória de Ana](assets/xeque-mate.jpeg) |

## Controles

| Controle | Ação |
| --- | --- |
| Clique em uma peça da vez | Seleciona a peça e mostra para onde ela pode ir |
| Clique em uma casa destacada | Move a peça (ou captura a peça adversária que está lá) |
| Arrastar o mouse | Orbita a câmera em torno do tabuleiro |
| Scroll | Aproxima/afasta a câmera |
| Setas `←` `→` | Giram a câmera ao redor do tabuleiro |
| Setas `↑` `↓` | Abaixam/levantam a câmera |
| `C` ou botão **Girar Câmera 180°** | Leva a câmera para o lado oposto, com animação |
| `1`, `2`, `3` | Liga/desliga a luz ambiente, a principal e a de preenchimento |
| Botão **Desfazer Lance** | Volta um lance |
| Botão **Reiniciar Partida** | Posição inicial, pontuação zerada e volta ao menu de nomes |
| Seletor **Estilo** | Troca o tema |
| `Esc` (na janela de promoção) | Cancela a promoção e mantém o peão selecionado |

Um clique só conta se o mouse quase não se moveu entre apertar e soltar; senão, foi um arrasto de câmera.
A câmera só gira e aproxima/afasta em torno do centro do tabuleiro: arrastar com o botão direito não
desloca a cena, e a distância fica entre 5 e 25 unidades, então o tabuleiro não sai da tela.

## Pipeline gráfica desta entrega

- **Laço de renderização:** a cena agora é desenhada a cada quadro (`setAnimationLoop`), porque câmera,
  animações e efeitos mudam o tempo todo. Cada quadro trata as setas, atualiza a câmera, avança as
  animações e os efeitos com o tempo decorrido (`dt`) e desenha ([`_tick`](src/graphics/chess-scene.js#L266)).
- **Sombras:** com o shadow map ligado, a luz principal desenha a cena do seu ponto de vista em uma
  textura de profundidade (2048 × 2048); na hora de desenhar, cada ponto compara a sua distância com essa
  textura para saber se está na sombra. A luz direcional usa uma câmera ortográfica que cobre o tabuleiro,
  e `PCFSoftShadowMap` suaviza a borda. Peças e moldura projetam (`castShadow`), casas, moldura e base
  recebem (`receiveShadow`). Desligar a luz principal (`2`) também tira as sombras.
- **Neblina:** `FogExp2` com a cor do fundo de cada tema faz o que está longe se misturar ao fundo.
- **Animação do lance:** a peça vai da casa de origem à de destino com interpolação suave
  (`easeInOutSine`), e a altura segue `sen(t·π)`, formando um salto ([`_glide`](src/graphics/pieces-view.js#L121)).
- **Efeitos:** estilhaços são cubinhos lançados para cima que caem com gravidade e encolhem
  ([`shatter`](src/graphics/effects.js#L24)); o confete são quadrados girando que caem em loop
  ([`confetti`](src/graphics/effects.js#L38)).
- **Destaques:** a cor de destaque multiplica a textura da casa e um brilho (`emissive`) é somado, na
  prioridade último lance < xeque < destino < seleção ([`setHighlights`](src/graphics/board-view.js#L165)).

## Das entregas anteriores

- **Modelos (Entrega 1):** peças feitas por revolução (`LatheGeometry`) e cabeça do cavalo por extrusão.
- **Câmera, projeção e luzes (Entrega 2):** `PerspectiveCamera` e as três luzes, que continuam podendo ser
  ligadas e desligadas (`1`, `2`, `3`). A tecla `C` agora faz o giro animado.
- **Texturas (Entrega 3):** madeira com UV calculado para cada modelo; agora é o tema Clássico.
- **Jogabilidade (Entrega 4):** clique por raycasting, regras completas, pontuação pelas peças capturadas
  ([`score`](src/core/game.js#L96)) e fim de partida por xeque-mate ou empate.

## Evolução em relação à Entrega 4

| Aspecto | Entrega 4 | Entrega 5 |
| --- | --- | --- |
| Temas | Só madeira | Clássico, Cyberpunk e Ouro & Prata, cada um com texturas próprias |
| Material das peças | `MeshStandardMaterial` | `MeshPhysicalMaterial` com verniz e, no Cyberpunk, mapa de emissão |
| Câmera | Duas posições fixas (tecla `C`) | Livre (mouse, scroll e setas) e giro animado de 180° |
| Sombras e neblina | Não | Shadow map e `FogExp2` |
| Lances | A peça aparece no destino | A peça desliza com um salto; estilhaços, faíscas e confete |
| Painel | Vez de jogar e pontuação | Também histórico em SAN, desfazer, girar câmera e ajuda dos controles |
| Jogadores | Brancas e pretas | Menu com o nome de cada jogador |

Arquivos novos e alterados:

- [`notation.js`](src/core/notation.js) (novo) e [`game.js`](src/core/game.js): notação SAN, histórico e desfazer.
- [`player-menu.js`](src/ui/player-menu.js) (novo) e [`hud.js`](src/ui/hud.js): menu de nomes, histórico,
  botões e seletor de tema.
- [`controller.js`](src/app/controller.js): menu, desfazer, animação dos lances, confete e destaques novos.
- [`chess-scene.js`](src/graphics/chess-scene.js): laço de renderização, câmera livre, sombras, neblina e
  troca de tema.
- [`animator.js`](src/graphics/animator.js) e [`effects.js`](src/graphics/effects.js) (novos): animações e efeitos.
- [`pieces-view.js`](src/graphics/pieces-view.js): materiais PBR por tema e animação dos lances.
- [`board-view.js`](src/graphics/board-view.js) e [`piece-geometry.js`](src/graphics/piece-geometry.js):
  sombras e destaques de xeque e último lance.
- [`skins.js`](src/config/skins.js) e [`textures.js`](src/graphics/textures.js): os três temas e o
  carregamento único das imagens.
- [`assets/textures/cyberpunk/`](assets/textures/cyberpunk) e [`assets/textures/metalico/`](assets/textures/metalico)
  (novos): texturas dos temas novos.
- [`index.html`](index.html) e [`main.css`](src/styles/main.css) (novo): painel e menu.

## Tecnologia

**Three.js r128 sobre WebGL2**, com módulos ES nativos e `importmap` (sem build). `OrbitControls` vem dos
exemplos do próprio Three.js, pelo mesmo CDN. Tailwind CSS e Font Awesome vêm por CDN para o painel.
Todos os modelos foram feitos em código pelo grupo; nenhum modelo externo foi usado.

## Como executar

O projeto não tem build nem dependências, mas usa **módulos ES nativos** e carrega bibliotecas por CDN
(é preciso estar online).

1. Abra a pasta do projeto no VS Code.
2. Instale a extensão **Live Server** (`ritwickdey.liveserver`).
3. Clique com o botão direito em `index.html` → **Open with Live Server**.
4. Digite o nome dos jogadores e clique em **Começar Partida**.

> Abrir o `index.html` com duplo clique (`file://`) **não funciona**: os navegadores bloqueiam módulos ES
> carregados de arquivos locais.

## Estrutura do projeto

```
.
├── index.html              # Página, painel, menu de nomes, alertas e importmap
├── assets/                 # Favicon e prints
│   └── textures/           # Texturas do tema Clássico (madeira)
│       ├── cyberpunk/      #   texturas do tema Cyberpunk Neon
│       └── metalico/       #   texturas do tema Ouro & Prata
└── src/
    ├── main.js             # Ponto de entrada: monta o jogo
    ├── core/               # Regras do xadrez (sem Three.js nem DOM)
    │   ├── constants.js    #   cores, coordenadas e valor das peças
    │   ├── position.js     #   posição (FEN), lances legais, xeque, roque, en passant
    │   ├── notation.js     #   notação algébrica (SAN)
    │   └── game.js         #   partida: lances, histórico, desfazer, pontuação e fim de jogo
    ├── graphics/           # Camada 3D (Three.js)
    │   ├── chess-scene.js  #   renderer, câmera livre, luzes, sombras, entrada e laço de renderização
    │   ├── board-view.js   #   tabuleiro, coordenadas, UV das casas e destaques
    │   ├── pieces-view.js  #   peças, materiais por tema e animação dos lances
    │   ├── piece-geometry.js # modelos das peças (revolução e extrusão) e UV
    │   ├── animator.js     #   animações por tempo
    │   ├── effects.js      #   estilhaços e confete
    │   ├── textures.js     #   carrega as imagens de textura
    │   └── support.js      #   detecção de WebGL2
    ├── ui/                 # Interface 2D (DOM)
    │   ├── hud.js          #   vez de jogar, pontuação, histórico, botões e alertas
    │   ├── player-menu.js  #   menu com o nome dos jogadores
    │   └── promotion-modal.js # janela de escolha da promoção
    ├── app/controller.js   # Liga regras, cena 3D e interface
    ├── config/skins.js     # Temas: texturas, materiais e cores
    └── styles/main.css     # Barra de rolagem do histórico
```
