/**
 * Integration test for UpsCarrier.
 * Stubs the UPS rate API and OAuth; verifies normalized RateQuote output.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CarrierValidationError,
  CarrierRateFetchError,
  CarrierTimeoutError,
  isCarrierIntegrationError,
} from "@/src/server/errors";
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

  it("builds correct UPS request payload from domain RateRequest", async () => {
    let capturedPath: string | null = null;
    let capturedBody: Record<string, unknown> | null = null;

    const captureStub: RateHttpClient = {
      post: async (path, body, _options) => {
        capturedPath = path;
        capturedBody = body as Record<string, unknown>;
        return new Response(JSON.stringify(STUB_UPS_RATE_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    };

    const carrier = new UpsCarrier({ oauthClient }, captureStub);
    const requestWithService: RateRequest = {
      ...VALID_RATE_REQUEST,
      serviceLevel: "03",
    };

    await carrier.getRates(requestWithService);

    expect(capturedPath).toBe("/rating/v2409/Shop");
    expect(capturedBody).not.toBeNull();
    if (capturedBody === null) throw new Error("unreachable");
    const body: Record<string, unknown> = capturedBody;
    const rateReq = body.RateRequest as Record<string, unknown>;
    expect(rateReq).toBeDefined();
    const shipment = rateReq.Shipment as Record<string, unknown>;
    expect(shipment).toBeDefined();

    const shipper = shipment.Shipper as Record<string, unknown>;
    expect(shipper.Name).toBe("123 Origin St");
    const shipperAddr = (shipper.Address as Record<string, unknown>).AddressLine as string[];
    expect(shipperAddr).toContain("123 Origin St");
    expect((shipper.Address as Record<string, unknown>).PostalCode).toBe("10001");
    expect((shipper.Address as Record<string, unknown>).CountryCode).toBe("US");

    const shipTo = shipment.ShipTo as Record<string, unknown>;
    expect((shipTo.Address as Record<string, unknown>).PostalCode).toBe("90001");

    expect(shipment.Service).toEqual({ Code: "03", Description: "03" });
    expect(shipment.NumOfPieces).toBe("1");

    const pkg = (Array.isArray(shipment.Package) ? shipment.Package[0] : shipment.Package) as Record<string, unknown>;
    expect(pkg).toBeDefined();
    const weight = pkg.PackageWeight as Record<string, unknown>;
    expect(weight.Weight).toBe("5");
    const dims = pkg.Dimensions as Record<string, unknown>;
    expect(dims.Length).toBe("10");
    expect(dims.Width).toBe("8");
    expect(dims.Height).toBe("6");
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

  describe("error scenarios", () => {
    it("returns structured error on 401 unauthorized", async () => {
      const stub: RateHttpClient = {
        post: async () => {
          throw new CarrierValidationError("Request failed with status 401", {
            statusCode: 401,
            statusText: "Unauthorized",
          });
        },
      };

      const carrier = new UpsCarrier({ oauthClient }, stub);

      const err = await carrier
        .getRates(VALID_RATE_REQUEST)
        .then(() => null, (e: unknown) => e);

      expect(isCarrierIntegrationError(err)).toBe(true);
      expect((err as CarrierValidationError).toJSON()).toEqual({
        code: "CARRIER_VALIDATION",
        message: "Request failed with status 401",
        details: { statusCode: 401, statusText: "Unauthorized" },
      });
    });

    it("returns structured error on 429 rate limit", async () => {
      const stub: RateHttpClient = {
        post: async () => {
          throw new CarrierValidationError("Request failed with status 429", {
            statusCode: 429,
            statusText: "Too Many Requests",
          });
        },
      };

      const carrier = new UpsCarrier({ oauthClient }, stub);

      const err = await carrier
        .getRates(VALID_RATE_REQUEST)
        .then(() => null, (e: unknown) => e);

      expect(isCarrierIntegrationError(err)).toBe(true);
      const json = (err as CarrierValidationError).toJSON();
      expect(json.code).toBe("CARRIER_VALIDATION");
      expect(json.details).toMatchObject({ statusCode: 429 });
    });

    it("returns structured error on malformed JSON response", async () => {
      const stub: RateHttpClient = {
        post: async () =>
          new Response("{ invalid", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      };

      const carrier = new UpsCarrier({ oauthClient }, stub);

      const err = await carrier
        .getRates(VALID_RATE_REQUEST)
        .then(() => null, (e: unknown) => e);

      expect(isCarrierIntegrationError(err)).toBe(true);
      const json = (err as CarrierRateFetchError).toJSON();
      expect(json.code).toBe("CARRIER_RATE_FETCH_FAILED");
      expect(json.message).toBe("Invalid response body");
      expect(json.details?.cause).toBeDefined();
    });

    it("returns structured error on network timeout", async () => {
      const stub: RateHttpClient = {
        post: async () => {
          throw new CarrierTimeoutError("Request timed out", {
            cause: "AbortError",
          });
        },
      };

      const carrier = new UpsCarrier({ oauthClient }, stub);

      const err = await carrier
        .getRates(VALID_RATE_REQUEST)
        .then(() => null, (e: unknown) => e);

      expect(isCarrierIntegrationError(err)).toBe(true);
      expect((err as CarrierTimeoutError).toJSON()).toEqual({
        code: "CARRIER_TIMEOUT",
        message: "Request timed out",
        details: { cause: "AbortError" },
      });
    });
  });
});
