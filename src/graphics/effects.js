import * as THREE from 'three';

const CONFETTI_COLORS = [0xff0055, 0x00f0ff, 0xffd700, 0x00ff66, 0x9d4edd];
const SHARD_COLORS = [0xff0055, 0xffcc00];

/** Estilhaços (captura/promoção) e confete (xeque-mate). Tudo dependente de dt. */
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.shards = [];
    this.confettiPieces = [];

    this.shardGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    this.confettiGeometry = new THREE.PlaneGeometry(0.15, 0.15);
    this.materials = new Map();
  }

  _material(color, side = THREE.FrontSide) {
    const key = `${color}-${side}`;
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshBasicMaterial({ color, side }));
    return this.materials.get(key);
  }

  shatter(position, overrideColor = null) {
    for (let i = 0; i < 25; i += 1) {
      const color = overrideColor ?? SHARD_COLORS[Math.random() > 0.5 ? 0 : 1];
      const mesh = new THREE.Mesh(this.shardGeometry, this._material(color));
      mesh.position.copy(position).add(new THREE.Vector3(0, 0.4, 0));
      this.scene.add(mesh);
      this.shards.push({
        mesh,
        life: 1,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5 + 2, (Math.random() - 0.5) * 6),
      });
    }
  }

  confetti() {
    for (let i = 0; i < 150; i += 1) {
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const mesh = new THREE.Mesh(this.confettiGeometry, this._material(color, THREE.DoubleSide));
      mesh.position.set((Math.random() - 0.5) * 10, Math.random() * 8 + 6, (Math.random() - 0.5) * 10);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.scene.add(mesh);
      this.confettiPieces.push({
        mesh,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, -Math.random() * 2 - 1, (Math.random() - 0.5) * 1.5),
        spin: new THREE.Vector3(Math.random() * 5, Math.random() * 5, Math.random() * 5),
      });
    }
  }

  /** `dt` em segundos. */
  update(dt) {
    const decay = 0.95 ** (dt * 60);
    this.shards = this.shards.filter((s) => {
      s.velocity.y -= 10.8 * dt; // gravidade
      s.mesh.position.addScaledVector(s.velocity, dt);
      s.mesh.scale.multiplyScalar(decay);
      s.life -= dt / 0.83;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        return false;
      }
      return true;
    });

    for (const c of this.confettiPieces) {
      c.mesh.position.addScaledVector(c.velocity, dt);
      c.mesh.rotation.x += c.spin.x * dt;
      c.mesh.rotation.y += c.spin.y * dt;
      if (c.mesh.position.y < 0) c.mesh.position.y = 10;
    }
  }

  clear() {
    for (const s of this.shards) this.scene.remove(s.mesh);
    for (const c of this.confettiPieces) this.scene.remove(c.mesh);
    this.shards = [];
    this.confettiPieces = [];
  }
}
