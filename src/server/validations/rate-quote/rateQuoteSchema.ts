import { z } from "zod";

export const rateQuoteSchema = z.object({
  carrierId: z.string().min(1, "Carrier ID is required"),
  serviceLevel: z.string().min(1, "Service level is required"),
  amount: z.number().nonnegative("Amount must be non-negative"),
  currency: z.string().length(3, "Currency must be a 3-letter code").toUpperCase(),
  estimatedTransitDays: z.number().int().positive().optional(),
});

export type RateQuote = z.infer<typeof rateQuoteSchema>;

export function parseRateQuote(input: unknown): RateQuote {
  return rateQuoteSchema.parse(input);
}
