import { NestFactory } from "@nestjs/core";

import { AppModule } from "../tests/common/app.module";
import { HyperExpressAdapter, NestHyperExpressApplication } from "../src";

const PORT = process.env.PORT ?? 3000;

(async function () {
  const app = await NestFactory.create<NestHyperExpressApplication>(
    AppModule,
    new HyperExpressAdapter()
  );

  app.enableCors({
    origin: "*",
    methods: "POST",
  });

  app.listen(PORT, async () => {
    console.log(`Server is running on: http://localhost:${PORT}`);
  });
})();
