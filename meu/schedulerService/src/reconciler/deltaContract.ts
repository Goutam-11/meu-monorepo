import type { Contract } from "./policy";

const API_ORIGIN = "https://api.india.delta.exchange";

type DeltaProduct = {
  symbol?: unknown;
  contract_type?: unknown;
  notional_type?: unknown;
  is_quanto?: unknown;
  contract_value?: unknown;
  maintenance_margin?: unknown;
  settling_asset?: { symbol?: unknown };
  settlement_asset?: { symbol?: unknown };
};

export async function fetchDeltaContract(symbol: string, fetcher: typeof fetch = globalThis.fetch): Promise<Contract> {
  const response = await fetcher(`${API_ORIGIN}/v2/products/${encodeURIComponent(symbol)}`, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Delta product request failed (${response.status})`);
  const body = await response.json() as { product?: DeltaProduct } | DeltaProduct;
  const product = "product" in body && body.product ? body.product : body as DeltaProduct;
  const settlement = product.settling_asset?.symbol ?? product.settlement_asset?.symbol;
  if (product.symbol !== symbol || product.contract_type !== "perpetual_futures" || product.notional_type !== "vanilla" || product.is_quanto !== false || settlement !== "USD")
    throw new Error("Delta product metadata is not a supported linear USD perpetual");
  const contractSize = Number(product.contract_value);
  const maintenanceMargin = Number(product.maintenance_margin);
  if (!Number.isFinite(contractSize) || contractSize <= 0 || !Number.isFinite(maintenanceMargin) || maintenanceMargin <= 0 || maintenanceMargin >= 100)
    throw new Error("Delta product metadata is missing verified sizing or margin fields");
  return { symbol, contractSize, minContracts: 1, maintenanceMarginRate: maintenanceMargin / 100, settlement: "USD" };
}
