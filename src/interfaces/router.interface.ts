import { Handler } from "./common.interface";

export interface HyperExpressRouterOptions {
  path: string;
  method: string;
  handler: Handler;
}
