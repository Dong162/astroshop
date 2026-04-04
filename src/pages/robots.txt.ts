import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const siteUrl = (site ?? new URL("https://example.com")).toString().replace(/\/$/, "");
  const body = [`User-agent: *`, `Allow: /`, `Sitemap: ${siteUrl}/sitemap.xml`].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
};
