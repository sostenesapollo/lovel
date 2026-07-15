const ITEMS = [
  { title: "100% original", desc: "Importação rastreada" },
  { title: "Envio seguro", desc: "Embalagem discreta" },
  { title: "Troca fácil", desc: "Até 7 dias" },
  { title: "Pagamento", desc: "PIX · cartão · boleto" },
];

export function TrustBar({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`trust-bar${compact ? " trust-bar--compact" : ""}`} role="list">
      {ITEMS.map((item) => (
        <div key={item.title} className="trust-item" role="listitem">
          <p className="trust-item__title">{item.title}</p>
          <p className="trust-item__desc">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}
