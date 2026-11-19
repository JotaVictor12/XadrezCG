/** Interpolação suave (ease in-out senoidal), t em [0, 1]. */
export const easeInOutSine = (t) => 0.5 - Math.cos(t * Math.PI) / 2;

/**
 * Executor de animações por tempo. Cada animação tem uma chave; iniciar uma nova
 * com a mesma chave conclui imediatamente a anterior (evita animações brigando
 * pelo mesmo objeto).
 */
export class Animator {
  constructor() {
    this.tasks = new Map();
  }

  run({ key, duration, onUpdate, onComplete }) {
    this.finish(key);
    this.tasks.set(key, { start: null, duration, onUpdate, onComplete });
  }

  /** Avança todas as animações. `now` em ms (o mesmo relógio do laço de render). */
  update(now) {
    for (const [key, task] of this.tasks) {
      task.start ??= now;
      const t = Math.min((now - task.start) / task.duration, 1);
      task.onUpdate(t);
      if (t >= 1) {
        this.tasks.delete(key);
        task.onComplete?.();
      }
    }
  }

  /** Conclui a animação de `key` imediatamente. */
  finish(key) {
    const task = this.tasks.get(key);
    if (!task) return;
    this.tasks.delete(key);
    task.onUpdate(1);
    task.onComplete?.();
  }

  /** Descarta a animação de `key` sem concluí-la. */
  cancel(key) {
    this.tasks.delete(key);
  }

  clear() {
    this.tasks.clear();
  }
}
