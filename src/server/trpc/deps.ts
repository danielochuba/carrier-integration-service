/**
 * tRPC handler dependencies.
 * Wire rateService with carriers here; default uses empty carriers.
 */

import { RateService } from "@/src/server/services";

export const rateService = new RateService({ carriers: [] });
