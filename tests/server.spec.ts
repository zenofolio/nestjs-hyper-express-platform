import { describe } from "mocha";
import { get } from "http";
import { strictEqual } from "node:assert";

import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./common/app.module";
import { HyperExpressAdapter, NestHyperExpressApplication } from "../src";
import { Server } from "hyper-express";

const PORT = process.env.PORT ?? 3000;
const requests_count = 100;

const request = (endpoint: string = "") =>
  new Promise<number>((resolve) => {
    get(`http://0.0.0.0:${PORT}/${endpoint}`, (res) => {
      strictEqual(res.statusCode, 200);
      resolve(res.statusCode);
    });
  });

describe("HyperExpressAdapter", () => {
 

  const server = async () => {
    const adapter = new HyperExpressAdapter();

    const app = await NestFactory.create<NestHyperExpressApplication>(
      AppModule,
      adapter
    );

    app.useLogger(false);

    // start the server
    return app.listen(PORT);
  }

  beforeEach(async function () {
    await server();
  });


  it("Should Start NestJJ Application", async function () {
    
     await request();
  });
 

  it("Test HyperExpressAdapter", async function () {

    
    for (let i = 0; i < requests_count; i++) {
      await request();
    }


  })
 

  it("Test HyperExpressAdapter Requests", async function () {
    for (let i = 0; i < requests_count; i++) {
      await request();
    }
  });


  it("Test HyperExpressAdapter Parallel Requests", async function () {
    const requests = Array.from({ length: requests_count }, () => request());
    await Promise.all(requests);
  })

 
});
