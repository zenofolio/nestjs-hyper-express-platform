type Function = (...args: unknown[]) => void;

export default class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on(event: string, listener: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);
  }

  addListener(event: string, listener: Function) {
    this.on(event, listener);
  }

  once(event: string, listener: Function) {
    const fn = (...args: unknown[]) => {
      listener(...args);
      this.off(event, fn);
    };
    this.on(event, fn);
  }

  off(event: string, listener: Function) {
    if (!this.events.has(event)) return;
    this.events.get(event)!.delete(listener);
    if (this.events.get(event)!.size === 0) {
      this.events.delete(event);
    }
  }

  removeListener(event: string, listener: Function) {
    this.off(event, listener);
  }

  emit(event: string, ...args: unknown[]) {
    if (!this.events.has(event)) return;
    this.events.get(event)!.forEach((fn) => fn(...args));
  }

  removeAllListeners(event: string) {
    this.events.delete(event);
  }

  destroy() {
    this.events.clear();
  }
}
