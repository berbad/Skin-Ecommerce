import { z } from "zod";
export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((v) => v.toLowerCase());
export const passwordSchema = z
  .string()
  .min(12)
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password must fit within 72 UTF-8 bytes",
  );
export const loginPasswordSchema = z
  .string()
  .min(1)
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72);
export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/)
  .transform((v) => v.toLowerCase());
export const quantitySchema = z.number().int().min(1).max(1000);
export const addressSchema = z
  .object({
    line1: z.string().max(200),
    line2: z.string().max(200).optional(),
    city: z.string().max(100),
    state: z.string().max(100),
    postalCode: z.string().max(20),
    country: z.string().max(100),
  })
  .strict();
export const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    address: addressSchema.optional(),
  })
  .strict();
const formNumber = z
  .union([
    z.number(),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .transform(Number),
  ])
  .pipe(z.number().finite());
export const productSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(10000),
    price: formNumber.pipe(z.number().min(0.01).max(999999.99)),
    stock: formNumber.pipe(z.number().int().min(0).max(1000000)),
    category: z.string().trim().min(1).max(100),
    featured: z
      .union([
        z.boolean(),
        z.enum(["true", "false"]).transform((v) => v === "true"),
      ])
      .optional()
      .default(false),
    ingredients: z.string().max(10000).optional(),
    benefits: z.string().max(10000).optional(),
    howToUse: z.string().max(10000).optional(),
  })
  .strict();

// Original available stock shown to the administrator guards against intervening reservations.
export const productUpdateSchema = productSchema.extend({
  expectedStock: formNumber.pipe(z.number().int().min(0).max(1000000)),
});
