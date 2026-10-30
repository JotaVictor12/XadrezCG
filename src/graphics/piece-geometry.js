import * as THREE from 'three';

/**
 * Peças modeladas por revolução (LatheGeometry): cada perfil é uma lista de
 * pontos [raio, altura] girada em torno do eixo Y.
 */
const SEGMENTS = 48;

/** Pontos de um arco de circunferência (centro cx, cy), para partes arredondadas. */
function arc(cx, cy, radius, fromDeg, toDeg, steps = 8) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = ((fromDeg + ((toDeg - fromDeg) * i) / steps) * Math.PI) / 180;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return points;
}

// Base comum: degrau com borda arredondada.
const BASE = (r) => [[0, 0], [r, 0], ...arc(r - 0.04, 0.05, 0.04, 0, 90, 4), [r - 0.08, 0.11], [r - 0.12, 0.15]];

const PROFILES = {
  P: [...BASE(0.36), [0.17, 0.25], [0.13, 0.45], [0.21, 0.5], [0.21, 0.55], [0.1, 0.58], ...arc(0, 0.71, 0.15, -45, 90)],
  R: [...BASE(0.4), [0.25, 0.3], [0.23, 0.68], [0.33, 0.74], [0.33, 1.0], [0.25, 1.0], [0.25, 0.93], [0, 0.93]],
  B: [...BASE(0.38), [0.2, 0.3], [0.15, 0.68], [0.25, 0.73], [0.25, 0.77], [0.13, 0.8], ...arc(0, 0.97, 0.17, -50, 90), ...arc(0, 1.2, 0.05, -90, 90, 4)],
  Q: [...BASE(0.42), [0.25, 0.3], [0.16, 0.85], [0.28, 0.9], [0.28, 0.95], [0.2, 1.0], [0.34, 1.26], [0.3, 1.3], [0.1, 1.3], ...arc(0, 1.36, 0.07, -90, 90, 4)],
  K: [...BASE(0.44), [0.27, 0.32], [0.18, 0.9], [0.3, 0.95], [0.3, 1.0], [0.22, 1.05], [0.33, 1.38], [0.28, 1.42], [0.1, 1.45], [0, 1.5]],
  // Base do cavalo com um colar no topo (a cabeça é montada em `knightHead`).
  N: [...BASE(0.38), [0.22, 0.3], [0.28, 0.36], [0.28, 0.42], [0, 0.42]],
};

const lathe = (points) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), SEGMENTS);

// Cabeça do cavalo: silhueta lateral [frente, altura] extrudada na espessura.
const HEAD_THICKNESS = 0.2;
const HEAD_BEVEL = 0.05;
// Curva da nuca (topo da cabeça → base), usada no contorno e para posicionar a crina.
const NAPE = [[-0.1, 1.1], [-0.3, 0.8], [-0.2, 0.4]];

function knightHeadShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.2, 0.4);
  shape.lineTo(0.18, 0.4);
  shape.quadraticCurveTo(0.3, 0.5, 0.16, 0.64); // peito
  shape.lineTo(0.3, 0.72); // mandíbula
  shape.lineTo(0.4, 0.76); // queixo
  shape.quadraticCurveTo(0.48, 0.8, 0.42, 0.88); // focinho
  shape.lineTo(0.14, 1.1); // chanfro do nariz até a testa
  shape.quadraticCurveTo(0.02, 1.18, NAPE[0][0], NAPE[0][1]); // alto da cabeça
  shape.quadraticCurveTo(NAPE[1][0], NAPE[1][1], NAPE[2][0], NAPE[2][1]); // nuca
  return shape;
}

/**
 * Cabeça do cavalo (olhando para -z): silhueta extrudada com bordas chanfradas,
 * orelhas (cones), olhos (esferas) e crina (caixas ao longo da nuca).
 */
function knightHead() {
  const head = new THREE.ExtrudeGeometry(knightHeadShape(), {
    depth: HEAD_THICKNESS,
    bevelEnabled: true,
    bevelThickness: HEAD_BEVEL,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 12,
  });
  head.translate(0, 0, -HEAD_THICKNESS / 2); // centraliza a espessura em z
  head.rotateY(Math.PI / 2); // a silhueta passa para o plano YZ: "frente" vira -z

  const side = HEAD_THICKNESS / 2 + HEAD_BEVEL; // face lateral da cabeça
  const ear = new THREE.ConeGeometry(0.05, 0.14, 8);
  const eye = new THREE.SphereGeometry(0.035, 12, 8);
  const parts = [
    { geometry: head },
    { geometry: ear, position: [0.08, 1.19, 0], rotationX: 0.25 },
    { geometry: ear, position: [-0.08, 1.19, 0], rotationX: 0.25 },
    { geometry: eye, position: [side - 0.01, 0.98, -0.2] },
    { geometry: eye, position: [-side + 0.01, 0.98, -0.2] },
  ];

  // Crina: tufos alinhados à tangente da nuca, um pouco para fora do contorno.
  const nape = new THREE.QuadraticBezierCurve(...NAPE.map(([u, v]) => new THREE.Vector2(u, v)));
  const tuft = new THREE.BoxGeometry(0.08, 0.12, 0.12);
  for (let i = 0; i < 6; i += 1) {
    const t = 0.06 + i * 0.12;
    const point = nape.getPoint(t);
    const tangent = nape.getTangent(t); // aponta para baixo, ao longo da nuca
    const normal = new THREE.Vector2(tangent.y, -tangent.x); // para trás, fora da cabeça
    const [u, v] = [point.x + normal.x * 0.03, point.y + normal.y * 0.03];
    parts.push({ geometry: tuft, position: [0, v, -u], rotationX: Math.atan2(tangent.x, -tangent.y) });
  }
  return parts;
}

/** Partes de cada peça: { geometry, rotationX?, position? }. */
function buildParts(type) {
  const body = { geometry: lathe(PROFILES[type]) };
  switch (type) {
    case 'N':
      return [body, ...knightHead()];
    case 'K': {
      // Cruz no topo: diferencia o rei da dama.
      const vertical = new THREE.BoxGeometry(0.08, 0.3, 0.08);
      const horizontal = new THREE.BoxGeometry(0.24, 0.08, 0.08);
      return [
        body,
        { geometry: vertical, position: [0, 1.65, 0] },
        { geometry: horizontal, position: [0, 1.67, 0] },
      ];
    }
    default:
      return [body];
  }
}

// Geometrias são compartilhadas entre todas as peças do mesmo tipo.
const cache = new Map();
const getParts = (type) => {
  if (!cache.has(type)) cache.set(type, buildParts(type));
  return cache.get(type);
};

/** Cria o objeto 3D de uma peça (Group com uma malha por parte). */
export function createPieceObject(type, material) {
  const group = new THREE.Group();
  for (const part of getParts(type)) {
    const mesh = new THREE.Mesh(part.geometry, material);
    if (part.rotationX) mesh.rotation.x = part.rotationX;
    if (part.position) mesh.position.set(...part.position);
    group.add(mesh);
  }
  return group;
}
