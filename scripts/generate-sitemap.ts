// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://settleupnow.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/sign-in", changefreq: "monthly", priority: "0.4" },
  { path: "/sign-up", changefreq: "monthly", priority: "0.6" },
];

async function fetchBlogSlugs() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const sb = createClient(url, key);
    const { data } = await sb.from("blog_posts").select("slug, updated_at").eq("published", true);
    return data ?? [];
  } catch {
    return [];
  }
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

const posts = await fetchBlogSlugs();
for (const p of posts as Array<{ slug: string; updated_at?: string }>) {
  entries.push({
    path: `/blog/${p.slug}`,
    lastmod: p.updated_at?.slice(0, 10),
    changefreq: "monthly",
    priority: "0.7",
  });
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
