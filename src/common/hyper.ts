import { Server, ServerConstructorOptions } from "hyper-express";

export default class NestHyperServer extends Server {
  private events: { [key: string]: Function[] } = {};

  constructor(options?: ServerConstructorOptions) {
    super(options);
  }

  address() {
    return `http://127.0.0.1:${this.port}`;
  }

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  once(event: string, listener: Function) {
    const fn = (...args: any[]) => {
      listener(...args);
      this.off(event, fn);
    };
    this.on(event, fn);
  }

  off(event: string, listener?: Function) {
    if (!this.events[event]) {
      return;
    }

    if (!listener) {
      this.events[event] = [];
      return;
    }

    this.events[event] = this.events[event].filter((fn) => fn !== listener);
  }

  removeListener(event: string, listener?: Function) {
    this.off(event, listener);
  }

  removeAllListeners(event: string) {
    this.events[event] = [];
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach((fn) => fn(...args));
  }
}
