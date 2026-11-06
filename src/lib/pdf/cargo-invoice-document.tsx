import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { InvoiceLineDisplay } from "@/lib/invoice-display";
import type { CargoInvoiceLine } from "@/lib/types";
import "@/lib/pdf/register-font";

export type CargoInvoicePdfData = {
  shopName: string;
  orderCode: string;
  lines: InvoiceLineDisplay[];
  categoryLines: CargoInvoiceLine[];
  weightKg: number;
  subtotalThb: number | null;
  discountThb: number;
  thbTotalDue: number | null;
  mmkTotalDue: number;
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Noto Sans Thai" },
  header: { marginBottom: 20 },
  shop: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  meta: { color: "#444", marginBottom: 2 },
  table: { marginTop: 12, marginBottom: 16 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 6 },
  rowHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#333", paddingBottom: 4, marginBottom: 4 },
  colItem: { flex: 1, paddingRight: 8 },
  colQty: { width: 40, textAlign: "right" },
  colMoney: { width: 80, textAlign: "right" },
  totals: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#333" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalBold: { fontSize: 12, fontWeight: "bold", marginTop: 8 },
  foot: { marginTop: 24, fontSize: 8, color: "#666" },
});

function fmtThb(n: number) {
  return `THB ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtMmk(n: number) {
  return `${n.toLocaleString("en-US")} MMK`;
}

export function CargoInvoicePdfDocument({
  shopName,
  orderCode,
  lines,
  categoryLines,
  weightKg,
  subtotalThb,
  discountThb,
  thbTotalDue,
  mmkTotalDue,
}: CargoInvoicePdfData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.shop}>{shopName}</Text>
          <Text style={styles.meta}>Cargo / shipping invoice</Text>
          <Text style={styles.meta}>Order: {orderCode}</Text>
        </View>

        {categoryLines.length > 0 && (
          <View style={styles.table}>
            <View style={styles.rowHeader}>
              <Text style={styles.colItem}>Category</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colMoney}>Weight</Text>
              <Text style={styles.colMoney}>THB / kg</Text>
              <Text style={styles.colMoney}>Total</Text>
            </View>
            {categoryLines.map((line, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.colItem}>{line.categoryName}</Text>
                <Text style={styles.colQty}>{line.qty}</Text>
                <Text style={styles.colMoney}>{line.weightKg} kg</Text>
                <Text style={styles.colMoney}>{fmtThb(line.unitPriceThb)}</Text>
                <Text style={styles.colMoney}>{fmtThb(line.totalThb)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={styles.colItem}>Item (reference)</Text>
            <Text style={styles.colQty}>Qty</Text>
          </View>
          {lines.map((line, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.colItem}>{line.title}</Text>
              <Text style={styles.colQty}>{line.qty}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Chargeable weight</Text>
            <Text>{weightKg} kg</Text>
          </View>
          {subtotalThb != null && (
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>{fmtThb(subtotalThb)}</Text>
            </View>
          )}
          {discountThb > 0 && (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>- {fmtThb(discountThb)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalBold]}>
            <Text>Amount due</Text>
            <Text>{thbTotalDue != null ? `${fmtThb(thbTotalDue)} / ${fmtMmk(mmkTotalDue)}` : fmtMmk(mmkTotalDue)}</Text>
          </View>
        </View>

        <Text style={styles.foot}>
          Cargo fee is charged in THB. Pay the MMK equivalent as instructed by your agent.
        </Text>
      </Page>
    </Document>
  );
}
