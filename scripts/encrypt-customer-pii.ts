/**
 * Encrypts leftover plaintext customer PII. Rows already prefixed enc:v1: are skipped.
 */
import { PrismaClient } from "@prisma/client";

import {
  customerPiiRead,
  customerPiiWrite,
  isEncryptedPii,
} from "../src/server/crypto/customer-pii";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.customer.findMany();
  let updated = 0;
  for (const row of rows) {
    const needs =
      !isEncryptedPii(row.phone) ||
      (row.email != null && row.email !== "" && !isEncryptedPii(row.email)) ||
      (row.notes != null && row.notes !== "" && !isEncryptedPii(row.notes)) ||
      (row.messengerPsid != null && row.messengerPsid !== "" && !isEncryptedPii(row.messengerPsid)) ||
      (row.facebookProfileUrl != null &&
        row.facebookProfileUrl !== "" &&
        !isEncryptedPii(row.facebookProfileUrl)) ||
      !row.phoneHash ||
      (Boolean(row.email) && !row.emailHash);
    if (!needs) continue;
    const pii = customerPiiRead(row);
    await prisma.customer.update({
      where: { id: row.id },
      data: customerPiiWrite({
        phone: pii.phone,
        email: pii.email,
        facebookProfileUrl: pii.facebookProfileUrl,
        notes: pii.notes,
        messengerPsid: pii.messengerPsid,
      }),
    });
    updated += 1;
  }
  console.log(`Encrypted ${updated} customer row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
