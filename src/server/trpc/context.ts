import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { rateService } from "./deps";

export function createContext(opts: FetchCreateContextFnOptions) {
  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    rateService,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
