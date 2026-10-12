export function fmtThb(amount: number) {
  return `฿${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function fmtThbLine(price: number, qty: number) {
  const total = price * qty;
  return qty > 1 ? `${fmtThb(total)} (${fmtThb(price)} × ${qty})` : fmtThb(total);
}
