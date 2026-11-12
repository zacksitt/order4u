import { z } from "zod";

export const MAX_THB = 9_999_999.99;
export const MAX_QTY = 99_999;
export const MAX_KG = 9_999.99;
export const MAX_RATE = 99_999;
export const MAX_NAME = 80;
export const MAX_ITEM_TITLE = 200;
export const MAX_URL = 2_000;
export const MAX_INSTRUCTIONS = 2_000;
export const MAX_CUSTOMER_NOTE = 500;
export const MAX_EMAIL = 120;
export const MAX_PASSWORD = 128;
export const MIN_SET_PASSWORD = 8;
export const MAX_SEARCH = 80;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;
const HTML_TAGS = /<\/?[a-z][^>]*>/gi;
const MULTI_SPACE = /[^\S\n]+/g;
const NAME_CHARS = /^[\p{L}\p{M}\p{N} .'\-@()]+$/u;

export function stripControls(value: string): string {
  return value.replace(CONTROL_CHARS, "");
}

export function sanitizePlainText(value: string): string {
  return stripControls(value)
    .replace(HTML_TAGS, "")
    .replace(MULTI_SPACE, " ")
    .trim();
}

export function sanitizeMultiline(value: string): string {
  return stripControls(value)
    .replace(HTML_TAGS, "")
    .split("\n")
    .map((line) => line.replace(MULTI_SPACE, " ").trimEnd())
    .join("\n")
    .trim();
}

export function sanitizePhone(value: string): string {
  return stripControls(value).replace(/[^\d+\- ]/g, "").replace(MULTI_SPACE, " ").trim();
}

export function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

function hasAtMostDecimals(value: number, places: number): boolean {
  if (!Number.isFinite(value)) return false;
  const factor = 10 ** places;
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-6;
}

function looksLikeUrl(value: string): boolean {
  return /https?:\/\//i.test(value) || /\bwww\./i.test(value);
}

function preprocessString(fn: (value: string) => string, schema: z.ZodType<string>) {
  return z.preprocess((value) => (typeof value === "string" ? fn(value) : value), schema) as z.ZodType<string>;
}

export const zPersonName = preprocessString(
  sanitizePlainText,
  z
    .string()
    .min(2, "Enter a name (2–80 characters).")
    .max(MAX_NAME, "Name is too long (max 80 characters).")
    .refine((value) => NAME_CHARS.test(value), "Use letters, numbers, and spaces only.")
    .refine((value) => !looksLikeUrl(value), "Do not put a link in the name."),
);

export const zShopName = preprocessString(
  sanitizePlainText,
  z
    .string()
    .min(2, "Enter a shop name (2–80 characters).")
    .max(MAX_NAME, "Shop name is too long (max 80 characters).")
    .refine((value) => !looksLikeUrl(value), "Do not put a link in the shop name."),
);

export const zItemTitle = preprocessString(
  sanitizePlainText,
  z.string().min(1, "Enter the item name.").max(MAX_ITEM_TITLE, "Item name is too long (max 200 characters)."),
);

export const zCategoryName = preprocessString(
  sanitizePlainText,
  z.string().min(1, "Enter a category name.").max(MAX_NAME, "Category name is too long (max 80 characters)."),
);

export const zPhone = preprocessString(
  sanitizePhone,
  z
    .string()
    .max(20)
    .refine((value) => value === "" || phoneDigitCount(value) >= 8, "Phone needs at least 8 digits.")
    .refine((value) => value === "" || phoneDigitCount(value) <= 15, "Phone can have at most 15 digits."),
);

export const zHttpUrl = preprocessString(
  (value) => stripControls(value).trim(),
  z
    .string()
    .min(1, "Enter the product URL.")
    .max(MAX_URL, "URL is too long.")
    .refine((value) => /^https?:\/\//i.test(value), "URL must start with http:// or https://.")
    .refine((value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, "Enter a valid product URL."),
);

export const zQty = z
  .number({ error: "Enter the quantity." })
  .int("Quantity must be a whole number.")
  .min(1, "Quantity must be at least 1.")
  .max(MAX_QTY, "Quantity can be at most 99,999.");

export const zThbPositive = z
  .number({ error: "Enter a THB amount." })
  .gt(0, "Amount must be greater than 0.")
  .max(MAX_THB, "Amount is too large.")
  .refine((value) => hasAtMostDecimals(value, 2), "Use at most 2 decimal places.");

export const zThbNonNeg = z
  .number({ error: "Enter a THB amount." })
  .min(0, "Amount cannot be negative.")
  .max(MAX_THB, "Amount is too large.")
  .refine((value) => hasAtMostDecimals(value, 2), "Use at most 2 decimal places.");

export const zKg = z
  .number({ error: "Enter the weight in kg." })
  .gt(0, "Weight must be greater than 0.")
  .max(MAX_KG, "Weight can be at most 9,999.99 kg.")
  .refine((value) => hasAtMostDecimals(value, 2), "Use at most 2 decimal places.");

export const zPercent = z
  .number({ error: "Enter a percent." })
  .min(0, "Percent cannot be negative.")
  .max(100, "Percent cannot be more than 100.")
  .refine((value) => hasAtMostDecimals(value, 1), "Use at most 1 decimal place.");

export const zRate = z
  .number({ error: "Enter the THB to MMK rate." })
  .gt(0, "Rate must be greater than 0.")
  .max(MAX_RATE, "Rate is too large.")
  .refine((value) => hasAtMostDecimals(value, 4), "Use at most 4 decimal places.");

export const zEmail = preprocessString(
  (value) => stripControls(value).trim().toLowerCase(),
  z.email("Enter a valid email.").max(MAX_EMAIL, "Email is too long."),
);

export const zOptionalEmail = preprocessString(
  (value) => stripControls(value).trim().toLowerCase(),
  z
    .string()
    .max(MAX_EMAIL, "Email is too long.")
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email."),
);

export const zOptionalHttpUrl = preprocessString(
  (value) => stripControls(value).trim(),
  z
    .string()
    .max(MAX_URL, "URL is too long.")
    .refine((value) => {
      if (value === "") return true;
      if (!/^https?:\/\//i.test(value)) return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, "Enter a valid URL starting with http:// or https://."),
);

export const zPassword = z
  .string()
  .min(1, "Enter your password.")
  .max(MAX_PASSWORD, "Password is too long.");

export const zSetPassword = z
  .string()
  .min(MIN_SET_PASSWORD, `Password must be at least ${MIN_SET_PASSWORD} characters.`)
  .max(MAX_PASSWORD, "Password is too long.");

export const zPaymentInstructions = preprocessString(
  sanitizeMultiline,
  z.string().max(MAX_INSTRUCTIONS, "Payment instructions are too long (max 2,000 characters)."),
);

export const zUuid = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Invalid id.",
  );

export const customerProfileSchema = z
  .object({
    id: zUuid,
    name: zPersonName,
    phone: zPhone.optional().default(""),
    email: zOptionalEmail.optional().default(""),
    password: z.string().max(MAX_PASSWORD).optional().default(""),
    facebookProfileUrl: zOptionalHttpUrl.optional().default(""),
    notes: z.preprocess(
      (value) => (typeof value === "string" ? sanitizeMultiline(value) : value),
      z.string().max(MAX_INSTRUCTIONS, "Notes are too long.").optional().default(""),
    ),
  })
  .superRefine((value, ctx) => {
    if (!value.password) return;
    if (value.password.length < MIN_SET_PASSWORD) {
      ctx.addIssue({
        code: "custom",
        message: `Password must be at least ${MIN_SET_PASSWORD} characters.`,
        path: ["password"],
      });
    }
    if (!value.email) {
      ctx.addIssue({
        code: "custom",
        message: "Enter an email to set a password.",
        path: ["email"],
      });
    }
  });

export const zCatalogQuery = preprocessString(
  sanitizePlainText,
  z.string().max(MAX_SEARCH, "Search is too long."),
);

export const zCustomerNote = preprocessString(
  sanitizeMultiline,
  z.string().max(MAX_CUSTOMER_NOTE, "Notes are too long (max 500 characters)."),
);

export const orderLineInputSchema = z.object({
  title: zItemTitle,
  url: zOptionalHttpUrl,
  qty: zQty,
  price: zThbPositive,
  shippingFeeThb: zThbNonNeg.optional(),
  catalogItemId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    zUuid.optional(),
  ),
  marketplace: z.enum(["shopee", "lazada", "other"]).optional(),
  customerNote: zCustomerNote.optional(),
  shopeeShopId: z.string().min(1).max(40).optional(),
  shopeeItemId: z.string().min(1).max(40).optional(),
});

export type OrderLineInput = z.infer<typeof orderLineInputSchema>;

export const customerCreateOrderSchema = z.object({
  customerName: zPersonName,
  customerPhone: zPhone.optional().default(""),
  lines: z.array(orderLineInputSchema).min(1, "Add at least one item."),
});

export const agentCreateOrderSchema = customerCreateOrderSchema.extend({
  thbShipping: zThbNonNeg,
  serviceFeePercent: zPercent,
  thbMmkRate: zRate.optional(),
  discountThb: zThbNonNeg.optional(),
  customerId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    zUuid.optional(),
  ),
});

export const agentCreateCustomerSchema = z
  .object({
    name: zPersonName,
    phone: zPhone.optional().default(""),
    email: zOptionalEmail.optional().default(""),
    password: z.string().max(MAX_PASSWORD).optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (!value.password) return;
    if (value.password.length < MIN_SET_PASSWORD) {
      ctx.addIssue({
        code: "custom",
        message: `Password must be at least ${MIN_SET_PASSWORD} characters.`,
        path: ["password"],
      });
    }
    if (!value.email) {
      ctx.addIssue({
        code: "custom",
        message: "Enter an email to set a password.",
        path: ["email"],
      });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: zPassword,
    newPassword: zSetPassword,
    confirmPassword: zSetPassword,
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Choose a different password from the current one.",
    path: ["newPassword"],
  });

export const publicCreateOrderSchema = customerCreateOrderSchema.extend({
  shopSlug: preprocessString(
    sanitizePlainText,
    z
      .string()
      .min(1, "Invalid shop.")
      .max(80)
      .regex(/^[a-z0-9-]+$/i, "Invalid shop."),
  ),
  portalToken: preprocessString(
    (value) => stripControls(value).trim(),
    z.string().min(8, "Invalid or expired order link.").max(200),
  ),
});

export const loginSchema = z.object({
  email: zEmail,
  password: zPassword,
});

export const tenantSettingsSchema = z.object({
  shopName: zShopName,
  thbMmkRate: zRate,
  defaultServiceFeePercent: zPercent,
  paymentInstructions: zPaymentInstructions,
});

export const itemCategorySchema = z.object({
  name: zCategoryName,
  cargoPriceThb: zThbPositive,
});

export const unpaidQuoteLineSchema = z.object({
  id: z.preprocess((value) => (value === "" || value === null ? undefined : value), zUuid.optional()),
  title: zItemTitle,
  qty: zQty,
  price: zThbPositive,
  shippingFeeThb: zThbNonNeg,
});

export const updateUnpaidQuoteSchema = z.object({
  orderId: zUuid,
  rate: zRate,
  discountThb: zThbNonNeg,
  lines: z.array(unpaidQuoteLineSchema).min(1, "Add at least one item."),
});

export const cargoInvoiceIssueSchema = z.object({
  orderId: zUuid,
  categoryLines: z
    .array(
      z.object({
        categoryId: zUuid,
        weightKg: zKg,
        unitPriceThb: zThbPositive.optional(),
      }),
    )
    .min(1, "Enter the weight for every category."),
  discountThb: zThbNonNeg,
});

export function firstIssueMessage(error: z.ZodError, fallback = "Invalid data."): string {
  return error.issues[0]?.message ?? fallback;
}

export function parseWith<T>(schema: z.ZodType<T>, value: unknown, fallback: string): { ok: true; data: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, fallback) };
  return { ok: true, data: parsed.data };
}
