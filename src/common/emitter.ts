export default class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  addListener(event: string, listener: Function) {
    this.on(event, listener);
  }

  once(event: string, listener: Function) {
    const fn = (...args: any[]) => {
      listener(...args);
      this.off(event, fn);
    };
    this.on(event, fn);
  }

  off(event: string, listener: Function) {
    if (!this.events[event]) {
      return;
    }
    this.events[event] = this.events[event].filter((fn) => fn !== listener);
  }

  removeListener(event: string, listener: Function) {
    this.off(event, listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach((fn) => fn(...args));
  }

  removeAllListeners(event: string) {
    delete this.events[event];
  }

  destroy() {
    this.events = {};
  }
}
