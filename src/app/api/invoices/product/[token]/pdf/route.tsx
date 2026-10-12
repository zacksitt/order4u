import { renderToBuffer } from "@react-pdf/renderer";

import { ProductInvoicePdfDocument } from "@/lib/pdf/product-invoice-document";
import { getProductInvoicePdfDataByToken } from "@/server/queries/invoice-pdf";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const data = await getProductInvoicePdfDataByToken(token);
  if (!data) {
    return new Response("Invoice not found", { status: 404 });
  }

  const buffer = await renderToBuffer(<ProductInvoicePdfDocument {...data} />);
  const filename = `${data.orderCode.replace(/[^a-zA-Z0-9-]/g, "_")}-product-invoice.pdf`;

  const encoded = encodeURIComponent(filename);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
