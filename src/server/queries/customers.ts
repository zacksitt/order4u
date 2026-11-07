import type { Prisma } from "@prisma/client";

import {
  CUSTOMER_PAGE_SIZES,
  parseCustomerPageSize,
  parseCustomerSort,
  parsePage,
  parseSortDir,
  type CustomerSortKey,
  type SortDir,
} from "@/lib/customer-list";
import { MAX_SEARCH, zCatalogQuery } from "@/lib/input-rules";
import { requireAgent } from "@/server/auth/session";
import { customerPiiRead, emailHashFromPlain, phoneHashFromPlain } from "@/server/crypto/customer-pii";
import { prisma } from "@/server/db";

export type AgentCustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  facebookProfileUrl: string;
  notes: string;
  orderCount: number;
  hasLogin: boolean;
  createdAt: string;
};

export type CustomerSearchHit = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

export type CustomerListResult = {
  customers: AgentCustomerRow[];
  total: number;
  page: number;
  pageSize: (typeof CUSTOMER_PAGE_SIZES)[number];
  sort: CustomerSortKey;
  dir: SortDir;
  query: string;
};

function mapRow(
  row: {
    id: string;
    name: string;
    createdAt: Date;
    user: { email: string } | null;
    _count?: { orders: number };
  } & Parameters<typeof customerPiiRead>[0],
): AgentCustomerRow {
  const pii = customerPiiRead(row);
  return {
    id: row.id,
    name: row.name,
    phone: pii.phone,
    email: row.user?.email || pii.email,
    facebookProfileUrl: pii.facebookProfileUrl,
    notes: pii.notes,
    orderCount: row._count?.orders ?? 0,
    hasLogin: Boolean(row.user),
    createdAt: row.createdAt.toISOString(),
  };
}

function normalizeSearch(search?: string) {
  return zCatalogQuery.safeParse(typeof search === "string" ? search.slice(0, MAX_SEARCH) : "").data ?? "";
}

function customerSearchWhere(tenantId: string, search?: string): Prisma.CustomerWhereInput {
  const q = normalizeSearch(search);
  const where: Prisma.CustomerWhereInput = { tenantId };
  if (!q) return where;
  const or: Prisma.CustomerWhereInput[] = [
    { name: { contains: q, mode: "insensitive" } },
    { user: { email: { contains: q, mode: "insensitive" } } },
  ];
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 6) {
    or.push({ phoneHash: phoneHashFromPlain(q) });
  }
  if (q.includes("@")) {
    or.push({ emailHash: emailHashFromPlain(q) });
  }
  return { ...where, OR: or };
}

function customerOrderBy(sort: CustomerSortKey, dir: SortDir): Prisma.CustomerOrderByWithRelationInput {
  if (sort === "orders") return { orders: { _count: dir } };
  if (sort === "created_at") return { createdAt: dir };
  return { name: dir };
}

export async function listAgentCustomersPage(input: {
  search?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
  dir?: string;
}): Promise<CustomerListResult> {
  const session = await requireAgent();
  const query = normalizeSearch(input.search);
  const pageSize = parseCustomerPageSize(input.pageSize);
  const sort = parseCustomerSort(input.sort);
  const dir = parseSortDir(input.dir);
  const where = customerSearchWhere(session.tenantId, query);
  const total = await prisma.customer.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const page = Math.min(parsePage(input.page), totalPages);
  const rows = await prisma.customer.findMany({
    where,
    include: { _count: { select: { orders: true } }, user: { select: { email: true } } },
    orderBy: customerOrderBy(sort, dir),
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return {
    customers: rows.map(mapRow),
    total,
    page,
    pageSize,
    sort,
    dir,
    query,
  };
}

export async function getAgentCustomerById(id: string): Promise<AgentCustomerRow | null> {
  const session = await requireAgent();
  const row = await prisma.customer.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { _count: { select: { orders: true } }, user: { select: { email: true } } },
  });
  if (!row) return null;
  return mapRow(row);
}

export async function searchAgentCustomers(query: string): Promise<CustomerSearchHit[]> {
  const session = await requireAgent();
  const q = normalizeSearch(query);
  const rows = await prisma.customer.findMany({
    where: customerSearchWhere(session.tenantId, q),
    include: { user: { select: { email: true } } },
    orderBy: { name: "asc" },
    take: 20,
  });
  return rows.map((row) => {
    const pii = customerPiiRead(row);
    return {
      id: row.id,
      name: row.name,
      phone: pii.phone === "—" ? "" : pii.phone,
      email: row.user?.email || pii.email,
    };
  });
}
