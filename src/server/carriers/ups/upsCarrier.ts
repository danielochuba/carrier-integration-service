import type { Carrier } from "@/ports/carrier";
import type { RateQuote, RateRequest } from "@/src/server/domain";
import { CarrierRateFetchError } from "@/src/server/errors";
import { parseRateRequest } from "@/src/server/validations";
import { UpsOAuthClient } from "./oauthClient";
import { mapRateRequestToUpsPayload } from "./rateRequestMapper";
import { mapUpsResponseToRateQuotes } from "./rateResponseMapper";

const DEFAULT_RATING_PATH = "/rating/v2409/Shop";

export interface UpsCarrierConfig {
  oauthClient: UpsOAuthClient;
  ratingPath?: string;
}

export interface RateHttpClient {
  post(
    path: string,
    body: Record<string, unknown>,
    options?: { headers?: Record<string, string> }
  ): Promise<Response>;
}

export class UpsCarrier implements Carrier {
  private readonly oauthClient: UpsOAuthClient;
  private readonly httpClient: RateHttpClient;
  private readonly ratingPath: string;

  constructor(
    config: UpsCarrierConfig,
    httpClient: RateHttpClient
  ) {
    this.oauthClient = config.oauthClient;
    this.httpClient = httpClient;
    this.ratingPath = config.ratingPath ?? DEFAULT_RATING_PATH;
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const validated = parseRateRequest(request);

    const payload = mapRateRequestToUpsPayload(validated);
    const token = await this.oauthClient.getAccessToken();

    const response = await this.httpClient.post(this.ratingPath, payload as unknown as Record<string, unknown>, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch (err) {
      throw new CarrierRateFetchError("Invalid response body", {
        cause: err instanceof Error ? err.message : String(err),
      });
    }
    return mapUpsResponseToRateQuotes(body);
  }
}
