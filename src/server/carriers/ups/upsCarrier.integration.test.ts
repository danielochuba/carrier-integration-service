/**
 * Integration test for UpsCarrier.
 * Stubs the UPS rate API and OAuth; verifies normalized RateQuote output.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UpsCarrier } from "./upsCarrier";
import { UpsOAuthClient } from "./oauthClient";
import type { RateRequest } from "@/src/server/domain";
import type { OAuthHttpClient } from "./oauthClient";
import type { RateHttpClient } from "./upsCarrier";

const MOCK_TOKEN = "mock-access-token";

const STUB_UPS_RATE_RESPONSE = {
  RateResponse: {
    RatedShipment: [
      {
        Service: { Code: "03", Description: "Ground" },
        TotalCharges: { MonetaryValue: "15.99", CurrencyCode: "USD" },
        TimeInTransit: { BusinessTransitDays: 3 },
      },
      {
        Service: { Code: "01", Description: "Next Day Air" },
        TotalCharges: { MonetaryValue: 42.50, CurrencyCode: "USD" },
        TimeInTransit: { BusinessTransitDays: 1 },
      },
    ],
  },
};

const VALID_RATE_REQUEST: RateRequest = {
  origin: {
    addressLine1: "123 Origin St",
    city: "New York",
    stateOrProvinceCode: "NY",
    postalCode: "10001",
    countryCode: "US",
  },
  destination: {
    addressLine1: "456 Dest Ave",
    city: "Los Angeles",
    stateOrProvinceCode: "CA",
    postalCode: "90001",
    countryCode: "US",
  },
  packages: [
    {
      weight: { value: 5, unit: "lb" },
      dimensions: { length: 10, width: 8, height: 6, unit: "in" },
    },
  ],
};

describe("UpsCarrier", () => {
  let oauthClient: UpsOAuthClient;
  let stubOAuthHttp: OAuthHttpClient;
  let stubRateHttp: RateHttpClient;

  beforeEach(() => {
    stubOAuthHttp = {
      post: async () =>
        new Response(
          JSON.stringify({ access_token: MOCK_TOKEN, expires_in: 3600 }),
          { status: 200 }
        ),
    };

    oauthClient = new UpsOAuthClient(
      {
        clientId: "test-client",
        clientSecret: "test-secret",
        tokenUrl: "https://example.com/oauth/token",
      },
      stubOAuthHttp
    );

    stubRateHttp = {
      post: async () =>
        new Response(JSON.stringify(STUB_UPS_RATE_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    };
  });

  it("returns correctly normalized RateQuote objects from stubbed UPS response", async () => {
    const carrier = new UpsCarrier({ oauthClient }, stubRateHttp);

    const quotes = await carrier.getRates(VALID_RATE_REQUEST);

    expect(quotes).toHaveLength(2);

    expect(quotes[0]).toEqual({
      carrierId: "ups",
      serviceLevel: "03",
      amount: 15.99,
      currency: "USD",
      estimatedTransitDays: 3,
    });

    expect(quotes[1]).toEqual({
      carrierId: "ups",
      serviceLevel: "01",
      amount: 42.5,
      currency: "USD",
      estimatedTransitDays: 1,
    });
  });

  it("normalizes MonetaryValue from string and number", async () => {
    const carrier = new UpsCarrier({ oauthClient }, stubRateHttp);
    const quotes = await carrier.getRates(VALID_RATE_REQUEST);

    expect(quotes[0]!.amount).toBe(15.99);
    expect(quotes[1]!.amount).toBe(42.5);
  });

  it("returns empty array when UPS response has no RatedShipment", async () => {
    const emptyStub: RateHttpClient = {
      post: async () =>
        new Response(JSON.stringify({ RateResponse: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    };

    const carrier = new UpsCarrier({ oauthClient }, emptyStub);

    const quotes = await carrier.getRates(VALID_RATE_REQUEST);

    expect(quotes).toEqual([]);
  });
});
