import type { RateQuote, RateRequest } from "@/src/server/domain";

export interface Carrier {
  getRates(request: RateRequest): Promise<RateQuote[]>;
}
