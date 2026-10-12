import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { InvoiceLineDisplay } from "@/lib/invoice-display";
import { productInvoiceThbAmountDue } from "@/lib/product-invoice-calc";
import type { InvoiceSnapshot } from "@/lib/types";

export type ProductInvoicePdfData = {
  shopName: string;
  orderCode: string;
  customerName: string;
  lines: InvoiceLineDisplay[];
  snapshot: InvoiceSnapshot;
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20 },
  shop: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  meta: { color: "#444", marginBottom: 2 },
  table: { marginTop: 12, marginBottom: 16 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 6 },
  rowHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#333", paddingBottom: 4, marginBottom: 4 },
  colItem: { flex: 1 },
  colQty: { width: 40, textAlign: "right" },
  colLine: { width: 72, textAlign: "right" },
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

export function ProductInvoicePdfDocument({
  shopName,
  orderCode,
  customerName,
  lines,
  snapshot,
}: ProductInvoicePdfData) {
  const thbTotal = snapshot.thbSubtotal + snapshot.thbShipping;
  const feePercent = snapshot.serviceFeePercent;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.shop}>{shopName}</Text>
          <Text style={styles.meta}>Product invoice</Text>
          <Text style={styles.meta}>Order: {orderCode}</Text>
          <Text style={styles.meta}>Customer: {customerName}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={styles.colItem}>Item</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colLine}>Line THB</Text>
          </View>
          {lines.map((line, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.colItem}>{line.title}</Text>
              <Text style={styles.colQty}>{line.qty}</Text>
              <Text style={styles.colLine}>{fmtThb(line.price * line.qty)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal (goods)</Text>
            <Text>{fmtThb(snapshot.thbSubtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Thailand shipping</Text>
            <Text>{fmtThb(snapshot.thbShipping)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>THB total</Text>
            <Text>{fmtThb(thbTotal)}</Text>
          </View>
          {feePercent > 0 && (
            <View style={styles.totalRow}>
              <Text>Agent fee ({feePercent}%)</Text>
              <Text>
                {fmtThb(snapshot.serviceFeeThb)} / {fmtMmk(snapshot.serviceFeeMmk)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text>FX rate (locked)</Text>
            <Text>1 THB = {snapshot.rate} MMK</Text>
          </View>
          <View style={[styles.totalRow, styles.totalBold]}>
            <Text>Amount due</Text>
            <Text>
              {fmtThb(productInvoiceThbAmountDue(snapshot))} / {fmtMmk(snapshot.mmkTotal)}
            </Text>
          </View>
        </View>

        <Text style={styles.foot}>
          Pay in MMK as instructed by your agent. This invoice reflects quoted THB prices at time of issue.
        </Text>
      </Page>
    </Document>
  );
}
