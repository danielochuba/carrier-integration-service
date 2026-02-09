import type { RateQuote } from "@/src/server/domain";

const CARRIER_ID = "ups";
const DEFAULT_CURRENCY = "USD";

interface UpsRatedShipment {
  Service?: { Code?: string; Description?: string };
  TotalCharges?: { MonetaryValue?: string | number; CurrencyCode?: string };
  TimeInTransit?: { BusinessTransitDays?: string | number };
}

interface UpsRateResponse {
  RateResponse?: {
    RatedShipment?: UpsRatedShipment | UpsRatedShipment[];
  };
}

function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return !Number.isNaN(n) ? n : null;
  }
  return null;
}

function parseTransitDays(value: unknown): number | undefined {
  const n = parseAmount(value);
  if (n === null || n < 1 || !Number.isInteger(n)) return undefined;
  return n;
}

function parseCurrencyCode(value: unknown): string {
  if (typeof value === "string" && value.length >= 3) {
    return value.slice(0, 3).toUpperCase();
  }
  return DEFAULT_CURRENCY;
}

function parseServiceLevel(rated: UpsRatedShipment): string | null {
  const code = rated.Service?.Code;
  if (typeof code === "string" && code.trim().length > 0) return code.trim();
  const desc = rated.Service?.Description;
  if (typeof desc === "string" && desc.trim().length > 0) return desc.trim();
  return null;
}

function mapRatedShipmentToQuote(rated: UpsRatedShipment): RateQuote | null {
  const amount = parseAmount(rated.TotalCharges?.MonetaryValue);
  if (amount === null || amount < 0) return null;

  const serviceLevel = parseServiceLevel(rated);
  if (!serviceLevel) return null;

  return {
    carrierId: CARRIER_ID,
    serviceLevel,
    amount,
    currency: parseCurrencyCode(rated.TotalCharges?.CurrencyCode),
    estimatedTransitDays: parseTransitDays(rated.TimeInTransit?.BusinessTransitDays),
  };
}

function toRatedShipmentArray(
  rated: UpsRatedShipment | UpsRatedShipment[] | undefined
): UpsRatedShipment[] {
  if (rated === null || rated === undefined) return [];
  return Array.isArray(rated) ? rated : [rated];
}

export function mapUpsResponseToRateQuotes(input: unknown): RateQuote[] {
  if (input === null || input === undefined || typeof input !== "object") {
    return [];
  }

  const body = input as UpsRateResponse;
  const ratedShipments = toRatedShipmentArray(
    body.RateResponse?.RatedShipment
  );

  const quotes: RateQuote[] = [];
  for (const rated of ratedShipments) {
    if (!rated || typeof rated !== "object") continue;
    const quote = mapRatedShipmentToQuote(rated);
    if (quote) quotes.push(quote);
  }

  return quotes;
}
