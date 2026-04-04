import type { Product } from "../types/product";

export const SITE_NAME = "Tap Hoa Tech";
const DEFAULT_SITE_URL = "https://example.com";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

export function toPlainText(value: string): string {
  return normalizeWhitespace(
    stripHtml(value)
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[•*]+/g, " ")
      .replace(/\p{Extended_Pictographic}/gu, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  );
}

export function truncateText(value: string, maxLength: number): string {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxLength + 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const cutIndex = lastSpace > Math.floor(maxLength * 0.65) ? lastSpace : maxLength;

  return `${sliced.slice(0, cutIndex).trim()}...`;
}

export function buildSeoDescription(value: string, maxLength = 155): string {
  return truncateText(toPlainText(value), maxLength);
}

export function buildPageTitle(value: string, maxLength = 60): string {
  const label = normalizeWhitespace(value);
  const brandedTitle = `${label} | ${SITE_NAME}`;

  if (brandedTitle.length <= maxLength) {
    return brandedTitle;
  }

  if (label.length <= maxLength) {
    return label;
  }

  return truncateText(label, maxLength);
}

export function buildProductSeoDescription(product: Product): string {
  const source = product.short_description || product.description || product.name;
  return buildSeoDescription(source, 155);
}

export function buildAbsoluteUrl(pathOrUrl: string, siteUrl = DEFAULT_SITE_URL): string {
  return new URL(pathOrUrl, siteUrl).toString();
}

export function buildOrganizationJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: buildAbsoluteUrl("/", siteUrl),
    email: "sales@example.com",
    telephone: "0911311139"
  };
}

export function buildWebSiteJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: buildAbsoluteUrl("/", siteUrl),
    inLanguage: "vi-VN"
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function buildProductJsonLd(product: Product, siteUrl: string) {
  const productUrl = buildAbsoluteUrl(`/products/${product.slug}/`, siteUrl);
  const imageUrls =
    product.images.length > 0
      ? product.images.map((image) => buildAbsoluteUrl(image.src, siteUrl))
      : [buildAbsoluteUrl("https://placehold.co/1200x1200/f3f4f6/111827?text=Tap+Hoa+Tech", siteUrl)];
  const displayPrice = product.sale_price ?? product.regular_price;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: toPlainText(product.name),
    description: buildProductSeoDescription(product),
    sku: String(product.id),
    category: product.categories[0] ?? "San pham",
    image: imageUrls,
    url: productUrl,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "VND",
      price: String(displayPrice),
      availability:
        product.stock_status === "instock"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock"
    }
  };
}
