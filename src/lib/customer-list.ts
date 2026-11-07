export const CUSTOMER_PAGE_SIZES = [10, 25, 100] as const;
export type CustomerPageSize = (typeof CUSTOMER_PAGE_SIZES)[number];
export type CustomerSortKey = "name" | "orders" | "created_at";
export type SortDir = "asc" | "desc";

export const DEFAULT_CUSTOMER_PAGE_SIZE: CustomerPageSize = 10;
export const DEFAULT_CUSTOMER_SORT: CustomerSortKey = "name";
export const DEFAULT_CUSTOMER_DIR: SortDir = "asc";

export function parseCustomerPageSize(value: string | undefined): CustomerPageSize {
  const n = Number(value);
  return CUSTOMER_PAGE_SIZES.includes(n as CustomerPageSize)
    ? (n as CustomerPageSize)
    : DEFAULT_CUSTOMER_PAGE_SIZE;
}

export function parseCustomerSort(value: string | undefined): CustomerSortKey {
  return value === "orders" || value === "created_at" || value === "name" ? value : DEFAULT_CUSTOMER_SORT;
}

export function parseSortDir(value: string | undefined): SortDir {
  return value === "desc" ? "desc" : "asc";
}

export function parsePage(value: string | undefined): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function nextCustomerSortDir(
  column: CustomerSortKey,
  current: CustomerSortKey,
  dir: SortDir,
): SortDir {
  if (column !== current) return column === "name" ? "asc" : "desc";
  return dir === "asc" ? "desc" : "asc";
}

export function customersHref(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: string;
}) {
  const search = new URLSearchParams();
  const q = params.q?.trim() ?? "";
  if (q) search.set("q", q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.pageSize && params.pageSize !== DEFAULT_CUSTOMER_PAGE_SIZE) {
    search.set("pageSize", String(params.pageSize));
  }
  if (params.sort && params.sort !== DEFAULT_CUSTOMER_SORT) search.set("sort", params.sort);
  if (params.dir && params.dir !== DEFAULT_CUSTOMER_DIR) search.set("dir", params.dir);
  const qs = search.toString();
  return qs ? `/agent/customers?${qs}` : "/agent/customers";
}
