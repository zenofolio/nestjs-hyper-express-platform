import { describe, it, beforeEach } from "mocha";
import { get } from "http";
import { strictEqual } from "node:assert";

import { AppModule } from "./common/app.module";
import { HyperExpressAdapter, NestHyperExpressApplication } from "../src";
import { NestFactory } from "@nestjs/core";
import { IncomingMessage } from "node:http";

const PORT = process.env.PORT ?? 3000;
const REQUESTS_COUNT = 100;

/**
 * Sends an HTTP GET request to the specified endpoint and resolves with the status code.
 * @param endpoint - The endpoint to send the request to.
 * @returns Promise<number> - Resolves with the HTTP status code.
 */
const request = (endpoint: string = "") =>
  new Promise<IncomingMessage>((resolve) => {
    get(`http://0.0.0.0:${PORT}/${endpoint}`, (res) => {
      resolve(res);
    });
  });

/**
 * Test suite for HyperExpressAdapter.
 */
describe("HyperExpressAdapter Tests", () => {
  const startServer = async () => {
    const adapter = new HyperExpressAdapter();
    const app = await NestFactory.create<NestHyperExpressApplication>(
      AppModule,
      adapter
    );
    app.useLogger(false);
    return app.listen(PORT);
  };

  beforeEach(async function () {
    await startServer();
  });

  it("should start the NestJS application", async function () {
    const res = await request();
    strictEqual(res.statusCode, 200);
  });

  it("should handle sequential requests", async function () {
    for (let i = 0; i < REQUESTS_COUNT; i++) {
      await request().then((res) => {
        strictEqual(res.statusCode, 200);
      });
    }
  });

  it("should handle parallel requests", async function () {
    const requests = Array.from({ length: REQUESTS_COUNT }, () =>
      request().then((res) => strictEqual(res.statusCode, 200))
    );

    await Promise.all(requests);
  });
});
