import { env } from "cloudflare:workers";

type D1Row = {
  id: number;
  kind: string;
  title: string;
  content: string;
  extra: string;
  created_at: string;
  updated_at: string;
};

const db = () => (env as unknown as { DB: D1Database }).DB;

async function ready() {
  await db().prepare(`CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    extra TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function present(row: D1Row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    content: row.content,
    extra: JSON.parse(row.extra || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  await ready();
  const { results } = await db().prepare("SELECT * FROM entries ORDER BY updated_at DESC, id DESC").all<D1Row>();
  return Response.json({ entries: results.map(present) });
}

export async function POST(request: Request) {
  await ready();
  const body = await request.json() as { kind?: string; title?: string; content?: string; extra?: unknown };
  if (!body.kind?.trim() || !body.title?.trim()) {
    return Response.json({ error: "分类与题目不能为空" }, { status: 400 });
  }
  const result = await db().prepare(
    "INSERT INTO entries (kind, title, content, extra) VALUES (?, ?, ?, ?) RETURNING *"
  ).bind(body.kind.trim(), body.title.trim(), body.content?.trim() || "", JSON.stringify(body.extra || {})).first<D1Row>();
  return Response.json({ entry: result ? present(result) : null }, { status: 201 });
}

export async function PUT(request: Request) {
  await ready();
  const body = await request.json() as { id?: number; kind?: string; title?: string; content?: string; extra?: unknown };
  if (!body.id || !body.kind?.trim() || !body.title?.trim()) {
    return Response.json({ error: "记录、分类与题目不能为空" }, { status: 400 });
  }
  const result = await db().prepare(
    "UPDATE entries SET kind = ?, title = ?, content = ?, extra = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *"
  ).bind(body.kind.trim(), body.title.trim(), body.content?.trim() || "", JSON.stringify(body.extra || {}), body.id).first<D1Row>();
  if (!result) return Response.json({ error: "没有找到这则记录" }, { status: 404 });
  return Response.json({ entry: present(result) });
}

export async function DELETE(request: Request) {
  await ready();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "缺少记录编号" }, { status: 400 });
  await db().prepare("DELETE FROM entries WHERE id = ?").bind(Number(id)).run();
  return Response.json({ ok: true });
}
