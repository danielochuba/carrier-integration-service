import { z } from "zod";

export const weightSchema = z.object({
  value: z.number().positive("Weight must be positive"),
  unit: z.enum(["kg", "lb"]),
});

export const dimensionsSchema = z.object({
  length: z.number().nonnegative("Length must be non-negative"),
  width: z.number().nonnegative("Width must be non-negative"),
  height: z.number().nonnegative("Height must be non-negative"),
  unit: z.enum(["cm", "in"]),
});

export const packageSchema = z.object({
  weight: weightSchema,
  dimensions: dimensionsSchema.optional(),
});

export type Weight = z.infer<typeof weightSchema>;
export type Dimensions = z.infer<typeof dimensionsSchema>;
export type Package = z.infer<typeof packageSchema>;

export function parsePackage(input: unknown): Package {
  return packageSchema.parse(input);
}
