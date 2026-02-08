/**
 * UPS OAuth 2.0 client-credentials flow.
 * Token acquisition, caching, and refresh on expiry.
 * HTTP client is injected for testability.
 */

import { CarrierUnavailableError } from "@/src/server/errors";

const REFRESH_BUFFER_MS = 60_000;

export interface UpsOAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}

/**
 * Minimal HTTP client interface for token requests.
 * Inject a stub in tests to avoid real HTTP calls.
 */
export interface OAuthHttpClient {
  post(
    url: string,
    body?: string | Record<string, unknown>,
    options?: { headers?: Record<string, string> }
  ): Promise<Response>;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export class UpsOAuthClient {
  private readonly config: UpsOAuthConfig;
  private readonly httpClient: OAuthHttpClient;
  private cache: CachedToken | null = null;
  private fetchPromise: Promise<string> | null = null;

  constructor(config: UpsOAuthConfig, httpClient: OAuthHttpClient) {
    this.config = config;
    this.httpClient = httpClient;
  }

  /**
   * Returns a valid access token, fetching and caching as needed.
   * Refreshes when the token is expired or within the refresh buffer.
   */
  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.cache!.accessToken;
    }

    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = this.fetchToken();
    try {
      const token = await this.fetchPromise;
      return token;
    } finally {
      this.fetchPromise = null;
    }
  }

  private isTokenValid(): boolean {
    if (!this.cache) return false;
    return Date.now() < this.cache.expiresAt - REFRESH_BUFFER_MS;
  }

  private async fetchToken(): Promise<string> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
      "utf-8"
    ).toString("base64");

    const response = await this.httpClient.post(
      this.config.tokenUrl,
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    const data = (await response.json()) as TokenResponse;

    if (!data.access_token) {
      throw new CarrierUnavailableError("Invalid token response: missing access_token", {
        statusCode: response.status,
      });
    }

    const expiresIn = data.expires_in ?? 3600;
    this.cache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return this.cache.accessToken;
  }

  /**
   * Clears the cached token. Useful for testing or forcing refresh.
   */
  clearCache(): void {
    this.cache = null;
    this.fetchPromise = null;
  }
}
