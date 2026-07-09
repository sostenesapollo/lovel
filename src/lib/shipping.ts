/**
 * Frete estimado saindo de Foz do Iguaçu (PR).
 * Valores médios para pacote leve (decant/perfume ~0,3–0,8 kg) via PAC/econômico.
 * Não é cotação em tempo real — base para o cliente no site.
 */

export const SHIPPING_ORIGIN = {
  city: "Foz do Iguaçu",
  state: "PR",
  cep: "85851-000",
} as const;

export type ShippingRegion =
  | "local"
  | "sul"
  | "sudeste"
  | "centro_oeste"
  | "nordeste"
  | "norte";

export type ShippingQuote = {
  region: ShippingRegion;
  regionLabel: string;
  price: number;
  etaDays: string;
  state?: string;
};

/** Preço médio por região (origem: Foz do Iguaçu / PR) */
export const SHIPPING_BY_REGION: Record<
  ShippingRegion,
  { price: number; etaDays: string; label: string }
> = {
  local: { price: 18.9, etaDays: "2–4", label: "Paraná (região)" },
  sul: { price: 24.9, etaDays: "3–6", label: "Sul (SC / RS)" },
  sudeste: { price: 29.9, etaDays: "4–8", label: "Sudeste" },
  centro_oeste: { price: 34.9, etaDays: "5–9", label: "Centro-Oeste" },
  nordeste: { price: 42.9, etaDays: "7–12", label: "Nordeste" },
  norte: { price: 49.9, etaDays: "8–14", label: "Norte" },
};

const STATE_TO_REGION: Record<string, ShippingRegion> = {
  PR: "local",
  SC: "sul",
  RS: "sul",
  SP: "sudeste",
  RJ: "sudeste",
  MG: "sudeste",
  ES: "sudeste",
  MT: "centro_oeste",
  MS: "centro_oeste",
  GO: "centro_oeste",
  DF: "centro_oeste",
  BA: "nordeste",
  SE: "nordeste",
  AL: "nordeste",
  PE: "nordeste",
  PB: "nordeste",
  RN: "nordeste",
  CE: "nordeste",
  PI: "nordeste",
  MA: "nordeste",
  AM: "norte",
  RR: "norte",
  AP: "norte",
  PA: "norte",
  TO: "norte",
  RO: "norte",
  AC: "norte",
};

/** Faixas de CEP → UF (prefixo dos 5 primeiros dígitos) */
const CEP_PREFIX_RANGES: Array<{ from: number; to: number; state: string }> = [
  { from: 1000, to: 19999, state: "SP" },
  { from: 20000, to: 28999, state: "RJ" },
  { from: 29000, to: 29999, state: "ES" },
  { from: 30000, to: 39999, state: "MG" },
  { from: 40000, to: 48999, state: "BA" },
  { from: 49000, to: 49999, state: "SE" },
  { from: 50000, to: 56999, state: "PE" },
  { from: 57000, to: 57999, state: "AL" },
  { from: 58000, to: 58999, state: "PB" },
  { from: 59000, to: 59999, state: "RN" },
  { from: 60000, to: 63999, state: "CE" },
  { from: 64000, to: 64999, state: "PI" },
  { from: 65000, to: 65999, state: "MA" },
  { from: 66000, to: 68899, state: "PA" },
  { from: 68900, to: 68999, state: "AP" },
  { from: 69000, to: 69299, state: "AM" },
  { from: 69300, to: 69399, state: "RR" },
  { from: 69400, to: 69899, state: "AM" },
  { from: 69900, to: 69999, state: "AC" },
  { from: 70000, to: 72799, state: "DF" },
  { from: 72800, to: 72999, state: "GO" },
  { from: 73000, to: 73699, state: "DF" },
  { from: 73700, to: 76799, state: "GO" },
  { from: 76800, to: 76999, state: "RO" },
  { from: 77000, to: 77999, state: "TO" },
  { from: 78000, to: 78899, state: "MT" },
  { from: 79000, to: 79999, state: "MS" },
  { from: 80000, to: 87999, state: "PR" },
  { from: 88000, to: 89999, state: "SC" },
  { from: 90000, to: 99999, state: "RS" },
];

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCep(value: string) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function stateFromCep(cep: string): string | null {
  const d = onlyDigits(cep);
  if (d.length < 5) return null;
  const prefix = Number(d.slice(0, 5));
  if (Number.isNaN(prefix)) return null;
  const match = CEP_PREFIX_RANGES.find((r) => prefix >= r.from && prefix <= r.to);
  return match?.state ?? null;
}

export function regionFromState(state: string): ShippingRegion | null {
  const uf = state.trim().toUpperCase();
  return STATE_TO_REGION[uf] ?? null;
}

export function quoteShipping(opts: {
  state?: string | null;
  cep?: string | null;
}): ShippingQuote | null {
  const uf =
    (opts.state?.trim().toUpperCase() || null) ??
    (opts.cep ? stateFromCep(opts.cep) : null);
  if (!uf) return null;

  const region = regionFromState(uf);
  if (!region) return null;

  const base = SHIPPING_BY_REGION[region];
  return {
    region,
    regionLabel: base.label,
    price: base.price,
    etaDays: base.etaDays,
    state: uf,
  };
}

/** Tabela resumida para exibir no site (sem CEP) */
export const SHIPPING_TABLE: Array<{
  region: ShippingRegion;
  label: string;
  price: number;
  etaDays: string;
  states: string;
}> = [
  { region: "local", label: "Paraná", price: 18.9, etaDays: "2–4", states: "PR" },
  { region: "sul", label: "Sul", price: 24.9, etaDays: "3–6", states: "SC, RS" },
  { region: "sudeste", label: "Sudeste", price: 29.9, etaDays: "4–8", states: "SP, RJ, MG, ES" },
  {
    region: "centro_oeste",
    label: "Centro-Oeste",
    price: 34.9,
    etaDays: "5–9",
    states: "MT, MS, GO, DF",
  },
  {
    region: "nordeste",
    label: "Nordeste",
    price: 42.9,
    etaDays: "7–12",
    states: "BA, SE, AL, PE, PB, RN, CE, PI, MA",
  },
  {
    region: "norte",
    label: "Norte",
    price: 49.9,
    etaDays: "8–14",
    states: "AM, PA, TO, RO, AC, RR, AP",
  },
];
