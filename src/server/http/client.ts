/**
 * Reusable HTTP client abstraction.
 * Uses native fetch; configurable base URL, timeout, and headers.
 * Normalizes network errors, timeouts, and non-2xx responses into carrier integration errors.
 */

import {
  CarrierTimeoutError,
  CarrierUnavailableError,
  CarrierRateFetchError,
  CarrierValidationError,
  isCarrierIntegrationError,
} from "@/src/server/errors";

export interface HttpClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
  timeoutMs?: number;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.defaultTimeoutMs = config.timeoutMs ?? 30000;
    this.defaultHeaders = config.headers ?? {};
  }

  async request(options: RequestOptions): Promise<Response> {
    const url = this.resolveUrl(options);
    const headers = this.mergeHeaders(options.headers);
    const body = this.resolveBody(options.body);
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.throwForNon2xx(response);
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (isCarrierIntegrationError(error)) throw error;
      this.throwForFetchError(error);
    }
  }

  private async throwForNon2xx(response: Response): Promise<never> {
    const details: Record<string, unknown> = {
      statusCode: response.status,
      statusText: response.statusText,
    };
    try {
      const text = await response.text();
      if (text) {
        try {
          details.responseBody = JSON.parse(text) as unknown;
        } catch {
          details.responseBody = text;
        }
      }
    } catch {
      // Ignore body read failures
    }

    if (response.status >= 400 && response.status < 500) {
      throw new CarrierValidationError(
        `Request failed with status ${response.status}`,
        details
      );
    }
    if (response.status >= 500) {
      throw new CarrierUnavailableError(
        `Carrier returned server error: ${response.status}`,
        details
      );
    }
    throw new CarrierRateFetchError(
      `Request failed with status ${response.status}`,
      details
    );
  }

  private throwForFetchError(error: unknown): never {
    if (error instanceof Error && error.name === "AbortError") {
      throw new CarrierTimeoutError("Request timed out", {
        cause: error.message,
      });
    }
    throw new CarrierUnavailableError(
      "Network request failed",
      error instanceof Error ? { cause: error.message } : undefined
    );
  }

  async get(pathOrUrl: string, options?: Omit<RequestOptions, "method" | "path" | "url">): Promise<Response> {
    const path = pathOrUrl.startsWith("http") ? undefined : pathOrUrl;
    const url = path ? undefined : pathOrUrl;
    return this.request({ ...options, method: "GET", path, url });
  }

  async post(
    pathOrUrl: string,
    body?: RequestOptions["body"],
    options?: Omit<RequestOptions, "method" | "path" | "url" | "body">
  ): Promise<Response> {
    const path = pathOrUrl.startsWith("http") ? undefined : pathOrUrl;
    const url = path ? undefined : pathOrUrl;
    return this.request({ ...options, method: "POST", path, url, body });
  }

  private resolveUrl(options: RequestOptions): string {
    if (options.url) return options.url;
    const path = (options.path ?? "").replace(/^\//, "");
    return `${this.baseUrl}/${path}`;
  }

  private mergeHeaders(requestHeaders?: Record<string, string>): Headers {
    const headers = new Headers(this.defaultHeaders);
    if (requestHeaders) {
      for (const [key, value] of Object.entries(requestHeaders)) {
        headers.set(key, value);
      }
    }
    return headers;
  }

  private resolveBody(body?: string | Record<string, unknown>): string | undefined {
    if (body === undefined) return undefined;
    if (typeof body === "string") return body;
    return JSON.stringify(body);
  }
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}
