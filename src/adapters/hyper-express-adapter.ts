/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-types */
import {
  InternalServerErrorException,
  Logger,
  RequestMethod,
  StreamableFile,
  VersioningType,
} from "@nestjs/common";
import {
  VERSION_NEUTRAL,
  VersionValue,
  VersioningOptions,
} from "@nestjs/common/interfaces";
import {
  CorsOptions,
  CorsOptionsDelegate,
} from "@nestjs/common/interfaces/external/cors-options.interface";
import { NestApplicationOptions } from "@nestjs/common/interfaces/nest-application-options.interface";
import {
  isNil,
  isObject,
  isString,
  isUndefined,
} from "@nestjs/common/utils/shared.utils";
import { AbstractHttpAdapter } from "@nestjs/core/adapters/http-adapter";
import { RouterMethodFactory } from "@nestjs/core/helpers/router-method-factory";
import {
  MiddlewareNext,
  Request,
  Response,
  ServerConstructorOptions,
  Router,
  DefaultRequestLocals,
} from "hyper-express";
import NestHyperServer from "../common/hyper";

interface VersionedRoute<
  A extends Request = Request,
  B extends Response = Response,
  R extends any = any
> {
  (req: A, res: B, next: MiddlewareNext | (() => void)): R;
}

export class HyperExpressAdapter<
  TServer extends NestHyperServer = NestHyperServer,
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
    this.setHttpServer(new NestHyperServer(opts) as TServer);

    Object.assign(this.httpServer, {
      address: () => this.address(),
    })
  }

  /////////////////////////////
  // Life-cycle Methods
  /////////////////////////////

  public once() {}
  public removeListener() {}

  public address() {
    return `0.0.0.0:${this.port}`;
  }

  public close() {
    if (!this.instance) {
      return undefined;
    }
    return Promise.resolve(this.instance.close());
  }

  /////////////////////////////
  // HTTP Response Methods
  /////////////////////////////

  public status(response: Response, statusCode: number) {
    return response.status(statusCode);
  }

  public reply(response: Response, body: any, statusCode?: number) {
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
    response.raw.end(message);
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
      server.listen(this.port).then( socket => {
        hostname?.();
       server.emit("listening", socket);
       this.logger.log(`Server listening on port ${this.port}`);
      }).catch((err) => {
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
    const isVersionMatch = (extractedVersion: any, version: VersionValue) => {
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
    if (
      version === VERSION_NEUTRAL ||
      versioningOptions.type === VersioningType.URI
    ) {
      return handler as VersionedRoute;
    }

    // Custom Extractor Versioning Handler
    if (versioningOptions.type === VersioningType.CUSTOM) {
      const handlerForCustomVersioning: VersionedRoute = (req, res, next) => {
        const extractedVersion = versioningOptions.extractor(req);
        if (isVersionMatch(extractedVersion, version)) {
          return handler(req, res, next);
        }
        return callNextHandler(req, res, next);
      };
      return handlerForCustomVersioning;
    }

    // Media Type (Accept Header) Versioning Handler
    if (versioningOptions.type === VersioningType.MEDIA_TYPE) {
      const handlerForMediaTypeVersioning: VersionedRoute = (
        req,
        res,
        next
      ) => {
        const acceptHeaderValue: string | undefined =
          req.headers?.["Accept"] || req.headers?.["accept"];

        const acceptHeaderVersionParameter = acceptHeaderValue
          ? acceptHeaderValue.split(";")[1]
          : undefined;

        if (isUndefined(acceptHeaderVersionParameter)) {
          if (Array.isArray(version) && version.includes(VERSION_NEUTRAL)) {
            return handler(req, res, next);
          }
        } else {
          const headerVersion = acceptHeaderVersionParameter.split(
            versioningOptions.key
          )[1];

          if (isVersionMatch(headerVersion, version)) {
            return handler(req, res, next);
          }
        }
        return callNextHandler(req, res, next);
      };
      return handlerForMediaTypeVersioning;
    }

    // Header Versioning Handler
    if (versioningOptions.type === VersioningType.HEADER) {
      const handlerForHeaderVersioning: VersionedRoute = (req, res, next) => {
        const customHeaderVersionParameter: string | undefined =
          req.headers?.[versioningOptions.header] ||
          req.headers?.[versioningOptions.header.toLowerCase()];

        if (isUndefined(customHeaderVersionParameter)) {
          if (Array.isArray(version) && version.includes(VERSION_NEUTRAL)) {
            return handler(req, res, next);
          }
        } else if (isVersionMatch(customHeaderVersionParameter, version)) {
          return handler(req, res, next);
        }
        return callNextHandler(req, res, next);
      };
      return handlerForHeaderVersioning;
    }

    return (req, res, next) => {
      return handler(req, res, next);
    };
  }

  /////////////////////////////
  // Route Methods
  /////////////////////////////

  // @ts-ignore
  get(path: string, handler?: any): any {
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

    let server = router ?? this.getHttpServer();
    let caller = server[method];

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

  ////////////////////////////
  // Not implemented methods
  ////////////////////////////

  public render(response: Response, view: string, options: any) {
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
  enableCors(
    options: CorsOptions | CorsOptionsDelegate<TRequest>,
    prefix?: string
  ) {
    this.logger.log("enableCors", options, prefix);
  }
}
