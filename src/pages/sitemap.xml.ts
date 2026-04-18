import type { APIRoute } from "astro";

import { getProducts } from "../lib/products";
import { buildAbsoluteUrl } from "../lib/seo";
import { toImageCdn } from "../lib/image-cdn";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toLastModified(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = (site ?? new URL("https://example.com")).toString();
  const products = await getProducts();
  const urls = [
    {
      loc: buildAbsoluteUrl("/", siteUrl),
      lastmod: new Date().toISOString(),
      images: []
    },
    ...products.map((product) => ({
      loc: buildAbsoluteUrl(`/products/${product.slug}/`, siteUrl),
      lastmod: toLastModified(product.updated_at || product.created_at),
      images: product.images.map((img) => ({
        url: buildAbsoluteUrl(toImageCdn(img.src), siteUrl),
        title: product.name
      }))
    }))
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `
    <lastmod>${entry.lastmod}</lastmod>` : ""}${entry.images.length > 0 ? `
${entry.images
      .map(
        (img) => `    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
    </image:image>`
      )
      .join("\n")}` : ""}
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};
