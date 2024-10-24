import type { Request, Response } from "hyper-express/types";

export interface Handler {
    (req: Request, res: Response): void;
}


export type RequestMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD" | "TRACE";