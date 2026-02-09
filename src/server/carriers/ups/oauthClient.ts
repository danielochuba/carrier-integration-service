import { CarrierUnavailableError } from "@/src/server/errors";

const REFRESH_BUFFER_MS = 60_000;

export interface UpsOAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}

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

  clearCache(): void {
    this.cache = null;
    this.fetchPromise = null;
  }
}
