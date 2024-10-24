import type { INestApplication, HttpServer } from '@nestjs/common';
import type { Server, Request, Response, ServerConstructorOptions } from 'hyper-express/types';
import { HyperExpressLsitenOptions } from './options.interface';





/**
 * @publicApi
 */
export interface NestHyperExpressApplication<
  TServer extends Server = Server,
> extends INestApplication<TServer> {
  /**
   * Returns the underlying HTTP adapter bounded to a Fastify app.
   *
   * @returns {HttpServer}
   */
  getHttpAdapter(): HttpServer<Request, Response, TServer>;
  
}