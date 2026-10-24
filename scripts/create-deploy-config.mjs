import { writeFile } from "node:fs/promises";

const required = ["CLOUDFLARE_D1_DATABASE_ID", "CLOUDFLARE_D1_DATABASE_NAME", "CLOUDFLARE_R2_BUCKET_NAME"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  throw new Error(`缺少 GitHub Secrets：${missing.join(", ")}`);
}

const config = {
  name: process.env.CLOUDFLARE_WORKER_NAME || "yizhen-qinghuan",
  main: "dist/server/index.js",
  compatibility_date: "2026-05-15",
  compatibility_flags: ["nodejs_compat"],
  assets: {
    directory: "dist/client",
    binding: "ASSETS",
  },
  d1_databases: [
    {
      binding: "DB",
      database_name: process.env.CLOUDFLARE_D1_DATABASE_NAME,
      database_id: process.env.CLOUDFLARE_D1_DATABASE_ID,
      migrations_dir: "drizzle",
    },
  ],
  r2_buckets: [
    {
      binding: "ARCHIVE",
      bucket_name: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    },
  ],
  observability: { enabled: true },
};

await writeFile(".wrangler-deploy.json", `${JSON.stringify(config, null, 2)}\n`);
console.log("Cloudflare 部署配置已生成。");
