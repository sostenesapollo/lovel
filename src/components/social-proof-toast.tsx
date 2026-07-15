"use client";

import { useEffect, useState } from "react";
import { SOCIAL_PURCHASES } from "@/lib/product-social-proof";

type ToastState = {
  name: string;
  city: string;
  product: string;
  key: number;
} | null;

export function SocialProofToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let idx = Math.floor(Math.random() * SOCIAL_PURCHASES.length);

    function schedule(delayMs: number) {
      showTimer = setTimeout(() => {
        const item = SOCIAL_PURCHASES[idx % SOCIAL_PURCHASES.length];
        idx += 1;
        setToast({ ...item, key: Date.now() });
        setVisible(true);
        hideTimer = setTimeout(() => {
          setVisible(false);
          schedule(14000 + Math.random() * 18000);
        }, 5200);
      }, delayMs);
    }

    schedule(8000 + Math.random() * 6000);

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      className={`social-toast${visible ? " social-toast--visible" : ""}`}
      role="status"
      aria-live="polite"
      key={toast.key}
    >
      <span className="social-toast__dot" aria-hidden="true" />
      <div className="social-toast__body">
        <p className="social-toast__title">
          <strong>{toast.name}</strong> de {toast.city}
        </p>
        <p className="social-toast__desc">acabou de comprar {toast.product}</p>
      </div>
    </div>
  );
}
