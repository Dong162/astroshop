import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const siteUrl = (site ?? new URL("https://example.com")).toString().replace(/\/$/, "");
  const body = [
    `User-agent: *`,
    `Allow: /`,
    ``,
    `# Disallow admin and checkout pages`,
    `Disallow: /admin/`,
    `Disallow: /cart/`,
    `Disallow: /payment/`,
    `Disallow: /thank-you/`,
    ``,
    `# Sitemap`,
    `Sitemap: ${siteUrl}/sitemap.xml`
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
};
