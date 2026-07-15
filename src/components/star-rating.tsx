type StarRatingProps = {
  value: number;
  size?: "sm" | "md";
  className?: string;
};

export function StarRating({ value, size = "sm", className = "" }: StarRatingProps) {
  const full = Math.floor(value);
  const half = value - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span
      className={`star-rating star-rating--${size}${className ? ` ${className}` : ""}`}
      aria-label={`${value.toFixed(1)} de 5 estrelas`}
      role="img"
    >
      {Array.from({ length: full }, (_, i) => (
        <span key={`f${i}`} className="star-rating__star star-rating__star--full" aria-hidden="true">
          ★
        </span>
      ))}
      {half ? (
        <span className="star-rating__star star-rating__star--half" aria-hidden="true">
          ★
        </span>
      ) : null}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e${i}`} className="star-rating__star star-rating__star--empty" aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}
