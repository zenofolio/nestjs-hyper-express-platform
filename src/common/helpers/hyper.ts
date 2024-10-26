import { Server, ServerConstructorOptions } from "hyper-express";
import EventEmitter from "../emitter";
import { Mixing } from "../utils/mixin";

// Mix the Server class with the EventEmitter class.
const ServerEmitter = Mixing(Server, EventEmitter);

export default class NestHyperServerBase extends ServerEmitter {
  constructor(options?: ServerConstructorOptions) {
    super(options);
  }

  address() {
    return `http://127.0.0.1:${this.port}`;
  }
}
