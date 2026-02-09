import { router } from "./trpc";
import { rateRouter } from "./routers/rate";

export const appRouter = router({
  rate: rateRouter,
});

export type AppRouter = typeof appRouter;
