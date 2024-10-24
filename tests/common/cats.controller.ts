import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("cats")
export class CatsController {
  constructor(private readonly appService: AppService) {}

  @Get()
  findAll() {
    return {
      name: "Cat",
      age: 4,
    };
  }

  @Get("meow")
  meow() {
    return {
      meow: "meow",
    };
  }
}
