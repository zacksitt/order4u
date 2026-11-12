/**
 * Create one shop, its agent, and one cargo user.
 *
 * npm run db:add-shop -- \
 *   --shop "My Shop" \
 *   --agent-email agent@myshop.com --agent-name "Ma Shop" --agent-password "choose-one" \
 *   --cargo-email cargo@myshop.com --cargo-name "Ko Cargo" --cargo-password "choose-one"
 *
 * Uses DATABASE_URL from the shell, or from .env then .env.local.
 * Rate is 134 MMK per THB. Service fee is 7%.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const THB_MMK_RATE = 134;
const SERVICE_FEE_PERCENT = 7;
const MIN_PASSWORD = 8;

loadEnvFiles();

const prisma = new PrismaClient();

function loadEnvFiles() {
  const preset = new Set(Object.keys(process.env));
  for (const file of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (preset.has(key)) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

function arg(name: string): string {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing ${flag}`);
  }
  return value.trim();
}

function slugFromName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!slug) throw new Error("Shop name needs letters or numbers for a slug.");
  return slug;
}

function requirePassword(label: string, password: string) {
  if (password.length < MIN_PASSWORD) {
    throw new Error(`${label} password must be at least ${MIN_PASSWORD} characters.`);
  }
}

async function main() {
  const shopName = arg("shop");
  const agentEmail = arg("agent-email").toLowerCase();
  const agentName = arg("agent-name");
  const agentPassword = arg("agent-password");
  const cargoEmail = arg("cargo-email").toLowerCase();
  const cargoName = arg("cargo-name");
  const cargoPassword = arg("cargo-password");
  const slug = process.argv.includes("--slug") ? arg("slug") : slugFromName(shopName);

  requirePassword("Agent", agentPassword);
  requirePassword("Cargo", cargoPassword);
  if (agentEmail === cargoEmail) {
    throw new Error("Agent and cargo need different email addresses.");
  }

  const slugTaken = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (slugTaken) throw new Error(`Shop slug "${slug}" already exists.`);

  const emails = await prisma.user.findMany({
    where: { email: { in: [agentEmail, cargoEmail] } },
    select: { email: true },
  });
  if (emails.length > 0) {
    throw new Error(`Email already in use: ${emails.map((row) => row.email).join(", ")}`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const agent = await tx.user.create({
      data: {
        email: agentEmail,
        passwordHash: hashSync(agentPassword, 10),
        displayName: agentName,
      },
    });
    const cargo = await tx.user.create({
      data: {
        email: cargoEmail,
        passwordHash: hashSync(cargoPassword, 10),
        displayName: cargoName,
      },
    });
    const shop = await tx.tenant.create({
      data: {
        name: shopName,
        slug,
        defaultAgentId: agent.id,
        defaultThbMmkRate: THB_MMK_RATE,
        defaultServiceFeePercent: SERVICE_FEE_PERCENT,
      },
    });
    await tx.tenantMembership.createMany({
      data: [
        { tenantId: shop.id, userId: agent.id, role: "agent" },
        { tenantId: shop.id, userId: cargo.id, role: "cargo" },
      ],
    });
    return { shop, agent, cargo };
  });

  console.log("Shop:", created.shop.name, created.shop.slug, created.shop.id);
  console.log("Agent:", created.agent.email, created.agent.id);
  console.log("Cargo:", created.cargo.email, created.cargo.id);
  console.log(`Rate: 1 THB = ${THB_MMK_RATE} MMK · service fee ${SERVICE_FEE_PERCENT}%`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
