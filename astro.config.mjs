import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Tên miền chính thức của bạn (cần đổi lại nếu bạn dùng tên miền khác)
const site = process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "https://dongtaphoa.vn";

export default defineConfig({
  site,
  integrations: [sitemap()]
});
