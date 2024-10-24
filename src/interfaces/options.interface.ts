import {us_listen_socket} from 'uWebSockets.js';

export interface HyperExpressLsitenOptions {
    port: number;
    host?: string;
    callback?: (listen_socket: us_listen_socket) => void;
}