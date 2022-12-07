import { Context } from "../types/Context";
import { Ctx, Query, Resolver } from "type-graphql";

@Resolver()
export class HelloResolver {
  @Query((_returns) => String)
  hello(@Ctx() {}: Context) {
    return "hello world";
  }
}
