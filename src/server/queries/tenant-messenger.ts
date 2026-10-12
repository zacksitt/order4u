import { prisma } from "@/server/db";

export async function getTenantByMessengerPageId(pageId: string) {
  return prisma.tenant.findFirst({
    where: { messengerPageId: pageId },
  });
}

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
  });
}

/** Resolve tenant for webhook: DB page id, else env MESSENGER_PAGE_ID match, else demo slug fallback. */
export async function resolveTenantForPageId(pageId: string) {
  const byPage = await getTenantByMessengerPageId(pageId);
  if (byPage) return byPage;

  const { getMessengerEnv } = await import("@/lib/messenger/env");
  const env = getMessengerEnv();
  if (env.pageId && env.pageId === pageId) {
    const bySlug = await getTenantBySlug("demo-shop");
    if (bySlug) return bySlug;
  }

  return getTenantBySlug("demo-shop");
}
