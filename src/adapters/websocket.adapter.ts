// import {
//   ServerConstructorOptions,
//   Websocket,
//   WSRouteOptions,
// } from "hyper-express";
// import { isFunction, isNil } from "@nestjs/common/utils/shared.utils";
// import {
//   AbstractWsAdapter,
//   MessageMappingProperties,
// } from "@nestjs/websockets";
// import { DISCONNECT_EVENT } from "@nestjs/websockets/constants";
// import NestHyperServer from "src/common/hyper";
 

// type Options = WSRouteOptions & { namespace?: string; server?: any }

// /**
//  * @publicApi
//  */
// export class NestHyperSocketAdapter<
//   TServer extends NestHyperServer = NestHyperServer,
//   TClient extends Websocket = Websocket,
//   TOptions extends Options = Options
// > extends AbstractWsAdapter<TServer, TClient, TOptions> {
//   public create(
//     port: number,
//     options?: Options & { namespace?: string; server?: any }
//   ): TServer {
//     if (!options) {
//       return this.createIOServer(port);
//     }
//     const { namespace, server, ...opt } = options;
//     return server && isFunction(server.of)
//       ? server.of(namespace)
//       : namespace
//       ? this.createIOServer(port, opt).of(namespace)
//       : this.createIOServer(port, opt);
//   }

//   public createIOServer(port: number, options?: Options): any {
    
//     var server = new NestHyperServer();
//     server.listen(port);
  
//     server.ws("/", options, (socket) => {

//     }) ;
    
//     return server;

//   }

//   public bindMessageHandlers(
//     socket: TClient,
//     handlers: MessageMappingProperties[],
//     transform: (data: any) => Observable<any>
//   ) {
//     const disconnect$ = fromEvent(socket, DISCONNECT_EVENT).pipe(
//       share(),
//       first()
//     );

//     handlers.forEach(({ message, callback }) => {
//       const source$ = fromEvent(socket, message).pipe(
//         mergeMap((payload: any) => {
//           const { data, ack } = this.mapPayload(payload);
//           return transform(callback(data, ack)).pipe(
//             filter((response: any) => !isNil(response)),
//             map((response: any) => [response, ack])
//           );
//         }),
//         takeUntil(disconnect$)
//       );
//       source$.subscribe(([response, ack]) => {
//         if (response.event) {
//           return socket.emit(response.event, response.data);
//         }
//         isFunction(ack) && ack(response);
//       });
//     });
//   }

//   public mapPayload(payload: unknown): { data: any; ack?: Function } {
//     if (!Array.isArray(payload)) {
//       if (isFunction(payload)) {
//         return { data: undefined, ack: payload as Function };
//       }
//       return { data: payload };
//     }
//     const lastElement = payload[payload.length - 1];
//     const isAck = isFunction(lastElement);
//     if (isAck) {
//       const size = payload.length - 1;
//       return {
//         data: size === 1 ? payload[0] : payload.slice(0, size),
//         ack: lastElement,
//       };
//     }
//     return { data: payload };
//   }
// }
