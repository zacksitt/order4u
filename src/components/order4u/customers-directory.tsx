"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { CustomerCreateForm } from "@/components/order4u/customer-create-form";
import { CustomerEditor } from "@/components/order4u/customer-editor";
import { PageHeader } from "@/components/order4u/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { agentOrdersHref } from "@/lib/agent-orders-href";
import {
  CUSTOMER_PAGE_SIZES,
  customersHref,
  nextCustomerSortDir,
  type CustomerSortKey,
  type SortDir,
} from "@/lib/customer-list";
import type { AgentCustomerRow, CustomerListResult } from "@/server/queries/customers";

export function CustomersDirectory({ list }: { list: CustomerListResult }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AgentCustomerRow | null>(null);
  const [q, setQ] = useState(list.query);

  useEffect(() => {
    setQ(list.query);
  }, [list.query]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim() === list.query.trim()) return;
      startTransition(() => {
        router.replace(
          customersHref({
            q,
            page: 1,
            pageSize: list.pageSize,
            sort: list.sort,
            dir: list.dir,
          }),
          { scroll: false },
        );
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q, list.query, list.pageSize, list.sort, list.dir, router]);

  function go(params: Partial<{ q: string; page: number; pageSize: number; sort: string; dir: string }>) {
    startTransition(() => {
      router.replace(
        customersHref({
          q: params.q ?? q,
          page: params.page ?? list.page,
          pageSize: params.pageSize ?? list.pageSize,
          sort: params.sort ?? list.sort,
          dir: params.dir ?? list.dir,
        }),
        { scroll: false },
      );
    });
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize) || 1);
  const from = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const to = Math.min(list.page * list.pageSize, list.total);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Create a login, then pick them on New order."
        action={
          <Button type="button" className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
            New customer
          </Button>
        }
      />

      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center"
        action="/agent/customers"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q, page: 1 });
        }}
      >
        <Input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, or phone"
          className="sm:max-w-xs"
        />
        <input type="hidden" name="pageSize" value={list.pageSize} />
        <input type="hidden" name="sort" value={list.sort} />
        <input type="hidden" name="dir" value={list.dir} />
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          Search
        </Button>
      </form>

      <div className={pending ? "opacity-60 transition-opacity" : ""}>
        {list.customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <SortHead label="Name" column="name" list={list} />
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Facebook</th>
                  <SortHead label="Orders" column="orders" list={list} align="right" />
                  <SortHead label="Created" column="created_at" list={list} />
                </tr>
              </thead>
              <tbody>
                {list.customers.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        onClick={() => setEditing(row)}
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{row.phone}</td>
                    <td className="px-3 py-2 break-all">{row.email || "—"}</td>
                    <td className="px-3 py-2">
                      {row.facebookProfileUrl ? (
                        <a href={row.facebookProfileUrl} className="text-primary" target="_blank" rel="noreferrer">
                          Profile
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.orderCount > 0 ? (
                        <Link
                          href={agentOrdersHref({ customer: row.id })}
                          className="text-primary hover:underline"
                        >
                          {row.orderCount}
                        </Link>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {new Date(row.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {list.total === 0 ? "0 customers" : `${from}–${to} of ${list.total}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Per page
              <select
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                value={list.pageSize}
                onChange={(e) => go({ page: 1, pageSize: Number(e.target.value) })}
              >
                {CUSTOMER_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={list.page <= 1 || pending}
                onClick={() => go({ page: list.page - 1 })}
              >
                Previous
              </Button>
              <span className="px-2 text-xs tabular-nums text-muted-foreground">
                {list.page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={list.page >= totalPages || pending}
                onClick={() => go({ page: list.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {createOpen && (
        <Modal
          title="New customer"
          description="Email and password are optional. If you set both, they can sign in and must change the password."
          onClose={() => setCreateOpen(false)}
        >
          <CustomerCreateForm onSaved={() => setCreateOpen(false)} />
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <CustomerEditor key={editing.id} customer={editing} onSaved={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}

function SortHead({
  label,
  column,
  list,
  align = "left",
}: {
  label: string;
  column: CustomerSortKey;
  list: CustomerListResult;
  align?: "left" | "right";
}) {
  const active = list.sort === column;
  const nextDir: SortDir = nextCustomerSortDir(column, list.sort, list.dir);
  return (
    <th className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <Link
        href={customersHref({
          q: list.query,
          page: 1,
          pageSize: list.pageSize,
          sort: column,
          dir: nextDir,
        })}
        scroll={false}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          align === "right" ? "justify-end w-full" : ""
        } ${active ? "text-foreground" : ""}`}
      >
        {label}
        <span className="text-[10px] tabular-nums" aria-hidden>
          {active ? (list.dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}
