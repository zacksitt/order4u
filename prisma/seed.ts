import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const AGENT_ID = "00000000-0000-4000-8000-000000000010";
const CARGO1_ID = "user_cargo_1";
const CARGO2_ID = "user_cargo_2";

async function main() {
  const passwordHash = hashSync(DEMO_PASSWORD, 10);

  // Agent must exist before tenant.defaultAgentId (FK tenants_default_agent_id_fkey).
  const agent = await prisma.user.upsert({
    where: { email: "agent@demo.shop" },
    update: {},
    create: {
      id: AGENT_ID,
      email: "agent@demo.shop",
      passwordHash,
      displayName: "Demo Agent",
    },
  });

  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {
      slug: "demo-shop",
      defaultAgentId: agent.id,
    },
    create: {
      id: TENANT_ID,
      name: "Demo Shop",
      slug: "demo-shop",
      defaultAgentId: agent.id,
      defaultThbMmkRate: 92,
      defaultServiceFeePercent: 7,
      paymentInstructions: "KBZ Pay / Wave — send screenshot in chat after transfer.",
    },
  });

  const cargo1 = await prisma.user.upsert({
    where: { email: "cargo1@demo.shop" },
    update: {},
    create: { id: CARGO1_ID, email: "cargo1@demo.shop", passwordHash, displayName: "Ko Warehouse" },
  });

  await prisma.user.upsert({
    where: { email: "cargo2@demo.shop" },
    update: {},
    create: { id: CARGO2_ID, email: "cargo2@demo.shop", passwordHash, displayName: "Ma Warehouse" },
  });

  for (const row of [
    { userId: agent.id, role: "agent" as const },
    { userId: cargo1.id, role: "cargo" as const },
    { userId: CARGO2_ID, role: "cargo" as const },
  ]) {
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId_role: { tenantId: TENANT_ID, userId: row.userId, role: row.role } },
      update: {},
      create: { tenantId: TENANT_ID, userId: row.userId, role: row.role },
    });
  }

  const catalog = [
    { id: "item_1", name: "Running shoes — size 42", sourceUrl: "https://shopee.co.th/product/running-shoes-42", price: 890, description: "Black / EU 42" },
    { id: "item_2", name: "Phone case — iPhone 15", sourceUrl: "https://lazada.co.th/product/iphone-15-case", price: 250, description: "Clear matte" },
    { id: "item_3", name: "Skincare set", sourceUrl: "https://shopee.co.th/product/skincare-set", price: 890, description: "3-piece bundle" },
    { id: "item_4", name: "Baby stroller", sourceUrl: "https://lazada.co.th/product/baby-stroller", price: 2400, description: "Foldable grey" },
    { id: "item_5", name: "Wireless earbuds", sourceUrl: "https://shopee.co.th/product/wireless-earbuds", price: 520, description: "White" },
    { id: "item_6", name: "Thai snack box", sourceUrl: "https://shopee.co.th/product/snack-box", price: 180, description: "Mixed 12 pcs" },
  ];

  for (const item of catalog) {
    await prisma.catalogItem.upsert({
      where: { id: item.id },
      update: {},
      create: { ...item, tenantId: TENANT_ID },
    });
  }

  const customers = [
    { id: "cust_1", name: "Ma Hla", phone: "09 123 456 789", portalAccessToken: "portal-demo-ma-hla" },
    { id: "cust_2", name: "Ko Min", phone: "09 987 654 321", portalAccessToken: "portal-demo-ko-min" },
    { id: "cust_3", name: "Aye Aye", phone: "09 555 111 222", portalAccessToken: "portal-demo-aye-aye" },
    { id: "cust_4", name: "Su Su", phone: "09 444 777 888", portalAccessToken: "portal-demo-su-su" },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: { portalAccessToken: c.portalAccessToken },
      create: { ...c, tenantId: TENANT_ID },
    });
  }

  await upsertOrder({
    id: "ord_1",
    code: "ORD-8K3M9P",
    customerId: "cust_1",
    token: "demo-token-123",
    productPaid: true,
    fulfillment: "collecting",
    productInv: { thbSubtotal: 1140, thbShipping: 50, rate: 92, feePct: 7, feeThb: 83.3, feeMmk: 7664, mmkTotal: 112644 },
    items: [
      { id: "li_1", title: "Running shoes — size 42", url: "https://shopee.co.th/...", catalogItemId: "item_1", qty: 1, price: 890, actualPrice: 850, status: "arrived_at_agent" as const },
      { id: "li_2", title: "Phone case — iPhone 15", url: "https://lazada.co.th/...", catalogItemId: "item_2", qty: 1, price: 250, actualPrice: 250, status: "arrived_at_agent" as const },
    ],
  });

  await upsertOrder({
    id: "ord_2",
    code: "ORD-7F2A1Q",
    customerId: "cust_2",
    token: "demo-token-awaiting",
    productPaid: false,
    fulfillment: "collecting",
    productInv: { thbSubtotal: 890, thbShipping: 0, rate: 92, feePct: 7, feeThb: 62.3, feeMmk: 5732, mmkTotal: 87612 },
    items: [
      { id: "li_3", title: "Skincare set", url: "https://shopee.co.th/...", catalogItemId: "item_3", qty: 1, price: 890, status: "pending_purchase" as const },
    ],
  });

  await upsertOrder({
    id: "ord_3",
    code: "ORD-9B4C2R",
    customerId: "cust_3",
    token: "demo-token-cargo",
    productPaid: true,
    fulfillment: "handed_to_cargo",
    assignedCargoUserId: CARGO1_ID,
    handed: true,
    productInv: { thbSubtotal: 2400, thbShipping: 80, rate: 91.5, feePct: 7, feeThb: 173.6, feeMmk: 15884, mmkTotal: 234884 },
    items: [
      { id: "li_4", title: "Baby stroller", url: "https://lazada.co.th/...", catalogItemId: "item_4", qty: 1, price: 2400, actualPrice: 2380, status: "arrived_at_agent" as const, cargoCheckOk: true },
    ],
  });

  await upsertOrder({
    id: "ord_4",
    code: "ORD-1D9E8S",
    customerId: "cust_4",
    token: "demo-token-delivered",
    productPaid: true,
    cargoPaid: true,
    fulfillment: "delivered",
    productInv: { thbSubtotal: 520, thbShipping: 40, rate: 92, feePct: 7, feeThb: 39.2, feeMmk: 3606, mmkTotal: 55166 },
    cargoInv: { weightKg: 1.2, mmkTotal: 18000 },
    items: [
      { id: "li_5", title: "Wireless earbuds", url: "https://shopee.co.th/...", catalogItemId: "item_5", qty: 1, price: 520, actualPrice: 499, status: "arrived_at_agent" as const, cargoCheckOk: true },
    ],
  });

  console.log("Seed OK — password for all users:", DEMO_PASSWORD);
  console.log("Agent: agent@demo.shop | Cargo: cargo1@demo.shop, cargo2@demo.shop");
}

type Inv = { thbSubtotal: number; thbShipping: number; rate: number; feePct: number; feeThb: number; feeMmk: number; mmkTotal: number };

async function upsertOrder(opts: {
  id: string;
  code: string;
  customerId: string;
  token: string;
  productPaid: boolean;
  cargoPaid?: boolean;
  fulfillment: string;
  assignedCargoUserId?: string;
  handed?: boolean;
  productInv: Inv;
  cargoInv?: { weightKg: number; mmkTotal: number };
  items: {
    id: string;
    title: string;
    url: string;
    catalogItemId?: string;
    qty: number;
    price: number;
    actualPrice?: number;
    status: "pending_purchase" | "arrived_at_agent";
    cargoCheckOk?: boolean;
  }[];
}) {
  const now = new Date();
  await prisma.order.upsert({
    where: { id: opts.id },
    update: {},
    create: {
      id: opts.id,
      tenantId: TENANT_ID,
      assignedAgentId: AGENT_ID,
      assignedCargoUserId: opts.assignedCargoUserId ?? null,
      handedToCargoByUserId: opts.handed ? AGENT_ID : null,
      handedToCargoAt: opts.handed ? now : null,
      customerId: opts.customerId,
      code: opts.code,
      publicAccessToken: opts.token,
      fulfillmentStatus: opts.fulfillment as "collecting",
      productPaymentStatus: opts.productPaid ? "paid" : "awaiting",
      cargoPaymentStatus: opts.cargoInv ? (opts.cargoPaid ? "paid" : "awaiting") : "not_applicable",
      productPaidAt: opts.productPaid ? now : null,
      cargoPaidAt: opts.cargoPaid ? now : null,
      items: {
        create: opts.items.map((item, i) => ({
          id: item.id,
          sortOrder: i,
          title: item.title,
          sourceUrl: item.url,
          qty: item.qty,
          price: item.price,
          actualPrice: item.actualPrice ?? null,
          catalogItemId: item.catalogItemId ?? null,
          status: item.status,
          cargoCheckOk: item.cargoCheckOk ?? null,
        })),
      },
      productInvoice: {
        create: {
          thbSubtotal: opts.productInv.thbSubtotal,
          thbShipping: opts.productInv.thbShipping,
          serviceFeePercent: opts.productInv.feePct,
          serviceFeeThb: opts.productInv.feeThb,
          mmkServiceFee: opts.productInv.feeMmk,
          rateThbMmk: opts.productInv.rate,
          mmkTotalDue: opts.productInv.mmkTotal,
        },
      },
      ...(opts.cargoInv
        ? {
            cargoInvoice: {
              create: {
                chargeableWeightKg: opts.cargoInv.weightKg,
                mmkTotalDue: opts.cargoInv.mmkTotal,
              },
            },
          }
        : {}),
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
