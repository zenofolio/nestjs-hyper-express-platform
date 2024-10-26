import { Logger } from "@nestjs/common/services/logger.service";
import { VersioningType } from "@nestjs/common/enums/version-type.enum";
import { RequestMethod } from "@nestjs/common/enums/request-method.enum";
import { InternalServerErrorException } from "@nestjs/common/exceptions";
import { AbstractHttpAdapter } from "@nestjs/core/adapters/http-adapter";
import { RouterMethodFactory } from "@nestjs/core/helpers/router-method-factory";
import { StreamableFile } from "@nestjs/common/file-stream/streamable-file";
import {
  VERSION_NEUTRAL,
  VersionValue,
  VersioningOptions,
} from "@nestjs/common/interfaces";
import {
  isNil,
  isObject,
  isString,
  isUndefined,
} from "@nestjs/common/utils/shared.utils";
import { NestApplicationOptions } from "@nestjs/common/interfaces/nest-application-options.interface";
import {
  CorsOptions,
  CorsOptionsDelegate,
} from "@nestjs/common/interfaces/external/cors-options.interface";

import type {
  MiddlewareNext,
  Request,
  Response,
  ServerConstructorOptions,
  Router,
  DefaultRequestLocals,
} from "hyper-express/types";

import NestHyperServerBase from "../common/helpers/hyper";
import { applyCors } from "../middlewares/cors.middleware";

interface VersionedRoute<
  A extends Request = Request,
  B extends Response = Response,
  R = any
> {
  (req: A, res: B, next: MiddlewareNext | (() => void)): R;
}

export class HyperExpressAdapter<
  TServer extends NestHyperServerBase = NestHyperServerBase,
  TRequest extends Request<DefaultRequestLocals> = Request<DefaultRequestLocals>,
  TResponse extends Response<DefaultRequestLocals> = Response<DefaultRequestLocals>
> extends AbstractHttpAdapter<TServer, TRequest, TResponse> {
  private readonly routerMethodFactory = new RouterMethodFactory();
  public readonly logger = new Logger(HyperExpressAdapter.name);
  port: number = 3000;

  // private readonly instance: Server;
  private _isParserRegistered: boolean = false;
  private isMiddieRegistered: boolean = false;

  constructor(opts?: ServerConstructorOptions) {
    super();

    // set instance
    this.setInstance(this);

    // set server
    this.setHttpServer(new NestHyperServerBase(opts) as TServer);

    // // set request and response
    // Object.assign(this.httpServer, {
    //   address: () => this.address(),
    // });
  }

  /////////////////////////////
  // Life-cycle Methods
  /////////////////////////////

  public close() {
    const server = this.getHttpServer();
    if (!server) {
      return undefined;
    }
    return Promise.resolve(server.close());
  }

  /////////////////////////////
  // HTTP Response Methods
  /////////////////////////////

  public status(response: Response, statusCode: number) {
    return response.status(statusCode);
  }

  public reply(response: Response | Error, body: any, statusCode?: number) {
    if (response instanceof Error) {
      // Log the error
      this.logger.error(response);
      return response;
    }

    // Set status code if provided
    if (statusCode) {
      response.status(statusCode);
    }

    // Handle null or undefined body
    if (isNil(body)) {
      return response.end();
    }

    // If body is a StreamableFile, set necessary headers and pipe the stream
    if (body instanceof StreamableFile) {
      const streamHeaders = body.getHeaders();
      this.setStreamHeaders(response, streamHeaders);
      return body.getStream().pipe(response);
    }

    // For non-streamable bodies, respond based on type (JSON or plain text)
    return isObject(body) ? response.json(body) : response.end(String(body));
  }

  public end(response: Response, message?: string) {
    response.end(message);
  }

  public redirect(response: Response, statusCode: number, url: string) {
    response.status(statusCode);
    response.redirect(url);
  }

  /////////////////////////////
  // Request Handling Methods
  /////////////////////////////

  public getRequestHostname(request: Request): string {
    return request.hostname;
  }

  public getRequestMethod(request: Request): string {
    return request.method;
  }

  public getRequestUrl(request: Request): string {
    return request.originalUrl;
  }

  public getHeader(response: Response, name: string) {
    return response.getHeader(name);
  }

  public appendHeader(response: Response, name: string, value: string) {
    response.setHeader(name, value);
  }

  /////////////////////////////
  // HTTP Server Methods
  /////////////////////////////

  public listen(port: any, hostname?: any, callback?: any) {
    const _type = typeof hostname;
    this.port = Number(port);
    const server = this.getHttpServer();

    // If hostname is a function, it is the callback
    if (_type === "function") {
      server
        .listen(this.port)
        .then((socket) => {
          hostname?.();
          server.emit("listening", socket);
          this.logger.log(`Server listening on port ${this.port}`);
        })
        .catch((err) => {
          this.logger.error(err);
          server.emit("error", err);
        });
    } else {
      server.listen(this.port, hostname as string, callback);
    }
  }

  /////////////////////////////
  // Error & Not Found Handlers
  /////////////////////////////

  public setErrorHandler(handler: Function, prefix?: string) {
    this.getHttpServer().set_error_handler(handler.bind(this.getHttpServer()));
  }

  public setNotFoundHandler(handler: Function) {
    this.getHttpServer().set_not_found_handler(
      handler.bind(this.getHttpServer())
    );
  }

  /////////////////////////////
  // Versioning Methods
  /////////////////////////////

  public applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions
  ): VersionedRoute<TRequest, TResponse, Function> {
    const callNextHandler: VersionedRoute = (req, res, next) => {
      if (!next) {
        throw new InternalServerErrorException(
          "HTTP adapter does not support filtering on version"
        );
      }
      return next();
    };
  
    // Helper function to check if the version matches
    const isVersionMatch = (extractedVersion: any): boolean => {
      if (Array.isArray(version)) {
        return (
          (Array.isArray(extractedVersion) &&
            version.some((v) => extractedVersion.includes(v as string))) ||
          (isString(extractedVersion) && version.includes(extractedVersion))
        );
      }
      return Array.isArray(extractedVersion)
        ? extractedVersion.includes(version)
        : isString(extractedVersion) && extractedVersion === version;
    };
  
    // URL Versioning (via path) and Neutral Version
    if (version === VERSION_NEUTRAL || versioningOptions.type === VersioningType.URI) {
      // eslint-disable-next-line
      // @ts-ignore
      return handler as VersionedRoute;
    }
  
    const createVersioningHandler = (extractor: (req: Request) => any): VersionedRoute => {
      return (req, res, next) => {
        const extractedVersion = extractor(req);
        if (isVersionMatch(extractedVersion)) {
          return handler(req, res, next);
        }
        return callNextHandler(req, res, next);
      };
    };
  
    // Custom Extractor Versioning Handler
    if (versioningOptions.type === VersioningType.CUSTOM) {
      // eslint-disable-next-line
      // @ts-ignore
      return createVersioningHandler(versioningOptions.extractor);
    }
  
    // Media Type (Accept Header) Versioning Handler
    if (versioningOptions.type === VersioningType.MEDIA_TYPE) {
      return (req, res, next) => {
        const acceptHeaderValue = req.headers?.["Accept"] || req.headers?.["accept"];
        const acceptHeaderVersionParameter = acceptHeaderValue?.split(";")[1];
  
        if (!acceptHeaderVersionParameter) {
          return Array.isArray(version) && version.includes(VERSION_NEUTRAL)
            ? handler(req, res, next)
            : callNextHandler(req, res, next);
        }
  
        const headerVersion = acceptHeaderVersionParameter.split(versioningOptions.key)[1];
        return isVersionMatch(headerVersion) ? handler(req, res, next) : callNextHandler(req, res, next);
      };
    }
  
    // Header Versioning Handler
    if (versioningOptions.type === VersioningType.HEADER) {
      return (req, res, next) => {
        const customHeaderVersionParameter =
          req.headers?.[versioningOptions.header] || req.headers?.[versioningOptions.header.toLowerCase()];
  
        if (!customHeaderVersionParameter) {
          return Array.isArray(version) && version.includes(VERSION_NEUTRAL)
            ? handler(req, res, next)
            : callNextHandler(req, res, next);
        }
  
        return isVersionMatch(customHeaderVersionParameter) ? handler(req, res, next) : callNextHandler(req, res, next);
      };
    }
  
    // Fallback handler
    return (req, res, next) => handler(req, res, next);
  }
  

  /////////////////////////////
  // Route Methods
  /////////////////////////////

 
  get(path: unknown, handler?: any): any {
    this.insertRoute("get", path, handler);
  }

  post(path: unknown, handler?: any): any {
    this.insertRoute("post", path, handler);
  }

  patch(path: unknown, handler?: any): any {
    this.insertRoute("patch", path, handler);
  }

  put(path: unknown, handler?: any): any {
    this.insertRoute("put", path, handler);
  }

  delete(path: unknown, handler?: any): any {
    this.insertRoute("delete", path, handler);
  }

  options(path: unknown, handler?: any): any {
    this.insertRoute("options", path, handler);
  }

  public createMiddlewareFactory(
    requestMethod: RequestMethod
  ): (path: string, callback: Function) => any {
    return this.routerMethodFactory
      .get(this.instance, requestMethod)
      .bind(this.instance);
  }

  setHeader(response: TResponse, name: string, value: string) {
    response.setHeader(name, value);
  }

  isHeadersSent(response: TResponse) {
    return response.headersSent;
  }

  initHttpServer(options: NestApplicationOptions) {
    // not needed
  }

  /////////////////////////////
  // Private Methods
  /////////////////////////////

  private setStreamHeaders(response: Response, streamHeaders: any) {
    // Set the headers only if they are missing
    const headers = {
      "Content-Type": streamHeaders.type,
      "Content-Length": streamHeaders.size,
      "Content-Disposition": streamHeaders.disposition,
    };

    Object.entries(headers).forEach(([key, value]) => {
      if (!response.getHeader(key)) {
        response.setHeader(key, value);
      }
    });
  }

  private insertRoute(
    method: "get" | "post" | "put" | "delete" | "patch" | "options",
    path: any,
    handler?: (req: Request, res: Response) => void,
    prefix?: string,
    router?: Router
  ) {
    // if handle is not defined, return
    if (!handler) return;

    // add prefix to path if is needed
    path = this.toPath(path, prefix);

    const server = router ?? this.getHttpServer();
    const caller = server[method];

    if (!caller) {
      throw new Error(`Method ${method} not supported`);
    }

    // add route
    caller?.apply(server, [path, handler]);
  }

  private toPath(path: string, prefix?: string): string {
    if (prefix) {
      // delete first slash
      path = path.replace(/^\//, "");

      // remove last slash
      prefix = prefix.replace(/\/$/, "");

      // join prefix and path
      path = `${prefix}/${path}`;
    }

    return path;
  }

  getType(): string {
    return "hyper-express";
  }

  enableCors(
    options: CorsOptions | CorsOptionsDelegate<TRequest>,
    prefix?: string
  ) {
    // If options is not provided, return
    if (!options) return;

    // Log the enableCors call
    this.logger.log("enableCors");

    // Register CORS middleware
    this.getHttpServer()?.use(applyCors(options));
  }

  ////////////////////////////
  // Not implemented methods
  ////////////////////////////

  public render(response: TResponse, view: string, options: any) {
    console.log("not implemented", view, options);
    throw Error("Not implemented");
  }

  useStaticAssets(...args: any[]) {
    throw new Error("Method not implemented.");
  }
  setViewEngine(engine: string) {
    throw new Error("Method not implemented.");
  }

  registerParserMiddleware(prefix?: string, rawBody?: boolean) {
    this.logger.log("registerParserMiddleware", prefix, rawBody);
  }
}
