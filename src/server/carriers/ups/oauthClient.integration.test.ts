import { describe, it, expect, vi } from "vitest";
import { UpsOAuthClient } from "./oauthClient";
import type { OAuthHttpClient } from "./oauthClient";

function stubTokenResponse(accessToken: string, expiresInSeconds: number = 3600) {
  return new Response(
    JSON.stringify({ access_token: accessToken, expires_in: expiresInSeconds }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

describe("UpsOAuthClient", () => {
  const config = {
    clientId: "test-client",
    clientSecret: "test-secret",
    tokenUrl: "https://example.com/oauth/token",
  };

  describe("token reuse", () => {
    it("returns cached token on second call without making another HTTP request", async () => {
      let callCount = 0;
      const stub: OAuthHttpClient = {
        post: async () => {
          callCount++;
          return stubTokenResponse("token-a", 3600);
        },
      };

      const client = new UpsOAuthClient(config, stub);

      const first = await client.getAccessToken();
      const second = await client.getAccessToken();

      expect(first).toBe("token-a");
      expect(second).toBe("token-a");
      expect(callCount).toBe(1);
    });

    it("reuses token when still valid (within buffer)", async () => {
      let callCount = 0;
      const stub: OAuthHttpClient = {
        post: async () => {
          callCount++;
          return stubTokenResponse("cached-token", 4000);
        },
      };

      const client = new UpsOAuthClient(config, stub);

      await client.getAccessToken();
      await client.getAccessToken();
      await client.getAccessToken();

      expect(callCount).toBe(1);
    });
  });

  describe("token refresh", () => {
    it("fetches new token after clearCache", async () => {
      let callCount = 0;
      const stub: OAuthHttpClient = {
        post: async () => {
          callCount++;
          return stubTokenResponse(`token-${callCount}`, 3600);
        },
      };

      const client = new UpsOAuthClient(config, stub);

      const first = await client.getAccessToken();
      expect(first).toBe("token-1");
      expect(callCount).toBe(1);

      client.clearCache();

      const second = await client.getAccessToken();
      expect(second).toBe("token-2");
      expect(callCount).toBe(2);
    });

    it("refetches when token is expired (past refresh buffer)", async () => {
      vi.useFakeTimers();

      let callCount = 0;
      const stub: OAuthHttpClient = {
        post: async () => {
          callCount++;
          return stubTokenResponse(`token-${callCount}`, 1);
        },
      };

      const client = new UpsOAuthClient(config, stub);

      const first = await client.getAccessToken();
      expect(first).toBe("token-1");
      expect(callCount).toBe(1);

      vi.advanceTimersByTime(65_000);

      const second = await client.getAccessToken();
      expect(second).toBe("token-2");
      expect(callCount).toBe(2);

      vi.useRealTimers();
    });
  });

  describe("concurrent calls", () => {
    it("deduplicates in-flight fetch when multiple getAccessToken calls run in parallel", async () => {
      let callCount = 0;
      const stub: OAuthHttpClient = {
        post: async () => {
          callCount++;
          return stubTokenResponse("single-fetch-token", 3600);
        },
      };

      const client = new UpsOAuthClient(config, stub);

      const [a, b, c] = await Promise.all([
        client.getAccessToken(),
        client.getAccessToken(),
        client.getAccessToken(),
      ]);

      expect(a).toBe("single-fetch-token");
      expect(b).toBe("single-fetch-token");
      expect(c).toBe("single-fetch-token");
      expect(callCount).toBe(1);
    });
  });
});
