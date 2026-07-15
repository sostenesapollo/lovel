"use client";

import { useEffect, useState } from "react";
import { getFlashOfferEndsAt } from "@/lib/product-social-proof";

type OfferCountdownProps = {
  label?: string;
  percent?: number;
  className?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function OfferCountdown({
  label = "Oferta do dia",
  percent,
  className = "",
}: OfferCountdownProps) {
  const [remaining, setRemaining] = useState<{ h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    function tick() {
      const end = getFlashOfferEndsAt();
      const ms = Math.max(0, end.getTime() - Date.now());
      const total = Math.floor(ms / 1000);
      setRemaining({
        h: Math.floor(total / 3600),
        m: Math.floor((total % 3600) / 60),
        s: total % 60,
      });
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!remaining) {
    return (
      <div className={`offer-countdown${className ? ` ${className}` : ""}`} aria-hidden="true">
        <span className="offer-countdown__label">{label}</span>
        <span className="offer-countdown__digits">--:--:--</span>
      </div>
    );
  }

  return (
    <div
      className={`offer-countdown${className ? ` ${className}` : ""}`}
      role="timer"
      aria-live="polite"
      aria-label={`${label}: ${pad(remaining.h)} horas, ${pad(remaining.m)} minutos, ${pad(remaining.s)} segundos`}
    >
      <div className="offer-countdown__copy">
        <span className="offer-countdown__label">{label}</span>
        {percent ? (
          <span className="offer-countdown__badge">−{percent}%</span>
        ) : null}
      </div>
      <div className="offer-countdown__timer">
        <span className="offer-countdown__unit">
          <strong>{pad(remaining.h)}</strong>
          <small>h</small>
        </span>
        <span className="offer-countdown__sep" aria-hidden="true">
          :
        </span>
        <span className="offer-countdown__unit">
          <strong>{pad(remaining.m)}</strong>
          <small>m</small>
        </span>
        <span className="offer-countdown__sep" aria-hidden="true">
          :
        </span>
        <span className="offer-countdown__unit">
          <strong>{pad(remaining.s)}</strong>
          <small>s</small>
        </span>
      </div>
    </div>
  );
}
