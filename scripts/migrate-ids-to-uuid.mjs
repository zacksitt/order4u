/**
 * Rewrites leftover seed/cuid primary keys (ord_1, …) to UUID v4.
 * Existing UUID rows stay. Bookmarks to rewritten orders will change.
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PK_TABLES = [
  "cargo_invoice_lines",
  "notifications",
  "actions_logs",
  "product_invoices",
  "cargo_invoices",
  "order_items",
  "orders",
  "items",
  "item_categories",
  "customers",
  "users",
  "tenants",
];

const FK_COLUMNS = [
  ["tenants", "default_agent_id"],
  ["tenant_memberships", "tenant_id"],
  ["tenant_memberships", "user_id"],
  ["customers", "tenant_id"],
  ["customers", "user_id"],
  ["item_categories", "tenant_id"],
  ["items", "tenant_id"],
  ["orders", "tenant_id"],
  ["orders", "assigned_agent_id"],
  ["orders", "assigned_cargo_user_id"],
  ["orders", "handed_to_cargo_by_user_id"],
  ["orders", "customer_id"],
  ["orders", "created_by_user_id"],
  ["order_items", "order_id"],
  ["order_items", "catalog_item_id"],
  ["order_items", "item_category_id"],
  ["product_invoices", "order_id"],
  ["cargo_invoices", "order_id"],
  ["cargo_invoice_lines", "cargo_invoice_id"],
  ["notifications", "tenant_id"],
  ["notifications", "user_id"],
  ["notifications", "order_id"],
  ["actions_logs", "tenant_id"],
  ["actions_logs", "entity_id"],
  ["actions_logs", "updated_by"],
];

const prisma = new PrismaClient();

async function main() {
  const remaps = [];

  for (const table of PK_TABLES) {
    const rows = await prisma.$queryRawUnsafe(`SELECT id FROM "${table}"`);
    for (const row of rows) {
      if (typeof row.id === "string" && !UUID.test(row.id)) {
        remaps.push({ table, oldId: row.id, newId: randomUUID() });
      }
    }
  }

  if (remaps.length === 0) {
    console.log("All primary keys are already UUID.");
    return;
  }

  console.log(`Rewriting ${remaps.length} non-UUID id(s) to UUID.`);

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN
            SELECT conname, conrelid::regclass AS rel
            FROM pg_constraint
            WHERE contype = 'f'
              AND connamespace = 'public'::regnamespace
          LOOP
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.rel, r.conname);
          END LOOP;
        END $$;
      `);

      for (const { table, oldId, newId } of remaps) {
        for (const [fkTable, column] of FK_COLUMNS) {
          await tx.$executeRawUnsafe(
            `UPDATE "${fkTable}" SET "${column}" = $1 WHERE "${column}" = $2`,
            newId,
            oldId,
          );
        }
        await tx.$executeRawUnsafe(`UPDATE "${table}" SET id = $1 WHERE id = $2`, newId, oldId);
        console.log(`${table}: ${oldId} -> ${newId}`);
      }
    },
    { timeout: 120_000, maxWait: 20_000 },
  );

  console.log("UUID rewrite finished. prisma db push will restore foreign keys.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
