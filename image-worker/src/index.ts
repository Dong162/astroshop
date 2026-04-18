/**
 * Image Worker Proxy & R2 Storage (V2 - Optimized)
 *
 * Flow: Request → CORS Preflight → Cache API → R2 → Origin Fetch → Store & Serve
 * Cleanup: R2 Object Lifecycle Rules (configured in Cloudflare Dashboard)
 *
 * Domain: images.dongtaphoa.com
 * Origin: r6i.pen.dropbuy.vn
 */

export interface Env {
  IMAGES_BUCKET: R2Bucket;
}

const ORIGIN_HOST = "r6i.pen.dropbuy.vn";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (optimized for product images)
const MIN_FILE_SIZE = 100; // Reject tiny placeholder files (bytes)
const CACHE_TTL = 31536000; // 1 year
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

// ---------- File validation ----------
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"]);
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
]);

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

function isAllowedExtension(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(ext);
}

function isValidImageContentType(contentType: string): boolean {
  const baseType = contentType.split(";")[0].trim();
  return ALLOWED_CONTENT_TYPES.has(baseType);
}

function guessContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MAP[ext] ?? "application/octet-stream";
}

// ---------- Rate limiting ----------
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 100; // requests
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms

function getClientIP(request: Request): string {
  return request.headers.get("cf-connecting-ip") || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// ---------- Main handler ----------
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const clientIP = getClientIP(request);

    // 1) Rate limiting check
    if (!checkRateLimit(clientIP)) {
      return withCors(new Response("Too Many Requests", { status: 429 }));
    }

    // 2) CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return withCors(new Response("Method Not Allowed", { status: 405 }));
    }

    const key = url.pathname.slice(1); // remove leading "/"

    if (!key) {
      return withCors(new Response("Not Found", { status: 404 }));
    }

    // 3) File extension validation
    if (!isAllowedExtension(key)) {
      return withCors(
        new Response("Invalid file type. Only images allowed.", { status: 400 })
      );
    }

    // 4) Cache API check
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let cached = await cache.match(cacheKey);
    if (cached) {
      return withCors(cached);
    }

    // 5) R2 check
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

      // Store in Cache API (background)
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return withCors(response);
    }

    // 6) Fetch from origin & migrate
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

    // Content-Type validation
    const contentTypeHeader = originResponse.headers.get("content-type") ?? "";
    if (!isValidImageContentType(contentTypeHeader)) {
      return withCors(
        new Response("Invalid content-type. Only images allowed.", { status: 400 })
      );
    }

    // Size check (header)
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

    // Validate actual file size & minimum size
    if (body.byteLength > MAX_FILE_SIZE) {
      return withCors(
        new Response(`File too large (>${MAX_FILE_SIZE / 1024 / 1024}MB)`, {
          status: 413,
        })
      );
    }

    if (body.byteLength < MIN_FILE_SIZE) {
      return withCors(
        new Response(`File too small (<${MIN_FILE_SIZE} bytes). Placeholder rejected.`, { status: 400 })
      );
    }

    const contentType = contentTypeHeader ?? guessContentType(key);

    // 7) Store in R2 (background)
    ctx.waitUntil(
      env.IMAGES_BUCKET.put(key, body, {
        httpMetadata: { contentType },
      })
    );

    // 8) Build response & store in Cache API
    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_TTL}, immutable`,
      "CF-Cache-Status": "MISS",
    });

    const response = new Response(body, { headers });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return withCors(response);
  },
} satisfies ExportedHandler<Env>;
