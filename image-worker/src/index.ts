/**
 * Image Worker Proxy & R2 Storage (V3 - Shared CDN)
 *
 * Flow: Request → CORS Preflight → Cache API → R2 → Origin Fetch → Store & Serve
 * Auto-cleanup: Scheduled job deletes images unused for 30+ days
 *
 * Domain: images.dongtaphoa.com
 * Origin: r6i.pen.dropbuy.vn
 */

export interface Env {
  IMAGES_BUCKET: R2Bucket;
}

const ORIGIN_HOST = "r6i.pen.dropbuy.vn";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const CACHE_TTL = 31536000; // 1 year
const UNUSED_DAYS = 30; // Auto-delete after 30 days of no access
const FAKE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ---------- CORS ----------
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: Response): Response {
  const res = new Response(response.body, response);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

// ---------- Metadata & Cleanup ----------
/**
 * Update last-accessed timestamp for an image
 * Prevents deletion of recently-used images
 */
async function updateLastAccessed(
  bucket: R2Bucket,
  key: string,
  contentType?: string
): Promise<void> {
  try {
    const now = Date.now();
    await bucket.put(key, null, {
      onlyIf: { etagMatches: undefined }, // Allow overwrite
      customMetadata: {
        lastAccessed: now.toString(),
        lastAccessedDate: new Date(now).toISOString(),
      },
      httpMetadata: contentType ? { contentType } : undefined,
    });
  } catch (error) {
    console.error(`Failed to update metadata for ${key}:`, error);
  }
}

/**
 * Delete images unused for 30+ days
 * Runs as scheduled background job
 */
async function cleanupUnusedImages(bucket: R2Bucket): Promise<{
  deleted: number;
  errors: number;
  examined: number;
}> {
  const now = Date.now();
  const thirtyDaysMs = UNUSED_DAYS * 24 * 60 * 60 * 1000;
  const cutoffTime = now - thirtyDaysMs;

  let deleted = 0;
  let errors = 0;
  let examined = 0;
  let cursor: string | undefined;

  try {
    // ✅ Paginate through all objects in R2
    do {
      const list = await bucket.list({ cursor, limit: 1000 });

      for (const object of list.objects) {
        examined++;
        const lastAccessedStr =
          object.customMetadata?.lastAccessed || object.uploadedDate;

        if (!lastAccessedStr) continue;

        const lastAccessTime = isNaN(Number(lastAccessedStr))
          ? new Date(lastAccessedStr).getTime()
          : Number(lastAccessedStr);

        // Delete if not accessed in 30+ days
        if (lastAccessTime < cutoffTime) {
          try {
            await bucket.delete(object.key);
            deleted++;
            console.log(`🗑️ Deleted unused image: ${object.key}`);
          } catch (deleteError) {
            errors++;
            console.error(`❌ Cleanup error for ${object.key}:`, deleteError);
          }
        }
      }

      cursor = list.cursor;
    } while (cursor);

    console.log(
      `✅ Cleanup complete: examined=${examined}, deleted=${deleted}, errors=${errors}`
    );
  } catch (error) {
    console.error("❌ Cleanup job failed:", error);
  }

  return { deleted, errors, examined };
}

// ---------- Content-Type fallback ----------
const EXT_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

function guessContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MAP[ext] ?? "application/octet-stream";
}

// ---------- Main handler ----------
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1) CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return withCors(new Response("Method Not Allowed", { status: 405 }));
    }

    const url = new URL(request.url);
    const key = url.pathname.slice(1); // remove leading "/"

    if (!key) {
      return withCors(new Response("Not Found", { status: 404 }));
    }

    // 2) Cache API check
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let cached = await cache.match(cacheKey);
    if (cached) {
      return withCors(cached);
    }

    // 3) R2 check
    const r2Object = await env.IMAGES_BUCKET.get(key);
    if (r2Object) {
      const contentType =
        r2Object.httpMetadata?.contentType ?? guessContentType(key);
      const headers = new Headers({
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${CACHE_TTL}, immutable`,
        "CF-Cache-Status": "HIT",
      });

      const response = new Response(r2Object.body, { headers });

      // Update last accessed time (background)
      ctx.waitUntil(
        updateLastAccessed(env.IMAGES_BUCKET, key, r2Object.httpMetadata?.contentType)
      );

      // Store in Cache API (background)
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return withCors(response);
    }

    // 4) Fetch from origin & migrate
    const originUrl = `https://${ORIGIN_HOST}/${key}`;
    let originResponse: Response;

    try {
      originResponse = await fetch(originUrl, {
        headers: { "User-Agent": FAKE_USER_AGENT },
        cf: { cacheTtl: 0 }, // bypass CF cache on origin fetch
      });
    } catch {
      return withCors(new Response("Origin Unreachable", { status: 502 }));
    }

    if (!originResponse.ok) {
      return withCors(
        new Response("Not Found on Origin", { status: originResponse.status })
      );
    }

    // Size check
    const contentLength = Number(originResponse.headers.get("content-length") ?? "0");
    if (contentLength > MAX_FILE_SIZE) {
      return withCors(
        new Response(`File too large (>${MAX_FILE_SIZE / 1024 / 1024}MB)`, {
          status: 413,
        })
      );
    }

    // Read body as ArrayBuffer for dual use (R2 put + response)
    const body = await originResponse.arrayBuffer();

    if (body.byteLength > MAX_FILE_SIZE) {
      return withCors(
        new Response(`File too large (>${MAX_FILE_SIZE / 1024 / 1024}MB)`, {
          status: 413,
        })
      );
    }

    const contentType =
      originResponse.headers.get("content-type") ?? guessContentType(key);

    // 5) Store in R2 (background) with metadata
    const now = Date.now();
    ctx.waitUntil(
      env.IMAGES_BUCKET.put(key, body, {
        httpMetadata: { contentType },
        customMetadata: {
          lastAccessed: now.toString(),
          lastAccessedDate: new Date(now).toISOString(),
        },
      })
    );

    // 6) Build response & store in Cache API
    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_TTL}, immutable`,
      "CF-Cache-Status": "MISS",
    });

    const response = new Response(body, { headers });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return withCors(response);
  },

  /**
   * Scheduled handler: Runs daily cleanup of unused images
   * Configure in wrangler.toml with cron trigger: "0 2 * * *" (2 AM UTC daily)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("🧹 Starting scheduled cleanup job...");
    const result = await cleanupUnusedImages(env.IMAGES_BUCKET);
    console.log(`Cleanup result:`, result);
  },
} satisfies ExportedHandler<Env>;
