import { PRODUCT_PLACEHOLDER } from "@/lib/constants";

const CART_SELECTOR = ".header__cart";
const FLY_DURATION_MS = 980;

type Point = { x: number; y: number };

function centerOf(el: Element): Point {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function isMostlyVisible(el: Element) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const visibleH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
  const visibleW = Math.min(r.right, vw) - Math.max(r.left, 0);
  return visibleH > Math.min(48, r.height * 0.35) && visibleW > Math.min(48, r.width * 0.35);
}

function preferReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function bumpCart(cart: Element) {
  cart.classList.remove("header__cart--bump");
  void (cart as HTMLElement).offsetWidth;
  cart.classList.add("header__cart--bump");
  window.setTimeout(() => cart.classList.remove("header__cart--bump"), 520);
}

/**
 * Flies a product thumbnail from `source` (or nearest product image) into the header cart icon.
 */
export function flyToCart(source: Element | null, imageUrl?: string | null) {
  if (typeof document === "undefined") return;

  const cart = document.querySelector(CART_SELECTOR);
  if (!cart) return;

  if (preferReducedMotion()) {
    bumpCart(cart);
    return;
  }

  const scope = source?.closest("article, .pdp, .pdp__grid, .product-card") ?? source?.parentElement;
  const imgEl =
    (scope?.querySelector(
      "img.product-card__image, .pdp__gallery img, .image-carousel__slide--active img, .image-carousel img, img",
    ) as HTMLImageElement | null) ?? null;

  // Prefer a visible origin so the path is readable (image if on-screen, else the button)
  const startEl =
    (imgEl && isMostlyVisible(imgEl) ? imgEl : null) ??
    (source && isMostlyVisible(source) ? source : null) ??
    imgEl ??
    source;

  if (!startEl) {
    bumpCart(cart);
    return;
  }

  const start = centerOf(startEl);
  const end = centerOf(cart);
  const startRect = startEl.getBoundingClientRect();
  const size = Math.min(88, Math.max(56, Math.min(startRect.width || 64, startRect.height || 64) * 0.48));

  const src = imageUrl || imgEl?.currentSrc || imgEl?.src || PRODUCT_PLACEHOLDER;

  const flyer = document.createElement("div");
  flyer.className = "cart-flyer";
  flyer.setAttribute("aria-hidden", "true");
  flyer.style.width = `${size}px`;
  flyer.style.height = `${size}px`;
  flyer.style.left = `${start.x}px`;
  flyer.style.top = `${start.y}px`;

  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.draggable = false;
  img.onerror = () => {
    if (img.src.endsWith(PRODUCT_PLACEHOLDER)) return;
    img.onerror = null;
    img.src = PRODUCT_PLACEHOLDER;
  };
  flyer.appendChild(img);

  document.body.appendChild(flyer);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // Soft arc toward the header so the eye tracks the path into the cart
  const peakX = dx * 0.55;
  const peakY = dy * 0.35 - Math.max(40, Math.abs(dx) * 0.08);

  const animation = flyer.animate(
    [
      {
        transform: "translate(-50%, -50%) translate(0px, 0px) scale(1) rotate(0deg)",
        opacity: 1,
        offset: 0,
      },
      {
        transform: `translate(-50%, -50%) translate(${dx * 0.28}px, ${dy * 0.18 - 24}px) scale(0.92) rotate(-6deg)`,
        opacity: 1,
        offset: 0.28,
      },
      {
        transform: `translate(-50%, -50%) translate(${peakX}px, ${peakY}px) scale(0.62) rotate(-4deg)`,
        opacity: 1,
        offset: 0.62,
      },
      {
        transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.18) rotate(8deg)`,
        opacity: 0.35,
        offset: 0.9,
      },
      {
        transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.06) rotate(10deg)`,
        opacity: 0,
        offset: 1,
      },
    ],
    {
      duration: FLY_DURATION_MS,
      easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      fill: "forwards",
    },
  );

  // Land + bump while the flyer is still over the icon
  window.setTimeout(() => bumpCart(cart), Math.round(FLY_DURATION_MS * 0.86));

  const finish = () => flyer.remove();
  animation.finished.then(finish).catch(finish);
}
