/**
 * Phone icons are the committed Order4U logo.
 * The build checks they are present and does not replace them.
 */
import { access } from "node:fs/promises";
import { join } from "node:path";

const files = [
  "public/brand/order4u-logo.png",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/icon-512-maskable.png",
  "public/icons/apple-touch-icon.png",
  "src/app/favicon.ico",
  "src/app/icon.png",
  "src/app/apple-icon.png",
];

for (const file of files) {
  await access(join(process.cwd(), file));
}

console.log("Order4U logo icons are in place");
