/**
 * Marca LOVEL — L que forma o frasco, wordmark em Cormorant (via CSS).
 */
export function LovelLogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Névoa do spray */}
      <g fill="currentColor">
        <circle cx="46" cy="6" r="1.15" opacity="0.5" />
        <circle cx="51" cy="4" r="0.85" opacity="0.4" />
        <circle cx="55" cy="7.5" r="0.7" opacity="0.32" />
        <circle cx="49" cy="10" r="0.55" opacity="0.28" />
        <circle cx="57" cy="3" r="0.5" opacity="0.22" />
      </g>
      {/* Bico do atomizador */}
      <rect x="28" y="2" width="10" height="5.5" rx="1" fill="currentColor" />
      <path d="M31 7.5h4v3.5h-4z" fill="currentColor" />
      {/* Anel do frasco */}
      <circle
        cx="28"
        cy="40"
        r="22"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        opacity="0.85"
      />
      {/* L tipográfico fundido ao círculo */}
      <path
        d="M14 18.5V52.5c0 2.2 1.4 3.5 3.6 3.5H48"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Topo do L */}
      <path
        d="M14 18.5h3.2"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type LovelLogoProps = {
  variant?: "header" | "footer" | "admin";
  className?: string;
};

export function LovelLogo({ variant = "header", className = "" }: LovelLogoProps) {
  return (
    <span className={`lovel-logo lovel-logo--${variant} ${className}`.trim()}>
      <LovelLogoMark className="lovel-logo__mark" />
      <span className="lovel-logo__text">
        <span className="lovel-logo__name">Lovel</span>
        {variant !== "admin" ? (
          <span className="lovel-logo__tag">Boutique · Essence · Soin</span>
        ) : null}
      </span>
    </span>
  );
}
