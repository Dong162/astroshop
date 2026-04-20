/**
 * Image CDN proxy utility
 *
 * Rewrites image URLs from the origin server to the Cloudflare R2-backed CDN.
 * Origin: r6i.pen.dropbuy.vn  →  CDN: images.dongtaphoa.com
 */

const ORIGIN_HOST = "r6i.pen.dropbuy.vn";
const CDN_HOST = "images.dongtaphoa.com";

/**
 * Image sizes supported by the CDN suffix pattern.
 */
export type ThumbnailSize = "256x256" | "512x512";

/**
 * Convert an image URL to go through the image CDN proxy.
 * Only rewrites URLs that match the known origin host.
 * Other URLs (placehold.co, unsplash, etc.) are returned as-is.
 * 
 * @param src The original image source URL
 * @param size Optional size suffix to append (e.g., "256x256" -> image_256x256.jpg)
 */
export function toImageCdn(src: string, size?: ThumbnailSize): string {
  if (!src) return src;

  try {
    const url = new URL(src);
    
    // Only process if it matches origin or already converted CDN host
    if (url.host === ORIGIN_HOST || url.host === CDN_HOST) {
      url.host = CDN_HOST;
      url.protocol = "https:";
      
      if (size) {
        const lastDotIndex = url.pathname.lastIndexOf('.');
        if (lastDotIndex !== -1 && !url.pathname.includes(`_${size}`)) {
          const pathWithoutExt = url.pathname.substring(0, lastDotIndex);
          const ext = url.pathname.substring(lastDotIndex);
          url.pathname = `${pathWithoutExt}_${size}${ext}`;
        }
      }
      
      return url.toString();
    }
  } catch {
    // not a valid URL, return as-is
  }

  return src;
}

