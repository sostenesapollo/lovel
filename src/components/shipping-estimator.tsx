"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import {
  formatCep,
  onlyDigits,
  quoteShipping,
  SHIPPING_TABLE,
  type ShippingQuote,
} from "@/lib/shipping";

export type ShippingEstimateResult = {
  quote: ShippingQuote;
  cep: string;
};

type Props = {
  compact?: boolean;
  onQuote?: (result: ShippingEstimateResult | null) => void;
  initialCep?: string;
};

export function ShippingEstimator({ compact = false, onQuote, initialCep = "" }: Props) {
  const [cep, setCep] = useState(initialCep);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [error, setError] = useState("");

  function calculate(raw: string) {
    const digits = onlyDigits(raw);
    if (digits.length < 8) {
      setError("Digite um CEP válido (8 dígitos).");
      setQuote(null);
      onQuote?.(null);
      return;
    }
    const result = quoteShipping({ cep: digits });
    if (!result) {
      setError("Não encontramos a região deste CEP.");
      setQuote(null);
      onQuote?.(null);
      return;
    }
    setError("");
    setQuote(result);
    onQuote?.({ quote: result, cep: formatCep(digits) });
  }

  return (
    <div className={`shipping-est${compact ? " shipping-est--compact" : ""}`}>
      {!compact && (
        <>
          <h3 className="shipping-est__title">Frete estimado</h3>
          <p className="shipping-est__lead">
            Enviamos do Paraná. Valores médios — o frete final pode variar conforme peso e
            transportadora.
          </p>
        </>
      )}

      <div className="shipping-est__form">
        <label className="shipping-est__label" htmlFor="shipping-cep">
          Calcular pelo CEP
        </label>
        <div className="shipping-est__row">
          <input
            id="shipping-cep"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => {
              const next = formatCep(e.target.value);
              setCep(next);
              if (onlyDigits(next).length === 8) calculate(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                calculate(cep);
              }
            }}
          />
          <button type="button" className="btn btn--outline btn--sm" onClick={() => calculate(cep)}>
            Calcular
          </button>
        </div>
      </div>

      {error && <p className="shipping-est__error">{error}</p>}

      {quote && (
        <div className="shipping-est__result">
          <p>
            <strong>{formatPrice(quote.price)}</strong>
            <span>
              {" "}
              · {quote.regionLabel}
              {quote.state ? ` (${quote.state})` : ""} · {quote.etaDays} dias úteis
            </span>
          </p>
          <p className="shipping-est__note">Estimativa · frete grátis acima de R$199</p>
        </div>
      )}

      {!compact && (
        <div className="shipping-est__table" role="table" aria-label="Tabela de frete por região">
          <div className="shipping-est__table-head" role="row">
            <span role="columnheader">Região</span>
            <span role="columnheader">Prazo</span>
            <span role="columnheader">A partir de</span>
          </div>
          {SHIPPING_TABLE.map((row) => (
            <div key={row.region} className="shipping-est__table-row" role="row">
              <span role="cell">
                <strong>{row.label}</strong>
                <small>{row.states}</small>
              </span>
              <span role="cell">{row.etaDays} dias</span>
              <span role="cell">{formatPrice(row.price)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
