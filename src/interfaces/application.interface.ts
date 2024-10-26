import type { INestApplication, HttpServer } from '@nestjs/common';
import type { Server, Request, Response } from 'hyper-express/types';





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