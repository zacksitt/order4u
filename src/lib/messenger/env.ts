import { z } from "zod";

const messengerEnvSchema = z.object({
  META_APP_SECRET: z.string().optional(),
  MESSENGER_VERIFY_TOKEN: z.string().optional(),
  MESSENGER_PAGE_ACCESS_TOKEN: z.string().optional(),
  MESSENGER_PAGE_ID: z.string().optional(),
  MESSENGER_SETUP_SECRET: z.string().optional(),
  MESSENGER_SKIP_SIGNATURE_VERIFY: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  APP_URL: z.string().optional(),
});

export type MessengerEnv = {
  appSecret: string | undefined;
  verifyToken: string | undefined;
  pageAccessToken: string | undefined;
  pageId: string | undefined;
  setupSecret: string | undefined;
  skipSignatureVerify: boolean;
  appUrl: string;
};

export function getMessengerEnv(): MessengerEnv {
  const parsed = messengerEnvSchema.parse(process.env);
  const appUrl =
    parsed.APP_URL?.replace(/\/$/, "") ??
    process.env.AUTH_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  return {
    appSecret: parsed.META_APP_SECRET,
    verifyToken: parsed.MESSENGER_VERIFY_TOKEN,
    pageAccessToken: parsed.MESSENGER_PAGE_ACCESS_TOKEN,
    pageId: parsed.MESSENGER_PAGE_ID,
    setupSecret: parsed.MESSENGER_SETUP_SECRET,
    skipSignatureVerify: parsed.MESSENGER_SKIP_SIGNATURE_VERIFY ?? false,
    appUrl,
  };
}

export function messengerConfigured(): boolean {
  const env = getMessengerEnv();
  return Boolean(env.verifyToken && env.pageAccessToken);
}
