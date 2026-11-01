export function fmtThb(amount: number) {
  return `฿${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function fmtMmk(amount: number) {
  return `${amount.toLocaleString("en-US")} MMK`;
}

export function fmtCargoFee(fee: { thbTotal?: number; mmkTotal: number }) {
  if (fee.thbTotal != null) return `${fmtThb(fee.thbTotal)} / ${fmtMmk(fee.mmkTotal)}`;
  return fmtMmk(fee.mmkTotal);
}

export function fmtThbLine(price: number, qty: number) {
  const total = price * qty;
  return qty > 1 ? `${fmtThb(total)} (${fmtThb(price)} × ${qty})` : fmtThb(total);
}
