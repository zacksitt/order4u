/** Demo tenant defaults — maps to `tenants` row in production. */
export const DEFAULT_TENANT_SETTINGS = {
  thbMmkRate: 92,
  /** Agent service fee as % of THB order total (goods + TH shipping). */
  defaultServiceFeePercent: 7,
  shopName: "Demo Shop",
} as const;

export type TenantSettings = {
  thbMmkRate: number;
  defaultServiceFeePercent: number;
  shopName: string;
};
