import { z } from "zod";
import { addressSchema } from "../address/addressSchema";
import { packageSchema } from "../package/packageSchema";

export const rateRequestSchema = z.object({
  origin: addressSchema,
  destination: addressSchema,
  packages: z.array(packageSchema).min(1, "At least one package is required"),
  serviceLevel: z.string().optional(),
});

export type RateRequest = z.infer<typeof rateRequestSchema>;

export function parseRateRequest(input: unknown): RateRequest {
  return rateRequestSchema.parse(input);
}
