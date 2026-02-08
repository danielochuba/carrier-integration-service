/**
 * UPS carrier adapter implementing the Carrier port.
 * Validates input, obtains OAuth token, calls UPS rate endpoint, returns normalized RateQuote objects.
 */

import type { Carrier } from "@/ports/carrier";
import type { RateQuote, RateRequest } from "@/src/server/domain";
import { parseRateRequest } from "@/src/server/validations";
import { UpsOAuthClient } from "./oauthClient";
import { mapRateRequestToUpsPayload } from "./rateRequestMapper";
import { mapUpsResponseToRateQuotes } from "./rateResponseMapper";

const DEFAULT_RATING_PATH = "/rating/v2409/Shop";

export interface UpsCarrierConfig {
  oauthClient: UpsOAuthClient;
  ratingPath?: string;
}

/**
 * HTTP client interface for rate requests.
 * HttpClient satisfies this; inject a stub in tests.
 */
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

    const response = await this.httpClient.post(this.ratingPath, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const body = (await response.json()) as unknown;
    return mapUpsResponseToRateQuotes(body);
  }
}
