import type { RateQuote, RateRequest } from "@/src/server/domain";

/**
 * Port for a shipping carrier.
 * Adapters implement this interface to integrate with specific carriers.
 */
export interface Carrier {
  /**
   * Fetches shipping rates for the given rate request.
   * @returns Resolved list of rate quotes, or empty if none available.
   */
  getRates(request: RateRequest): Promise<RateQuote[]>;
}
