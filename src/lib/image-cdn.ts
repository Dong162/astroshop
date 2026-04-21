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
export type ThumbnailSize = "128x128" | "256x256" | "512x512";

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
        if (lastDotIndex !== -1) {
          let pathWithoutExt = url.pathname.substring(0, lastDotIndex);
          const ext = url.pathname.substring(lastDotIndex);
          
          // 1. Unified Regex for dimension suffixes: _1024x1024, -800x600, etc.
          const sizeRegex = /([_-])\d+x\d+$/;
          const match = pathWithoutExt.match(sizeRegex);
          
          if (match) {
            // Case A: Replace existing size suffix, preserving the original separator (_ or -)
            const separator = match[1];
            pathWithoutExt = pathWithoutExt.replace(sizeRegex, `${separator}${size}`);
          } else {
            // Case B: General appending (including numeric suffixes like -1, -2, -3, -4)
            // Only append if not already present
            if (!pathWithoutExt.endsWith(`_${size}`) && !pathWithoutExt.endsWith(`-${size}`)) {
              pathWithoutExt = `${pathWithoutExt}_${size}`;
            }
          }
          
          url.pathname = `${pathWithoutExt}${ext}`;
        }
      }
      
      return url.toString();
    }
  } catch {
    // not a valid URL, return as-is
  }

  return src;
}

