export type RequestMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD" | "TRACE";

export interface RouterOptions {
    method: RequestMethods;
    handler: string;
}

