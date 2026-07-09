import { CONFIG } from "./config.js";

export function formatPrice(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function pixPrice(value) {
  return value * (1 - CONFIG.pixDiscount);
}

export function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

export function isFractionalVariant(label) {
  return CONFIG.fractionalLabels.includes(label);
}

export function getFullBottleVariantIndex(product) {
  return product.variants.findIndex((v) => v.label === CONFIG.fullBottleLabel);
}

export function getVariant(product, index) {
  return product.variants[index ?? product.defaultVariant ?? 0];
}

export function productUrl(product) {
  return `produto.html?id=${product.id}`;
}

export function categoryUrl(type, sub = "") {
  return sub ? `categoria.html?tipo=${type}&sub=${sub}` : `categoria.html?tipo=${type}`;
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
