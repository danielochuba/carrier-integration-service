/**
 * Rate tRPC router.
 * Thin, framework-only procedure; validation and logic in domain/validations.
 */

import { procedure, router } from "../trpc";
import { rateRequestSchema } from "@/src/server/validations";

export const rateRouter = router({
  getRates: procedure
    .input(rateRequestSchema)
    .query(async ({ ctx, input }) => ctx.rateService.getRates(input)),
});
