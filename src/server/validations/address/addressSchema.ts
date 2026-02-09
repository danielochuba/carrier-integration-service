import { z } from "zod";

export const addressSchema = z.object({
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  stateOrProvinceCode: z.string().min(1, "State or province code is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  countryCode: z
    .string()
    .length(2, "Country code must be a 2-letter ISO code")
    .toUpperCase(),
});

export type Address = z.infer<typeof addressSchema>;

export function parseAddress(input: unknown): Address {
  return addressSchema.parse(input);
}
