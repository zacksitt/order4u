export function agentOrdersHref(params: { view?: string; customer?: string; code?: string }) {
  const search = new URLSearchParams();
  if (params.view && params.view !== "all") search.set("view", params.view);
  if (params.customer) search.set("customer", params.customer);
  const code = params.code?.trim();
  if (code) search.set("code", code);
  const qs = search.toString();
  return qs ? `/agent/orders?${qs}` : "/agent/orders";
}
