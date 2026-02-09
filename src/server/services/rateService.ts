import type { Carrier } from "@/ports/carrier";
import type { RateQuote, RateRequest } from "@/src/server/domain";

export interface RateServiceConfig {
  carriers: Carrier[];
}

export class RateService {
  private readonly carriers: Carrier[];

  constructor(config: RateServiceConfig) {
    this.carriers = config.carriers;
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    if (this.carriers.length === 0) return [];

    const results = await Promise.allSettled(
      this.carriers.map((carrier) => carrier.getRates(request))
    );

    const quotes: RateQuote[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        quotes.push(...result.value);
      }
    }

    return quotes;
  }
}
