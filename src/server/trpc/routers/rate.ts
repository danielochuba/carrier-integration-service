import { procedure, router } from "../trpc";
import { rateRequestSchema } from "@/src/server/validations";

export const rateRouter = router({
  getRates: procedure
    .input(rateRequestSchema)
    .query(async ({ ctx, input }) => ctx.rateService.getRates(input)),
});
