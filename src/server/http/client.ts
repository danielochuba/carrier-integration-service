/**
 * Reusable HTTP client abstraction.
 * Uses native fetch; configurable base URL, timeout, and headers.
 */

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
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
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
