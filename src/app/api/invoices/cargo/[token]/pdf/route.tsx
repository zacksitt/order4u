import { renderToBuffer } from "@react-pdf/renderer";

import { CargoInvoicePdfDocument } from "@/lib/pdf/cargo-invoice-document";
import { getCargoInvoicePdfDataByToken } from "@/server/queries/invoice-pdf";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const data = await getCargoInvoicePdfDataByToken(token);
  if (!data) {
    return new Response("Invoice not found", { status: 404 });
  }

  const buffer = await renderToBuffer(<CargoInvoicePdfDocument {...data} />);
  const filename = `${data.orderCode.replace(/[^a-zA-Z0-9-]/g, "_")}-cargo-invoice.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
