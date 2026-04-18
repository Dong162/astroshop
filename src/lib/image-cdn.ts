/**
 * Image CDN proxy utility
 *
 * Rewrites image URLs from the origin server to the Cloudflare R2-backed CDN.
 * Origin: r6i.pen.dropbuy.vn  →  CDN: images.dongtaphoa.com
 */

const ORIGIN_HOST = "r6i.pen.dropbuy.vn";
const CDN_HOST = "images.dongtaphoa.com";

/**
 * Convert an image URL to go through the image CDN proxy.
 * Only rewrites URLs that match the known origin host.
 * Other URLs (placehold.co, unsplash, etc.) are returned as-is.
 */
export function toImageCdn(src: string): string {
  if (!src) return src;

  try {
    const url = new URL(src);
    if (url.host === ORIGIN_HOST) {
      url.host = CDN_HOST;
      url.protocol = "https:";
      return url.toString();
    }
  } catch {
    // not a valid URL, return as-is
  }

  return src;
}
