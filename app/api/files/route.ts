import { env } from "cloudflare:workers";

type AssetRow = { id: number; key: string; name: string; type: string; size: number; note: string; created_at: string };
const bindings = () => env as unknown as { DB: D1Database; ARCHIVE: R2Bucket };

async function ready() {
  await bindings().DB.prepare(`CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

const present = (row: AssetRow) => ({ id: row.id, key: row.key, name: row.name, type: row.type, size: row.size, note: row.note, createdAt: row.created_at, url: `/api/files/${encodeURIComponent(row.key)}` });

export async function GET() {
  await ready();
  const { results } = await bindings().DB.prepare("SELECT * FROM assets ORDER BY id DESC").all<AssetRow>();
  return Response.json({ files: results.map(present) });
}

export async function POST(request: Request) {
  await ready();
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File)) return Response.json({ error: "请选择文件" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "单个文件请勿超过 15MB" }, { status: 400 });
  const cleanName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "-");
  const key = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${cleanName}`;
  await bindings().ARCHIVE.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  const row = await bindings().DB.prepare(
    "INSERT INTO assets (key, name, type, size, note) VALUES (?, ?, ?, ?, ?) RETURNING *"
  ).bind(key, file.name, file.type || "application/octet-stream", file.size, String(data.get("note") || "")).first<AssetRow>();
  return Response.json({ file: row ? present(row) : null }, { status: 201 });
}

export async function DELETE(request: Request) {
  await ready();
  const id = Number(new URL(request.url).searchParams.get("id"));
  const row = await bindings().DB.prepare("SELECT * FROM assets WHERE id = ?").bind(id).first<AssetRow>();
  if (row) {
    await bindings().ARCHIVE.delete(row.key);
    await bindings().DB.prepare("DELETE FROM assets WHERE id = ?").bind(id).run();
  }
  return Response.json({ ok: true });
}
